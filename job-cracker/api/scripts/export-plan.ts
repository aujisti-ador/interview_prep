/**
 * Renders the 30-day plan to markdown at the repo root, so it can be read
 * (and committed, and reviewed on a phone) without the app running.
 *
 * The app remains the source of truth for tracking; this is the offline copy.
 * Run with `npm run export:plan`.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { plan } from '../src/content/plan';
import { problems, quiz, drills, skills, starPrompts } from '../src/content';

const OUT = join(__dirname, '../../../30-DAY-PLAN.md');

const KIND_ICON: Record<string, string> = {
  dsa: 'Coding',
  design: 'Design',
  read: 'Read',
  quiz: 'Quiz',
  behavioral: 'Story',
  mock: 'Mock',
  admin: 'Admin',
  project: 'Build',
};

const lines: string[] = [];

lines.push('# 30-Day Interview Sprint — Senior / Lead Backend Engineer');
lines.push('');
lines.push(
  '> Generated from the Job Cracker platform (`job-cracker/`). Run `cd job-cracker && make up` and open',
);
lines.push('> http://localhost:8080 to work through this with progress tracking, a code runner, and scoring.');
lines.push('');
lines.push(
  `**Contents:** ${plan.length} days · ${plan.reduce((a, d) => a + d.tasks.length, 0)} tasks · ${problems.length} coding problems · ` +
    `${quiz.length} recall questions · ${drills.length} design drills · ${skills.length} tracked skills · ${starPrompts.length} behavioral prompts`,
);
lines.push('');
lines.push('## The bet behind this plan');
lines.push('');
lines.push(
  'You already have deep written material in this repo. What kills candidates at your level is not knowledge — ' +
    'it is (a) the online assessment filter and (b) turning depth into crisp, metric-backed narrative under a 45-minute clock. ' +
    'So this is retrieval and drilling under time, not first-pass learning.',
);
lines.push('');
lines.push('**Daily shape (~3.5h):** coding block → depth block → design block → narrative block. Coding comes first, while you are fresh.');
lines.push('');
lines.push('---');
lines.push('');

// index table
lines.push('## Index');
lines.push('');
lines.push('| Day | Week | Title | Theme |');
lines.push('|---|---|---|---|');
for (const day of plan) {
  lines.push(`| ${day.id} | ${day.week} | [${day.title}](#day-${day.id}) | ${day.theme} |`);
}
lines.push('');
lines.push('---');
lines.push('');

let currentWeek = 0;
for (const day of plan) {
  if (day.week !== currentWeek) {
    currentWeek = day.week;
    lines.push(`## Week ${currentWeek}`);
    lines.push('');
  }

  const mins = day.targetMins ?? day.tasks.reduce((a, t) => a + t.minutes, 0);
  lines.push(`<a id="day-${day.id}"></a>`);
  lines.push(`### Day ${day.id} — ${day.title}`);
  lines.push('');
  lines.push(`*${day.theme}* · ~${Math.floor(mins / 60)}h ${mins % 60}m`);
  lines.push('');
  lines.push(`**Focus.** ${day.focus}`);
  lines.push('');
  lines.push(`> **What a hiring manager is testing here.** ${day.hiringLens}`);
  lines.push('');
  for (const task of day.tasks) {
    lines.push(`- [ ] **${KIND_ICON[task.kind] ?? task.kind} · ${task.minutes}m** — ${task.title}`);
    if (task.detail) lines.push(`      ${task.detail}`);
    if (task.ref && task.ref.endsWith('.md')) lines.push(`      \`${task.ref}\``);
  }
  lines.push('');
}

lines.push('---');
lines.push('');
lines.push('## Coding bank by pattern');
lines.push('');
const byPattern = new Map<string, typeof problems>();
for (const p of problems) {
  if (!byPattern.has(p.pattern)) byPattern.set(p.pattern, []);
  byPattern.get(p.pattern)!.push(p);
}
for (const [pattern, list] of [...byPattern.entries()].sort()) {
  lines.push(`**${pattern}** (${list.length})`);
  lines.push('');
  for (const p of list.sort((a, b) => b.frequency - a.frequency)) {
    lines.push(`- ${p.title} — *${p.difficulty}*, frequency ${p.frequency}/5`);
  }
  lines.push('');
}

lines.push('---');
lines.push('');
lines.push('## Design drills');
lines.push('');
for (const kind of ['hld', 'lld', 'architecture']) {
  const list = drills.filter((d) => d.kind === kind);
  if (!list.length) continue;
  lines.push(`**${kind.toUpperCase()}**`);
  lines.push('');
  for (const d of list) lines.push(`- ${d.title} — ${d.difficulty}, ${d.timeboxMin} min timebox`);
  lines.push('');
}

lines.push('---');
lines.push('');
lines.push('## Skills tracked');
lines.push('');
lines.push('| Skill | Category | BD demand | Remote demand |');
lines.push('|---|---|---|---|');
for (const s of skills) {
  lines.push(`| ${s.name} | ${s.category} | ${s.demandBD}/5 | ${s.demandRemote}/5 |`);
}
lines.push('');

writeFileSync(OUT, lines.join('\n'));
console.log(`wrote ${OUT} (${lines.length} lines)`);
