export interface RuntimeSpec {
  node?: string;
  python?: string;
  ruby?: string;
  java?: string;
  go?: string;
}

export interface EnvVarSpec {
  key: string;
  required: boolean;
  description?: string;
  example?: string;
}

export interface DependencySpec {
  npm?: string[];   // list of required package names
  pip?: string[];   // list of required pip packages
}

export interface PathSpec {
  noHardcodedPaths?: boolean;
  requiredFiles?: string[];
}

export interface ToolingSpec {
  docker?: boolean;
  dockerCompose?: boolean;
  nvm?: boolean;
  git?: boolean;
  make?: boolean;
}

export interface DockerSpec {
  images?: string[];
  composeFile?: string;
}

export interface DxSpec {
  name?: string;
  version?: string;
  runtime?: RuntimeSpec;
  env?: EnvVarSpec[];
  dependencies?: DependencySpec;
  paths?: PathSpec;
  tooling?: ToolingSpec;
  docker?: DockerSpec;
  ports?: number[];
}

export interface ScanIssue {
  id: string;
  category: 'runtime' | 'dependency' | 'env' | 'path' | 'tooling' | 'docker' | 'docs' | 'git' | 'structure';
  severity: 'blocking' | 'high' | 'warning' | 'info';
  title: string;
  detail: string;
  fixable: boolean;
  fixHint?: string;
  timeEstimateMinutes: number;
  actual?: string;
  expected?: string;
  metadata?: Record<string, any>;
}

export interface ScanResult {
  issues: ScanIssue[];
  categoryStatus: Record<string, 'pass' | 'fail' | 'warn' | 'skip'>;
  scannedAt: Date;
}
