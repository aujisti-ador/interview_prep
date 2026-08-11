import { DocSeed } from './types';

const marketAnalysis = `
# Market analysis — Senior / Lead Backend Engineer (Node · NestJS · AWS)

> **Where these numbers come from.** This is a hiring-manager's read of the market for your
> profile, built from the stack and experience in this repo plus general knowledge of how
> Senior/Lead Node loops are run in Bangladesh and in international remote hiring. It is
> **not** scraped from live job boards, and the compensation bands are ranges to negotiate
> against, not quotes. Verify current postings on the sources listed at the bottom before you
> anchor on any figure. Everything about the *funnel* — where candidates get cut and why —
> is the part I would stand behind hardest.

---

## 1. Your position, read cold

If your CV crossed my desk, here is the 20-second impression:

**Strong signals**
- Telecom-scale production experience (41M subscribers) — this is rare and it is your single best asset. Most BD senior candidates top out at hundreds of thousands of users.
- Real event-driven systems: Kafka, RabbitMQ, Redis, an outbox somewhere in there. Not tutorial knowledge.
- Real-time / streaming (Agora, WebSockets) — a genuine niche. When it matches the role it is a near-instant shortlist.
- Breadth from API to infrastructure. You can hold an architecture conversation, not just an implementation one.

**What makes me hesitate**
- **Online assessment risk.** Architect-shaped candidates who have been shipping for six years are usually rusty on timed algorithmic problems. This is the number one reason people with your profile never reach a human.
- **Written English artifacts.** For remote roles I want to see how you write — an ADR, an RFC, a good PR description. Without those I am guessing.
- **AI/LLM integration.** In 2026 this appears in a large share of remote backend postings. If your CV is silent on it, you are competing on a smaller pool than you need to.
- **"Lead" evidence.** Senior is proven by systems. Lead is proven by decisions that shaped a team. Your material is heavy on the first and light on the second.

**The honest summary:** your ceiling is high and your funnel risk is concentrated almost
entirely in the first two rounds. That is good news — early-funnel problems are the most
trainable kind, which is exactly what the 30-day plan attacks.

---

## 2. The funnel you are actually walking into

A typical Senior/Lead Node loop, and where people like you get cut:

| Stage | Format | Typical pass rate | Your risk |
|---|---|---|---|
| Resume screen | 6-second scan for scale, stack keywords, ownership verbs | 10-20% | **Medium** — fixable in one afternoon |
| Recruiter screen | 20-30 min: background, comp expectations, timezone, notice | 60-70% | **Medium** — comp anchoring is the trap |
| **Online assessment** | 60-90 min, 2-3 problems on HackerRank/Codility/CodeSignal | **25-40%** | **HIGH — this is your bottleneck** |
| Technical deep dive | 60 min on your stack: Node internals, DB, concurrency | 50-60% | **Low** — you are strong here |
| System design | 45-60 min, whiteboard or excalidraw | 40-50% | **Medium** — knowledge is there, pacing is not |
| Take-home (EU/remote) | 4-8 hours, graded on tests and README as much as features | 50% | **Medium** — testing discipline |
| Behavioral / bar raiser | 45-60 min, STAR, leadership signals | 60-70% | **Medium** — needs metric-backed stories |

Multiply those through and a strong candidate converts roughly **2-5%** of applications into
offers. That is not a comment on you; it is arithmetic. It means **volume matters as much as
preparation**, which is why the plan has you applying from day 7 rather than day 28.

**The single highest-leverage fact on this page:** the online assessment is a machine. It does
not care that you have run a system for 41M users. Two hours a day of pattern drilling for
four weeks moves you from roughly a coin flip to a near-certainty, and nothing else in the
funnel has that kind of return.

---

## 3. Bangladesh market

**Who hires at this level**

- *Fintech / MFS:* bKash, Nagad, Upay, ShurjoPay, SSLCommerz, iPay — highest bar, highest pay, most compliance. Your MFS-adjacent design prep is directly targeted here.
- *Consumer platforms:* Pathao, Chaldal, Shohoz, Sheba.xyz, Daraz BD, Truck Lagbe, Foodpanda BD — scale problems, event-driven architectures, cost pressure.
- *Service / product engineering:* Brain Station 23, Cefalo, Kaz Software, Enosis, Vivasoft, DataSoft, Therap BD, Selise, Augmedix — many of these are effectively international remote with a Dhaka office, which makes them a useful bridge.
- *Telecom-adjacent:* Banglalink, Grameenphone digital arms, Robi/Axiata Digital — you already speak this language.

**What BD interviewers actually weight**
1. Can you own a system without supervision?
2. Cost consciousness — AWS bills are scrutinised line by line here.
3. Reliability under bad infrastructure — power, network, third-party gateways that go down.
4. Can you work with a mixed-seniority team and raise the juniors?
5. Local compliance where relevant: Bangladesh Bank guidelines, BTRC, the Digital Security Act.

**Compensation (monthly, BDT, gross — treat as ranges to negotiate against, not quotes)**

| Level | Product / fintech | Service company | Notes |
|---|---|---|---|
| Senior Backend | 150k - 300k | 120k - 220k | Top fintech pays above this for proven scale |
| Lead / Staff | 280k - 500k | 220k - 400k | Title inflation is common — check the actual scope |
| Engineering Manager | 350k - 650k | 280k - 500k | Different track; do not accept it by accident |

Your telecom-scale experience is a legitimate premium argument in this market. Use it.

---

## 4. International remote market

**Channels, ranked by realistic yield for a Dhaka-based senior**

1. **Vetted marketplaces** — Proxify, Toptal, Arc.dev, Gun.io, Lemon.io. Highest yield for a strong BD candidate because they solve the trust problem for the employer. Expect a hard technical screen plus an English communication assessment. Once you are in, deal flow is steady.
2. **EU product companies hiring in +/-3h timezone bands** — Dhaka (UTC+6) overlaps European mornings well. This is a structural advantage over Latin American candidates for European roles; lead with it.
3. **Remote-first job boards** — WeWorkRemotely, RemoteOK, Wellfound, Remotive, EU Remote Jobs. Lower yield, higher volume. Worth 20 minutes a day, not more.
4. **Employer-of-record startups** — companies already using Deel/Remote.com/Oyster hire globally without friction. Filtering for "Deel" or "employer of record" in postings is a genuinely useful search trick.
5. **Direct outbound** — a short, specific message to an engineering leader about a problem they have written about publicly. Low volume, unreasonably high response rate. Two per week.

**What changes versus BD interviews**
- **Spoken English under technical pressure is the top gatekeeper**, ahead of every technical dimension. Fluency matters less than structure: signpost where you are going, pause, check in.
- Testing and documentation are graded much harder. Take-homes are often won or lost on the README.
- Async written communication is an explicit evaluated competency.
- Security and compliance questions are real: GDPR, SOC 2, data residency.
- Timezone overlap is negotiated up front — decide your real answer before the call.

**Compensation (USD, annual equivalent — wide ranges, verify per role)**

| Channel | Typical band | Notes |
|---|---|---|
| Vetted marketplace (hourly) | $30 - $70/hr | Proxify and Lemon.io sit lower, Toptal and Gun.io higher |
| EU startup, remote contractor | $45k - $90k | Often quoted monthly in EUR |
| US startup, remote contractor | $60k - $130k | Widest variance; location-adjusted offers are common |
| US/EU full-time via EOR | $70k - $140k | Rarer, but the best total package when it happens |

Even the low end of these is a multiple of BD senior pay. **This is why the negotiation
playbook matters more than one more LeetCode problem.** Do not name a number first, and never
anchor to your BD salary.

---

## 5. Skill demand, weighted

Scored 1-5 for how often each is an explicit requirement or a scored interview dimension.
The full interactive version, with your self-ratings and computed gaps, is on the **Skills** tab.

| Skill | BD | Remote | Comment |
|---|---|---|---|
| Node.js internals | 5 | 5 | The reliable filter question |
| PostgreSQL depth | 5 | 5 | Expect a real query on screen |
| DSA under time | 3 | 5 | **Your bottleneck** |
| SQL on a screening test | 4 | 4 | Highest points-per-minute section, most often skipped |
| Assessment platform fluency | 3 | 5 | Pure format knowledge — learnable in an afternoon |
| System design (HLD) | 4 | 5 | Pacing, not knowledge |
| Event-driven architecture | 4 | 5 | **Your strength — lead with it** |
| TypeScript (advanced) | 4 | 5 | Assumed, rarely taught |
| AWS + cost fluency | 4 | 5 | Cost talk is the differentiator |
| Testing strategy | 3 | 5 | Where BD candidates lose take-homes |
| Observability / SLOs | 3 | 5 | Fastest proof you have *run* a system |
| **LLM / RAG integration** | 3 | 5 | **Biggest upside gap — scarce and well paid** |
| Written English artifacts | 2 | 5 | ADRs and RFCs are cheap proof of lead-level |
| Spoken English | 2 | 5 | The top remote gatekeeper |
| NestJS | 4 | 3 | Strong in BD/EU, less so in US startups |
| Kubernetes | 4 | 4 | Not SRE depth — probes, OOM, rollout safety |

---

## 6. The three things I would fix first

1. **Drill the online assessment until it is boring.** It is a pure gate, it is trainable, and it is where you are most likely to be filtered before anyone reads your experience. ~90 minutes a day, every day, for four weeks. This is why the plan front-loads DSA.

2. **Ship one small, public, well-tested artifact — ideally with an LLM component.** A RAG service with real evals, a clean README, meaningful tests, CI. It simultaneously closes the AI gap, the testing gap and the "show me your written work" gap. It is the highest-leverage single object you can create in this month.

3. **Convert your experience into seven metric-backed stories and rehearse them out loud in English.** You have the raw material; it is currently unstructured. Ninety minutes of work per story, and it upgrades every behavioral round you will ever sit.

---

## 7. Sources worth checking for current data

Since the figures above are estimates rather than scraped listings, verify before you anchor:

- **BD:** BDJobs, LinkedIn Bangladesh, Glassdoor BD, the "Bangladesh Software Engineers" and "Dhaka Tech" community groups, and direct company career pages (bKash, Pathao, Brain Station 23).
- **Remote:** levels.fyi (US benchmarks), Glassdoor, the Proxify and Arc.dev public rate pages, WeWorkRemotely and RemoteOK salary fields, and the annual Stack Overflow developer survey for stack-level trends.
- **Demand signals:** search the same stack keywords weekly on LinkedIn with a date filter and count postings. Ten minutes a week gives you a real trend line rather than a vibe.
`.trim();

