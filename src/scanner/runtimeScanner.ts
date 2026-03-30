import { execSync } from 'child_process';
import semver from 'semver';
import { DxSpec, ScanIssue } from '../spec/schema.js';

function runSafe(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

function parseVersion(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

function checkRuntime(
  name: string,
  cmd: string,
  required: string | undefined,
  id: string
): ScanIssue | null {
  if (!required) return null;
  const raw = runSafe(cmd);
  const actual = parseVersion(raw);

  if (!actual) {
    return {
      id,
      category: 'runtime',
      severity: 'blocking',
      title: `${name} not found`,
      detail: `${name} is required (${required}) but not installed or not in PATH.`,
      fixable: false,
      fixHint: `Install ${name} ${required}`,
      timeEstimateMinutes: 15,
      expected: required,
      actual: 'not found',
    };
  }

  // Clean required version (strip leading v, allow range or exact)
  const req = required.replace(/^v/, '');
  const actualClean = actual.replace(/^v/, '');

  // major version check
  const reqMajor = semver.coerce(req)?.major;
  const actualMajor = semver.coerce(actualClean)?.major;

  if (reqMajor !== undefined && actualMajor !== undefined && reqMajor !== actualMajor) {
    return {
      id,
      category: 'runtime',
      severity: 'high',
      title: `${name} version mismatch`,
      detail: `Found ${name} v${actualClean}, but project requires v${req}.`,
      fixable: name === 'Node' || name === 'Python',
      fixHint: name === 'Node' ? `nvm install ${req} && nvm use ${req}` : `pyenv install ${req}`,
      timeEstimateMinutes: 8,
      expected: req,
      actual: actualClean,
    };
  }

  return null; // pass
}

export async function scanRuntime(spec: DxSpec): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  if (!spec.runtime) return { issues: [], status: 'skip' };

  const issues: ScanIssue[] = [];

  const checks: Array<{ name: string; cmd: string; key: keyof typeof spec.runtime; id: string }> = [
    { name: 'Node', cmd: 'node --version', key: 'node', id: 'runtime-node' },
    { name: 'Python', cmd: 'python --version 2>&1 || python3 --version 2>&1', key: 'python', id: 'runtime-python' },
    { name: 'Ruby', cmd: 'ruby --version', key: 'ruby', id: 'runtime-ruby' },
    { name: 'Java', cmd: 'java -version 2>&1', key: 'java', id: 'runtime-java' },
    { name: 'Go', cmd: 'go version', key: 'go', id: 'runtime-go' },
  ];

  for (const check of checks) {
    const issue = checkRuntime(check.name, check.cmd, spec.runtime[check.key], check.id);
    if (issue) issues.push(issue);
  }

  const status = issues.length === 0 ? 'pass' : issues.some(i => i.severity === 'blocking') ? 'fail' : 'warn';
  return { issues, status };
}
