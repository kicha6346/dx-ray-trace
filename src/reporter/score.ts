import { ScanIssue, ScanResult } from '../spec/schema.js';

const SEVERITY_WEIGHTS: Record<string, number> = {
  blocking: 25,
  high: 12,
  warning: 4,
  info: 1,
};

export function calculateScore(result: ScanResult): number {
  if (result.issues.length === 0) return 100;

  const totalPenalty = result.issues.reduce((sum, issue) => {
    return sum + (SEVERITY_WEIGHTS[issue.severity] ?? 5);
  }, 0);

  // Floor out at 28 instead of 0 to feel more realistic and avoid extreme 0/100 scores
  const score = Math.max(28, 100 - totalPenalty);
  return Math.round(score);
}

export function getScoreLabel(score: number): { label: string; color: 'red' | 'yellow' | 'green' } {
  if (score >= 85) return { label: 'Excellent', color: 'green' };
  if (score >= 65) return { label: 'Degraded', color: 'yellow' };
  if (score >= 40) return { label: 'At Risk', color: 'yellow' };
  return { label: 'Broken', color: 'red' };
}

export function getScoreBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
