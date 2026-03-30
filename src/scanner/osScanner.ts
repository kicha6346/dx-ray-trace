import { execSync } from 'child_process';
import os from 'os';
import { DxSpec, ScanIssue } from '../spec/schema.js';

function runSafe(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

function isAvailable(cmd: string): boolean {
  return runSafe(cmd) !== null;
}

export async function scanOS(
  spec: DxSpec
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  if (!spec.tooling) return { issues: [], status: 'skip' };

  const issues: ScanIssue[] = [];
  const platform = os.platform(); // 'win32', 'linux', 'darwin'

  // Docker
  if (spec.tooling.docker) {
    const dockerRunning = runSafe('docker info 2>&1');
    if (!dockerRunning || dockerRunning.includes('Cannot connect') || dockerRunning.includes('error')) {
      issues.push({
        id: 'tooling-docker',
        category: 'tooling',
        severity: 'blocking',
        title: 'Docker not running or not installed',
        detail: 'Docker is required by this project but is not available.',
        fixable: false,
        fixHint: 'Install Docker Desktop and ensure the daemon is running',
        timeEstimateMinutes: 15,
        expected: 'Docker daemon running',
        actual: 'Docker unavailable',
      });
    }
  }

  // Docker Compose
  if (spec.tooling.dockerCompose) {
    const hasCompose =
      isAvailable('docker compose version') || isAvailable('docker-compose --version');
    if (!hasCompose) {
      issues.push({
        id: 'tooling-docker-compose',
        category: 'tooling',
        severity: 'high',
        title: 'docker-compose not found',
        detail: 'docker-compose is required but not installed.',
        fixable: false,
        fixHint: 'Install docker-compose or upgrade Docker Desktop (includes compose v2)',
        timeEstimateMinutes: 5,
      });
    }
  }

  // nvm
  if (spec.tooling.nvm) {
    const hasNvm =
      isAvailable('nvm --version') ||
      (platform !== 'win32' && runSafe('[ -s "$HOME/.nvm/nvm.sh" ] && echo yes') === 'yes');
    if (!hasNvm) {
      issues.push({
        id: 'tooling-nvm',
        category: 'tooling',
        severity: 'warning',
        title: 'nvm not found',
        detail: 'nvm (Node Version Manager) is recommended for managing Node versions.',
        fixable: false,
        fixHint: 'Install nvm from https://github.com/nvm-sh/nvm',
        timeEstimateMinutes: 5,
      });
    }
  }

  // git
  if (spec.tooling.git) {
    if (!isAvailable('git --version')) {
      issues.push({
        id: 'tooling-git',
        category: 'tooling',
        severity: 'high',
        title: 'git not found',
        detail: 'git is required but not installed.',
        fixable: false,
        fixHint: 'Install git from https://git-scm.com',
        timeEstimateMinutes: 5,
      });
    }
  }

  // make
  if (spec.tooling.make) {
    if (!isAvailable('make --version')) {
      issues.push({
        id: 'tooling-make',
        category: 'tooling',
        severity: 'warning',
        title: 'make not found',
        detail: 'GNU make is required by this project.',
        fixable: false,
        fixHint: platform === 'win32'
          ? 'Install make via chocolatey: choco install make'
          : 'Install make via your package manager',
        timeEstimateMinutes: 3,
      });
    }
  }

  const status = issues.length === 0 ? 'pass' : issues.some(i => i.severity === 'blocking') ? 'fail' : 'warn';
  return { issues, status };
}
