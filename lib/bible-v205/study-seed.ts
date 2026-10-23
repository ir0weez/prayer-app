// v206 — INERT BY HIS RULING. In v205 this file carried his Notion
// Studies databases as a seed: chapter states plus the Current/Next
// queues, asserted as his progress. His verdict on the shipped build:
// the imported states are not the chapters he counts as studied, and
// "Clear them — only my app progress counts." So the seed ships empty:
// no statuses, no tracked subsets, no queues. Nothing in the app may
// read state from here — study.ts resolves a chapter purely from his
// in-app overrides and the queues he builds himself. The file (and the
// StudySeed shape) remain only so no import path can resurrect the
// import by accident; scripts/build-bible-v205.ts emits this same
// inert body now.
import type { StudySeed } from './types';

export const STUDY_SEED: StudySeed = {
  statuses: {},
  trackedChapters: {},
  writeQueue: [],
  restudyQueue: [],
};
