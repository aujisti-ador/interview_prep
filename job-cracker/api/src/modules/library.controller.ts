import { BadRequestException, Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, relative, resolve, sep } from 'path';

/**
 * Serves the repo's markdown guides to the reader in the web app.
 *
 * The repo is mounted read-only at REPO_ROOT. Every path from the client is
 * resolved and checked to be inside that root before anything is read — the
 * only interesting security surface in this app.
 */
const REPO_ROOT = resolve(process.env.REPO_ROOT || join(process.cwd(), '../..'));

/** Directories that are not study material. */
const SKIP_DIRS = new Set(['job-cracker', 'node_modules', '.git', '.claude', 'dist', '.vscode']);

const SECTION_LABELS: Record<string, { label: string; blurb: string; order: number }> = {
  '.': { label: 'Top level', blurb: 'Plan and index documents', order: 0 },
  'phase-0-online-assessments': {
    label: 'Phase 0 — Online assessments',
    blurb: 'The screening gate: platform mechanics, MCQ banks, coding challenges, SQL, timed mocks',
    order: 1,
  },
  'phase-1-core-programming': {
    label: 'Phase 1 — Core programming',
    blurb: 'JavaScript/TypeScript, Node internals, NestJS, testing, design patterns',
    order: 2,
  },
  'phase-2-apis-realtime-systems': {
    label: 'Phase 2 — APIs & real-time',
    blurb: 'GraphQL, REST, WebSockets, event-driven architecture, gRPC, LLM integration',
    order: 3,
  },
  'phase-3-databases-data': {
    label: 'Phase 3 — Databases & data',
    blurb: 'PostgreSQL, Redis, Kafka, RabbitMQ, NoSQL, migrations, ORMs',
    order: 4,
  },
  'phase-4-cloud-infrastructure': {
    label: 'Phase 4 — Cloud & infrastructure',
    blurb: 'NGINX, AWS serverless, Docker, Kubernetes, observability, security, CI/CD',
    order: 5,
  },
  'phase-5-system-design': {
    label: 'Phase 5 — System design',
    blurb: 'Fundamentals, architecture patterns, distributed systems, DDD, HLD/LLD practice',
    order: 6,
  },
  'hands-on-projects': {
    label: 'Hands-on projects',
    blurb: 'Build walkthroughs with architecture, data flows and interview talking points',
    order: 7,
  },
};

interface LibraryFile {
  path: string;
  name: string;
  title: string;
  bytes: number;
  headings: number;
}

/** True if any segment of a root-relative path is one `walk` refuses to descend into. */
function hidden(relPath: string): boolean {
  return relPath
    .split(sep)
    .some((segment) => segment.startsWith('.') || SKIP_DIRS.has(segment));
}

/** Resolve a client-supplied path, refusing anything that escapes the repo root. */
async function safeResolve(raw: string): Promise<string> {
  if (!raw) throw new BadRequestException('path is required');
  if (!raw.endsWith('.md')) throw new BadRequestException('only .md files are served');

  const candidate = resolve(REPO_ROOT, raw);
  if (candidate !== REPO_ROOT && !candidate.startsWith(REPO_ROOT + sep)) {
    throw new BadRequestException('path escapes the library root');
  }

  // Re-check after following symlinks, so a symlinked file cannot escape either.
  let real: string;
  try {
    real = await fs.realpath(candidate);
  } catch {
    throw new NotFoundException(`no such file: ${raw}`);
  }
  const realRoot = await fs.realpath(REPO_ROOT);
  if (real !== realRoot && !real.startsWith(realRoot + sep)) {
    throw new BadRequestException('path escapes the library root');
  }

  // Containment is not the whole rule. `walk` refuses to descend into
  // SKIP_DIRS, so those files are absent from the tree and from search — but
  // this endpoint took any path inside the root, which made every
  // `job-cracker/**/node_modules/**/*.md` readable by direct request. Apply
  // the same exclusion here, on the resolved path, so a symlink cannot launder
  // its way past it either.
  if (hidden(relative(realRoot, real))) {
    throw new NotFoundException(`no such file: ${raw}`);
  }
  return real;
}

