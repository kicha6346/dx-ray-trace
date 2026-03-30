import { execSync } from 'child_process';
import { DxSpec, ScanIssue } from '../spec/schema.js';

function runSafe(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 10000 }).trim();
  } catch {
    return null;
  }
}

export async function scanDocker(
  spec: DxSpec
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  if (!spec.docker?.images || spec.docker.images.length === 0) {
    return { issues: [], status: 'skip' };
  }

  const issues: ScanIssue[] = [];
  const missingImages: string[] = [];

  for (const image of spec.docker.images) {
    const result = runSafe(`docker image inspect ${image} 2>&1`);
    if (!result || result.includes('No such image') || result.includes('Error')) {
      missingImages.push(image);
    }
  }

  if (missingImages.length > 0) {
    issues.push({
      id: 'docker-missing-images',
      category: 'docker',
      severity: 'high',
      title: `${missingImages.length} Docker image(s) not pulled`,
      detail: `Missing images: ${missingImages.join(', ')}`,
      fixable: true,
      fixHint: missingImages.map(img => `docker pull ${img}`).join('\n'),
      timeEstimateMinutes: missingImages.length * 5,
      expected: spec.docker.images.join(', '),
      actual: `Missing: ${missingImages.join(', ')}`,
    });
  }

  const status = issues.length === 0 ? 'pass' : 'warn';
  return { issues, status };
}
