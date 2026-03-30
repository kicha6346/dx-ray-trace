import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { DxSpec, ScanIssue } from '../spec/schema.js';

const HARDCODED_PATH_PATTERN = /['"`](\/(?:Users|home|root|var|srv|opt|mnt)\/[^'"`\s]{3,}|[A-Z]:[\\\/][^'"`\s]{3,})['"`]/g;
const HARDCODED_URL_PATTERN = /['"`](http:\/\/localhost:\d+[^\s'"`]*|http:\/\/127\.0\.0\.1:\d+[^\s'"`]*)['"`]/g;
const SECRET_PATTERN = /['"`](sk_test_[a-zA-Z0-9]{15,}|AKIA[0-9A-Z]{16})['"`]/g;

const SOURCE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'java', 'go', 'php'];

function scanFileContent(filePath: string): { paths: string[], urls: string[], secrets: string[] } {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const pathMatches: string[] = [];
    const urlMatches: string[] = [];
    const secretMatches: string[] = [];
    
    let m: RegExpExecArray | null;
    while ((m = HARDCODED_PATH_PATTERN.exec(content)) !== null) pathMatches.push(m[1]);
    while ((m = HARDCODED_URL_PATTERN.exec(content)) !== null) urlMatches.push(m[1]);
    while ((m = SECRET_PATTERN.exec(content)) !== null) secretMatches.push(m[1]);
    
    return {
      paths: [...new Set(pathMatches)],
      urls: [...new Set(urlMatches)],
      secrets: [...new Set(secretMatches)]
    };
  } catch {
    return { paths: [], urls: [], secrets: [] };
  }
}

export async function scanPaths(
  spec: DxSpec,
  projectDir: string
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  const issues: ScanIssue[] = [];

  // 1. Check required files exist
  if (spec.paths?.requiredFiles && spec.paths.requiredFiles.length > 0) {
    const missingFiles: string[] = [];
    for (const reqFile of spec.paths.requiredFiles) {
      const fullPath = path.isAbsolute(reqFile) ? reqFile : path.join(projectDir, reqFile);
      if (!fs.existsSync(fullPath)) missingFiles.push(reqFile);
    }
    if (missingFiles.length > 0) {
      issues.push({
        id: 'path-missing-files',
        category: 'path',
        severity: 'high',
        title: `${missingFiles.length} required file(s) missing`,
        detail: `Missing: ${missingFiles.join(', ')}`,
        fixable: false,
        fixHint: 'Ensure all required files are present or check out the correct branch',
        timeEstimateMinutes: 5,
      });
    }
  }

  // 2. Scan for hardcoded absolute paths
  if (spec.paths?.noHardcodedPaths !== false) {
    const pattern = `**/*.{${SOURCE_EXTENSIONS.join(',')}}`;
    let files: string[] = [];
    try {
      files = globSync(pattern, {
        cwd: projectDir,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/build/**', '**/__pycache__/**'],
        absolute: true,
      });
    } catch {
      files = [];
    }

    const hardcodedPaths: Array<{ file: string; matches: string[] }> = [];
    const hardcodedUrls: Array<{ file: string; matches: string[] }> = [];
    const hardcodedSecrets: Array<{ file: string; matches: string[] }> = [];
    
    for (const file of files.slice(0, 200)) { // cap at 200 files
      const found = scanFileContent(file);
      const relFile = path.relative(projectDir, file);
      if (found.paths.length > 0) hardcodedPaths.push({ file: relFile, matches: found.paths });
      if (found.urls.length > 0) hardcodedUrls.push({ file: relFile, matches: found.urls });
      if (found.secrets.length > 0) hardcodedSecrets.push({ file: relFile, matches: found.secrets });
    }

    if (hardcodedPaths.length > 0) {
      const examples = hardcodedPaths.slice(0, 3).map(f => `${f.file}: ${f.matches[0]}`).join('; ');
      issues.push({
        id: 'path-hardcoded-absolute',
        category: 'path',
        severity: 'warning',
        title: `${hardcodedPaths.reduce((s, f) => s + f.matches.length, 0)} hardcoded absolute path(s) detected`,
        detail: `Found in ${hardcodedPaths.length} file(s). Examples: ${examples}`,
        fixable: false,
        timeEstimateMinutes: hardcodedPaths.length * 3,
      });
    }

    if (hardcodedUrls.length > 0) {
      const examples = hardcodedUrls.slice(0, 3).map(f => `${f.file}: ${f.matches[0]}`).join('; ');
      issues.push({
        id: 'path-hardcoded-url',
        category: 'path',
        severity: 'blocking',
        title: `${hardcodedUrls.reduce((s, f) => s + f.matches.length, 0)} hardcoded localhost URL(s) detected`,
        detail: `Found in ${hardcodedUrls.length} file(s). Examples: ${examples}`,
        fixable: true,
        fixHint: 'Extract hardcoded localhost URLs into `.env` configuration.',
        timeEstimateMinutes: hardcodedUrls.length * 5,
        metadata: { findings: hardcodedUrls }
      });
    }

    if (hardcodedSecrets.length > 0) {
      const examples = hardcodedSecrets.slice(0, 3).map(f => `${f.file}: ${f.matches[0].substring(0, 10)}...`).join('; ');
      issues.push({
        id: 'path-hardcoded-secret',
        category: 'path',
        severity: 'blocking',
        title: `${hardcodedSecrets.reduce((s, f) => s + f.matches.length, 0)} hardcoded secret(s) detected`,
        detail: `Found in ${hardcodedSecrets.length} file(s). Examples: ${examples}`,
        fixable: true,
        fixHint: 'Extract raw secrets into `.env` to prevent supply chain leaks.',
        timeEstimateMinutes: hardcodedSecrets.length * 10,
        metadata: { findings: hardcodedSecrets }
      });
    }
  }

  if (issues.length === 0 && !spec.paths?.requiredFiles?.length && spec.paths?.noHardcodedPaths === false) {
    return { issues: [], status: 'skip' };
  }

  const status = issues.length === 0 ? 'pass' : issues.some(i => i.severity === 'high' || i.severity === 'blocking') ? 'fail' : 'warn';
  return { issues, status };
}