/** First `# heading` if present, otherwise a title derived from the filename. */
function extractTitle(markdown: string, fileName: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) return match[1].replace(/[*_`]/g, '').trim();
  return fileName
    .replace(/\.md$/, '')
    .replace(/^\d+[a-z]?-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

@Controller('library')
export class LibraryController {
  private cache: { files: LibraryFile[]; at: number } | null = null;

  private async walk(dir: string, out: string[] = []): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await this.walk(full, out);
      else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
    }
    return out;
  }

  private async allFiles(): Promise<LibraryFile[]> {
    // The repo is a read-only mount that changes rarely; a short TTL keeps the
    // tree snappy without going stale while you are editing guides.
    if (this.cache && Date.now() - this.cache.at < 30_000) return this.cache.files;

    const paths = await this.walk(REPO_ROOT);
    const files: LibraryFile[] = [];
    for (const full of paths) {
      const body = await fs.readFile(full, 'utf8');
      const rel = relative(REPO_ROOT, full);
      const name = rel.split(sep).pop()!;
      files.push({
        path: rel.split(sep).join('/'),
        name,
        title: extractTitle(body, name),
        bytes: Buffer.byteLength(body),
        headings: (body.match(/^##\s+/gm) ?? []).length,
      });
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    this.cache = { files, at: Date.now() };
    return files;
  }

  /** Grouped tree for the sidebar. */
  @Get()
  async tree() {
    const files = await this.allFiles();
    const groups = new Map<string, LibraryFile[]>();
    for (const file of files) {
      const parts = file.path.split('/');
      const dir = parts.length > 1 ? parts[0] : '.';
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir)!.push(file);
    }

    return [...groups.entries()]
      .map(([dir, items]) => ({
        dir,
        label: SECTION_LABELS[dir]?.label ?? dir,
        blurb: SECTION_LABELS[dir]?.blurb ?? '',
        order: SECTION_LABELS[dir]?.order ?? 99,
        files: items,
      }))
      .sort((a, b) => a.order - b.order || a.dir.localeCompare(b.dir));
  }

  /** Full-text search across every guide. Beats Ctrl+F, which only sees one file. */
  @Get('search')
  async search(@Query('q') q?: string) {
    const query = (q ?? '').trim();
    if (query.length < 3) return { query, results: [] };

    const needle = query.toLowerCase();
    const files = await this.allFiles();
    const results: any[] = [];

    for (const file of files) {
      const body = await fs.readFile(join(REPO_ROOT, file.path), 'utf8');
      const lines = body.split('\n');
      const hits: { line: number; text: string; heading: string }[] = [];
      let heading = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^#{1,3}\s+/.test(line)) heading = line.replace(/^#+\s+/, '').trim();
        if (!line.toLowerCase().includes(needle)) continue;
        if (hits.length >= 4) break;
        hits.push({ line: i + 1, text: line.trim().slice(0, 240), heading });
      }

      if (hits.length) results.push({ path: file.path, title: file.title, hits });
      if (results.length >= 25) break;
    }

    return { query, results };
  }

  /**
   * A single guide, split into sections at `## ` boundaries so the reader can
   * render progressively — some of these files are 190KB and would jank the
   * main thread if handed to the markdown renderer in one piece.
   */
  @Get('file')
  async file(@Query('path') path: string) {
    const full = await safeResolve(path);
    const body = await fs.readFile(full, 'utf8');
    const rel = relative(REPO_ROOT, full).split(sep).join('/');
    const name = rel.split('/').pop()!;

    const lines = body.split('\n');
    const sections: { heading: string; content: string }[] = [];
    let current = { heading: '', lines: [] as string[] };
    let inFence = false;

    const push = () => {
      if (current.lines.length || current.heading) {
        sections.push({ heading: current.heading, content: current.lines.join('\n') });
      }
    };

    for (const line of lines) {
      // Do not treat a `## ` inside a fenced code block as a heading.
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      if (!inFence && /^##\s+/.test(line)) {
        push();
        current = { heading: line.replace(/^##\s+/, '').trim(), lines: [line] };
      } else {
        current.lines.push(line);
      }
    }
    push();

    // Headings only — the anchor ids come from rehype-slug at render time, and
    // the reader reads them back off the DOM. Duplicating that slug algorithm
    // here would silently drift and break every jump link.
    const toc = sections
      .filter((s) => s.heading)
      .map((s) => ({ heading: s.heading.replace(/[*_`]/g, '') }));

    return {
      path: rel,
      name,
      title: extractTitle(body, name),
      bytes: Buffer.byteLength(body),
      sections: sections.map((s) => s.content),
      toc,
    };
  }
}
