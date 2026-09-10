import { memo, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';

export function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-100">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink-800 pb-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-100">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-400">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

const TONES: Record<string, string> = {
  neutral: 'bg-ink-800 text-ink-300',
  accent: 'bg-accent/15 text-accent-soft',
  good: 'bg-good/15 text-good',
  warn: 'bg-warn/15 text-warn',
  bad: 'bg-bad/15 text-bad',
};

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`chip ${TONES[tone] ?? TONES.neutral}`}>{children}</span>;
}

export function difficultyTone(difficulty: string) {
  return difficulty === 'easy' ? 'good' : difficulty === 'hard' ? 'bad' : 'warn';
}

export function Meter({
  value,
  max = 100,
  tone = 'accent',
  className = '',
  label,
}: {
  value: number;
  max?: number;
  tone?: 'accent' | 'good' | 'warn' | 'bad';
  className?: string;
  /** Names the meter for assistive tech when no adjacent text already does. */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar =
    tone === 'good' ? 'bg-good' : tone === 'warn' ? 'bg-warn' : tone === 'bad' ? 'bg-bad' : 'bg-accent';
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-800 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * A polite live region. Renders nothing visible — it exists so that state which
 * is otherwise conveyed by colour or by a panel appearing (test results, a
 * score, a timer crossing its budget) is also announced.
 */
export function Announce({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card-tight">
      <div className="label">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}

/** Resolve a link found inside `dir/file.md` against the library root. */
export function resolveRepoPath(fromFile: string, href: string): string {
  const base = fromFile.split('/').slice(0, -1);
  const parts = href.split('/');
  const out = [...base];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

/**
 * Markdown renderer shared by the seeded docs and the repo Library.
 *
 * When `sourcePath` is given, relative `.md` links are rewritten to Library
 * routes so cross-references between guides actually navigate instead of 404ing.
 */
function MarkdownBody({ body, sourcePath }: { body: string; sourcePath?: string }) {
  const navigate = useNavigate();

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
      components={{
        a({ href, children, ...rest }) {
          const target = href ?? '';

          if (/^https?:\/\//.test(target)) {
            return (
              <a href={target} target="_blank" rel="noreferrer" {...rest}>
                {children}
              </a>
            );
          }

          // In-page anchor — let the browser handle it.
          if (target.startsWith('#')) {
            return (
              <a href={target} {...rest}>
                {children}
              </a>
            );
          }

          const [pathPart, hash] = target.split('#');
          if (sourcePath && pathPart.endsWith('.md')) {
            const resolved = resolveRepoPath(sourcePath, pathPart);
            return (
              <a
                href={`/library/${resolved}${hash ? `#${hash}` : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/library/${resolved}${hash ? `#${hash}` : ''}`);
                }}
                {...rest}
              >
                {children}
              </a>
            );
          }

          // A link to a non-markdown repo file: show it, do not pretend it navigates.
          return (
            <span className="text-ink-400" title={target}>
              {children}
            </span>
          );
        },
      }}
    >
      {body}
    </Markdown>
  );
}

const MemoMarkdown = memo(MarkdownBody);

export function Doc({ body, sourcePath }: { body: string; sourcePath?: string }) {
  return (
    <div className="prose-doc max-w-none">
      <MemoMarkdown body={body} sourcePath={sourcePath} />
    </div>
  );
}

/** A reference into the repo, rendered as a link into the Library reader. */
export function RefLink({ refPath, className = '' }: { refPath: string; className?: string }) {
  if (!refPath || !refPath.endsWith('.md')) return null;
  const [path, hash] = refPath.split('#');
  return (
    <Link
      to={`/library/${path}${hash ? `#${hash}` : ''}`}
      className={`font-mono text-[11px] text-ink-500 transition hover:text-accent-soft hover:underline ${className}`}
      title="Read this guide in the Library"
    >
      {path}
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-800 px-6 py-10 text-center text-sm text-ink-400">
      {children}
    </div>
  );
}

export function Loading() {
  return <div className="py-16 text-center text-sm text-ink-500">Loading…</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
      {message}
      <div className="mt-1 text-xs text-ink-400">
        If this persists, check that the API container is running: <code>docker compose ps</code>
      </div>
    </div>
  );
}
