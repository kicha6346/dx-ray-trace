#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { loadSpec, specExists } from './spec/loader.js';
import { runScans } from './scanner/index.js';
import { renderReport } from './reporter/renderer.js';
import { runFixer } from './fixer/index.js';
import { runSimulator } from './simulator/index.js';
import { generateSpec, writeSpec } from './init/generator.js';

const program = new Command();

program
  .name('dx')
  .description(chalk.bold.cyan('DX-Ray Trace') + ' — Reproducibility & Drift Scanner')
  .version('1.0.0');

// ─── dx scan ───────────────────────────────────────────────────────────────
program
  .command('scan')
  .description('Scan your environment and generate a Compatibility Matrix + Reproducibility Score')
  .argument('[project-dir]', 'Path to project directory', '.')
  .option('-s, --spec <path>', 'Path to dx-spec.yaml (default: <project-dir>/dx-spec.yaml)')
  .action(async (projectDir: string, opts: { spec?: string }) => {
    const resolvedDir = path.resolve(projectDir);

    const spec = loadSpec(resolvedDir, opts.spec);
    if (!spec) {
      console.log('');
      console.log(chalk.yellow.bold('  ⚠️  No dx-spec.yaml found.'));
      console.log(chalk.dim('  Run ') + chalk.cyanBright('dx init') + chalk.dim(' to generate one from your current environment.'));
      console.log('');
      process.exit(1);
    }

    console.clear();
    const spinner = ora({ text: chalk.dim('Scanning your environment...'), color: 'cyan' }).start();

    try {
      const result = await runScans(spec, resolvedDir);
      spinner.stop();
      await renderReport(result, resolvedDir, spec.name ?? path.basename(resolvedDir));
    } catch (err: any) {
      spinner.fail(chalk.red('Scan failed: ' + err.message));
      process.exit(1);
    }
  });

// ─── dx fix ────────────────────────────────────────────────────────────────
program
  .command('fix')
  .description('Auto-fix detected issues and generate dx-setup.sh for manual steps')
  .argument('[project-dir]', 'Path to project directory', '.')
  .option('-s, --spec <path>', 'Path to dx-spec.yaml')
  .action(async (projectDir: string, opts: { spec?: string }) => {
    const resolvedDir = path.resolve(projectDir);

    const spec = loadSpec(resolvedDir, opts.spec);
    if (!spec) {
      console.log(chalk.yellow('⚠️  No dx-spec.yaml found. Run dx init first.'));
      process.exit(1);
    }

    console.clear();
    const spinner = ora({ text: chalk.dim('Scanning for issues to fix...'), color: 'cyan' }).start();
    const result = await runScans(spec, resolvedDir);
    spinner.stop();

    await runFixer(result, resolvedDir);
  });

// ─── dx simulate ───────────────────────────────────────────────────────────
program
  .command('simulate')
  .description("Simulate a new developer's first run and report failure points + onboarding difficulty")
  .argument('[project-dir]', 'Path to project directory', '.')
  .option('-s, --spec <path>', 'Path to dx-spec.yaml')
  .action(async (projectDir: string, opts: { spec?: string }) => {
    const resolvedDir = path.resolve(projectDir);

    const spec = loadSpec(resolvedDir, opts.spec);
    if (!spec) {
      console.log(chalk.yellow('⚠️  No dx-spec.yaml found. Run dx init first.'));
      process.exit(1);
    }

    await runSimulator(spec, resolvedDir);
  });

