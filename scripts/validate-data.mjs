/**
 * Data validation script for hpd-calc data files.
 * Run with: node scripts/validate-data.mjs
 * Exits 1 if any errors are found; exits 0 if all checks pass.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

let errors = 0;
let warnings = 0;

function err(file, msg)  { console.error(`  ERROR   [${file}] ${msg}`); errors++; }
function warn(file, msg) { console.warn (`  WARNING [${file}] ${msg}`); warnings++; }
function ok(msg)         { console.log  (`  ok      ${msg}`); }

// ── Load files ──────────────────────────────────────────────────────────────

function load(rel, { optional = false } = {}) {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (e) {
    if (optional && e.code === 'ENOENT') return null;
    err(rel, `Cannot load file: ${e.message}`);
    return null;
  }
}

const rules    = load('data/rules.json');
const noiseExp = load('data/noise-exposures.json');
const hpdProd  = load('data/hpd-products.json', { optional: true });

// ── Validate rules.json ─────────────────────────────────────────────────────

console.log('\n── rules.json ──────────────────────────────────────────');

if (rules) {
  // Jurisdictions
  const REQUIRED_JURS = ['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL','YT','NT','NU','FED'];
  for (const code of REQUIRED_JURS) {
    if (!rules.jurisdictions?.[code]) {
      err('rules.json', `Missing jurisdiction: ${code}`);
    } else {
      const j = rules.jurisdictions[code];
      if (typeof j.limit_dba !== 'number')    err('rules.json', `${code}.limit_dba must be a number`);
      if (typeof j.exchange_rate_db !== 'number') err('rules.json', `${code}.exchange_rate_db must be a number`);
      if (j.limit_dba < 80 || j.limit_dba > 95) warn('rules.json', `${code}.limit_dba ${j.limit_dba} is outside expected range 80–95`);
    }
  }
  ok(`${Object.keys(rules.jurisdictions ?? {}).length} jurisdictions`);

  // Derating
  const d = rules.derating ?? {};
  if (typeof d.earplug?.factor !== 'number') err('rules.json', 'derating.earplug.factor missing or not a number');
  if (typeof d.earmuff?.factor !== 'number') err('rules.json', 'derating.earmuff.factor missing or not a number');
  if (typeof d.dual?.factor    !== 'number') err('rules.json', 'derating.dual.factor missing or not a number');
  if (typeof d.dual?.bonus_nrr !== 'number') err('rules.json', 'derating.dual.bonus_nrr missing or not a number');
  ok('derating factors present');

  // CSA class bands
  const bands = rules.csa_classes ?? [];
  if (bands.length < 5) err('rules.json', `Expected at least 5 CSA class bands, got ${bands.length}`);
  for (const [i, b] of bands.entries()) {
    if (!b.class)               err('rules.json', `csa_classes[${i}].class missing`);
    if (b.grade === undefined)  err('rules.json', `csa_classes[${i}].grade missing`);
  }
  ok(`${bands.length} CSA class bands`);

  // Adequacy
  const a = rules.adequacy ?? {};
  if (typeof a.over_protected_below !== 'number') err('rules.json', 'adequacy.over_protected_below missing');
  if (typeof a.caution_margin_db    !== 'number') err('rules.json', 'adequacy.caution_margin_db missing');
  ok('adequacy thresholds present');
}

// ── Validate noise-exposures.json ───────────────────────────────────────────

console.log('\n── noise-exposures.json ────────────────────────────────');

if (noiseExp) {
  const entries = noiseExp.entries ?? [];
  ok(`${entries.length} entries`);

  const ids = new Set();
  for (const [i, e] of entries.entries()) {
    const loc = `entries[${i}] id="${e.id}"`;

    if (!e.id)                       err('noise-exposures.json', `${loc}: id is required`);
    if (!e.job_title)                err('noise-exposures.json', `${loc}: job_title is required`);
    if (!e.industry)                 err('noise-exposures.json', `${loc}: industry is required`);
    if (typeof e.lex_8h !== 'number') err('noise-exposures.json', `${loc}: lex_8h must be a number`);
    if (!['measured','estimated'].includes(e.value_type)) err('noise-exposures.json', `${loc}: value_type must be 'measured' or 'estimated'`);
    if (!e.source)                   err('noise-exposures.json', `${loc}: source is required`);
    if (!Array.isArray(e.aliases))   err('noise-exposures.json', `${loc}: aliases must be an array`);

    if (e.lex_8h < 55 || e.lex_8h > 130) warn('noise-exposures.json', `${loc}: lex_8h ${e.lex_8h} is outside plausible range 55–130`);

    if (e.id && ids.has(e.id))       err('noise-exposures.json', `Duplicate id: ${e.id}`);
    if (e.id) ids.add(e.id);
  }

  const measured  = entries.filter(e => e.value_type === 'measured').length;
  const estimated = entries.filter(e => e.value_type === 'estimated').length;
  ok(`${measured} measured, ${estimated} estimated`);

  const industries = [...new Set(entries.map(e => e.industry))].sort();
  ok(`${industries.length} industries: ${industries.join(', ')}`);
}

// ── Validate hpd-products.json ──────────────────────────────────────────────

console.log('\n── hpd-products.json ───────────────────────────────────');

if (hpdProd) {
  const products = hpdProd.products ?? [];
  ok(`${products.length} products`);

  const ids = new Set();
  for (const [i, p] of products.entries()) {
    const loc = `products[${i}] id="${p.id}"`;

    if (!p.id)                        err('hpd-products.json', `${loc}: id is required`);
    if (!p.brand)                     err('hpd-products.json', `${loc}: brand is required`);
    if (!p.model)                     err('hpd-products.json', `${loc}: model is required`);
    if (!['earplug','earmuff'].includes(p.type)) err('hpd-products.json', `${loc}: type must be 'earplug' or 'earmuff'`);
    if (typeof p.nrr !== 'number')    err('hpd-products.json', `${loc}: nrr must be a number`);
    if (p.nrr < 0 || p.nrr > 40)     warn('hpd-products.json', `${loc}: nrr ${p.nrr} outside expected range 0–40`);

    if (p.id && ids.has(p.id))        err('hpd-products.json', `Duplicate id: ${p.id}`);
    if (p.id) ids.add(p.id);
  }
} else {
  warn('hpd-products.json', 'File not found — will need to be created before Phase 4');
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log('\n────────────────────────────────────────────────────────');
if (errors === 0 && warnings === 0) {
  console.log('  All checks passed.\n');
  process.exit(0);
} else {
  console.log(`  ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(errors > 0 ? 1 : 0);
}
