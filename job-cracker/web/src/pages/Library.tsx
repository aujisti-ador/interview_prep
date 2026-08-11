import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Chip, Doc, ErrorBox, Loading, Meter } from '../components/ui';

interface LibraryFile {
  path: string;
  name: string;
  title: string;
  bytes: number;
  headings: number;
}

interface LibraryGroup {
  dir: string;
  label: string;
  blurb: string;
  files: LibraryFile[];
}

interface GuideDoc {
  path: string;
  name: string;
  title: string;
  bytes: number;
  sections: string[];
  toc: { heading: string }[];
}

/** Sections rendered in the first paint; the rest stream in on idle. */
const FIRST_BATCH = 3;
const BATCH_SIZE = 4;

const idle: (cb: () => void) => number =
  typeof (window as any).requestIdleCallback === 'function'
    ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 400 })
    : (cb) => window.setTimeout(cb, 24);

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}

// ---------------------------------------------------------------- search

function SearchPanel({ onPick }: { onPick: () => void }) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data, isFetching } = useQuery({
    queryKey: ['library-search', debounced],
    queryFn: () => api.get<any>(`/library/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.trim().length >= 3,
  });

  return (
    <div>
      <label className="sr-only" htmlFor="library-search">
        Search all guides
      </label>
      <input
        id="library-search"
        type="search"
        className="input text-sm"
        placeholder="Search all 59 guides…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      {debounced.length >= 3 && (
        <div className="mt-3">
          {isFetching && <div className="px-1 text-xs text-ink-500">Searching…</div>}
          {data && data.results.length === 0 && !isFetching && (
            <div className="px-1 text-xs text-ink-500">No matches for “{debounced}”.</div>
          )}
          <div className="space-y-2">
            {(data?.results ?? []).map((r: any) => (
              <div key={r.path} className="rounded-lg border border-ink-800 bg-ink-900/60 p-3">
                <Link
                  to={`/library/${r.path}`}
                  onClick={onPick}
                  className="text-[13px] font-medium text-accent-soft hover:underline"
                >
                  {r.title}
                </Link>
                <div className="mt-1 space-y-1">
                  {r.hits.map((h: any, i: number) => (
                    <div key={i} className="border-l border-ink-700 pl-2 text-[11px] leading-snug text-ink-400">
                      {h.heading && <span className="text-ink-500">{h.heading} · </span>}
                      {h.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- index

function LibraryIndex({ groups }: { groups: LibraryGroup[] }) {
  const total = groups.reduce((a, g) => a + g.files.length, 0);
  const bytes = groups.reduce((a, g) => a + g.files.reduce((b, f) => b + f.bytes, 0), 0);

  return (
    <>
      <header className="mb-8 border-b border-ink-800 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-100">Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-400">
          Every guide in the repo, readable here. {total} documents, {kb(bytes)} of material — the source
          material behind the plan, the practice bank and the drills.
        </p>
      </header>

      <div className="mb-8 max-w-xl">
        <SearchPanel onPick={() => {}} />
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.dir}>
            <div className="mb-3 border-b border-ink-850 pb-2">
              <h2 className="text-base font-semibold text-ink-100">{group.label}</h2>
              {group.blurb && <p className="mt-0.5 text-sm text-ink-400">{group.blurb}</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.files.map((file) => (
                <Link
                  key={file.path}
                  to={`/library/${file.path}`}
                  className="rounded-xl border border-ink-800 bg-ink-900/60 p-4 transition hover:border-ink-600"
                >
                  <div className="text-sm font-medium leading-snug text-ink-100">{file.title}</div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-500">
                    <span>{kb(file.bytes)}</span>
                    {file.headings > 0 && (
                      <>
                        <span>·</span>
                        <span>{file.headings} sections</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-ink-500">{file.path}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- reader

function Reader({ path }: { path: string }) {
  const { hash } = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['library-file', path],
    queryFn: () => api.get<GuideDoc>(`/library/file?path=${encodeURIComponent(path)}`),
  });

  const [rendered, setRendered] = useState(FIRST_BATCH);
  const [activeId, setActiveId] = useState('');
  /** Headings read back off the DOM — the authoritative anchor ids. */
  const [domToc, setDomToc] = useState<{ id: string; text: string }[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollRoot = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setRendered(FIRST_BATCH);
    setDomToc([]);
    // The app scrolls its <main>, not the window.
    scrollRoot.current = document.querySelector('main');
    scrollRoot.current?.scrollTo({ top: 0 });
  }, [path]);

  // Stream the remaining sections in during idle time. Everything ends up in
  // the DOM, so browser find-in-page still works once the doc settles.
  useEffect(() => {
    if (!data) return;
    if (rendered >= data.sections.length) return;
    const id = idle(() => setRendered((n) => Math.min(n + BATCH_SIZE, data.sections.length)));
    return () => {
      if (typeof (window as any).cancelIdleCallback === 'function') (window as any).cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [data, rendered]);

  const fullyRendered = data ? rendered >= data.sections.length : false;

  // Read the anchor ids that rehype-slug actually produced. This runs per
  // batch, not once at the end: on a 49-section guide, waiting for the full
  // render left the table of contents inert — and scroll-spy never armed —
  // for as long as the document took to stream in.
  useEffect(() => {
    if (!bodyRef.current) return;
    const next = Array.from(bodyRef.current.querySelectorAll<HTMLElement>('h2[id]')).map((h) => ({
      id: h.id,
      text: (h.textContent ?? '').trim(),
    }));
    // Keep the old array identity when no new heading appeared, so the
    // IntersectionObserver below is not rebuilt on every batch.
    setDomToc((prev) => (prev.length === next.length ? prev : next));
  }, [rendered, path, data]);

  const scrollTo = (el: Element | null) => {
    if (!el) return;
    const root = scrollRoot.current;
    if (root) {
      const top = (el as HTMLElement).getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 12;
      root.scrollTo({ top, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /**
   * Deep link: jump as soon as the section holding the anchor exists, retrying
   * as further batches stream in. If the target has not appeared yet, stop
   * streaming lazily and render the rest — a cross-guide link that lands on the
   * wrong scroll position for several seconds reads as a broken link.
   */
  const jumpedFor = useRef('');
  useEffect(() => {
    if (!hash) {
      jumpedFor.current = '';
      return;
    }
    const key = `${path}${hash}`;
    if (jumpedFor.current === key) return;

    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) {
      jumpedFor.current = key;
      scrollTo(el);
    } else if (data && rendered < data.sections.length) {
      setRendered(data.sections.length);
    }
  }, [hash, path, rendered, data]);

  // Highlight the section currently in view in the table of contents.
  useEffect(() => {
    if (!domToc.length || !bodyRef.current) return;
    const headings = Array.from(bodyRef.current.querySelectorAll('h2[id]'));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { root: scrollRoot.current, rootMargin: '0px 0px -70% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [domToc, path]);

  /**
   * Jump to the i-th section. Resolved positionally rather than by slug so it
   * works while the document is still streaming in, and cannot drift from
   * whatever ids the renderer generated.
   */
  const jumpTo = (index: number) => {
    /*
     * When the rest of the document still has to commit, the heading will not
     * exist yet. Retry across frames instead of guessing a delay: a long guide
     * with many code blocks takes rehype-highlight well past any fixed timeout,
     * and the old 80ms guess silently did nothing — the click just looked dead.
     */
    const go = (attempt = 0) => {
      const el = bodyRef.current?.querySelectorAll<HTMLElement>('h2[id]')[index];
      if (el) {
        scrollTo(el);
        history.replaceState(null, '', `#${el.id}`);
        setActiveId(el.id);
        return;
      }
      if (attempt < 120) requestAnimationFrame(() => go(attempt + 1));
    };

    if (!fullyRendered && data) setRendered(data.sections.length);
    go();
  };

  const crumbs = useMemo(() => path.split('/'), [path]);

  /**
   * The reader already shows the document title in its header, and almost every
   * guide opens with the same title as an `# ` heading. Drop that first heading
   * so the title is not printed twice — and so the page has one `h1`, not two.
   */
  const sections = useMemo(() => {
    if (!data?.sections.length) return [];
    const [first, ...rest] = data.sections;
    const lines = first.split('\n');
    const idx = lines.findIndex((l) => l.trim() !== '');
    if (idx !== -1 && /^#\s+/.test(lines[idx])) {
      return [lines.slice(idx + 1).join('\n'), ...rest];
    }
    return data.sections;
  }, [data]);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <article className="min-w-0">
        <div className="mb-5 border-b border-ink-800 pb-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <Link to="/library" className="text-ink-500 hover:text-ink-300">
              ← Library
            </Link>
            <span className="text-ink-600" aria-hidden="true">
              /
            </span>
            <span className="font-mono text-[11px] text-ink-500">{crumbs.join(' / ')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-ink-100">{data.title}</h1>
            <Chip>{kb(data.bytes)}</Chip>
          </div>
          {!fullyRendered && (
            <div className="mt-3">
              <Meter value={rendered} max={data.sections.length} label="Sections rendered" />
              <div className="mt-1 text-[11px] text-ink-500">
                Rendering long document — {rendered} of {data.sections.length} sections
              </div>
            </div>
          )}
        </div>

        <div ref={bodyRef}>
          {sections.slice(0, rendered).map((section, i) => (
            <Doc key={`${path}-${i}`} body={section} sourcePath={data.path} />
          ))}
        </div>
      </article>

      {data.toc.length > 1 && (
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <div className="label mb-2" id="toc-heading">
              On this page
            </div>
            <nav aria-labelledby="toc-heading" className="max-h-[75vh] space-y-0.5 overflow-y-auto pr-2">
              {(domToc.length ? domToc : data.toc.map((t) => ({ id: '', text: t.heading }))).map(
                (item, i) => (
                  <button
                    key={`${item.id || 'pending'}-${i}`}
                    onClick={() => jumpTo(i)}
                    aria-current={item.id && activeId === item.id ? 'location' : undefined}
                    className={`block w-full rounded px-2 py-1 text-left text-[12px] leading-snug transition ${
                      item.id && activeId === item.id
                        ? 'bg-accent/15 text-accent-soft'
                        : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200'
                    }`}
                  >
                    {item.text}
                  </button>
                ),
              )}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}

export default function Library() {
  const params = useParams();
  const path = (params['*'] ?? '').trim();

  const { data, isLoading, error } = useQuery({
    queryKey: ['library-tree'],
    queryFn: () => api.get<LibraryGroup[]>('/library'),
  });

  if (path) return <Reader path={path} />;
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return <LibraryIndex groups={data ?? []} />;
}