// ─── dx init ───────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Generate a dx-spec.yaml from your current environment')
  .argument('[project-dir]', 'Path to project directory', '.')
  .option('-f, --force', 'Overwrite existing dx-spec.yaml', false)
  .action(async (projectDir: string, opts: { force: boolean }) => {
    const resolvedDir = path.resolve(projectDir);
    const outPath = path.join(resolvedDir, 'dx-spec.yaml');

    const { existsSync } = await import('fs');
    if (existsSync(outPath) && !opts.force) {
      console.log('');
      console.log(chalk.yellow('  ⚠️  dx-spec.yaml already exists.'));
      console.log(chalk.dim('  Use --force to overwrite.'));
      console.log('');
      process.exit(1);
    }

    const spinner = ora({ text: chalk.dim('Detecting environment...'), color: 'cyan' }).start();

    try {
      const spec = generateSpec(resolvedDir);
      spinner.stop();
      writeSpec(spec, outPath);

      console.log('');
      console.log(chalk.green.bold('  ✅ dx-spec.yaml generated!'));
      console.log(chalk.dim(`  Location: ${outPath}`));
      console.log('');
      console.log(chalk.bold('  Detected:'));

      if (spec.runtime?.node) console.log(chalk.dim(`    • Node: ${spec.runtime.node}`));
      if (spec.runtime?.python) console.log(chalk.dim(`    • Python: ${spec.runtime.python}`));
      if (spec.dependencies?.npm) console.log(chalk.dim(`    • ${spec.dependencies.npm.length} npm dependencies`));
      if (spec.env) console.log(chalk.dim(`    • ${spec.env.length} environment variables`));

      console.log('');
      console.log(chalk.bold('  👉 Run ') + chalk.cyanBright('dx scan') + chalk.bold(' to scan your environment against this spec.'));
      console.log('');
    } catch (err: any) {
      spinner.fail(chalk.red('Init failed: ' + err.message));
      process.exit(1);
    }
  });

// ─── dx export ───────────────────────────────────────────────────────────────
program
  .command('export')
  .description('Snapshot your active environment for peer comparison')
  .argument('[project-dir]', 'Path to project directory', '.')
  .option('-o, --out <path>', 'Output file name', 'dx-env-snapshot.yaml')
  .action(async (projectDir: string, opts: { out: string }) => {
    const resolvedDir = path.resolve(projectDir);
    const outPath = path.resolve(resolvedDir, opts.out);

    const spinner = ora({ text: chalk.dim('Taking environment snapshot...'), color: 'cyan' }).start();
    try {
      const spec = generateSpec(resolvedDir);
      spinner.stop();
      writeSpec(spec, outPath);

      console.log('');
      console.log(chalk.green.bold('  📸 Environment Snapshot created!'));
      console.log(chalk.dim(`  Send this file to a peer so they can run: `) + chalk.cyanBright(`dx compare ${opts.out}`));
      console.log('');
    } catch (err: any) {
      spinner.fail(chalk.red('Export failed: ' + err.message));
      process.exit(1);
    }
  });

// ─── dx compare ──────────────────────────────────────────────────────────────
program
  .command('compare')
  .description('Compare your environment against a peer snapshot')
  .argument('<snapshot>', 'Path to peer snapshot yaml')
  .argument('[project-dir]', 'Path to project directory', '.')
  .action(async (snapshot: string, projectDir: string) => {
    const resolvedDir = path.resolve(projectDir);
    const snapPath = path.resolve(snapshot);

    const spec = loadSpec(resolvedDir, snapPath);
    if (!spec) {
      console.log(chalk.red(`⚠️  Snapshot file not found: ${snapPath}`));
      process.exit(1);
    }

    console.log('');
    console.log(chalk.bold.magenta('  🤝 PEER-TO-PEER DRIFT COMPARISON'));
    console.log(chalk.dim(`  Checking your machine against: ${path.basename(snapPath)}`));
    console.log('');

    const spinner = ora({ text: chalk.dim('Comparing instances...'), color: 'magenta' }).start();
    try {
      const result = await runScans(spec, resolvedDir);
      spinner.stop();
      await renderReport(result, resolvedDir, 'Peer Snapshot');
    } catch (err: any) {
      spinner.fail(chalk.red('Compare failed: ' + err.message));
      process.exit(1);
    }
  });

if (process.argv.length === 2) {
  import('./menu.js').then(m => m.runMenu());
} else {
  program.parse(process.argv);
}
