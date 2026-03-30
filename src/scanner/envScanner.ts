import fs from 'fs';
import path from 'path';
import { DxSpec, EnvVarSpec, ScanIssue } from '../spec/schema.js';

import stripBom from 'strip-bom';

function loadEnvKeys(filePath: string): Set<string> {
  if (!fs.existsSync(filePath)) return new Set();
  const raw = fs.readFileSync(filePath, 'utf-8');
  // Strip BOM, replace corrupted invisible characters, and split
  const content = stripBom(raw).replace(/[\uFFFD\uFEFF]/g, '');
  
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      // Clean up key name
      const key = trimmed.slice(0, eqIdx).trim().replace(/[^a-zA-Z0-9_]/g, '');
      if (key) keys.add(key);
    }
  }
  return keys;
}

export async function scanEnv(
  spec: DxSpec,
  projectDir: string
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  const issues: ScanIssue[] = [];

  const envPath = path.join(projectDir, '.env');
  const envExamplePath = path.join(projectDir, '.env.example');

  const hasEnv = fs.existsSync(envPath);
  const hasEnvExample = fs.existsSync(envExamplePath);

  // If .env.example exists but .env does not
  if (hasEnvExample && !hasEnv) {
    issues.push({
      id: 'env-missing-file',
      category: 'env',
      severity: 'blocking',
      title: '.env file missing',
      detail: '.env.example exists but .env has not been created. App will crash on startup.',
      fixable: true,
      fixHint: 'cp .env.example .env',
      timeEstimateMinutes: 10,
      expected: '.env present',
      actual: '.env missing',
    });
  }

  // Build required keys from spec.env or from .env.example
  let requiredKeys: string[] = [];
  if (spec.env && spec.env.length > 0) {
    requiredKeys = spec.env.filter(e => e.required).map(e => e.key.replace(/[^a-zA-Z0-9_]/g, ''));
  } else if (hasEnvExample) {
    requiredKeys = Array.from(loadEnvKeys(envExamplePath));
  }

  // If we require variables, but don't have a .env file, that is a failure, NOT a skip.
  if (requiredKeys.length > 0 && !hasEnv) {
    // We already added 'env-missing-file' above if hasEnvExample is true,
    // but what if there's no .env AND no .env.example, yet spec.env exists?
    if (!hasEnvExample) {
      issues.push({
        id: 'env-missing-file-spec',
        category: 'env',
        severity: 'blocking',
        title: '.env file missing',
        detail: 'The project specification requires environment variables, but no .env file exists.',
        fixable: false,
        timeEstimateMinutes: 10,
        expected: '.env file present with required keys',
        actual: '.env file missing',
      });
    }
  } else if (requiredKeys.length === 0 && !hasEnv && !hasEnvExample) {
    return { issues: [], status: 'skip' };
  }

  // Compare example keys vs actual env keys
  const actualKeys = hasEnv ? loadEnvKeys(envPath) : new Set<string>();
  const exampleKeys = hasEnvExample ? loadEnvKeys(envExamplePath) : new Set<string>();

  const missingRequired = requiredKeys.filter(k => !actualKeys.has(k));
  if (missingRequired.length > 0) {
    const isSeverelyMissing = missingRequired.length >= requiredKeys.length / 2;
    issues.push({
      id: 'env-missing-keys',
      category: 'env',
      severity: isSeverelyMissing ? 'blocking' : 'high',
      title: `${missingRequired.length} required environment variable(s) missing`,
      detail: `Missing: ${missingRequired.join(', ')}`,
      fixable: true,
      fixHint: `Add these variables to your .env file with real values: ${missingRequired.join(', ')}`,
      timeEstimateMinutes: missingRequired.length * 5,
      actual: `Missing: ${missingRequired.join(', ')}`,
    });
  }

  // Check for empty/placeholder values
  if (hasEnv) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    const content = stripBom(raw).replace(/[\uFFFD\uFEFF]/g, '');
    const emptyOrPlaceholder: string[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim().replace(/[^a-zA-Z0-9_]/g, '');
      const val = trimmed.slice(eqIdx + 1).trim();
      if (val === '' || val === 'your_value_here' || val === 'CHANGEME' || val === 'xxx') {
        if (key) emptyOrPlaceholder.push(key);
      }
    }
    if (emptyOrPlaceholder.length > 0) {
      issues.push({
        id: 'env-placeholder-values',
        category: 'env',
        severity: 'warning',
        title: `${emptyOrPlaceholder.length} env var(s) have placeholder/empty values`,
        detail: `Still using dummy values: ${emptyOrPlaceholder.join(', ')}`,
        fixable: true,
        fixHint: 'Replace placeholder values in .env with real credentials',
        timeEstimateMinutes: emptyOrPlaceholder.length * 3,
      });
    }
  }

  const status = issues.length === 0 ? 'pass' : issues.some(i => i.severity === 'blocking') ? 'fail' : 'warn';
  return { issues, status };
}
