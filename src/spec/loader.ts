import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { DxSpec } from './schema.js';

export function loadSpec(projectDir: string, specPath?: string): DxSpec | null {
  const candidates = specPath
    ? [specPath]
    : [
        path.join(projectDir, 'dx-spec.yaml'),
        path.join(projectDir, 'dx-spec.yml'),
        path.join(process.cwd(), 'dx-spec.yaml'),
        path.join(process.cwd(), 'dx-spec.yml'),
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, 'utf-8');
      const spec = yaml.load(raw) as DxSpec;
      return spec;
    }
  }

  return null;
}

export function specExists(projectDir: string): boolean {
  return (
    fs.existsSync(path.join(projectDir, 'dx-spec.yaml')) ||
    fs.existsSync(path.join(projectDir, 'dx-spec.yml'))
  );
}
