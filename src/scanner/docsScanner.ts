import fs from 'fs';
import path from 'path';
import { DxSpec, ScanIssue } from '../spec/schema.js';

export async function scanDocs(
  spec: DxSpec,
  projectDir: string
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  const issues: ScanIssue[] = [];
  const readmePath = path.join(projectDir, 'README.md');
  const pkgPath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(readmePath) || !fs.existsSync(pkgPath)) {
    return { issues: [], status: 'skip' };
  }

  // Load package.json scripts
  let scripts: Record<string, string> = {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    scripts = pkg.scripts || {};
  } catch {
    return { issues: [], status: 'skip' };
  }

  const scriptNames = new Set(Object.keys(scripts));

  // Load README.md
  let readme = '';
  try {
    readme = fs.readFileSync(readmePath, 'utf-8');
  } catch {
    return { issues: [], status: 'skip' };
  }

  // Find occurrences of `npm run <script>` or `yarn <script>`
  const npmRunRegex = /(?:npm run\s+|yarn\s+)([a-zA-Z0-9:-_]+)/g;
  let match;
  const referencedScripts = new Set<string>();

  while ((match = npmRunRegex.exec(readme)) !== null) {
    // Ignore common non-script commands that might follow yarn, like "yarn install", "yarn add"
    const cmd = match[1];
    if (cmd && !['install', 'add', 'remove', 'upgrade'].includes(cmd)) {
      referencedScripts.add(cmd);
    }
  }

  // Compare
  const staleScripts: string[] = [];
  for (const script of referencedScripts) {
    if (!scriptNames.has(script)) {
      staleScripts.push(script);
    }
  }

  if (staleScripts.length > 0) {
    issues.push({
      id: 'docs-stale-script',
      category: 'docs',
      severity: 'warning',
      title: `${staleScripts.length} stale script references in README`,
      detail: `README.md references these scripts that do not exist in package.json: ${staleScripts.join(', ')}`,
      fixable: false,
      fixHint: 'Update the documentation to reflect the current npm scripts, or add the missing scripts.',
      timeEstimateMinutes: 5,
      actual: `Missing scripts: ${staleScripts.join(', ')}`,
    });
  }

  const status = issues.length === 0 ? 'pass' : issues.some(i => i.severity === 'blocking') ? 'fail' : 'warn';
  return { issues, status };
}
