import fs from 'fs';
import path from 'path';
import { DxSpec, ScanIssue } from '../spec/schema.js';

export async function scanGit(
  spec: DxSpec,
  projectDir: string
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  const issues: ScanIssue[] = [];
  const gitignorePath = path.join(projectDir, '.gitignore');

  // If there's no .git folder, maybe it's not a git repo, but we should still encourage a .gitignore.
  // We'll treat it as a blocking issue if there's no .gitignore at all.
  if (!fs.existsSync(gitignorePath)) {
    issues.push({
      id: 'git-missing-gitignore',
      category: 'git',
      severity: 'blocking',
      title: 'Missing .gitignore file',
      detail: 'A .gitignore file is required to prevent committing sensitive or unnecessary files.',
      fixable: true,
      fixHint: 'Create a .gitignore file configured for your project type (e.g. npx create-gitignore node).',
      timeEstimateMinutes: 5,
      expected: '.gitignore file present',
      actual: '.gitignore missing',
    });
    return { issues, status: 'fail' };
  }

  // If it exists, let's parse it to ensure common risky things are ignored (for Node/Python projects)
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  const requiredIgnores = ['.env'];
  
  // Conditionally require node_modules if package.json exists
  if (fs.existsSync(path.join(projectDir, 'package.json'))) {
    requiredIgnores.push('node_modules');
  }

  const missingIgnores = requiredIgnores.filter(req => !lines.some(l => l.includes(req)));
  
  if (missingIgnores.length > 0) {
    issues.push({
      id: 'git-missing-ignores',
      category: 'git',
      severity: 'high',
      title: `Missing critical .gitignore rules`,
      detail: `Your .gitignore file is dangerously missing rules for: ${missingIgnores.join(', ')}`,
      fixable: true,
      fixHint: `Add the following lines to your .gitignore:\n${missingIgnores.join('\n')}`,
      timeEstimateMinutes: 2,
    });
  }

  const status = issues.length === 0 ? 'pass' : issues.some(i => i.severity === 'blocking' || i.severity === 'high') ? 'fail' : 'warn';
  return { issues, status };
}
