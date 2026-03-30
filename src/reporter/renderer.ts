import chalk from 'chalk';
import { ScanResult } from '../spec/schema.js';
import { renderMatrix } from './matrix.js';
import { renderHealthSummary } from './healthSummary.js';
import { renderIssueList } from './issueList.js';

export function renderBanner(projectName?: string): void {
  const name = chalk.bold.cyanBright(projectName ?? 'your project');
  console.log('');
  console.log(chalk.bold.cyan(' ██████╗ ██╗  ██╗      ██████╗  █████╗ ██╗   ██╗'));
  console.log(chalk.bold.cyan(' ██╔══██╗╚██╗██╔╝      ██╔══██╗██╔══██╗╚██╗ ██╔╝'));
  console.log(chalk.bold.cyan(' ██║  ██║ ╚███╔╝ █████╗██████╔╝███████║ ╚████╔╝ '));
  console.log(chalk.bold.cyan(' ██║  ██║ ██╔██╗ ╚════╝██╔══██╗██╔══██║  ╚██╔╝  '));
  console.log(chalk.bold.cyan(' ██████╔╝██╔╝ ██╗      ██║  ██║██║  ██║   ██║   '));
  console.log(chalk.bold.cyan(' ╚═════╝ ╚═╝  ╚═╝      ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  '));
  console.log('');
  console.log(chalk.bold.cyan(' ████████╗██████╗  █████╗  ██████╗███████╗'));
  console.log(chalk.bold.cyan(' ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝'));
  console.log(chalk.bold.cyan('    ██║   ██████╔╝███████║██║     █████╗  '));
  console.log(chalk.bold.cyan('    ██║   ██╔══██╗██╔══██║██║     ██╔══╝  '));
  console.log(chalk.bold.cyan('    ██║   ██║  ██║██║  ██║╚██████╗███████╗'));
  console.log(chalk.bold.cyan('    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝'));
  console.log('');
  console.log(chalk.bold.cyan('  DX-Ray Trace ') + chalk.gray('│ ') + chalk.dim('Reproducibility Scanner') + chalk.gray(' │ ') + chalk.dim(`Scanning: ${name}`));
  console.log('  ' + chalk.cyan('─'.repeat(65)));
  console.log('');
}

export async function renderReport(result: ScanResult, projectDir: string, projectName?: string): Promise<void> {
  renderBanner(projectName);
  renderMatrix(result);
  renderHealthSummary(result);
  await renderIssueList(result, projectDir);
}
