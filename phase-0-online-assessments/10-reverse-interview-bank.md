# The Reverse Interview — Questions You Ask

> "Do you have any questions for us?" is not the end of the interview. At senior and lead
> level it is a **scored section**, and it is the one most candidates walk into unprepared with
> a vague question about company culture.
>
> It does two jobs at once: it is the cheapest seniority signal available to you, and it is the
> only chance you get to find out whether the job is any good.

## In 60 seconds

1. **"Do you have any questions for us?" is a scored section, not the end of the interview.**
   Your questions reveal more than your answers, because your answers are rehearsed and your
   questions are not.
2. **The level ladder in one line:** a mid-level candidate asks what they will work on. A senior
   asks what the constraints are. A lead asks who decides, and what happens when the decision
   turns out to be wrong.
3. **Ask for a specific instance or number, never a policy.** "We value work-life balance" means
   nothing. **"How many times was someone paged outside hours last month?"** produces a real
   answer — and the hesitation before it is data too.
4. **Bring 8–10 written down; you will ask 3–4.** Several get answered during the interview, and
   a candidate with nothing left looks unprepared. Asking from notes reads as preparation, not
   weakness.
5. **Follow up on the answer.** The question opens the door; the follow-up is where the signal
   is. "We have a weekly rotation" → *"how many pages did the last person get overnight?"*
6. **The highest-return question in this document**, for the hiring manager, at the end:
   *"Is there anything about my background that gives you hesitation?"* Uncomfortable, and the
   only chance you get to answer the objection that would otherwise quietly end the process.

**The second reason to take this seriously has nothing to do with scoring.** You are about to
spend two years somewhere. Fifteen minutes of good questions is the only due diligence you get.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Reverse interview** | The part where you ask them questions |
| **Hiring manager** | The person who will be your boss. Owns the outcome, knows the truth |
| **Principal / Staff engineer** | Senior individual contributor above Senior. Match their altitude |
| **Bar raiser** | An interviewer from outside the team, checking standards are held |
| **Backfill** | The role exists because someone left. Always ask why |
| **On-call rotation** | The schedule for who gets woken up |
| **Page** | An alert waking someone up. The count is the metric that matters |
| **Runbook** | Written instructions for handling a specific alert |
| **Tech debt** | Shortcuts that slow future work. How they discuss it is very revealing |
| **Decision rights** | Who actually gets to decide, and on what |
| **Deploy frequency** | How often code reaches production. A proxy for engineering health |
| **Rollback** | Reverting a bad deploy. Ask how often, and whether it is practised |
| **IC track** | The individual-contributor career ladder, parallel to management |
| **Location-adjusted pay** | Salary varying by where you live. Ask directly and early |
| **Overlap hours** | The hours you share with the rest of the team |
| **Async culture** | Decisions made in writing rather than in meetings. Critical from GMT+6 |

---

## Table of Contents