const playbook = `
# The playbook

Everything that is not studying: the resume, the profile, the applications, the money conversation,
and the logistics that quietly lose people offers.

---

## Resume {#resume}

**The 6-second scan.** I read the top third of page one. If scale, stack and ownership are not
visible there, you go in the maybe pile, and the maybe pile is where applications go to die.

**Bullet formula:** \`verb + system + scale + outcome\`

- Weak: "Worked on the notification service."
- Better: "Built a notification service using Kafka and Redis."
- **Strong:** "Designed a Kafka-backed notification service delivering 4M+ messages/day to 41M subscribers, holding p99 under 2s through provider outages via per-channel circuit breakers."

**Rules**
- Every bullet has a number or a named trade-off. No exceptions.
- Top three bullets of your most recent role carry your three biggest results.
- Mirror the job description's vocabulary. If they write "event-driven", do not write "message-based".
- One page if under 8 years, two absolute maximum. No photo for international applications. No skill bar charts.
- A short "Selected work" line pointing at two GitHub repos with real READMEs beats a long skills list.
- For remote roles, put timezone and English proficiency somewhere visible. It removes a recruiter objection before it forms.

**Tailoring, cheaply:** rewrite only the summary line and the first bullet per application.
Ten minutes each. Full rewrites are not worth the time at this volume.

---

## LinkedIn {#linkedin}

- **Headline:** \`Senior Backend Engineer | Node.js · NestJS · AWS · Kafka | Systems for 41M users\` — recruiters search on exactly these tokens.
- **About:** four short paragraphs. First line states scale. Last line states what you are looking for, explicitly including remote.
- **Location:** keep Dhaka, but add "Open to remote (UTC+6, strong European overlap)". Framing the timezone as an advantage rather than an obstacle is worth doing.
- Turn on "Open to work" for recruiters only.
- Post twice a week during the sprint: a design trade-off you worked through, a thing you learned. Low effort, meaningful compounding on inbound.

---

## Application strategy

- **Volume:** 40-60 applications over 30 days. The plan schedules them so they do not all land in the final week.
- **Split:** roughly 50/50 BD and remote until you see which channel responds, then follow the response.
- **Timing:** Tuesday to Thursday morning in the employer's timezone.
- **Follow up once**, 7 days later, with one new piece of information (a repo you shipped, a relevant post). Not "just checking in".
- **Track everything** in the Pipeline tab. A funnel you cannot see is a funnel you cannot fix.
- **Referrals beat applications by roughly an order of magnitude.** Before applying cold, spend five minutes checking whether anyone in your network is there.

---

## Compensation & negotiation {#negotiation}

**The one rule: do not name a number first.** For a Dhaka-based candidate in an international
process this single habit is worth more than anything else in this document.

**Scenario 1 — "What are your salary expectations?"**
> "I'd rather understand the scope first — I want to make sure we're solving the same problem. What range has the team budgeted for this role?"

If pushed a second time, give a range anchored to the *market for the role*, not to you:
> "Based on what I'm seeing for senior backend roles at this scope, I'd expect somewhere in the range of X to Y. Does that fit your band?"

**Scenario 2 — the geography lowball.** "We pay adjusted for your location."
> "I understand companies take different approaches there. What I'd say is that the value I deliver doesn't change with my postcode — the systems, the availability, the ownership are the same. I'm evaluating opportunities against the market rate for the work, and I'd want us to land there."

If they hold firm at a genuinely low number, walk. There is more demand than there are strong
senior Node engineers, and accepting a location-discounted rate sets your anchor for years.

**Scenario 3 — "What is your current salary?"**
> "I'd prefer not to anchor on that — my current role has a different scope. I'm focused on what this role is worth."

You are never obliged to disclose it. In several jurisdictions they are not permitted to ask.

**Practical points**
- Negotiate in USD or EUR, always.
- Contractor versus employee changes take-home substantially: no benefits, no paid leave, and you handle your own tax. A contractor rate should be meaningfully above the equivalent salary, not equal to it.
- Get paid through Deel, Wise or Payoneer. Confirm the payment mechanism *before* signing.
- Check IP ownership and the non-compete clause. Some contracts claim everything you write, including personal projects.
- Ask about the notice period on both sides, and about the equipment/home-office allowance — small, easy wins that most people forget to ask for.

**When you get an offer:** always ask for time. "Thank you — I'm genuinely interested. Can I
come back to you by Thursday?" Nobody sane withdraws an offer over 48 hours, and the pause is
where the improvement happens.

---

## Interview logistics {#logistics}

The unglamorous list that has cost real candidates real offers:

- Test camera, microphone and screen sharing **the day before**, not five minutes prior.
- Have a backup connection ready (mobile hotspot, tethered and tested). Know how to switch in under 30 seconds.
- Light your face from the front. A backlit silhouette reads as unprofessional even when it is not your fault.
- Have excalidraw or draw.io open in a tab, logged in, with a blank board ready.
- IDE open, a scratch file ready, screen share pre-tested on the *right* monitor.
- Water on the desk. Phone silenced and face down. Notifications off, including desktop Slack.
- Your one-page cheat sheet within eye-line: latency numbers, your three headline metrics, your seven STAR titles, your five questions for them.
- If your connection drops mid-interview, message the recruiter immediately and rejoin. Everyone has seen it happen; how you handle it is the actual test.

**Your five questions for them.** Have these ready; the quality of your questions is a scored
signal at senior level:
1. What does the first 90 days look like for this role, concretely?
2. What is the biggest technical constraint the team is living with right now?
3. How do decisions get made and recorded here — is there an ADR or RFC culture?
4. What does on-call look like, and how often does it actually fire?
5. What would make you say, a year from now, that this hire went really well?
`.trim();

