/**
 * Proves every bundled reference solution passes its own tests.
 *
 * This is the guard that keeps the problem bank honest — a wrong expected value
 * would otherwise teach the wrong thing and waste the candidate's time debugging
 * a correct solution. Run with `npm run validate`.
 */
import { existsSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { runTests } from '../src/common/harness';
import { problems, plan, quiz, drills, skills, starPrompts, docs } from '../src/content';

/** Repo root, so `phase-3-.../01-x.md` style refs can be checked for existence. */
const REPO_ROOT = join(__dirname, '../../..');

async function main() {
  let failures = 0;

  // --- reference solutions must pass their own tests
  for (const p of problems) {
    const result = await runTests(p.solution, p.functionName, p.tests as any);
    if (!result.passed) {
      failures++;
      console.error(`\n✗ ${p.id} (${p.pattern})`);
      if (result.compileError) console.error(`  compile: ${result.compileError}`);
      for (const r of result.results.filter((x) => !x.ok)) {
        console.error(`  case ${r.index}${r.note ? ` [${r.note}]` : ''}`);
        console.error(`    input:    ${r.input}`);
        console.error(`    expected: ${r.expected}`);
        console.error(`    actual:   ${r.actual}`);
      }
    }
  }

  // --- referential integrity between the plan and everything it points at
  const drillIds = new Set(drills.map((d) => d.id));
  const quizTopics = new Set(quiz.map((q) => q.topic));
  const problemPatterns = new Set(problems.map((p) => p.pattern));

  for (const day of plan) {
    for (const task of day.tasks) {
      const ref = task.ref ?? '';
      if (ref.startsWith('design/')) {
        const id = ref.slice('design/'.length);
        if (!drillIds.has(id)) {
          failures++;
          console.error(`✗ day ${day.id}: unknown drill "${id}"`);
        }
      }
      if (ref.startsWith('quiz?topic=')) {
        const topic = decodeURIComponent(ref.slice('quiz?topic='.length));
        if (!quizTopics.has(topic)) {
          failures++;
          console.error(`✗ day ${day.id}: no quiz questions for topic "${topic}"`);
        }
      }
      if (ref.startsWith('practice?pattern=')) {
        const pattern = decodeURIComponent(ref.slice('practice?pattern='.length));
        if (!problemPatterns.has(pattern)) {
          failures++;
          console.error(`✗ day ${day.id}: no problems for pattern "${pattern}"`);
        }
      }
      // A dead link into the repo silently wastes a study block.
      if (ref.endsWith('.md') && !existsSync(join(REPO_ROOT, ref))) {
        failures++;
        console.error(`✗ day ${day.id}: missing repo file "${ref}"`);
      }
    }
  }

  for (const s of skills) {
    if (s.ref.endsWith('.md') && !existsSync(join(REPO_ROOT, s.ref))) {
      failures++;
      console.error(`✗ skill ${s.id}: missing repo file "${s.ref}"`);
    }
  }
  for (const qn of quiz) {
    if (qn.ref && qn.ref.endsWith('.md') && !existsSync(join(REPO_ROOT, qn.ref))) {
      failures++;
      console.error(`✗ quiz ${qn.id}: missing repo file "${qn.ref}"`);
    }
  }
  for (const d of drills) {
    if (d.ref && d.ref.endsWith('.md') && !existsSync(join(REPO_ROOT, d.ref))) {
      failures++;
      console.error(`✗ drill ${d.id}: missing repo file "${d.ref}"`);
    }
  }

  // --- duplicate ids anywhere would silently overwrite content on seed
  const checkUnique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        failures++;
        console.error(`✗ duplicate ${label} id: ${id}`);
      }
      seen.add(id);
    }
  };
  checkUnique('problem', problems.map((p) => p.id));
  checkUnique('quiz', quiz.map((q) => q.id));
  checkUnique('drill', drills.map((d) => d.id));
  checkUnique('skill', skills.map((s) => s.id));
  checkUnique('starPrompt', starPrompts.map((s) => s.id));
  checkUnique('doc', docs.map((d) => d.id));

  // --- which guides does the plan never send you to?
  const referenced = new Set<string>();
  for (const day of plan) for (const t of day.tasks) if (t.ref?.endsWith('.md')) referenced.add(t.ref);
  for (const s of skills) if (s.ref.endsWith('.md')) referenced.add(s.ref);
  for (const qn of quiz) if (qn.ref?.endsWith('.md')) referenced.add(qn.ref);
  for (const d of drills) if (d.ref?.endsWith('.md')) referenced.add(d.ref);

  const walk = (dir: string, acc: string[] = []): string[] => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ['job-cracker', 'node_modules'].includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, acc);
      else if (entry.name.endsWith('.md')) acc.push(relative(REPO_ROOT, full));
    }
    return acc;
  };

  // Index/plan documents are not study material, so they need no reference.
  const INDEX_DOCS = new Set(['README.md', 'prep.md', '30-DAY-PLAN.md', 'phase-0-online-assessments/README.md']);
  const uncovered = walk(REPO_ROOT)
    .filter((p) => !referenced.has(p) && !INDEX_DOCS.has(p))
    .sort();

  const byPattern = new Map<string, number>();
  for (const p of problems) byPattern.set(p.pattern, (byPattern.get(p.pattern) ?? 0) + 1);

  console.log('\n--- content summary ---');
  console.log(`plan days       ${plan.length}`);
  console.log(`problems        ${problems.length}`);
  for (const [pattern, n] of [...byPattern.entries()].sort()) {
    console.log(`  ${pattern.padEnd(24)} ${n}`);
  }
  console.log(`quiz questions  ${quiz.length} across ${new Set(quiz.map((q) => q.topic)).size} topics`);
  console.log(`design drills   ${drills.length}`);
  console.log(`skills          ${skills.length}`);
  console.log(`STAR prompts    ${starPrompts.length}`);

  const dayMins = plan.map((d) => d.tasks.reduce((a, t) => a + t.minutes, 0)).sort((a, b) => a - b);
  console.log(
    `daily load      ${(dayMins[0] / 60).toFixed(1)}h min · ` +
      `${(dayMins[Math.floor(dayMins.length / 2)] / 60).toFixed(1)}h median · ` +
      `${(dayMins[dayMins.length - 1] / 60).toFixed(1)}h max`,
  );

  // Advisory, not a failure — some guides are deliberately optional alternatives.
  console.log(`\nguides referenced by the plan: ${referenced.size}`);
  if (uncovered.length) {
    console.log(`guides never referenced (${uncovered.length}) — readable in the Library, but unscheduled:`);
    uncovered.forEach((u) => console.log(`  · ${u}`));
  } else {
    console.log('every guide is referenced somewhere.');
  }

  if (failures) {
    console.error(`\n${failures} failure(s).`);
    process.exit(1);
  }
  console.log('\nAll reference solutions pass and all references resolve.');
}

main();
