import { ExperimentConfig } from '../types';
import FittsPointingPlugin from '../plugins/plugin-fitts-pointing';
import HtmlButtonResponsePlugin from '@jspsych/plugin-html-button-response';

// Helper to get random number in range [min, max]
function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Helper to get random item from array
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Calculate max possible distance for a given angle and target width
// to keep both start and target within screen bounds
function getMaxDistance(angleDeg: number, targetWidth: number, padding = 20): number {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const rad = (angleDeg * Math.PI) / 180;
  
  // Center of screen
  const cx = width / 2;
  const cy = height / 2;
  
  // Available space from center to edge in the direction of the target (and start)
  // The task is centered, so we need space for half distance + half target width + padding
  // in both directions (angle and angle + 180)
  
  // Simplified check: fit the whole task within a bounding box of screen size
  // Max dx = (width - 2*padding - targetWidth) / 2
  // Max dy = (height - 2*padding - targetWidth) / 2
  
  // But we want to utilize diagonal space.
  // Distance from center to edge at given angle:
  // x = cx + r * cos(theta) -> r = (x - cx) / cos(theta)
  // If cos(theta) > 0, x = width - padding. If < 0, x = padding.
  
  // Actually, we just need to ensure:
  // |dx/2| + targetWidth/2 + padding <= width/2
  // |dy/2| + targetWidth/2 + padding <= height/2
  
  // |dist * cos(rad) / 2| <= width/2 - targetWidth/2 - padding
  // dist * |cos(rad)| <= width - targetWidth - 2*padding
  
  const maxW = width - targetWidth - 2 * padding;
  const maxH = height - targetWidth - 2 * padding;
  
  const limitX = Math.abs(Math.cos(rad)) < 1e-6 ? Infinity : maxW / Math.abs(Math.cos(rad));
  const limitY = Math.abs(Math.sin(rad)) < 1e-6 ? Infinity : maxH / Math.abs(Math.sin(rad));
  
  return Math.min(limitX, limitY);
}

export function generateBlocks(config: ExperimentConfig) {
  const timeline: any[] = [];

  for (const block of config.blocks) {
    // 1. Block Instructions
    timeline.push({
      type: HtmlButtonResponsePlugin,
      stimulus: `
        <h2>${block.type === 'practice' ? 'Practice Block' : 'Experiment Block'}</h2>
        <div style="text-align: left; max-width: 600px; margin: 0 auto;">
          <p><strong>Instructions:</strong></p>
          <ul>
            <li>Tap the <span style="color: #3498db; font-weight: bold;">BLUE circle</span> to start each trial.</li>
            <li>Then quickly and accurately tap the <span style="color: #e74c3c; font-weight: bold;">RED target</span>.</li>
            <li>There are ${block.trial_count} random trials in this block.</li>
          </ul>
        </div>
      `,
      choices: ['Start Block'],
    });

    // 2. Generate Random Trials
    const trials: any[] = [];
    
    for (let i = 0; i < block.trial_count; i++) {
      const width = Math.round(randomInRange(block.width_range[0], block.width_range[1]));
      const angle = randomInRange(0, 360); 
      const shape = randomChoice(block.shapes);
      
      // Calculate valid distance range for this angle and width
      const maxDist = getMaxDistance(angle, width);
      
      // Use configured min distance or default to 100
      const configuredMin = block.min_distance || 100;
      
      // Ensure min doesn't exceed max (e.g. very large targets on small screens)
      // Also ensure it's not too easy, e.g., maxDist * 0.5 cap might be too restrictive if screen is small
      // Let's just clamp min to max.
      const minDist = Math.min(configuredMin, maxDist); 
      
      const distance = Math.round(randomInRange(minDist, maxDist));

      trials.push({
        type: FittsPointingPlugin,
        target_width: width,
        target_distance: distance,
        target_angle: angle,
        target_shape: shape,
        show_feedback: config.show_feedback,
        data: {
          block_type: block.type,
          condition_width: width,
          condition_distance: distance,
          condition_angle: angle,
          condition_shape: shape,
          width_range_min: block.width_range[0],
          width_range_max: block.width_range[1],
        },
      });
    }

    timeline.push(...trials);
  }

  return timeline;
}
