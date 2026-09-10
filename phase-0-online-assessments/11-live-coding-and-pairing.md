# Live Coding & Pair Programming Rounds

> Everything else in this repo is scored by a machine or by you. This round is scored by a
> human watching you think.
>
> It is a **different skill** from the automated test, and being strong at one does not make you
> strong at the other. Plenty of people who ace HackerRank freeze on CoderPad.

## In 60 seconds

1. **They are not watching whether you get the answer.** They are watching how you behave when
   you do not know it yet. A candidate who reasons out loud and lands at 90% beats a silent one
   who lands at 100%.
2. **Silence is the failure mode.** Thirty seconds of quiet typing reads as "stuck and hiding
   it". Narrate — even "I'm not sure yet, let me think about the data structure" is far better
   than nothing.
3. **Ask clarifying questions before writing anything.** Input size, edge cases, can I mutate
   the input, is it sorted. This is scored, and it takes 60 seconds.
4. **State the brute force out loud, then improve it.** "The naive approach is O(n²) — let me
   see if a hash map gets it to O(n)." You have now shown range even if you never optimise.
5. **They will interrupt you, and it is not a trap.** A hint means they want you to succeed.
   Take it, say thank you, move on. Ignoring a hint is a real red flag.
6. **You are allowed to look things up** in most live rounds. Say "I'd normally check the docs
   for the exact signature here" — that is honest engineering, not weakness.

**The single highest-return preparation:** solve five problems **out loud, on a timer, into a
recording**. Then watch it. You will hear the silences, and hearing them once fixes them.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Live coding** | Writing code while an interviewer watches, usually 45–60 minutes |
| **Pair programming round** | You and the interviewer work on something together |
| **CoderPad / CodeSignal Interview / HackerRank Interview** | Shared browser editors used for this |
| **Screen share round** | You use your own IDE and share your screen. Increasingly common |
| **Think-aloud protocol** | Continuously narrating your reasoning |
| **Clarifying questions** | Establishing constraints before designing |
| **Brute force** | The obvious, inefficient solution. A valid starting point |
| **Dry run / trace** | Walking through your code line by line with a sample input |
| **Driver / navigator** | In pairing: one types, one directs. You may be asked to do either |
| **Bar raiser** | An interviewer from outside the team, checking consistency of standard |
| **Follow-up** | The extension they add once you finish — "now make it work for streaming input" |

---

## Table of Contents

