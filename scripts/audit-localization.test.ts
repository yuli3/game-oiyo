import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('never reports a localization pass when no content was inspected', () => {
  const root = mkdtempSync(join(tmpdir(), 'empty-localization-'));
  try {
    const result = spawnSync(process.execPath, [resolve('scripts/audit-localization.mjs')], { cwd: root, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('NOT ASSESSED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
