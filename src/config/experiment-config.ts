import { ExperimentConfig } from '../types';

export const config: ExperimentConfig = {
  participant_id: 'P001',
  session_id: new Date().toISOString(),

  fullscreen: true,
  show_feedback: true,

  blocks: [
    {
      type: 'practice',
      trial_count: 3, // Just 5 random practice trials
      width_range: [40, 80],
      min_distance: 100,
      shapes: ['circle'],
    },
    {
      type: 'experiment',
      trial_count: 12, // 20 random trials for the main experiment
      width_range: [20, 100],
      min_distance: 120,
      shapes: ['circle'],
    },
  ],
};
