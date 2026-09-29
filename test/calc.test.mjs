/**
 * Unit tests for src/calc.js — CSA Z94.2-14 calculation engine.
 * Test cases approved by Norm (industrial audiometric technician, BC).
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeLex, computeLprot, getVerdict, getCsaClass } from '../src/calc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(readFileSync(join(__dirname, '../data/rules.json'), 'utf8'));
const { derating, adequacy, jurisdictions } = rules;
const csaClasses = rules.csa_classes;

// Round to 1 decimal place to avoid floating-point noise
const r1 = (n) => Math.round(n * 10) / 10;

// ─── Approved test cases ────────────────────────────────────────────────────

test('Case 1 — earplug dBA: Lex 95, NRR 26 → 85.0 dBA, adequate (BC)', () => {
  const lprot = computeLprot(95, 'dBA', 'earplug', 26, null, derating);
  assert.strictEqual(r1(lprot), 85.0);
  const v = getVerdict(lprot, jurisdictions.BC.limit_dba, adequacy);
  assert.strictEqual(v.status, 'adequate');
  assert.strictEqual(v.color, 'green');
});

test('Case 2 — earplug dBA: Lex 100, NRR 22 → 92.0 dBA, danger (BC)', () => {
  const lprot = computeLprot(100, 'dBA', 'earplug', 22, null, derating);
  assert.strictEqual(r1(lprot), 92.0);
  const v = getVerdict(lprot, jurisdictions.BC.limit_dba, adequacy);
  assert.strictEqual(v.status, 'danger');
  assert.strictEqual(v.color, 'red');
});

test('Case 3 — earmuff dBA: Lex 98, NRR 25 → 83.5 dBA, adequate (BC)', () => {
  const lprot = computeLprot(98, 'dBA', 'earmuff', 25, null, derating);
  assert.strictEqual(r1(lprot), 83.5);
  const v = getVerdict(lprot, jurisdictions.BC.limit_dba, adequacy);
  assert.strictEqual(v.status, 'adequate');
  assert.strictEqual(v.color, 'green');
});

test('Case 4 — earmuff dBA: Lex 85, NRR 30 → 67.0 dBA, over-protected (BC)', () => {
  const lprot = computeLprot(85, 'dBA', 'earmuff', 30, null, derating);
  assert.strictEqual(r1(lprot), 67.0);
  const v = getVerdict(lprot, jurisdictions.BC.limit_dba, adequacy);
  assert.strictEqual(v.status, 'over-protected');
  assert.strictEqual(v.color, 'blue');
});

test('Case 5 — dual dBA: Lex 108, EP NRR 33 + EM NRR 29 → 86.3 dBA, caution (BC)', () => {
  // CSA Z94.2-14 s.9: (NRR_higher + 5) × 0.65 → (33 + 5) × 0.65 = 24.7; Lprot = 108 + 3 − 24.7 = 86.3
  const lprot = computeLprot(108, 'dBA', 'dual', 33, 29, derating);
  assert.strictEqual(r1(lprot), 86.3);
  const v = getVerdict(lprot, jurisdictions.BC.limit_dba, adequacy);
  assert.strictEqual(v.status, 'caution');
  assert.strictEqual(v.color, 'yellow');
});

test('Case 6 — earplug dBC: Lex 96, NRR 26 → 83.0 dBA, adequate (BC)', () => {
  const lprot = computeLprot(96, 'dBC', 'earplug', 26, null, derating);
  assert.strictEqual(r1(lprot), 83.0);
  const v = getVerdict(lprot, jurisdictions.BC.limit_dba, adequacy);
  assert.strictEqual(v.status, 'adequate');
  assert.strictEqual(v.color, 'green');
});

test('Case 7 — earmuff dBA Federal: Lex 92, NRR 25 → 77.5 dBA, adequate (FED 87 dBA limit)', () => {
  const lprot = computeLprot(92, 'dBA', 'earmuff', 25, null, derating);
  assert.strictEqual(r1(lprot), 77.5);
  const v = getVerdict(lprot, jurisdictions.FED.limit_dba, adequacy);
  assert.strictEqual(v.status, 'adequate');
  assert.strictEqual(v.color, 'green');
});

test('dual: missing nrr2 throws', () => {
  assert.throws(
    () => computeLprot(100, 'dBA', 'dual', 29, null, derating),
    /requires both NRR/
  );
});

// ─── computeLex ─────────────────────────────────────────────────────────────

test('computeLex — single task full shift: 95 dBA × 8 h → 95.0 dBA', () => {
  const lex = computeLex([{ level_dba: 95, hours: 8 }]);
  assert.strictEqual(r1(lex), 95.0);
});

test('computeLex — two equal tasks split shift: 90 dBA × 4 h + 90 dBA × 4 h → 90.0 dBA', () => {
  const lex = computeLex([
    { level_dba: 90, hours: 4 },
    { level_dba: 90, hours: 4 },
  ]);
  assert.strictEqual(r1(lex), 90.0);
});

// ─── getCsaClass ─────────────────────────────────────────────────────────────
// Bands (CSA Z94.2-14): Lex < 90 → C; 90–95 → B; 95 < Lex ≤ 105 → A; > 105 → Dual

test('getCsaClass — 85 dBA → Class C', () => {
  const c = getCsaClass(85, csaClasses);
  assert.strictEqual(c.class, 'C');
});

test('getCsaClass — 89.9 dBA → Class C (just below 90 boundary)', () => {
  const c = getCsaClass(89.9, csaClasses);
  assert.strictEqual(c.class, 'C');
});

test('getCsaClass — 90 dBA → Class B (boundary inclusive to B)', () => {
  const c = getCsaClass(90, csaClasses);
  assert.strictEqual(c.class, 'B');
});

test('getCsaClass — 91 dBA → Class B', () => {
  const c = getCsaClass(91, csaClasses);
  assert.strictEqual(c.class, 'B');
});

test('getCsaClass — 95 dBA → Class B (boundary inclusive to B)', () => {
  const c = getCsaClass(95, csaClasses);
  assert.strictEqual(c.class, 'B');
});

test('getCsaClass — 95.1 dBA → Class A (just above B upper boundary)', () => {
  const c = getCsaClass(95.1, csaClasses);
  assert.strictEqual(c.class, 'A');
});

test('getCsaClass — 100 dBA → Class A', () => {
  const c = getCsaClass(100, csaClasses);
  assert.strictEqual(c.class, 'A');
});

test('getCsaClass — 105 dBA → Class A (boundary inclusive to A)', () => {
  const c = getCsaClass(105, csaClasses);
  assert.strictEqual(c.class, 'A');
});

test('getCsaClass — 105.1 dBA → Dual (just above A upper boundary)', () => {
  const c = getCsaClass(105.1, csaClasses);
  assert.strictEqual(c.class, 'Dual');
});

test('getCsaClass — 106 dBA → Dual', () => {
  const c = getCsaClass(106, csaClasses);
  assert.strictEqual(c.class, 'Dual');
});

test('getCsaClass — Class B returns l_suffix_note', () => {
  const c = getCsaClass(92, csaClasses);
  assert.ok(c.l_suffix_note && c.l_suffix_note.includes('BL'));
});

test('getCsaClass — Class A returns l_suffix_note', () => {
  const c = getCsaClass(100, csaClasses);
  assert.ok(c.l_suffix_note && c.l_suffix_note.includes('AL'));
});

test('getCsaClass — Dual returns dual_min_note', () => {
  const c = getCsaClass(108, csaClasses);
  assert.ok(c.dual_min_note && c.dual_min_note.includes('Class A'));
});
