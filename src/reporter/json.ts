import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { HealReport } from '../types';

const DEFAULT_REPORT_PATH = './.heal/report.json';

export function writeJsonReport(report: HealReport, path = DEFAULT_REPORT_PATH): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(report, null, 2) + '\n', 'utf8');
}
