import chalk from 'chalk';
import { ScanIssue, ScanResult } from '../spec/schema.js';
import { calculateScore, getScoreBar, getScoreLabel } from './score.js';

const IMPACT_WEIGHTS: Record<string, number> = {
  blocking: 100,
  high: 60,
  warning: 20,
  info: 5,
};

const TIME_COST_LABELS: Record<string, string> = {
  runtime:    'platform setup',
  dependency: 'package installation',
  env:        'environment config',
  path:       'path debugging',
  tooling:    'tooling setup',
  docker:     'container setup',
};

export function renderHealthSummary(result: ScanResult): void {
  const score = calculateScore(result);
  const { label, color } = getScoreLabel(score);
  const bar = getScoreBar(score, 20);

  const scoreColor = color === 'green' ? chalk.green : color === 'yellow' ? chalk.yellow : chalk.red;
  const totalTime = result.issues.reduce((sum, i) => sum + i.timeEstimateMinutes, 0);

  // Sort issues by impact weight for top-3 listing
  const sortedIssues = [...result.issues].sort(
    (a, b) => (IMPACT_WEIGHTS[b.severity] ?? 0) - (IMPACT_WEIGHTS[a.severity] ?? 0)
  );
  const top3 = sortedIssues.slice(0, 3);

  const fixableCount = result.issues.filter(i => i.fixable).length;
  const totalCount = result.issues.length;

  // ╔══ box ══╗
  const boxWidth = 54;
  const scoreStr = `🧠 DX Health: ${score}/100   [${bar}] ${score}%`;
  const labelStr = `  Status: ${label}`;

  console.log('\n');
  console.log(scoreColor('  ╔' + '═'.repeat(boxWidth) + '╗'));
  console.log(scoreColor('  ║') + chalk.bold(`  ${scoreStr}`) + ' '.repeat(Math.max(0, boxWidth - 2 - scoreStr.length)) + scoreColor('║'));
  console.log(scoreColor('  ║') + chalk.dim(`  Status: ${label}`) + ' '.repeat(Math.max(0, boxWidth - 2 - `  Status: ${label}`.length)) + scoreColor('║'));
  console.log(scoreColor('  ╚' + '═'.repeat(boxWidth) + '╝'));

  // Biggest problems
  if (top3.length > 0) {
    console.log('\n' + chalk.bold.white('  💥 Biggest Problems:'));
    top3.forEach((issue, idx) => {
      const severityTag =
        issue.severity === 'blocking' ? chalk.bgRed.white.bold(' BLOCKING ')
        : issue.severity === 'high' ? chalk.bgYellow.black.bold(' HIGH IMPACT ')
        : chalk.bgGray.white(' WARNING ');

      const emoji = issue.severity === 'blocking' || issue.severity === 'high' ? '❌' : '⚠️ ';
      console.log(`     ${chalk.bold(`${idx + 1}.`)} ${emoji}  ${chalk.white(issue.title.padEnd(38))} ${severityTag}`);
    });
  }

  // Storytelling insight based on highest severity
  if (result.issues.some(i => i.severity === 'blocking')) {
    console.log('\n' + chalk.red.bold('  🚨 Project will NOT run on a new machine.'));
  } else if (result.issues.some(i => i.severity === 'high' || i.severity === 'warning')) {
    console.log('\n' + chalk.yellow.bold('  ⚠️  Project might run, but expect friction.'));
  }

  // 🧪 First Run Prediction
  if (totalCount > 0) {
    console.log('\n' + chalk.bold.magenta('  🧪 First Run Prediction:'));
    
    let hasPrediction = false;
    
    if (result.issues.some(i => i.id === 'dep-npm-missing' || i.id === 'dep-npm-node-modules')) {
      console.log(chalk.magenta('  → Dependencies are not fully installed. Run npm install.'));
      hasPrediction = true;
    }
    if (result.issues.some(i => i.category === 'env')) {
      console.log(chalk.magenta('  → App startup will crash due to missing environment variables'));
      hasPrediction = true;
    }
    if (result.issues.some(i => i.category === 'docker' || i.id === 'tooling-docker')) {
      console.log(chalk.magenta('  → Containers will fail to spin up correctly'));
      hasPrediction = true;
    }
    if (result.issues.some(i => i.id === 'runtime-node')) {
      console.log(chalk.magenta('  → Native binding errors or syntax errors may occur due to Node version mismatch'));
      hasPrediction = true;
    }

    if (!hasPrediction) {
      console.log(chalk.magenta('  → Build or runtime bugs are likely during initial setup'));
    }
  }

  // Time estimate
  if (totalTime > 0) {
    const hours = totalTime >= 60 ? `~${Math.round(totalTime / 60)}h` : '';
    const mins = `~${totalTime} min`;
    const timeLabel = hours ? `${hours} (${mins})` : mins;
    console.log('\n' + chalk.bold(`  ⏱  Estimated time wasted per new dev: `) + chalk.bold.red(timeLabel));
  }

  // Call to action
  if (totalCount === 0) {
    console.log('\n' + chalk.green.bold('  ✨ Project is fully reproducible. Onboarding is frictionless!'));
  } else if (fixableCount > 0) {
    console.log(
      '\n' +
      chalk.bold('  👉 Run ') +
      chalk.bold.cyanBright('dx fix') +
      chalk.bold(` to auto-resolve ${fixableCount}/${totalCount} issue${fixableCount > 1 ? 's' : ''} now.`)
    );
  } else {
    console.log('\n' + chalk.yellow.bold(`  ⚠️  All ${totalCount} issue(s) require manual resolution. Check the details above.`));
  }

  console.log();
}
