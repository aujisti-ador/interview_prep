# Resume, Profiles & Outreach

The artifacts that run on **every** application. Everything else in this repo is knowledge you
might be asked about. These four documents are the ones a stranger actually reads.

That asymmetry is the whole argument for this folder existing. You can be the strongest
engineer in the pipeline and never be measured, because the measuring only starts after a
recruiter has spent six seconds on a PDF.

| File | What it is | When you use it |
|---|---|---|
| [00-resume-system.md](00-resume-system.md) | How resumes are actually read — ATS mechanics, the 6-second scan, the bullet formula, the failure modes | Read once, properly, before writing anything |
| [01-master-resume.md](01-master-resume.md) | The fill-in master template, plus a worked example built from your own material | Day 3 of the plan. Fill it once, then tailor per application |
| [02-linkedin-and-profiles.md](02-linkedin-and-profiles.md) | LinkedIn headline and About, GitHub profile README, the "selected work" repos | After the resume is done — they all derive from it |
| [03-outreach-and-referrals.md](03-outreach-and-referrals.md) | Cold notes, referral asks, recruiter replies, follow-ups | Every day you apply |

---

## The order matters

Write them in the order above. The master resume is the source of truth; the LinkedIn About is
a longer, warmer restatement of the same three claims, and the outreach note is a two-sentence
restatement of one of them. If you write LinkedIn first you will end up with three documents
that make subtly different claims about who you are, and the inconsistency reads as
uncertainty.

```
        master resume  ──┬──▶  tailored resume per application
                         ├──▶  LinkedIn headline + About
                         ├──▶  GitHub profile README
                         └──▶  outreach note (2 sentences from the summary)
```

---

## The three claims

Before you write a word, decide the three things you want a stranger to believe after six
seconds. Everything in every artifact either supports one of them or gets cut.

Based on what this repo already knows about your background, the defensible three are:

1. **Telecom-scale production experience** — 41M subscribers is rare, and it is your single
   strongest differentiator against the BD senior pool.
2. **Real event-driven and real-time systems** — Kafka, RabbitMQ, Redis, WebSockets, Agora.
   Not tutorial knowledge; systems that carried load.
3. **Range from API to infrastructure** — you can hold an architecture conversation, not only
   an implementation one.

Verify these against your actual history before using them. The templates mark every number
as a placeholder for exactly this reason — a number you cannot defend in the follow-up
question is worse than no number.

---

## What this folder deliberately does not contain

**A finished PDF.** Resume formatting is a personal, iterative thing and a Markdown file is
the wrong container for it. Use [01-master-resume.md](01-master-resume.md) as the content
source and lay it out in whatever you already use — Google Docs, LaTeX, Typst. The system
document tells you what the layout must not do.

**A cover letter template.** For the roles you are targeting, cover letters are read at maybe
a 10% rate and almost never change an outcome. The two-sentence outreach note in
[03-outreach-and-referrals.md](03-outreach-and-referrals.md) does the same job at a twentieth
of the cost.

---

## Related

- The plan schedules the first resume pass on **Day 3** and a second pass in week 3.
- Market context — who is hiring, what they pay, where the funnel cuts: the **Market analysis**
  doc in the app.
- Interview logistics, negotiation scripts: the **Playbook** doc in the app.