1. [How this round differs from an automated test](#1-how-this-round-differs-from-an-automated-test)
2. [The minute-by-minute structure](#2-the-minute-by-minute-structure)
3. [Narration — what to actually say](#3-narration--what-to-actually-say)
4. [When you get stuck](#4-when-you-get-stuck)
5. [Pair programming rounds specifically](#5-pair-programming-rounds-specifically)
6. [The debugging round](#6-the-debugging-round)
7. [Setup and logistics](#7-setup-and-logistics)
8. [Practising with a human](#8-practising-with-a-human)
9. [Practising alone, effectively](#9-practising-alone-effectively)
10. [Scoring rubric — what they write down](#10-scoring-rubric--what-they-write-down)

---

## 1. How this round differs from an automated test

| | Automated test | Live coding |
|---|---|---|
| What is scored | Test cases passing | **Your reasoning**, then the code |
| Partial credit | Per test case | For approach, communication, recovery |
| Getting stuck | You lose the points | You get a hint — **if you say you are stuck** |
| Silence | Irrelevant | **The main way people fail** |
| Perfect syntax | Required | Nobody cares. "I'd check the exact API" is fine |
| Optimal solution | Usually needed | Often not — a working brute force plus a stated improvement passes |
| Speed | Everything | Secondary to clarity |

**The mental shift:** in an automated test you are producing an artifact. Here you are
demonstrating a process, and the code is a by-product. Interviewers write notes about your
thinking, not your syntax.

---

## 2. The minute-by-minute structure

A 45-minute round, and roughly how to spend it.

```
  0-3    Understand and clarify         ← do not skip. It is scored
  3-6    State the approach out loud    ← get agreement BEFORE coding
  6-10   Brute force, or the plan
 10-30   Write it, narrating
 30-38   Test it yourself, out loud
 38-45   Complexity, improvements, their follow-up
```

**0–3, clarify.** Repeat the problem back in your own words, then ask:

> "How large can the input get? Can it contain duplicates or negatives? Can I mutate it? Should
> I optimise for time or memory? What should happen with empty input?"

**3–6, state the approach and get agreement.** This is the highest-value 3 minutes in the round.

> "I'm thinking of a sliding window with a hash map tracking the last index of each character.
> That gets us O(n) time and O(k) space. Does that direction sound reasonable before I start
> typing?"

If your approach is wrong, they will redirect you *now*, before you have written 40 lines. If it
is right, you have already earned most of the approach marks.

**10–30, write it, narrating.** Keep talking. Name variables properly — `left`/`right`, not
`i`/`j` — because readable code is being assessed.

**30–38, test it yourself.** Do not wait to be asked. Take a small input and trace it out loud:

> "Let's run through `'abcabcbb'`. Left starts at 0… at index 3 we see 'a' again, which is at
> index 0, so left moves to 1…"

Candidates who test their own code unprompted are consistently rated higher, and it is where you
find your own bugs before they do.

**38–45, complexity and follow-ups.** State it without being asked: *"O(n) time, O(min(n, k))
space."* Then expect an extension: "what if the input is a stream?", "what if it does not fit in
memory?", "make it thread-safe."

---

## 3. Narration — what to actually say

The instruction "think out loud" is useless without examples. Here are the sentences.

**Starting:**
> "Let me make sure I understand — we're finding the longest substring with no repeated
> characters, and returning its length, not the substring itself?"

**Choosing an approach:**
> "The brute force is checking every substring, which is O(n²) or worse. The repeated work is
> re-scanning characters we've already seen, so a sliding window should let us do it in one
> pass."

**While writing:**
> "I'll keep a map from character to its last index. When I hit a repeat, I move the left
> boundary past that index — but only forward, never backward, or an old duplicate would drag
> the window back."

**When you notice a bug:**
> "Wait — if the character was seen before the current window started, I shouldn't move left.
> Let me guard that with a max."

*Catching your own bug out loud is one of the strongest signals in the whole round.* It reads as
someone who reviews their own work.

**When you are unsure:**
> "I think `Map` preserves insertion order here, but I'd verify that rather than rely on it."

**Finishing:**
> "That's O(n) time — each character is visited at most twice — and O(k) space where k is the
> alphabet size. If we needed the substring itself rather than the length, I'd track the start
> index alongside the max."

---

## 4. When you get stuck

Everyone gets stuck. **The round is partly designed to make you stuck**, because that is when
they learn something.

**The recovery script, in order:**

**1. Say it out loud.** Do not go quiet.
> "I'm stuck on how to handle the overlapping case. Let me think about a smaller example."

**2. Shrink the problem.** Solve it for n=1, n=2, and look for the pattern.
> "If there are only two intervals, I'd compare the end of the first to the start of the second.
> With three, sorting by start makes that comparison local. So sorting first is probably the
> move."

**3. Say what you *do* know.**
> "I know this needs to be better than O(n²), and I know sorting is O(n log n), so sorting is
> affordable. That suggests the answer involves a sorted order."

**4. Ask for a hint, explicitly.** This is allowed and is *not* a failure.
> "I've been circling this for a couple of minutes — could you give me a nudge on the data
> structure?"

Asking costs you far less than eight silent minutes. Interviewers are scored on candidate
experience too; most want to help.

**5. Take the hint fully.** Say what it unlocked:
> "Ah — a heap. Then I can always get the smallest end time in log n. That's the piece I was
> missing."

**What never to do:** go silent, guess randomly, or say "I've seen this before" and then
half-remember a solution you cannot explain. **A remembered solution you cannot derive is worse
than no solution**, because the follow-up will expose it immediately.

---

## 5. Pair programming rounds specifically

Increasingly common at senior level, and often about *collaboration* rather than problem
solving. You may be adding a feature to a small existing codebase, together.

**What is being tested:**

| Signal | What good looks like |
|---|---|
| Do you read before writing? | Spend the first minutes understanding the existing code |
| Do you follow existing conventions? | Match their patterns rather than imposing yours |
| Can you take direction? | They suggest something; you engage rather than defend |
| Can you give direction? | If you are navigating, be specific and explain why |
| Do you communicate trade-offs? | "We could do X quickly, or Y properly — which do you want?" |
| Would I want to work with you? | The actual question behind the round |

**Behaviours that score well:**

- **Ask about the codebase first.** "What's the convention here for error handling?"
- **Narrate your edits.** "I'm adding this to the service rather than the controller so it's testable."
- **Offer choices instead of decisions.** "I'd default to throwing here, but I see you return nulls elsewhere — which do you prefer?"
- **Disagree gracefully.** "That works. My hesitation is X — but if you've hit that before, I'll follow your lead."

**The trap:** treating it as a solo exercise with an audience. If you go quiet and type for ten
minutes, you have failed a *pairing* round regardless of the code produced.

---

## 6. The debugging round

You are given broken code and asked to fix it, live. It rewards method over cleverness.

**The method, out loud:**

```
1. Reproduce it            "Let me run it and see the actual failure."
2. Read the error properly "Undefined at line 40 — so `user` is undefined there."
3. Form ONE hypothesis     "I think the async call isn't awaited."
4. Test that hypothesis    "Let me log it before the call to confirm."
5. Fix, then verify        "That's it. Re-running — passes."
6. Ask what else it affects "Is this pattern used elsewhere in the codebase?"
```

**What separates senior here:** step 3 and step 6.

Junior candidates change several things at once and hope. Senior candidates form one hypothesis,
test it, and — crucially — **ask whether the same bug exists elsewhere.** That last question is
the difference between fixing a symptom and fixing a class of defect.

The find-the-bug material is in
[05-rest-api-and-debugging-challenges.md](05-rest-api-and-debugging-challenges.md) — 16 snippets
worth drilling with a timer.

---

## 7. Setup and logistics

Boring, and it costs people rounds.

| Item | Do |
|---|---|
| **Internet** | Wired if possible. Have your phone hotspot ready as a fallback |
| **Second monitor** | Very useful — problem on one, editor on the other. Tell them you have one |
| **Editor** | If it is *your* IDE, disable AI autocomplete unless they say it is allowed |
| **Screen** | Close Slack, email, anything that pops up. Share one window, not the desktop |
| **Audio** | Headphones with a mic. Laptop speakers cause echo the interviewer hears |
| **Camera** | On, at eye level, light in front of you |
| **Water** | Within reach. You will talk for 45 minutes |
| **Paper** | For sketching. Say "let me sketch this" rather than going quiet |
| **Practise the tool** | CoderPad has a free sandbox. Do not learn its keybindings during the interview |

**On AI autocomplete:** if it is on and they have not permitted it, that is a serious problem —
it looks like cheating even if you were not relying on it. Ask at the start: *"I have Copilot
installed — would you prefer I disable it?"* Asking is itself a good signal.

---

## 8. Practising with a human

**Everything else in this repo is self-scored, and self-scoring has a known inflation
problem.** This is the fix, and it is the single most under-used preparation there is.

| Where | Notes |
|---|---|
| **Pramp / Exponent** | Free peer mock interviews. You interview them, they interview you |
| **interviewing.io** | Anonymous mocks with real engineers. Some free, some paid |
| **A colleague** | Free and best if they will be honest. Give them the rubric below |
| **Discord / local BD dev communities** | Find a practice partner and commit to a weekly slot |

**Give your interviewer this rubric.** Untrained interviewers default to "did they get it
right", which is the least useful feedback:

```
Score 1-5 and give one sentence each:

1. Did they clarify requirements before coding?
2. Did they state an approach before writing, and check it with me?
3. Could I follow their reasoning throughout? Any silences over ~20 seconds?
4. Did they test their own code unprompted?
5. When stuck, did they say so and use the hint well?
6. Did they state complexity without being asked?
7. Would I want this person on my team?

Then: the ONE thing that would most improve the next attempt.
```

**Two mocks a week for three weeks beats twenty more solo problems.** The bottleneck at your
level is not pattern knowledge; it is producing it under observation.

---

## 9. Practising alone, effectively

If you cannot get a partner every time:

**Record yourself.** Solve a problem out loud into a screen recording, then watch it. This is
uncomfortable and it is the highest-return solo exercise available. You will hear:
- the silences you did not notice
- how often you say "um" and "basically"
- how fast you talk when nervous
- whether you ever stated your approach before typing

**Rubber-duck strictly.** Explain to an object as if it can be confused. If you catch yourself
skipping a step because "it's obvious", that is exactly the step an interviewer would ask about.

**Practise the transitions, not the problems.** You already know the patterns
([03](03-coding-challenges-dsa-javascript.md), [03b](03b-coding-challenges-advanced-patterns.md)).
What needs rehearsal is: clarifying → stating the approach → narrating → self-testing → stating
complexity. Those five moves are the same every time, and they can be made automatic.

**Time-box artificially.** 45 minutes, no pausing, no lookups beyond what you would do live.

---

## 10. Scoring rubric — what they write down

Reconstructed from what interviewers actually discuss in debriefs.

| Dimension | Weight | Strong | Weak |
|---|---|---|---|
| **Communication** | ~30% | Continuous, clear reasoning | Long silences; unexplained code |
| **Problem solving** | ~25% | Structured, considers alternatives | Jumps to code; one idea only |
| **Code quality** | ~20% | Readable names, sensible structure | Single-letter vars, no structure |
| **Testing** | ~15% | Traces their own code unprompted | Waits to be told it is wrong |
| **Coachability** | ~10% | Takes hints well, engages with feedback | Defensive; ignores redirection |

**Notice what is *not* on the list: getting the optimal solution.** It is folded into problem
solving and it is not the largest weight. **Communication is.**

**The strongest single sentence you can produce in this round** is catching your own mistake:

> "Hold on — that breaks when the array is empty. Let me guard that."

It demonstrates that you review your own work, which is the trait a team most needs and the
hardest to fake.

---

## Related

- [03-coding-challenges-dsa-javascript.md](03-coding-challenges-dsa-javascript.md) · [03b](03b-coding-challenges-advanced-patterns.md) — the patterns to have automatic
- [03c-nodejs-async-and-simulation-tasks.md](03c-nodejs-async-and-simulation-tasks.md) — the practical implementations often used in live rounds
- [05-rest-api-and-debugging-challenges.md](05-rest-api-and-debugging-challenges.md) — the debugging round
- [07-video-interview-and-psychometric.md](07-video-interview-and-psychometric.md) — speaking under pressure, recorded
- [10-reverse-interview-bank.md](10-reverse-interview-bank.md) — what to ask at the end
- [../phase-1-core-programming/06-reading-unfamiliar-code.md](../phase-1-core-programming/06-reading-unfamiliar-code.md) — for rounds set in an existing codebase
