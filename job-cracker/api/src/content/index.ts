import { plan } from './plan';
import { coreProblems } from './problems-core';
import { structureProblems } from './problems-structures';
import { graphProblems } from './problems-graphs';
import { dpProblems } from './problems-dp';
import { nodeProblems } from './problems-node';
import { quiz } from './quiz';
import { drills } from './drills';
import { starPrompts } from './behavioral';
import { skills } from './skills';
import { docs } from './docs';
import { ProblemSeed } from './types';

export const problems: ProblemSeed[] = [
  ...coreProblems,
  ...structureProblems,
  ...graphProblems,
  ...dpProblems,
  ...nodeProblems,
];

export const profileSeed = {
  name: 'Fazle Rabbi Ador',
  headline: 'Senior / Lead Backend Engineer — Node.js · NestJS · TypeScript · AWS · Kafka',
  yearsExperience: 6,
  targetRoles: ['Senior Backend Engineer', 'Lead Backend Engineer', 'Backend Architect'],
  targetMarkets: ['Bangladesh', 'International remote (EU/US)'],
  primaryStack: [
    'Node.js',
    'NestJS',
    'TypeScript',
    'PostgreSQL',
    'Redis',
    'Kafka',
    'RabbitMQ',
    'AWS Serverless',
    'Docker',
    'Kubernetes',
    'GraphQL',
  ],
  notes:
    'Seeded from the interview_prep repo (Banglalink BL-Power notifications at 41M subscribers, Right Tracks live streaming with Agora, Daraz voucher system). Edit anything here that is out of date — nothing else in the app depends on it being exactly right.',
};

/**
 * Bump this when content changes in a way that should overwrite what is already
 * in the database. Progress, attempts, stories and notes are never touched.
 */
export const CONTENT_VERSION = '1.4.0';

export { plan, quiz, drills, starPrompts, skills, docs };
export * from './types';
