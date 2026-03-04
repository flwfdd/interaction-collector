import { FittsTrialData } from '../types';

interface RegressionResult {
  a: number; // Intercept
  b: number; // Slope
  r2: number; // R-squared
  points: { id: number; mt: number }[];
}

export function calculateFittsLaw(data: any[]): RegressionResult {
  // Filter for valid trials (success only, exclude outliers if needed)
  const validTrials = data.filter((d) => d.success && d.block_type === 'experiment');

  if (validTrials.length === 0) {
    return { a: 0, b: 0, r2: 0, points: [] };
  }

  // Calculate ID and extract MT for each trial
  const points = validTrials.map((d) => {
    const id = Math.log2(d.target_distance / d.target_width + 1);
    return { id, mt: d.mt };
  });

  // Linear Regression: MT = a + b * ID
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const p of points) {
    sumX += p.id;
    sumY += p.mt;
    sumXY += p.id * p.mt;
    sumXX += p.id * p.id;
    sumYY += p.mt * p.mt;
  }

  const b = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const a = (sumY - b * sumX) / n;

  // Calculate R-squared
  const ssTotal = sumYY - (sumY * sumY) / n;
  const ssRes = sumYY - a * sumY - b * sumXY;
  const r2 = 1 - ssRes / ssTotal;

  return { a, b, r2, points };
}

export function generateReportHtml(result: RegressionResult): string {
  const ip = result.b > 0 ? (1000 / result.b).toFixed(2) : 'N/A'; // Index of Performance (bits/s)

  return `
    <div style="text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2 style="text-align: center; color: #333;">Fitts' Law Analysis Result</h2>
      
      <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; text-align: center;">
        <p style="font-size: 1.4em; margin: 10px 0; font-family: 'Courier New', monospace; font-weight: bold; color: #2c3e50;">
          MT = ${result.a.toFixed(0)} + ${result.b.toFixed(0)} × ID
        </p>
        <div style="display: flex; justify-content: space-around; margin-top: 15px; color: #555;">
          <span>R² = <strong>${result.r2.toFixed(3)}</strong></span>
          <span>Throughput ≈ <strong>${ip} bits/s</strong></span>
        </div>
      </div>

      <div style="font-size: 0.95em; color: #444;">
        <h3 style="font-size: 1.1em; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 20px;">Interpretation</h3>
        <ul style="padding-left: 20px;">
          <li><strong>Formula (MT = a + b × ID):</strong> Predicts movement time (MT) based on task difficulty (ID).</li>
          <li><strong>Index of Difficulty (ID = log₂(D/W + 1)):</strong> Calculated from distance (D) and target width (W). Higher ID means a harder task (further or smaller target).</li>
          <li><strong>Intercept (a = ${result.a.toFixed(0)} ms):</strong> Represents non-informational processing time (e.g., reaction time, button clicks).</li>
          <li><strong>Slope (b = ${result.b.toFixed(0)} ms/bit):</strong> Indicates processing speed. A <em>lower</em> slope means faster processing of difficult tasks.</li>
          <li><strong>R² (${result.r2.toFixed(3)}):</strong> Goodness of fit. Values closer to 1.0 indicate that Fitts' Law accurately models your performance.</li>
        </ul>
      </div>
      
      <p style="text-align: center; font-size: 0.9em; color: #888; margin-top: 30px;">
        Based on ${result.points.length} successful trials.
      </p>
    </div>
  `;
}
