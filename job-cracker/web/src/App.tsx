import { useEffect, useRef } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, Stats } from './lib/api';
import Dashboard from './pages/Dashboard';
import Plan from './pages/Plan';
import Practice from './pages/Practice';
import ProblemPage from './pages/Problem';
import Quiz from './pages/Quiz';
import Design from './pages/Design';
import DrillPage from './pages/Drill';
import Behavioral from './pages/Behavioral';
import Skills from './pages/Skills';
import Pipeline from './pages/Pipeline';
import Progress from './pages/Progress';
import DocPage from './pages/DocPage';
import Library from './pages/Library';

const NAV = [
  { to: '/', label: 'Today', end: true },
  { to: '/plan', label: 'Plan' },
  { to: '/library', label: 'Library' },
  { to: '/practice', label: 'Practice' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/design', label: 'Design' },
  { to: '/behavioral', label: 'Behavioral' },
  { to: '/skills', label: 'Skills' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/progress', label: 'Progress' },
];

const DOCS = [
  { to: '/doc/market-analysis', label: 'Market analysis' },
  { to: '/doc/playbook', label: 'Playbook' },
  { to: '/doc/how-to-use', label: 'How to use this' },
];

function Sidebar() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/stats') });

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-ink-850 bg-ink-900/50">
      <div className="border-b border-ink-850 px-5 py-5">
        <div className="text-sm font-semibold tracking-tight text-ink-100">Job Cracker</div>
        <div className="mt-0.5 text-xs text-ink-500">Senior / Lead Backend prep</div>
      </div>

      {stats && (
        <div className="border-b border-ink-850 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="label">Readiness</span>
            <span className="text-lg font-semibold text-ink-100">{stats.readiness}%</span>
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-800"
            role="progressbar"
            aria-valuenow={stats.readiness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall readiness"
          >
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${stats.readiness}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-ink-500">
            Session {stats.sessionNumber} of {stats.sessionsTotal} · {stats.sessionsDone} complete
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sections">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `mb-0.5 block rounded-lg px-3 py-2 text-sm transition ${
                isActive ? 'bg-accent/15 font-medium text-accent-soft' : 'text-ink-300 hover:bg-ink-850'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}

        <div className="label mt-6 px-3 pb-1">Reference</div>
        {DOCS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mb-0.5 block rounded-lg px-3 py-2 text-sm transition ${
                isActive ? 'bg-accent/15 font-medium text-accent-soft' : 'text-ink-300 hover:bg-ink-850'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  /**
   * `<main>` is the only scrolling region, and React Router does not reset it.
   * Without this, navigating away from a scrolled Library or problem table
   * drops you into the middle of the next page. Focus moves with the scroll so
   * keyboard and screen-reader users are told the view changed.
   *
   * The Library reader deep-links to an anchor, so leave its scroll alone.
   */
  useEffect(() => {
    if (!pathname.startsWith('/library/')) mainRef.current?.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg
                   focus:border focus:border-accent-dim focus:bg-ink-850 focus:px-4 focus:py-2 focus:text-sm
                   focus:text-ink-100"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 overflow-y-auto focus:outline-none"
      >
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/*" element={<Library />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/practice/:id" element={<ProblemPage />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/design" element={<Design />} />
            <Route path="/design/:id" element={<DrillPage />} />
            <Route path="/behavioral" element={<Behavioral />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/doc/:id" element={<DocPage />} />
            <Route path="*" element={<div className="text-ink-400">Not found.</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
