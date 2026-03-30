import path from 'path';
import { DxSpec, ScanIssue, ScanResult } from '../spec/schema.js';
import { scanRuntime } from './runtimeScanner.js';
import { scanDependencies } from './depScanner.js';
import { scanEnv } from './envScanner.js';
import { scanPaths } from './pathScanner.js';
import { scanOS } from './osScanner.js';
import { scanDocker } from './dockerScanner.js';
import { scanPorts } from './portScanner.js';
import { scanDocs } from './docsScanner.js';
import { scanGit } from './gitScanner.js';
import { scanStructure } from './structureScanner.js';

export async function runScans(
  spec: DxSpec,
  projectDir: string
): Promise<ScanResult> {
  const [runtimeRes, depRes, envRes, pathRes, osRes, dockerRes, portRes, docRes, gitRes, structureRes] = await Promise.all([
    scanRuntime(spec),
    scanDependencies(spec, projectDir),
    scanEnv(spec, projectDir),
    scanPaths(spec, projectDir),
    scanOS(spec),
    scanDocker(spec),
    scanPorts(spec),
    scanDocs(spec, projectDir),
    scanGit(spec, projectDir),
    scanStructure(spec, projectDir),
  ]);

  const allIssues: ScanIssue[] = [
    ...runtimeRes.issues,
    ...depRes.issues,
    ...envRes.issues,
    ...pathRes.issues,
    ...osRes.issues,
    ...dockerRes.issues,
    ...portRes.issues,
    ...docRes.issues,
    ...gitRes.issues,
    ...structureRes.issues,
  ];

  const categoryStatus: Record<string, 'pass' | 'fail' | 'warn' | 'skip'> = {
    runtime: runtimeRes.status,
    dependency: depRes.status,
    env: envRes.status,
    path: pathRes.status,
    tooling: osRes.status,
    docker: dockerRes.status,
    ports: portRes.status,
    docs: docRes.status,
    git: gitRes.status,
    structure: structureRes.status,
  };

  return {
    issues: allIssues,
    categoryStatus,
    scannedAt: new Date(),
  };
}
