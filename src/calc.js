/**
 * CSA Z94.2 HPD adequacy calculations.
 * Pure functions — no I/O, no global state.
 * The caller is responsible for loading rules.json and passing the relevant
 * sub-objects (derating, adequacy, csa_classes, jurisdictions) as arguments.
 */

/**
 * Compute Lex,8h from a list of tasks using the energy-summation formula.
 * @param {Array<{level_dba: number, hours: number}>} tasks
 * @returns {number} Lex,8h in dBA
 */
export function computeLex(tasks) {
  const sum = tasks.reduce((acc, { level_dba, hours }) => {
    return acc + (hours / 8) * Math.pow(10, level_dba / 10);
  }, 0);
  return 10 * Math.log10(sum);
}

/**
 * Compute the estimated protected level at the ear (Lprot).
 * Formulas from CSA Z94.2-14 s.9.
 *   Earplug: Lex + 3 − (NRR × 0.50)
 *   Earmuff: Lex + 3 − (NRR × 0.70)
 *   Dual:    Lex + 3 − ((NRR_higher + 5) × 0.65)
 * The +3 spectral correction applies only when weighting === 'dBA'.
 * @param {number} lex
 * @param {'dBA'|'dBC'} weighting
 * @param {'earplug'|'earmuff'|'dual'} hpdType
 * @param {number} nrr1 - NRR of primary HPD
 * @param {number|null} nrr2 - NRR of secondary HPD (dual only; must not be null)
 * @param {object} derating - derating object from rules.json
 * @returns {number} Lprot in dBA
 */
export function computeLprot(lex, weighting, hpdType, nrr1, nrr2, derating) {
  const correction = weighting === 'dBA' ? 3 : 0;

  if (hpdType === 'earplug') {
    return lex + correction - (nrr1 * derating.earplug.factor);
  }
  if (hpdType === 'earmuff') {
    return lex + correction - (nrr1 * derating.earmuff.factor);
  }
  if (hpdType === 'dual') {
    if (nrr2 == null) throw new Error('Dual protection requires both NRR values.');
    const higher = Math.max(nrr1, nrr2);
    return lex + correction - ((higher + derating.dual.bonus_nrr) * derating.dual.factor);
  }
  throw new Error(`Unknown HPD type: ${hpdType}`);
}

/**
 * Determine the adequacy verdict for a computed Lprot.
 * @param {number} lprot
 * @param {number} jurLimit
 * @param {object} adequacy
 * @returns {{ status: 'over-protected'|'adequate'|'caution'|'danger', color: string }}
 */
export function getVerdict(lprot, jurLimit, adequacy) {
  if (lprot < adequacy.over_protected_below) {
    return { status: 'over-protected', color: 'blue' };
  }
  if (lprot <= jurLimit) {
    return { status: 'adequate', color: 'green' };
  }
  if (lprot <= jurLimit + adequacy.caution_margin_db) {
    return { status: 'caution', color: 'yellow' };
  }
  return { status: 'danger', color: 'red' };
}

/**
 * Get the CSA Z94.2-14 required protection class for a given Lex.
 * Bands (from rules.json csa_classes, checked in order — first match wins):
 *   Class C  — Lex < 90 dBA
 *   Class B  — 90 ≤ Lex ≤ 95 dBA
 *   Class A  — 95 < Lex ≤ 105 dBA
 *   Dual     — Lex > 105 dBA
 * Lower bound is always inclusive (lex >= lex_min).
 * Upper bound is inclusive when band.max_inclusive === true, exclusive otherwise.
 * @param {number} lex
 * @param {Array} csaClasses
 * @returns {{ class: string, label: string, l_suffix_note?: string, dual_min_note?: string }}
 */
export function getCsaClass(lex, csaClasses) {
  for (const band of csaClasses) {
    const aboveMin    = band.lex_min === null || lex >= band.lex_min;
    const atOrBelowMax = band.lex_max === null ||
      (band.max_inclusive ? lex <= band.lex_max : lex < band.lex_max);
    if (aboveMin && atOrBelowMax) {
      return {
        class:         band.class,
        label:         band.label,
        l_suffix_note: band.l_suffix_note  ?? null,
        dual_min_note: band.dual_min_note  ?? null,
      };
    }
  }
  return { class: 'Unknown', label: 'Unknown', l_suffix_note: null, dual_min_note: null };
}
