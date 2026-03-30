import fs from 'fs';
import path from 'path';
import { DxSpec, ScanIssue } from '../spec/schema.js';
import { execSync } from 'child_process';

function runSafe(cmd: string, cwd?: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 10000, cwd }).trim();
  } catch {
    return null;
  }
}

function getInstalledNpmPackages(projectDir: string): Set<string> {
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) return new Set();
  
  const raw = runSafe('npm ls --json --all', projectDir);
  if (!raw) {
    // Fallback if npm ls fails for some reason
    try {
      return new Set(fs.readdirSync(nodeModulesPath).filter(d => !d.startsWith('.')));
    } catch {
      return new Set();
    }
  }

  try {
    const tree = JSON.parse(raw);
    const installed = new Set<string>();
    
    // Recursively extract all package names from the ls tree
    function extractNames(node: any) {
      if (!node) return;
      if (node.name) installed.add(node.name);
      if (node.dependencies) {
        for (const key of Object.keys(node.dependencies)) {
          // Some npm ls versions stick the name in the key, others in the object
          installed.add(key);
          extractNames(node.dependencies[key]);
        }
      }
    }
    
    extractNames(tree);
    return installed;
  } catch {
    return new Set();
  }
}

function getRequiredNpmPackages(projectDir: string): string[] {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) });
  } catch {
    return [];
  }
}

function getInstalledPipPackages(): Set<string> {
  const raw = runSafe('pip list --format=json') ?? runSafe('pip3 list --format=json');
  if (!raw) return new Set();
  try {
    const packages = JSON.parse(raw) as Array<{ name: string }>;
    return new Set(packages.map(p => p.name.toLowerCase()));
  } catch {
    return new Set();
  }
}

function getRequiredPipPackages(projectDir: string): string[] {
  const reqPath = path.join(projectDir, 'requirements.txt');
  if (!fs.existsSync(reqPath)) return [];
  return fs
    .readFileSync(reqPath, 'utf-8')
    .split('\n')
    .map(l => l.trim().split(/[>=<!]/)[0].trim().toLowerCase())
    .filter(Boolean);
}

export async function scanDependencies(
  spec: DxSpec,
  projectDir: string
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  const issues: ScanIssue[] = [];

  // --- NPM ---
  const requiredNpm = spec.dependencies?.npm ?? getRequiredNpmPackages(projectDir);
  const installedNpm = getInstalledNpmPackages(projectDir);
  const hasPackageJson = fs.existsSync(path.join(projectDir, 'package.json'));

  if (hasPackageJson) {
    const missing = requiredNpm.filter(p => !installedNpm.has(p));
    if (missing.length > 0) {
      issues.push({
        id: 'dep-npm-missing',
        category: 'dependency',
        severity: 'high',
        title: `${missing.length} npm package(s) not installed`,
        detail: `Missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` ... +${missing.length - 5} more` : ''}`,
        fixable: true,
        fixHint: 'npm install',
        timeEstimateMinutes: missing.length * 2,
        expected: 'All required packages installed',
        actual: `${missing.length} required package(s) missing`,
      });
    }

    if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
      issues.push({
        id: 'dep-npm-node-modules',
        category: 'dependency',
        severity: 'blocking',
        title: 'node_modules directory missing',
        detail: 'The node_modules folder does not exist. Dependencies were never installed.',
        fixable: true,
        fixHint: 'npm install',
        timeEstimateMinutes: 5,
        expected: 'node_modules present',
        actual: 'node_modules missing',
      });
    }
  }

  // --- PIP ---
  const requiredPip = spec.dependencies?.pip ?? getRequiredPipPackages(projectDir);
  if (requiredPip.length > 0) {
    const installedPip = getInstalledPipPackages();
    const missingPip = requiredPip.filter(p => !installedPip.has(p.toLowerCase()));
    if (missingPip.length > 0) {
      issues.push({
        id: 'dep-pip-missing',
        category: 'dependency',
        severity: 'high',
        title: `${missingPip.length} Python package(s) not installed`,
        detail: `Missing: ${missingPip.slice(0, 5).join(', ')}${missingPip.length > 5 ? ` ... +${missingPip.length - 5} more` : ''}`,
        fixable: true,
        fixHint: 'pip install -r requirements.txt',
        timeEstimateMinutes: missingPip.length * 3,
        expected: 'All required pip packages installed',
        actual: `${missingPip.length} required package(s) missing`,
      });
    }
  }

  if (issues.length === 0 && !hasPackageJson && requiredPip.length === 0) {
    return { issues: [], status: 'skip' };
  }

  const status = issues.length === 0 ? 'pass' : issues.some(i => i.severity === 'blocking') ? 'fail' : 'warn';
  return { issues, status };
}
