import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import killPort from 'kill-port';
import { ScanIssue, ScanResult } from '../spec/schema.js';
import { generateSetupScript } from './scriptGenerator.js';

function runCommand(cmd: string, cwd?: string): { success: boolean; output: string } {
  try {
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 120000, cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    return { success: true, output: result };
  } catch (e: any) {
    return { success: false, output: e.message ?? '' };
  }
}


export async function applySingleFix(issue: ScanIssue, projectDir: string): Promise<{ applied: boolean; minutesSaved: number }> {
  let applied = true;
  // Handle npm install / node_modules
if (issue.id === 'dep-npm-missing' || issue.id === 'dep-npm-node-modules') {
  process.stdout.write(chalk.dim('    Running npm install... '));
  const { success, output } = runCommand('npm install', projectDir);
  if (success) {
    console.log(chalk.green('✅ Done'));
  } else {
    console.log(chalk.red('❌ Failed'));
    console.log(chalk.gray('    ' + output.slice(0, 200)));
    applied = false;
  }
}

// pip install
else if (issue.id === 'dep-pip-missing') {
  process.stdout.write(chalk.dim('    Running pip install... '));
  const { success } = runCommand('pip install -r requirements.txt', projectDir);
  console.log(success ? chalk.green('✅ Done') : chalk.red('❌ Failed'));
  if (!success) applied = false;
}

// .env from .env.example
else if (issue.id === 'env-missing-file') {
  const src = path.join(projectDir, '.env.example');
  const dst = path.join(projectDir, '.env');
  try {
    fs.copyFileSync(src, dst);
    console.log(chalk.green('    ✅ Copied .env.example → .env'));
    console.log(chalk.yellow('    ⚠️  Remember to fill in real values!'));
  } catch {
    console.log(chalk.red('    ❌ Failed to copy .env.example'));
    applied = false;
  }
}

// Interactive Env filler
else if (issue.id === 'env-missing-keys' || issue.id === 'env-placeholder-values') {
  const { doEnvFix } = await inquirer.prompt([{
    type: 'confirm',
    name: 'doEnvFix',
    message: 'Do you want to interactively fill in these environment variables now?',
    default: true
  }]);

  if (doEnvFix) {
    const match = issue.detail.match(/:(.+)/);
    const keys = match ? match[1].split(',').map(k => k.trim()) : [];
    
    if (keys.length > 0) {
      const envPath = path.join(projectDir, '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      
      for (const key of keys) {
        const { val } = await inquirer.prompt([{
          type: 'input',
          name: 'val',
          message: `Value for ${chalk.cyanBright(key)}:`
        }]);
        
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${val}`);
        } else {
          envContent += `\n${key}=${val}`;
        }
      }
      
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      console.log(chalk.green(`    ✅ Values injected into .env`));
    }
  } else {
    console.log(chalk.yellow('    ⚠️  Skipping. Remember to fill them out manually.'));
    applied = false;
  }
}

// docker pull
else if (issue.id === 'docker-missing-images') {
  const images = issue.detail.match(/Missing images: (.+)/)?.[1]?.split(', ') ?? [];
  for (const img of images) {
    process.stdout.write(chalk.dim(`    Pulling ${img}... `));
    const { success } = runCommand(`docker pull ${img}`);
    console.log(success ? chalk.green('✅ Done') : chalk.red('❌ Failed'));
    if (!success) applied = false;
  }
}

// Node version via nvm
else if (issue.id === 'runtime-node' && issue.expected) {
  console.log(chalk.dim(`    Attempting: nvm install ${issue.expected} && nvm use ${issue.expected}`));
  const nvmScript = `nvm install ${issue.expected} && nvm use ${issue.expected}`;
  const { success } = runCommand(nvmScript);
  if (success) {
    console.log(chalk.green('    ✅ Node version switched'));
  } else {
    console.log(chalk.yellow('    ⚠️  nvm not available — added to manual setup script'));
    applied = false;
  }
}

// Missing gitignore
else if (issue.id === 'git-missing-gitignore') {
  const gitignorePath = path.join(projectDir, '.gitignore');
  const defaultContent = 'node_modules\n.env\ndist\n.DS_Store\ntmp\ncoverage\n';
  try {
    fs.writeFileSync(gitignorePath, defaultContent, 'utf-8');
    console.log(chalk.green('    ✅ Created .gitignore with secure defaults'));
  } catch (err: any) {
    console.log(chalk.red('    ❌ Failed to create .gitignore'));
    applied = false;
  }
}

// Missing critical git ignores
else if (issue.id === 'git-missing-ignores') {
  const gitignorePath = path.join(projectDir, '.gitignore');
  const match = issue.detail.match(/rules for: (.+)/);
  if (match) {
    const missing = match[1].split(',').map((s: string) => s.trim()).join('\n');
    try {
      let content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';
      if (!content.endsWith('\n') && content.length > 0) content += '\n';
      content += missing + '\n';
      fs.writeFileSync(gitignorePath, content, 'utf-8');
      console.log(chalk.green('    ✅ Appended strictly required ignores to .gitignore'));
    } catch {
      console.log(chalk.red('    ❌ Failed to update .gitignore'));
      applied = false;
    }
  }
}

// Port conflicts
else if (issue.id.startsWith('port-conflict-')) {
  const portStr = issue.id.split('-').pop();
  const port = parseInt(portStr || '0', 10);
  
  if (port) {
    const { doKill } = await inquirer.prompt([{
      type: 'confirm',
      name: 'doKill',
      message: `Port ${port} is in use. Kill the process to free it?`,
      default: false
    }]);
    
    if (doKill) {
      try {
        process.stdout.write(chalk.dim(`    Killing PID on port ${port}... `));
        await killPort(port);
        console.log(chalk.green('✅ Done'));
      } catch (e: any) {
        console.log(chalk.red('❌ Failed'));
        console.log(chalk.gray(`    ${e.message}`));
        applied = false;
      }
    } else {
      console.log(chalk.yellow(`    ⚠️  Port ${port} remains blocked.`));
      applied = false;
    }
  }
}

// Hardcoded URLs and Secrets Interactive Replacer
else if (issue.id === 'path-hardcoded-url' || issue.id === 'path-hardcoded-secret') {
  const findings: Array<{ file: string; matches: string[] }> = issue.metadata?.findings ?? [];
  
  for (const finding of findings) {
    const absPath = path.resolve(projectDir, finding.file);
    if (!fs.existsSync(absPath)) continue;

    for (const match of finding.matches) {
      console.log(chalk.red(`\n    🚨 Found hardcoded value in ${chalk.bold(finding.file)}`));
      console.log(chalk.dim(`       Content: `) + chalk.redBright(match));
      
      const { doReplace } = await inquirer.prompt([{
        type: 'confirm',
        name: 'doReplace',
        message: `Fix this by replacing it with an environment variable reference?`,
        default: true
      }]);

      if (doReplace) {
        const { codeStr } = await inquirer.prompt([{
          type: 'input',
          name: 'codeStr',
          message: `What code should replace it? (e.g. process.env.API_URL):`
        }]);

        // Read, replace, write
        let fileContent = fs.readFileSync(absPath, 'utf-8');
        const escapeRegex = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const replaceRegex = new RegExp(`['"\`]?${escapeRegex}['"\`]?`, 'g');
        fileContent = fileContent.replace(replaceRegex, codeStr);
        fs.writeFileSync(absPath, fileContent, 'utf-8');
        console.log(chalk.green(`    ✅ Replaced in ${finding.file}`));

        const { addToEnv } = await inquirer.prompt([{
          type: 'confirm',
          name: 'addToEnv',
          message: `Would you like to securely store the original value in your .env?`,
          default: true
        }]);

        if (addToEnv) {
          const { envVarName } = await inquirer.prompt([{
            type: 'input',
            name: 'envVarName',
            message: `Environment Variable Name (e.g. API_URL):`
          }]);
          
          const envPath = path.join(projectDir, '.env');
          let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
          envContent += `\n${envVarName}=${match}`;
          fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
          console.log(chalk.green(`    ✅ value injected into .env`));
        }
      } else {
        console.log(chalk.yellow('    ⚠️  Skipping replacement.'));
        applied = false;
      }
    }
  }
}


  return { applied, minutesSaved: issue.timeEstimateMinutes || 5 };
}

export async function runFixer(result: ScanResult, projectDir: string): Promise<void> {
  const fixable = result.issues.filter(i => i.fixable);
  const manual = result.issues.filter(i => !i.fixable);
  let minutesSaved = 0;

  console.log('');
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('        🔧  DX-RAY TRACE AUTO-FIXER                   ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════════════════════════╝'));
  console.log('');

  if (fixable.length === 0) {
    console.log(chalk.yellow('  ⚠️  No automatically fixable issues found.'));
  } else {
    console.log(chalk.bold(`  Found ${fixable.length} auto-fixable issue(s).\n`));

    const { reviewMode } = await inquirer.prompt([{
      type: 'select',
      name: 'reviewMode',
      message: 'How would you like to proceed?',
      choices: [
        { name: 'Review and approve each fix individually (Safe)', value: 'review' },
        { name: 'Auto-fix everything automatically (Fast)', value: 'auto' }
      ]
    }]);

    console.log('');

    for (const issue of fixable) {
      console.log(chalk.bold(`  ▶ Issue: ${issue.title}`));
      console.log(chalk.dim(`    ${issue.detail}`));

      let applyFix = true;
      if (reviewMode === 'review') {
        const promptResult = await inquirer.prompt([{
          type: 'confirm',
          name: 'applyFix',
          message: 'Apply auto-fix for this issue?',
          default: true
        }]);
        applyFix = promptResult.applyFix;
      }

      if (!applyFix) {
        console.log(chalk.yellow('    ⚠️  Skipped.'));
        console.log('');
        continue;
      }
      
      const res = await applySingleFix(issue, projectDir);
      if (res.applied) minutesSaved += res.minutesSaved;
console.log('');
    }
  }

  // Generate setup script for manual items
  if (manual.length > 0) {
    const scriptPath = path.join(projectDir, 'dx-setup.sh');
    generateSetupScript(manual, scriptPath);
    console.log(chalk.bold.green(`  📄 Manual setup script generated: ${chalk.cyanBright('dx-setup.sh')}`));
    console.log(chalk.gray(`     (${manual.length} issue(s) require manual steps)`));
    console.log('');
  }

  console.log(chalk.bold.cyan('  Run ') + chalk.bold.cyanBright('dx scan') + chalk.bold.cyan(' again to check your updated score.'));
  console.log('');

  if (minutesSaved > 0) {
    console.log(chalk.bold.green(`  🎉 DX-Ray Trace just saved your team ~${minutesSaved} minutes of debugging context!`));
    console.log('');
  }
}
