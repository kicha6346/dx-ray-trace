import chalk from 'chalk';
import { ScanResult } from '../spec/schema.js';

const CATEGORY_LABELS: Record<string, string> = {
  runtime:    'Runtime Versions',
  dependency: 'Dependencies',
  env:        'Env Variables',
  path:       'File Paths',
  tooling:    'Tooling (OS)',
  docker:     'Docker',
  ports:      'Open Ports',
  docs:       'Docs Freshness',
  git:        'Version Control (Git)',
  structure:  'Project Structure',
};

const STATUS_ICONS: Record<string, string> = {
  pass: chalk.green('✅ PASS'),
  fail: chalk.red('❌ FAIL'),
  warn: chalk.yellow('⚠️  WARN'),
  skip: chalk.gray('── Not Configured'),
};

export function renderMatrix(result: ScanResult): void {
  // To avoid circular updates, we just need to ensure category output fits.
  // The existing table has 60 characters total width.
  // "Docs Freshness" fits well in 21 padding.
  console.log('\n' + chalk.bold.cyan('  ┌─────────────────────────────────────────────────────────────┐'));
  console.log(       chalk.bold.cyan('  │') + chalk.bold.white('         📊  COMPATIBILITY MATRIX                            ') + chalk.bold.cyan('│'));
  console.log(       chalk.bold.cyan('  ├───────────────────────┬──────────────┬───────────────────────┤'));
  console.log(       chalk.bold.cyan('  │') + chalk.bold(' Category              ') + chalk.bold.cyan('│') + chalk.bold(' Status       ') + chalk.bold.cyan('│') + chalk.bold(' Issues Found          ') + chalk.bold.cyan('│'));
  console.log(       chalk.bold.cyan('  ├───────────────────────┼──────────────┼───────────────────────┤'));

  const categories = Object.keys(CATEGORY_LABELS);
  for (const cat of categories) {
    const status = result.categoryStatus[cat] ?? 'skip';
    const catIssues = result.issues.filter(i => i.category === cat);
    const label = CATEGORY_LABELS[cat].padEnd(21);
    const statusStr = STATUS_ICONS[status];
    const issueStr = catIssues.length > 0
      ? catIssues.map(i => i.title).join('; ').slice(0, 21).padEnd(21)
      : 'None'.padEnd(21);

    console.log(
      chalk.bold.cyan('  │') +
      ` ${label}` +
      chalk.bold.cyan('│') +
      ` ${statusStr}   ` +
      chalk.bold.cyan('│') +
      ` ${issueStr}` +
      chalk.bold.cyan('│')
    );
  }
  console.log(chalk.bold.cyan('  └───────────────────────┴──────────────┴───────────────────────┘'));
}
