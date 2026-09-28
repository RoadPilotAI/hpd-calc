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
 * @param {number} lex - Lex,8h in dBA (or dBC — see weighting param)
 * @param {'dBA'|'dBC'} weighting
 * @param {'earplug'|'earmuff'|'dual'} hpdType
 * @param {number} nrr1 - NRR of primary HPD
 * @param {number|null} nrr2 - NRR of secondary HPD (dual only)
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
    const higher = Math.max(nrr1, nrr2 ?? 0);
    return lex + correction - ((higher + derating.dual.bonus_nrr) * derating.dual.factor);
  }
  throw new Error(`Unknown HPD type: ${hpdType}`);
}

/**
 * Determine the adequacy verdict for a computed Lprot.
 * @param {number} lprot - protected level at ear in dBA
 * @param {number} jurLimit - regulatory limit from rules.json jurisdictions
 * @param {object} adequacy - adequacy object from rules.json
 * @returns {{ status: 'over-protected'|'adequate'|'caution'|'danger', color: 'blue'|'green'|'yellow'|'red' }}
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
 * Get the CSA class and grade recommendation for a given Lex.
 * Bands are ≤ lex_max and (> lex_min or lex_min is null).
 * @param {number} lex
 * @param {Array} csaClasses - csa_classes array from rules.json
 * @returns {{ class: string, grade: number|string, label: string }}
 */
export function getCsaClass(lex, csaClasses) {
  for (const band of csaClasses) {
    const aboveMin = band.lex_min === null || lex > band.lex_min;
    const atOrBelowMax = band.lex_max === null || lex <= band.lex_max;
    if (aboveMin && atOrBelowMax) {
      return { class: band.class, grade: band.grade, label: band.label };
    }
  }
  return { class: 'Unknown', grade: 'Unknown', label: 'Unknown' };
}