const howToUse = `
# How to use this platform

You have 30 days. This app exists so you never have to ask "what should I do today?"

## The daily loop

1. Open **Today**. It shows the current day of the plan with its tasks and the hiring-manager note explaining *why* that day exists.
2. Work the tasks top to bottom. They are ordered deliberately: DSA first while you are fresh, narrative work last when you are not.
3. Check each task off as you finish. Add a note when something did not land — future you will want it.
4. End the day on **Progress**. If a pattern is red, tomorrow's DSA block goes there regardless of what the plan says.

## The tabs

- **Today / Plan** — the 30-day trace. Every task links to the relevant guide, and the \`read →\` link opens it right here in the Library.
- **Library** — all 59 guides in the repo, readable in the app. Full-text search across every file (better than Ctrl+F, which only sees one document), a table of contents per guide, and cross-links between guides that actually navigate.
- **Practice** — the coding bank. Run your solution against real test cases in the browser. Use *Timed* mode at least twice a week: it is the only mode that simulates an actual assessment.
- **Quiz** — rapid recall. Cheap, fast, and it exposes the topics you *think* you know.
- **Design** — timed design drills. Write your answer, then score yourself against the rubric honestly. The rubric is the point; scoring yourself generously wastes the exercise.
- **Behavioral** — your STAR story bank. Write once, rehearse many times, track the rehearsal count.
- **Skills** — self-rate against market demand. The gap score is \`(demand − your level) × demand\`, so a weak high-demand skill outranks a weak niche one.
- **Pipeline** — applications and their stages. A funnel you cannot see is a funnel you cannot fix.
- **Market** — the analysis. Re-read it in week 3; it lands differently once you have sat some loops.

## How this relates to the rest of the repo

The markdown guides are the source material; this app is the drilling and tracking layer on top.
All of them are readable in the **Library** tab — you never need to leave the app to read.

- **\`phase-0-online-assessments/\`** is the written companion to the Practice tab — platform mechanics, MCQ banks, the SQL challenge bank, REST/debugging challenges, and full-length timed papers. Several plan tasks link straight into it.
- **\`phase-1\` … \`phase-5\`** are the depth guides. Every \`read\` task in the plan names the exact file.
- **\`hands-on-projects/\`** are the build walkthroughs. Use them for the artifact you ship in week 4.

Nothing here duplicates those files. The app tells you *what to do today*, runs your code, scores you, and remembers.

## Three rules

1. **Timed beats untimed.** Solving a problem in unlimited time teaches you the solution. Solving it in 25 minutes teaches you the job.
2. **Say it out loud.** Every design drill and every STAR story, spoken, recorded. The gap between what you know and what you can say under pressure is the whole game.
3. **Apply from week one.** Preparation without a pipeline is procrastination with extra steps. The early loops are your best rehearsals.
`.trim();

export const docs: DocSeed[] = [
  { id: 'market-analysis', title: 'Market analysis & funnel', body: marketAnalysis },
  { id: 'playbook', title: 'Playbook — resume, applications, negotiation', body: playbook },
  { id: 'how-to-use', title: 'How to use this platform', body: howToUse },
];
