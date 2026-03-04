import { initJsPsych } from 'jspsych';
import 'jspsych/css/jspsych.css';
import HtmlButtonResponsePlugin from '@jspsych/plugin-html-button-response';
import FullscreenPlugin from '@jspsych/plugin-fullscreen';
import { config } from './config/experiment-config';
import { generateBlocks } from './utils/experiment-utils';
import { calculateFittsLaw, generateReportHtml } from './utils/analysis';

async function runExperiment() {
    const jsPsych = initJsPsych({
        on_finish: () => {
            // Auto-save data
            jsPsych.data.get().localSave('csv', `fitts_data_${config.participant_id}_${new Date().getTime()}.csv`);
        },
    });

    const timeline: any[] = [];

    // 1. Welcome Screen
    timeline.push({
        type: HtmlButtonResponsePlugin,
        stimulus: `
      <h1>Fitts' Law Experiment</h1>
      <p>Welcome to the experiment.</p>
      <p>This experiment measures pointing performance on touchscreens.</p>
      <p>Please click 'Start' to begin.</p>
    `,
        choices: ['Start'],
    });

    // 2. Fullscreen Mode
    if (config.fullscreen) {
        timeline.push({
            type: FullscreenPlugin,
            fullscreen_mode: true,
            message: '<p>The experiment will switch to full screen mode when you press the button below.</p>',
            button_label: 'Enter Fullscreen',
        });
    }

    // 3. Generate Experiment Blocks
    const blocks = generateBlocks(config);
    timeline.push(...blocks);

    // 4. Analysis & Result Screen
    timeline.push({
        type: HtmlButtonResponsePlugin,
        stimulus: '',
        on_load: function () {
            // Get all trial data
            const data = jsPsych.data.get().values();
            // Calculate Fitts' Law
            const result = calculateFittsLaw(data);
            // Generate HTML report
            const report = generateReportHtml(result);

            const displayElement = jsPsych.getDisplayElement();
            const stimulusDiv = displayElement.querySelector('#jspsych-html-button-response-stimulus');
            if (stimulusDiv) {
                stimulusDiv.innerHTML = report;
            }
        },
        choices: ['Download Data & Finish'],
    });

    // 5. Exit Fullscreen
    if (config.fullscreen) {
        timeline.push({
            type: FullscreenPlugin,
            fullscreen_mode: false,
        });
    }

    await jsPsych.run(timeline);
}

runExperiment();
