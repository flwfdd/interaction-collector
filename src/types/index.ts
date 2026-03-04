export interface Point {
  x: number;
  y: number;
  t: number;
}

export interface FittsTrialData {
  // Condition parameters
  target_width: number;
  target_distance: number;
  target_angle: number;
  target_shape: 'circle' | 'rect';
  
  // Performance metrics
  rt: number;           // Reaction time (ms) - time from stimulus onset to first movement
  mt: number;           // Movement time (ms) - time from first movement to click
  total_time: number;   // Total time (ms)
  
  // Outcome
  success: boolean;     // Whether the target was hit
  error_distance: number; // Distance from click to target center
  
  // Coordinates
  start_x: number;
  start_y: number;
  target_x: number;
  target_y: number;
  click_x: number;
  click_y: number;
  
  // Trajectory
  trajectory: Point[];
}

export interface BlockConfig {
  type: 'practice' | 'experiment';
  trial_count: number; // Total number of trials in this block
  
  // Random generation ranges
  width_range: [number, number];    // [min, max] in pixels
  min_distance?: number;            // Minimum distance in pixels (default: 100)
  shapes: ('circle' | 'rect')[];    // Allowed shapes
}

export interface ExperimentConfig {
  participant_id: string;
  session_id: string;
  
  // General settings
  fullscreen: boolean;
  show_feedback: boolean;
  
  blocks: BlockConfig[];
}
