import { StarPromptSeed } from './types';

/**
 * Behavioral prompts with the grading notes I would carry into the room.
 * `redFlags` is the part most prep material omits, and it is where offers die.
 */
export const starPrompts: StarPromptSeed[] = [
  {
    id: 'star-scale',
    competency: 'Technical scale & impact',
    prompt: 'Tell me about the largest-scale system you have been responsible for. What actually made it hard?',
    whatGoodLooksLike:
      'A specific constraint, not just a big number. "41M subscribers" is context; "campaign bursts of 10M notifications in an hour against an SMS gateway that rate-limits us at 500/s" is the story. Ends with two metrics: before and after.',
    redFlags:
      'Describing the system rather than your contribution. No numbers. Using "we" for every sentence so I cannot tell what you did. Presenting scale as impressive without naming what broke.',
  },
  {
    id: 'star-incident',
    competency: 'Incident response',
    prompt: 'Walk me through a production incident you owned end to end.',
    whatGoodLooksLike:
      'Detection (how did you find out — and was it a customer or a monitor?), mitigation first, root cause second, then the systemic fix. Timestamps. Owning your own contribution to the cause reads as senior.',
    redFlags:
      'A hero narrative where you personally saved everything. Blaming another team or a vendor with no self-reflection. "We added more logging" as the only follow-up action.',
  },
  {
    id: 'star-tradeoff',
    competency: 'Judgment under constraint',
    prompt: 'Tell me about a time you shipped something you knew was not the right long-term design.',
    whatGoodLooksLike:
      'A clear-eyed account of the constraint (deadline, headcount, unknown demand), what you explicitly traded away, how you made the debt visible, and whether you actually came back to it.',
    redFlags:
      'Claiming you never compromise. Or the opposite: shipping debt with no plan and no communication. Not knowing whether the shortcut later cost anything.',
  },
  {
    id: 'star-pushback',
    competency: 'Influence & disagreement',
    prompt: 'Describe a time you disagreed with a technical decision made by someone more senior than you.',
    whatGoodLooksLike:
      'You gathered evidence rather than arguing from taste, disagreed in a way that let the other person change their mind without losing face, and — crucially — committed fully to the outcome even when it went against you.',
    redFlags:
      'Every story ends with you being proved right. Escalation as the first move. Sulking or quiet non-compliance after the decision.',
  },
  {
    id: 'star-mentoring',
    competency: 'Growing others',
    prompt: 'Tell me about someone you helped grow. What did you actually do, and what changed?',
    whatGoodLooksLike:
      'A named (anonymised) person, a specific gap, a specific intervention, and an observable outcome — they started leading reviews, their PR rework rate dropped, they got promoted.',
    redFlags:
      '"I mentored the juniors" with no specifics. Mentoring described as doing their work for them. No evidence anything changed.',
  },
  {
    id: 'star-conflict',
    competency: 'Working with people',
    prompt: 'Tell me about a conflict with a colleague or another team and how it resolved.',
    whatGoodLooksLike:
      'Genuine acknowledgement of the other side\'s position. A concrete mechanism that fixed it (a shared interface contract, a standing sync, a written decision doc), not just "we talked and it was fine".',
    redFlags:
      'A story where the other party is simply wrong or incompetent. Claiming you have never had conflict — that reads as either avoidant or not senior enough to have made hard calls.',
  },
  {
    id: 'star-cost',
    competency: 'Business awareness',
    prompt: 'Tell me about a time you saved money or improved efficiency in a system you owned.',
    whatGoodLooksLike:
      'You noticed the cost yourself rather than being told. Specific line items. A percentage or an absolute figure. And an explicit statement that reliability did not degrade — with the evidence.',
    redFlags:
      'Optimising something that was not a real cost. No measurement before or after. Cutting cost in a way that quietly increased risk.',
  },
  {
    id: 'star-failure',
    competency: 'Self-awareness',
    prompt: 'Tell me about a significant technical decision you got wrong.',
    whatGoodLooksLike:
      'A real, consequential mistake — an architecture choice, not a typo. What signal you missed, what you would look for now, and evidence you changed your behaviour afterwards.',
    redFlags:
      'A humblebrag ("I care too much about code quality"). A trivial mistake dressed up as a big one. Blaming incomplete requirements without owning the fact that clarifying them was your job.',
  },
  {
    id: 'star-ambiguity',
    competency: 'Operating without direction',
    prompt: 'Describe a project where the requirements were unclear and nobody could tell you what to build.',
    whatGoodLooksLike:
      'You went and found the information — talked to users, looked at data, shipped something small to learn. You made your assumptions explicit in writing so they could be corrected cheaply.',
    redFlags:
      'Waiting to be unblocked. Building the biggest possible interpretation. Complaining about product management rather than compensating for it. For remote roles this is a decisive competency.',
  },
  {
    id: 'star-remote',
    competency: 'Remote effectiveness',
    prompt: 'How do you work with a team that is 6+ hours ahead of you?',
    whatGoodLooksLike:
      'Concrete mechanics: written-first updates, decisions recorded in a doc rather than a call, deliberate overlap hours protected for the things that genuinely need synchrony, and a habit of unblocking yourself and reporting rather than waiting.',
    redFlags:
      'Vague enthusiasm about being flexible. Offering to work their hours entirely — that signals burnout risk, not commitment. No examples of written communication artifacts.',
  },
  {
    id: 'star-quality',
    competency: 'Engineering standards',
    prompt: 'How have you raised the quality bar on a team? What resistance did you meet?',
    whatGoodLooksLike:
      'A specific mechanism — a CI gate, a review checklist, a testing convention, a golden path template — and honest acknowledgement of the friction it caused and how you handled it.',
    redFlags:
      'Mandating standards by decree. Only describing what should be true rather than what you actually changed. No mention of anyone disagreeing, which usually means it did not happen.',
  },
  {
    id: 'star-migration',
    competency: 'Leading change',
    prompt: 'Tell me about a migration or a large refactor you led. How did you de-risk it?',
    whatGoodLooksLike:
      'Incremental slices with a reversible step at each stage, a shadow or dual-run period with comparison, explicit rollback criteria decided before starting, and stakeholder communication throughout.',
    redFlags:
      'A big-bang cutover that "went fine". No rollback plan. No measurement of whether the migration achieved its stated goal.',
  },
  {
    id: 'star-onboarding',
    competency: 'Ramp-up speed',
    prompt: 'How do you get productive in an unfamiliar codebase?',
    whatGoodLooksLike:
      'A repeatable method: trace one request end to end, read the tests, ship something tiny in week one, write down what confused you and turn it into onboarding docs. Concrete timeline.',
    redFlags:
      '"I read all the code." No sense of prioritisation. Nothing about asking questions efficiently — which is itself a skill in a remote team.',
  },
  {
    id: 'star-why',
    competency: 'Motivation & fit',
    prompt: 'Why this role, and why now?',
    whatGoodLooksLike:
      'Something specific about the company — their product, their engineering blog, the scale of a problem they have. A coherent arc from what you have done to what you want next. Honest about what you are looking for.',
    redFlags:
      'Generic answers that would fit any company. Only talking about compensation or remote flexibility. Negativity about the current employer — even justified negativity reads badly.',
  },
];
