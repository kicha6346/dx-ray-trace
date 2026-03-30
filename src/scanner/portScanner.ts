import { DxSpec, ScanIssue } from '../spec/schema.js';
import tcpPortUsed from 'tcp-port-used';

export async function scanPorts(
  spec: DxSpec
): Promise<{ issues: ScanIssue[]; status: 'pass' | 'fail' | 'warn' | 'skip' }> {
  const issues: ScanIssue[] = [];

  if (!spec.ports || spec.ports.length === 0) {
    return { issues: [], status: 'skip' };
  }

  for (const port of spec.ports) {
    try {
      // Check if port is in use across both IPv4 and IPv6
      const inUseV4 = await tcpPortUsed.check(port, '127.0.0.1');
      const inUseV6 = await tcpPortUsed.check(port, '::1');
      if (inUseV4 || inUseV6) {
        issues.push({
          id: `port-conflict-${port}`,
          category: 'tooling', // We can map this to tooling or a new category. Let's use tooling to keep matrix simple, or 'port'
          severity: 'blocking',
          title: `Port ${port} is already in use`,
          detail: `Another process is currently bound to port ${port}. Your application will fail to start.`,
          fixable: true,
          fixHint: `Kill the process running on port ${port}`,
          timeEstimateMinutes: 5,
          expected: `Port ${port} is free`,
          actual: `Port ${port} is in use`,
        });
      }
    } catch (e) {
      // Fallback
      issues.push({
        id: `port-check-failed-${port}`,
        category: 'tooling',
        severity: 'warning',
        title: `Could not verify port ${port}`,
        detail: `Failed to check if port ${port} is open.`,
        fixable: false,
        timeEstimateMinutes: 1,
      });
    }
  }

  const status = issues.length === 0 ? 'pass' : issues.some(i => i.severity === 'blocking') ? 'fail' : 'warn';
  return { issues, status };
}
