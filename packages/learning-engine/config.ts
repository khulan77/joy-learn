// Initial product assumptions, not a validated educational assessment.
export const masteryConfig = {
  initial: 50,
  correctWithoutHint: 10,
  correctAfterHint1: 6,
  correctAfterHint2: 3,
  correctAfterHeavyHelp: 1,
  incorrect: -5,
  min: 0,
  max: 100,
};
export const hintConfig = { secondAt: 2, heavyAt: 3 };
export const adaptiveConfig = {
  easyBelow: 40,
  hardAbove: 70,
  failureStreak: 2,
  successStreak: 2,
};
