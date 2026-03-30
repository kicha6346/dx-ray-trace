import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { DxSpec, ScanIssue } from '../spec/schema.js';

export async function scanStructure(
  spec: DxSpec,
  projectDir: string
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  const issues: ScanIssue[] = [];

  // Check for common source directories
  const hasSrc = fs.existsSync(path.join(projectDir, 'src'));
  const hasLib = fs.existsSync(path.join(projectDir, 'lib'));
  const hasApp = fs.existsSync(path.join(projectDir, 'app'));

  if (!hasSrc && !hasLib && !hasApp) {
    issues.push({
      id: 'structure-missing-src',
      category: 'structure',
      severity: 'warning',
      title: 'Missing core source directory',
      detail: 'Project lacks a standard source directory like `src/`, `lib/`, or `app/`.',
      fixable: false,
      fixHint: 'Move your application code into a dedicated directory like `src/` to prevent root clutter.',
      timeEstimateMinutes: 15,
    });
  }

  // Count files in root vs folders
  const rootFiles = fs.readdirSync(projectDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name);
    
  // Often it's bad to have > 15 config/source files in the root dir
  if (rootFiles.length > 15) {
    issues.push({
      id: 'structure-flat-root',
      category: 'structure',
      severity: 'warning',
      title: 'Cluttered root directory detected',
      detail: `Found ${rootFiles.length} files in the project root. This structure doesn't scale well.`,
      fixable: false,
      fixHint: 'Move source files to `src/` and docs to `docs/` or `.github/`.',
      timeEstimateMinutes: 30,
    });
  }

  const status = issues.length === 0 ? 'pass' : 'warn';
  return { issues, status };
}