1. [Why this is scored](#1-why-this-is-scored)
2. [The mechanics](#2-the-mechanics)
3. [Questions by who is in the room](#3-questions-by-who-is-in-the-room)
4. [The diagnostic set — what you are screening them for](#4-the-diagnostic-set--what-you-are-screening-them-for)
5. [Remote-specific questions](#5-remote-specific-questions)
6. [Lead and staff-level questions](#6-lead-and-staff-level-questions)
7. [Reading the answers](#7-reading-the-answers)
8. [Red flags](#8-red-flags)
9. [Questions that cost you](#9-questions-that-cost-you)
10. [Your shortlist](#10-your-shortlist)

---

## 1. Why this is scored

An interviewer learns more from your questions than from your answers, because your answers are
rehearsed and your questions are not.

A question reveals:

| Your question is about | You are read as |
|---|---|
| Whether the code is tested, how deploys go, who is on call | Someone who has operated a system |
| How decisions are made and who makes them | Someone who has been on the wrong end of one |
| What the last big incident was | Someone who has been through incidents |
| Perks, holidays, "the culture" | Someone evaluating a job, not a system |
| Nothing | Uninterested, or unprepared, or both |

**The asymmetry:** a mid-level candidate asks what they will be working on. A senior asks what
the constraints are. A lead asks who decides, and what happens when the decision turns out to
be wrong.

There is a second reason to take this seriously that has nothing to do with scoring. You are
about to spend two years of your life somewhere. Fifteen minutes of good questions is the only
due diligence you get.

---

## 2. The mechanics

**Bring more than you need.** Have 8–10 written down; you will ask 3–4. Several will get
answered during the interview, and a candidate who then has nothing left looks unprepared.

**Ask them from notes, visibly.** Having written questions reads as preparation, not weakness.
On a video call, keep them in a document beside the window.

**Follow up on the answer.** The question is the opening; the follow-up is where the signal is.

> — "How do you handle on-call?"
> — "We have a weekly rotation."
> — **"How many pages did the last person on rotation get overnight?"**

The second question is the one that gets you a real answer. Almost nobody asks it.

**Ask the same question to different people.** "What is the biggest technical challenge right
now?" asked to a hiring manager, an engineer, and a CTO produces three answers. If they
disagree substantially, you have learned something no glassdoor review would tell you.

**Take notes visibly.** It signals that the answers matter to your decision — which is itself
a seniority signal, because it implies you have a decision to make.

---

## 3. Questions by who is in the room

### 3a. Recruiter / HR screen

Keep it logistical and cheap. This is not the round for architecture questions.

- What does the interview process look like end to end, and how long does it usually take?
- Who would I be interviewing with, and what are their roles?
- Is this a new role or a backfill? *(Backfill → ask why the person left. New → ask what
  changed to create it.)*
- What is the salary range budgeted for this role? *(Ask early. See
  [../resume/03-outreach-and-referrals.md](../resume/03-outreach-and-referrals.md#6-the-salary-question-early))*
- Is the role genuinely remote, or remote-with-expectations? What are the overlap requirements?
- What is the team size and where are they located?

### 3b. Hiring manager

The highest-value conversation. This person owns the outcome and knows the truth.

- **What is the first problem you would want me to own?**
- What does success look like at 90 days? At a year?
- What is the hardest technical problem the team is facing right now?
- How is work decided and prioritised — where do the requirements come from?
- How much of the team's time goes to new work versus maintenance and incidents? *(A specific
  number here is a very good sign.)*
- What is the biggest source of technical debt, and is there appetite to address it?
- Why is this role open?
- What would make you regret hiring someone into this role?
- How do you evaluate senior engineers here — what separates a senior from a lead on your team?

### 3c. Engineers on the team

They will be more candid than anyone else in the process. Ask them about the day-to-day.

- What does a normal week look like for you?
- How long from a commit merging to it being in production?
- What is the test and review culture like — do PRs get read properly?
- What was the last incident, and what changed afterwards?
- What is the most frustrating part of working here? *(Ask it directly. The hesitation before
  the answer is as informative as the answer.)*
- If you could change one thing about the codebase, what would it be?
- How did your onboarding go? What did you wish had existed?

### 3d. Principal / staff engineer / architect

Match their altitude. These questions are also where you demonstrate yours.

- How are architectural decisions made and recorded? Do you write ADRs or RFCs?
- What is the service boundary philosophy — how do you decide when something becomes its own
  service?
- Where is the architecture straining as the company grows?
- What is the migration you know you need to do and have not started?
- How do you handle the tension between shipping speed and platform work?

### 3e. CTO / VP / founder

Zoom out. Ask about direction and constraints, not tactics.

- What has to be true in eighteen months for this to have been a good year?
- Where does engineering headcount go next, and why there?
- What is the runway/funding position? *(Entirely fair at any stage. Vagueness is a signal.)*
- What is the biggest risk to the business that engineering can affect?
- How do you think about build versus buy?

---

## 4. The diagnostic set — what you are screening them for

These are the questions that tell you whether to accept an offer. Ask at least three of them
somewhere in the process.

| What you want to know | Ask this | What good sounds like |
|---|---|---|
| **On-call load** | "How many times was someone paged outside hours last month?" | A number, and it is small, and they know it |
| **Deploy confidence** | "How many times a week do you deploy, and how do you roll back?" | Daily or better; rollback is boring and practised |
| **Testing reality** | "What is the state of the test suite — do you trust it?" | An honest, specific answer, including where it is weak |
| **Tech debt honesty** | "What is the worst part of the codebase?" | Immediate, specific, unembarrassed |
| **Decision rights** | "The last time an engineer disagreed with a product decision, what happened?" | A concrete story with a real resolution |
| **Growth** | "Who was the last person promoted to senior/lead, and what got them there?" | A specific person and specific reasons |
| **Attrition** | "How long has the team been together?" | Stable, or a good explanation |
| **Meeting load** | "How many hours of meetings does an engineer have in a typical week?" | Under six, and they know the number |
| **Documentation** | "If I join, what would I read in my first week?" | Something exists and they can name it |

**The pattern:** every one asks for a **specific instance or number**, not a policy. Policies
are aspirational; instances are real. "We value work-life balance" means nothing. "Two pages
last month, both from the same flaky alert, which we fixed" means everything.

---

## 5. Remote-specific questions

For a GMT+6 candidate applying to European or US companies, these are not optional. They
determine whether the job is livable.

- What hours of overlap do you actually need, and is that a hard requirement or a preference?
- How many people on the team are outside the headquarters timezone? *(If the answer is zero,
  you will be the experiment.)*
- How much of the decision-making happens in synchronous meetings versus in writing?
- What is the documentation culture — if I miss a meeting, can I catch up from a written record?
- How do you handle promotion and visibility for remote engineers?
- Is compensation adjusted by location? *(Ask directly. It substantially changes the offer and
  you want it on the table before the negotiation, not during it.)*
- What equipment/home-office support is there?
- Has anyone on the team been remote from Asia before?

**The one that matters most** is the synchronous-versus-written question. A company that makes
decisions in meetings you cannot attend will quietly route around you, and no amount of good
intent fixes it.

---

## 6. Lead and staff-level questions

If you are targeting Lead, these questions do double duty: they screen the role *and* they
demonstrate that you think at that level.

- What is the scope of technical decision-making for this role — what would I own outright,
  and what would I need to build consensus on?
- How do you resolve disagreement between senior engineers on an architectural call?
- Is there an expectation of people management, or is this an individual-contributor track?
- What does the IC ladder look like above this role?
- How much of this role is writing code versus writing documents and reviewing?
- What is the relationship between this team and [product / platform / infra]?
- If I wanted to change how something is done here — say the deployment process — what would
  that actually take?

That last one is the sharpest question in this document. The answer tells you the organisation's
real change cost, which is the single biggest determinant of whether a lead role is satisfying
or exhausting.

---

## 7. Reading the answers

| Signal | Interpretation |
|---|---|
| **Specific numbers, given quickly** | They measure things and are comfortable being measured |
| **"Let me think about that"** then a real answer | Good. Honest thought beats a slick non-answer |
| **Deflection to policy** | The specific instance is probably bad |
| **Different answers from different people** | Either healthy debate or organisational incoherence — ask a follow-up to tell which |
| **Defensiveness about tech debt** | They know it is bad and cannot say so |
| **Enthusiasm about the hardest problem** | The best signal there is. Engineers who like their hard problem are in a good place |
| **Nobody can name the last incident** | Either genuinely stable, or nobody is watching |

**The hesitation is data.** When you ask "what is the most frustrating part of working here?"
the pause before the answer tells you whether it is a small thing or a thing they are choosing
words around.

---

## 8. Red flags

None of these is individually fatal. Two or more is a pattern.

- **"We're like a family."** Almost always precedes weak boundaries and unpaid overtime.
- **Cannot name a single thing wrong with the codebase.** Either not paying attention or not
  being straight with you.
- **Vague on the salary range after being asked twice.** They intend to anchor on your number.
- **The role has been open for six months.** Something is wrong: the comp, the manager, or the
  requirements.
- **Everyone on the team is under two years' tenure.** Ask why directly.
- **On-call with no compensation, no rotation limit, and no post-incident process.**
- **"We move fast, we don't really do documentation."** For a remote GMT+6 role this is
  disqualifying, not charming.
- **Interviewer has not read your CV.** Predicts how much attention you will get as an employee.
- **Pressure to accept an offer within 24–48 hours.** Legitimate companies give you a week.

---

## 9. Questions that cost you

| Do not ask | Why |
|---|---|
| "What does the company do?" | You did not prepare |
| "How much holiday do I get?" | Fine at offer stage, weak in round two — ask the recruiter |
| "Is there a lot of overtime?" | Reads as pre-negotiating effort. Ask "how many pages last month?" instead |
| "What is the culture like?" | Too vague to produce a real answer; you will get a poster slogan |
| "Do you offer visa sponsorship?" *(for a remote role)* | Signals you have misread the role |
| Anything answered on their careers page | Same failure as the first row |
| Nothing at all | The worst option available |

**A note on the holiday question.** It is a completely legitimate thing to care about. The
issue is only *when* — ask the recruiter in the screen or at offer stage, where it is a normal
logistics question, rather than the hiring manager in a technical round, where it is the only
thing they will remember.

---

## 10. Your shortlist

Print these. Ask three or four per round, adjusted to who is in front of you.

**Universal, works in any round**
1. What is the first problem you would want me to own?
2. What is the hardest technical problem the team is facing right now?
3. What is the worst part of the codebase?

**The ones that tell you whether to accept**
4. How many times was someone paged outside hours last month?
5. How many times a week do you deploy, and how do you roll back?
6. The last time an engineer disagreed with a product decision — what happened?

**Remote**
7. How much of the decision-making happens synchronously versus in writing?
8. How many people on the team are outside the HQ timezone?

**Lead**
9. What would I own outright, and what would need consensus?
10. If I wanted to change how deployments work here, what would that actually take?

**The closer**, for the hiring manager, at the end:

> Is there anything about my background that gives you hesitation? I would rather address it
> now than leave you guessing.

This is the highest-return question in the entire document. It is uncomfortable, and it is the
only chance you will get to answer the objection that would otherwise quietly end the process.
Roughly half the time you will get a real concern, and roughly half of those you can dissolve
in ninety seconds.

---

## Related

- [09-take-home-assignments.md](09-take-home-assignments.md) — what to ask on a take-home follow-up call
- [07-video-interview-and-psychometric.md](07-video-interview-and-psychometric.md) — delivery under camera
- [../resume/03-outreach-and-referrals.md](../resume/03-outreach-and-referrals.md) — the salary conversation, early
- **Playbook** doc in the app — interview logistics and negotiation scripts
