import chalk from 'chalk';
import { ScanIssue, ScanResult } from '../spec/schema.js';

const SEVERITY_ORDER: Record<string, number> = {
  blocking: 0,
  high: 1,
  warning: 2,
  info: 3,
};

const SEVERITY_STYLES: Record<string, (s: string) => string> = {
  blocking: (s) => chalk.bgRed.white.bold(` [BLOCKING] `) + ' ' + chalk.red.bold(s),
  high:     (s) => chalk.bgYellow.black.bold(` [HIGH IMPACT] `) + ' ' + chalk.yellow.bold(s),
  warning:  (s) => chalk.bgGray.white(` [WARNING] `) + ' ' + chalk.gray(s),
  info:     (s) => chalk.bgCyan.black(` [INFO] `) + ' ' + chalk.cyan(s),
};

const SEVERITY_EMOJI: Record<string, string> = {
  blocking: '❌',
  high:     '❌',
  warning:  '⚠️ ',
  info:     'ℹ️ ',
};

export async function renderIssueList(result: ScanResult, projectDir: string): Promise<void> {
  if (result.issues.length === 0) {
    console.log('\n' + chalk.green.bold('  ✨ No issues found! Your environment is perfectly reproducible.'));
    return;
  }

  const sorted = [...result.issues].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
  );

  console.log('\n' + chalk.bold.white('  📋  ISSUE DETAILS'));
  console.log('  ' + chalk.gray('─'.repeat(65)));

  if (!process.stdout.isTTY) {
    sorted.forEach((issue, idx) => {
      const emoji = SEVERITY_EMOJI[issue.severity] ?? '•';
      console.log(`\n  ${chalk.bold(`${idx + 1}.`)} ${emoji}  ${SEVERITY_STYLES[issue.severity]?.(issue.title) ?? issue.title}`);
      console.log(`     ${chalk.gray(issue.detail)}`);
      if (issue.expected && issue.actual) {
        console.log(`     ${chalk.cyan('Expected:')} ${issue.expected}  ${chalk.red('Got:')} ${issue.actual}`);
      }
      if (issue.fixable && issue.fixHint) {
        console.log(`     ${chalk.green('🔧 Fix:')} ${chalk.greenBright(issue.fixHint)}`);
      } else if (issue.fixHint) {
        console.log(`     ${chalk.yellow('💡 Hint:')} ${issue.fixHint}`);
      }
    });

    console.log('\n  ' + chalk.gray('─'.repeat(65)));
    return;
  }

  // Interactive drill down
  const inquirer = (await import('inquirer')).default;
  while (true) {
    if (sorted.length === 0) {
      console.log(chalk.green('\n  ✨ All issues resolved! Returning to main menu.'));
      break;
    }

    const choices: any[] = sorted.map((issue) => {
      const emoji = SEVERITY_EMOJI[issue.severity] ?? '•';
      const label = ` ${emoji}  ${SEVERITY_STYLES[issue.severity]?.(issue.title) ?? issue.title}`;
      return { name: label, value: issue.id };
    });
    choices.push(new inquirer.Separator(' '));
    choices.push({ name: chalk.cyan(' 🔙 Return to Main Menu'), value: 'exit' });

    console.log('');
    const { selected } = await inquirer.prompt([{
      type: 'select',
      name: 'selected',
      message: 'Select an issue to view details or proceed:',
      pageSize: Math.min(15, choices.length + 1),
      choices
    }]);

    if (selected === 'exit') break;

    const issue = sorted.find(i => i.id === selected);
    if (issue) {
      console.log('\n  ' + chalk.gray('─'.repeat(65)));
      console.log(`  ${SEVERITY_STYLES[issue.severity]?.(issue.title) ?? issue.title}`);
      console.log(`  ${chalk.gray(issue.detail)}`);
      if (issue.expected && issue.actual) {
        console.log(`  ${chalk.cyan('Expected:')} ${issue.expected}  ${chalk.red('Got:')} ${issue.actual}`);
      }
      if (issue.fixable && issue.fixHint) {
        console.log(`  ${chalk.green('🔧 Auto-Fixable:')} ${chalk.greenBright(issue.fixHint)}`);
      } else if (issue.fixHint) {
        console.log(`  ${chalk.yellow('💡 Manual Hint:')} ${issue.fixHint}`);
      }
      console.log('  ' + chalk.gray('─'.repeat(65)) + '\n');
      
      if (issue.fixable) {
        const { applySingleFix } = await import('../fixer/index.js');
        console.log('');
        const { applied } = await applySingleFix(issue, projectDir);
        
        if (applied) {
          // Remove from sorted array
          const idx = sorted.findIndex(i => i.id === issue.id);
          if (idx !== -1) sorted.splice(idx, 1);
          
          // And remove from result.issues just to keep sync
          const rIdx = result.issues.findIndex(i => i.id === issue.id);
          if (rIdx !== -1) result.issues.splice(rIdx, 1);
        }
        
        console.log('');
        await inquirer.prompt([{ type: 'input', name: 'c', message: 'Press Enter to return to issue list...' }]);
        continue;
      }

      await inquirer.prompt([{ type: 'input', name: 'c', message: 'Press Enter to return to issue list...' }]);
    }
  }
}
