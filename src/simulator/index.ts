import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { DxSpec } from '../spec/schema.js';
import { runScans } from '../scanner/index.js';
import { renderReport } from '../reporter/renderer.js';
import { calculateScore } from '../reporter/score.js';

function runSafe(cmd: string, cwd?: string): { ok: boolean; output: string } {
  try {
    const out = execSync(cmd, { encoding: 'utf-8', timeout: 60000, cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, output: out };
  } catch (e: any) {
    return { ok: false, output: e.stderr ?? e.message ?? '' };
  }
}

const DIFFICULTY_THRESHOLDS = [
  { min: 85, label: '🟢 Easy', desc: 'New dev can onboard in < 5 minutes' },
  { min: 65, label: '🟡 Moderate', desc: 'Expect 15–30 minutes of setup friction' },
  { min: 40, label: '🟠 Hard', desc: 'New dev will hit multiple blockers. ~1h of setup' },
  { min: 0,  label: '🔴 Very Hard', desc: 'This project is currently unreproducible for new devs' },
];

function getDifficulty(score: number) {
  return DIFFICULTY_THRESHOLDS.find(t => score >= t.min)!;
}

export async function runSimulator(spec: DxSpec, projectDir: string): Promise<void> {
  console.log('');
  console.log(chalk.bold.magenta('  ╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('  ║') + chalk.bold.white('      🧪  DX-RAY TRACE: SIMULATE FRESH INSTALL        ') + chalk.bold.magenta('║'));
  console.log(chalk.bold.magenta('  ╚══════════════════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.dim('  Simulating what a new developer would experience...'));
  console.log('  ' + chalk.gray('─'.repeat(65)));
  console.log('');

  // Create a temp directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-simulate-'));
  const steps: Array<{ name: string; ok: boolean; detail: string; time: number }> = [];

  const spinner = ora({ text: 'Setting up temp environment...', color: 'magenta' }).start();

  try {
    // Step 1: Copy package.json (not node_modules)
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      spinner.text = 'Step 1/5: Copying project definition files...';
      const files = ['package.json', 'package-lock.json', 'requirements.txt', '.env.example', 'tsconfig.json'];
      for (const f of files) {
        const src = path.join(projectDir, f);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(tmpDir, f));
        }
      }
      steps.push({ name: 'Copy project files', ok: true, detail: 'package.json, etc. copied', time: 0 });
    }

    // Step 2: npm install
    const hasPkg = fs.existsSync(path.join(tmpDir, 'package.json'));
    if (hasPkg) {
      spinner.text = 'Step 2/5: Running npm install (fresh)...';
      const t = Date.now();
      const { ok, output } = runSafe('npm install --prefer-offline', tmpDir);
      const elapsed = Math.round((Date.now() - t) / 1000);
      steps.push({
        name: 'npm install',
        ok,
        detail: ok ? `Completed in ${elapsed}s` : output.slice(0, 150),
        time: elapsed,
      });
    }

    // Step 3: Check .env
    spinner.text = 'Step 3/5: Checking environment variables...';
    const hasEnvExample = fs.existsSync(path.join(projectDir, '.env.example'));
    const hasEnv = fs.existsSync(path.join(projectDir, '.env'));
    if (hasEnvExample && !hasEnv) {
      steps.push({
        name: 'Environment setup',
        ok: false,
        detail: '.env.example exists but no .env — would block app startup',
        time: 0,
      });
    } else if (!hasEnvExample && !hasEnv) {
      steps.push({ name: 'Environment setup', ok: true, detail: 'No .env required', time: 0 });
    } else {
      steps.push({ name: 'Environment setup', ok: true, detail: '.env present', time: 0 });
    }

    // Step 4: Runtime check
    spinner.text = 'Step 4/5: Verifying runtime versions...';
    const nodeVersion = runSafe('node --version').output.trim();
    const requiredNode = spec.runtime?.node;
    let runtimeOk = true;
    let runtimeDetail = `Node ${nodeVersion}`;
    if (requiredNode) {
      const reqMaj = parseInt(requiredNode.replace(/[^0-9].*/, ''), 10);
      const actMaj = parseInt(nodeVersion.replace(/[^0-9].*/, ''), 10);
      if (reqMaj !== actMaj) {
        runtimeOk = false;
        runtimeDetail = `Need Node v${requiredNode}, got ${nodeVersion}`;
      } else {
        runtimeDetail = `Node ${nodeVersion} ✓ matches required v${requiredNode}`;
      }
    }
    steps.push({ name: 'Runtime version check', ok: runtimeOk, detail: runtimeDetail, time: 0 });

    // Step 5: Run full scan
    spinner.text = 'Step 5/5: Running compatibility scan...';
    const scanResult = await runScans(spec, projectDir);
    const score = calculateScore(scanResult);
    const difficulty = getDifficulty(score);
    steps.push({
      name: 'Compatibility scan',
      ok: score >= 65,
      detail: `DX Health: ${score}/100`,
      time: 0,
    });

    spinner.succeed(chalk.bold('Simulation complete!'));

    // Print results
    console.log('');
    console.log(chalk.bold.white('  📋 Simulation Results:'));
    console.log('  ' + chalk.gray('─'.repeat(55)));

    for (const step of steps) {
      const icon = step.ok ? chalk.green('✅') : chalk.red('❌');
      const name = step.name.padEnd(28);
      const detail = chalk.dim(step.detail);
      const timing = step.time > 0 ? chalk.gray(` (${step.time}s)`) : '';
      console.log(`  ${icon}  ${name}${detail}${timing}`);
    }

    const totalTime = steps.reduce((s, t) => s + t.time, 0);
    const failCount = steps.filter(s => !s.ok).length;

    console.log('');
    console.log('  ' + chalk.gray('─'.repeat(55)));
    console.log('');
    console.log(chalk.bold(`  🎯 Onboarding Difficulty: `) + chalk.bold(difficulty.label));
    console.log(chalk.dim(`     ${difficulty.desc}`));
    console.log('');

    if (failCount > 0) {
      console.log(chalk.red.bold(`  ⛔ ${failCount} failure point(s) detected during simulation.`));
      console.log(chalk.dim('     Run ') + chalk.cyanBright('dx fix') + chalk.dim(' to auto-resolve where possible.'));
    } else {
      console.log(chalk.green.bold('  🎉 Clean setup! A new dev could onboard successfully right now.'));
    }

    console.log('');

  } finally {
    // Clean up temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
