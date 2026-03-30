import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function printBanner() {
  console.clear();
  console.log('');
  // DX-RAY TRACE ASCII banner - split into two lines for terminal width
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
  console.log(
    chalk.bold.white('  ') +
    chalk.bgCyan.black.bold(' DEVELOPER EXPERIENCE ') +
    chalk.dim('  Reproducibility & Drift Scanner  ') +
    chalk.cyan('v1.0.0')
  );
  console.log('  ' + chalk.cyan('─'.repeat(65)));
  console.log('');
}

function printSectionHeader(title: string) {
  console.log('');
  console.log(chalk.bold.cyan('  ┌─────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('  │') + chalk.bold.white(`  ${title.padEnd(51)} `) + chalk.bold.cyan('│'));
  console.log(chalk.bold.cyan('  └─────────────────────────────────────────────────────┘'));
  console.log('');
}

export async function runMenu() {
  printBanner();

  while (true) {
    const { action } = await inquirer.prompt([{
      type: 'select',
      name: 'action',
      message: chalk.bold.white('What would you like to do?'),
      pageSize: 10,
      choices: [
        new inquirer.Separator(chalk.dim('  ── 🔬 Diagnostics ──────────────────────────────')),
        {
          name: `  ${chalk.cyan('🔍')} ${chalk.bold('Scan Environment')}    ${chalk.dim('Check your env against the spec')}`,
          value: 'scan',
        },
        {
          name: `  ${chalk.green('🔧')} ${chalk.bold('Auto-Fix Issues')}     ${chalk.dim('Resolve detected problems interactively')}`,
          value: 'fix',
        },
        {
          name: `  ${chalk.magenta('🧪')} ${chalk.bold('Simulate Fresh Install')} ${chalk.dim('Preview new-dev onboarding experience')}`,
          value: 'simulate',
        },
        new inquirer.Separator(chalk.dim('  ── 🤝 Collaboration ────────────────────────────')),
        {
          name: `  ${chalk.yellow('📤')} ${chalk.bold('Export Snapshot')}     ${chalk.dim('Capture your local environment state')}`,
          value: 'export',
        },
        {
          name: `  ${chalk.blue('🤝')} ${chalk.bold('Compare Peer Env')}    ${chalk.dim('Diff your machine against a teammate')}`,
          value: 'compare',
        },
        new inquirer.Separator(chalk.dim('  ── ⚙️  Setup ────────────────────────────────────')),
        {
          name: `  ${chalk.gray('📝')} ${chalk.bold('Init DX Spec')}        ${chalk.dim('Generate dx-spec.yaml from current env')}`,
          value: 'init',
        },
        new inquirer.Separator(chalk.dim('  ──────────────────────────────────────────────')),
        {
          name: `  ${chalk.red('✖')}  ${chalk.bold('Exit')}`,
          value: 'exit',
        },
      ]
    }]);

    if (action === 'exit') {
      console.log('');
      console.log(chalk.cyan('  Goodbye! Happy coding. 👋'));
      console.log('');
      process.exit(0);
    }

    console.clear();
    await sleep(150);

    if (action === 'compare') {
      const { snapshot } = await inquirer.prompt([{
        type: 'input',
        name: 'snapshot',
        message: chalk.bold('  Path to peer snapshot file:'),
        default: 'dx-env-snapshot.yaml'
      }]);
      console.log('');
      try {
        execSync(`node ${path.resolve(__dirname, 'index.js')} compare ${snapshot}`, { stdio: 'inherit' });
      } catch { }
    } else {
      try {
        execSync(`node ${path.resolve(__dirname, 'index.js')} ${action}`, { stdio: 'inherit' });
      } catch (err: any) {
        if (err.message) {
          console.log('');
          console.log(chalk.red('  ❌ Execution failed: ') + chalk.gray(err.message.split('\n')[0]));
        }
      }
    }

    console.log('');
    console.log('  ' + chalk.cyan('─'.repeat(65)));
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: chalk.dim('Press Enter to return to the main menu...')
    }]);

    printBanner();
  }
}
