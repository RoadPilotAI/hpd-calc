import { computeLprot, getVerdict, getCsaClass } from './calc.js';

// ── State ────────────────────────────────────────────────
const S = {
  mode:     'occup',
  lex:      null,
  weighting:'dBA',
  hpdType:  'earplug',
  nrr1:     null,
  nrr2:     null,
  hpd1Name: '',
  hpd2Name: '',
  hpd1Type: 'earplug',
  hpd2Type: 'earmuff',
  jurCode:  'BC',
};

let rules    = null;
let noiseData = null;
let hpdData  = null;

// ── Bootstrap ────────────────────────────────────────────
async function init() {
  try {
    [rules, noiseData, hpdData] = await Promise.all([
      fetch('data/rules.json').then(r => r.json()),
      fetch('data/noise-exposures.json').then(r => r.json()),
      fetch('data/hpd-products.json').then(r => r.json()),
    ]);
  } catch (e) {
    document.getElementById('loadingOverlay').textContent = 'Failed to load data. Please refresh.';
    return;
  }

  document.getElementById('loadingOverlay').style.display = 'none';
  document.getElementById('printDate').textContent = 'Generated: ' + new Date().toLocaleDateString('en-CA');

  bindEvents();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ── Event binding ─────────────────────────────────────────
function bindEvents() {
  document.getElementById('jurSelect').addEventListener('change', e => {
    S.jurCode = e.target.value;
    recalc();
  });

  document.getElementById('modeOccup').addEventListener('click', () => setMode('occup'));
  document.getElementById('modeMeasured').addEventListener('click', () => setMode('measured'));

  document.getElementById('occupSearch').addEventListener('input', e => searchOccup(e.target.value));
  document.getElementById('occupResults').addEventListener('click', e => {
    const item = e.target.closest('.sr-item');
    if (item) selectOccup(item.dataset.id);
  });
  document.getElementById('occupChipClear').addEventListener('click', clearOccup);

  document.getElementById('lexInput').addEventListener('input', onLexInput);
  document.getElementById('btnDba').addEventListener('click', () => setWeighting('dBA'));
  document.getElementById('btnDbc').addEventListener('click', () => setWeighting('dBC'));

  document.getElementById('typeEarplug').addEventListener('click', () => setHpdType('earplug'));
  document.getElementById('typeEarmuff').addEventListener('click', () => setHpdType('earmuff'));
  document.getElementById('typeDual').addEventListener('click', () => setHpdType('dual'));

  document.getElementById('hpdSearch1').addEventListener('input', e => searchHpd(e.target.value, 1));
  document.getElementById('hpdResults1').addEventListener('click', e => {
    const item = e.target.closest('.sr-item');
    if (item) selectHpd(item.dataset.id, 1);
  });
  document.getElementById('hpdChip1Clear').addEventListener('click', () => clearHpd(1));

  document.getElementById('hpdSearch2').addEventListener('input', e => searchHpd(e.target.value, 2));
  document.getElementById('hpdResults2').addEventListener('click', e => {
    const item = e.target.closest('.sr-item');
    if (item) selectHpd(item.dataset.id, 2);
  });
  document.getElementById('hpdChip2Clear').addEventListener('click', () => clearHpd(2));

  document.getElementById('nrrInput1').addEventListener('input', recalc);
  document.getElementById('nrrInput2').addEventListener('input', recalc);

  document.getElementById('breakdownToggle').addEventListener('click', toggleBreakdown);
  document.getElementById('printBtn').addEventListener('click', () => window.print());

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap') && !e.target.closest('.search-results')) {
      closeAllResults();
    }
  });
}

// ── Jurisdiction ──────────────────────────────────────────
// S.jurCode set on change event; recalc() reads it.

// ── Mode ─────────────────────────────────────────────────
function setMode(m) {
  S.mode = m;
  document.getElementById('modeOccup').classList.toggle('active', m === 'occup');
  document.getElementById('modeMeasured').classList.toggle('active', m === 'measured');
  document.getElementById('occupSection').style.display    = m === 'occup'    ? '' : 'none';
  document.getElementById('measuredSection').style.display = m === 'measured' ? 'block' : 'none';
  if (m === 'occup') {
    const chip = document.getElementById('occupChip');
    S.lex = chip.classList.contains('visible') ? parseFloat(chip.dataset.dba) || null : null;
  } else {
    onLexInput();
  }
  recalc();
}

// ── Weighting ─────────────────────────────────────────────
function setWeighting(w) {
  S.weighting = w;
  document.getElementById('btnDba').classList.toggle('active', w === 'dBA');
  document.getElementById('btnDbc').classList.toggle('active', w === 'dBC');
  document.getElementById('weightNote').textContent = w === 'dBA'
    ? '+3 dB spectral correction will be applied in the CSA formula.'
    : 'No correction applied — dB(C) used directly.';
  recalc();
}

// ── Occupation search ─────────────────────────────────────
function shortSource(e) {
  let src;
  if (e.source.includes('WorkSafeBC'))       src = 'WorkSafeBC';
  else if (e.source.includes('Hazard Evaluation')) src = 'NIOSH HHE';
  else if (e.source.includes('MSHA'))        src = 'MSHA';
  else                                        src = 'NIOSH Pub. 98-126';
  return src + (e.value_type === 'estimated' ? ' (est.)' : '');
}

function scoreOccup(entry, words) {
  const title = entry.job_title.toLowerCase();
  const rest  = [entry.environment, entry.industry, ...(entry.aliases || [])].join(' ').toLowerCase();
  let score = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (title.includes(w))      score += w.length * 2;
    else if (rest.includes(w))  score += w.length;
  }
  return score;
}

function searchOccup(q) {
  const box = document.getElementById('occupResults');
  if (q.length < 2) { box.classList.remove('open'); box.innerHTML = ''; return; }
  const words = q.toLowerCase().split(/\s+/);
  const entries = noiseData.entries ?? [];
  const hits = entries
    .map(e => ({ e, score: scoreOccup(e, words) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.e);

  if (!hits.length) { box.classList.remove('open'); return; }
  box.innerHTML = hits.map(e => `
    <div class="sr-item" data-id="${esc(e.id)}">
      <div>
        <div class="sr-name">${esc(e.job_title)}</div>
        <div class="sr-env">${esc(e.environment)} · ${esc(shortSource(e))}</div>
      </div>
      <div class="sr-dba">${e.lex_8h} dBA</div>
    </div>`).join('');
  box.classList.add('open');
}

function selectOccup(id) {
  const entries = noiseData.entries ?? [];
  const e = entries.find(x => x.id === id);
  if (!e) return;
  S.lex = e.lex_8h;
  const chip = document.getElementById('occupChip');
  chip.dataset.dba = e.lex_8h;
  document.getElementById('occupChipName').textContent = e.job_title + ' — ' + e.environment;
  document.getElementById('occupChipMeta').textContent = e.industry + ' · ' + shortSource(e);
  document.getElementById('occupChipDba').textContent  = e.lex_8h + ' dBA';
  chip.classList.add('visible');
  document.getElementById('occupSearch').value = '';
  document.getElementById('occupResults').classList.remove('open');
  recalc();
}

function clearOccup() {
  S.lex = null;
  const chip = document.getElementById('occupChip');
  chip.classList.remove('visible');
  chip.dataset.dba = '';
  recalc();
}

// ── Measured Lex ──────────────────────────────────────────
function onLexInput() {
  const val = parseFloat(document.getElementById('lexInput').value);
  const errEl = document.getElementById('lexError');
  if (isNaN(val) || val < 50 || val > 140) {
    S.lex = null;
    errEl.classList.add('show');
  } else {
    S.lex = val;
    errEl.classList.remove('show');
  }
  recalc();
}

// ── HPD type ──────────────────────────────────────────────
function setHpdType(t) {
  S.hpdType = t;
  ['earplug', 'earmuff', 'dual'].forEach(x => {
    const cap = x.charAt(0).toUpperCase() + x.slice(1);
    document.getElementById('type' + cap).classList.toggle('active', x === t);
  });
  document.getElementById('dualSection').style.display = t === 'dual' ? '' : 'none';
  const notes = {
    earplug: 'CSA Z94.2: earplugs derated at 50%',
    earmuff: 'CSA Z94.2: earmuffs derated at 70%',
    dual:    'CSA Z94.2-14 s.9: (NRR_higher + 5) × 0.65 — both device NRRs required',
  };
  document.getElementById('deratingNote').textContent = notes[t];
  recalc();
}

// ── HPD search ────────────────────────────────────────────
function scoreHpd(product, words) {
  const title = (product.brand + ' ' + product.model).toLowerCase();
  const rest  = [product.type, ...(product.aliases || [])].join(' ').toLowerCase();
  let score = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (title.includes(w))     score += w.length * 2;
    else if (rest.includes(w)) score += w.length;
  }
  return score;
}

function searchHpd(q, slot) {
  const box = document.getElementById('hpdResults' + slot);
  if (q.length < 2) { box.classList.remove('open'); box.innerHTML = ''; return; }
  const words = q.toLowerCase().split(/\s+/);
  const products = hpdData.products ?? [];
  const hits = products
    .map(p => ({ p, score: scoreHpd(p, words) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.p);

  if (!hits.length) { box.classList.remove('open'); return; }
  box.innerHTML = hits.map(p => `
    <div class="sr-item" data-id="${esc(p.id)}">
      <div>
        <div class="sr-name">${esc(p.brand)} ${esc(p.model)}</div>
        <div class="sr-env">${p.type === 'earplug' ? 'Earplug' : 'Earmuff'}</div>
      </div>
      <div class="sr-dba">NRR ${p.nrr}</div>
    </div>`).join('');
  box.classList.add('open');
}

function selectHpd(id, slot) {
  const products = hpdData.products ?? [];
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (slot === 1) {
    S.nrr1     = p.nrr;
    S.hpd1Name = p.brand + ' ' + p.model;
    S.hpd1Type = p.type;
    document.getElementById('nrrInput1').value = p.nrr;
    document.getElementById('hpdSearch1').value = '';
    document.getElementById('hpdResults1').classList.remove('open');
    document.getElementById('hpdChip1Name').textContent = p.brand + ' ' + p.model;
    document.getElementById('hpdChip1Meta').textContent = p.type === 'earplug' ? 'Earplug' : 'Earmuff';
    document.getElementById('hpdChip1Nrr').textContent  = 'NRR ' + p.nrr;
    document.getElementById('hpdChip1').classList.add('visible');
    // In dual mode the top-level type selector must stay on 'dual'; only switch it for single-device selection
    if (S.hpdType !== 'dual') setHpdType(p.type);
    else recalc();
  } else {
    S.nrr2     = p.nrr;
    S.hpd2Name = p.brand + ' ' + p.model;
    S.hpd2Type = p.type;
    document.getElementById('nrrInput2').value = p.nrr;
    document.getElementById('hpdSearch2').value = '';
    document.getElementById('hpdResults2').classList.remove('open');
    document.getElementById('hpdChip2Name').textContent = p.brand + ' ' + p.model;
    document.getElementById('hpdChip2Meta').textContent = p.type === 'earplug' ? 'Earplug' : 'Earmuff';
    document.getElementById('hpdChip2Nrr').textContent  = 'NRR ' + p.nrr;
    document.getElementById('hpdChip2').classList.add('visible');
    recalc();
  }
}

function clearHpd(slot) {
  if (slot === 1) {
    S.nrr1 = null; S.hpd1Name = ''; S.hpd1Type = 'earplug';
    document.getElementById('nrrInput1').value = '';
    document.getElementById('hpdChip1').classList.remove('visible');
  } else {
    S.nrr2 = null; S.hpd2Name = ''; S.hpd2Type = 'earmuff';
    document.getElementById('nrrInput2').value = '';
    document.getElementById('hpdChip2').classList.remove('visible');
  }
  recalc();
}

function closeAllResults() {
  document.getElementById('occupResults').classList.remove('open');
  document.getElementById('hpdResults1').classList.remove('open');
  document.getElementById('hpdResults2').classList.remove('open');
}

// ── Breakdown toggle ──────────────────────────────────────
function toggleBreakdown() {
  const btn  = document.getElementById('breakdownToggle');
  const body = document.getElementById('breakdownBody');
  btn.classList.toggle('open');
  body.classList.toggle('open');
}

// ── Recalculate ───────────────────────────────────────────
function recalc() {
  const nrr1raw = parseFloat(document.getElementById('nrrInput1').value);
  const nrr2raw = parseFloat(document.getElementById('nrrInput2').value);
  const nrr1 = isNaN(nrr1raw) ? null : nrr1raw;
  const nrr2 = isNaN(nrr2raw) ? null : nrr2raw;

  const card = document.getElementById('resultCard');
  if (S.lex === null || nrr1 === null || (S.hpdType === 'dual' && nrr2 === null)) {
    card.classList.remove('visible');
    return;
  }

  const jur   = rules.jurisdictions[S.jurCode];
  const lprot = computeLprot(S.lex, S.weighting, S.hpdType, nrr1, nrr2, rules.derating);
  const verdict = getVerdict(lprot, jur.limit_dba, rules.adequacy);
  const csa   = getCsaClass(S.lex, rules.csa_classes);

  let cssClass, pillText, verdictText;
  const delta = (lprot - jur.limit_dba).toFixed(1);
  switch (verdict.status) {
    case 'over-protected':
      cssClass    = 'over';
      pillText    = '↓ Over-protected';
      verdictText = 'Protected level is below 70 dBA — attenuation may be higher than needed. Consider whether a lower-rated device would still protect while preserving situational awareness and communication.';
      break;
    case 'adequate':
      cssClass    = 'adequate';
      pillText    = '✓ Adequate';
      verdictText = 'This hearing protector provides sufficient protection for the stated noise exposure.';
      break;
    case 'caution':
      cssClass    = 'caution';
      pillText    = '⚠ Marginally under-protected';
      verdictText = `Protected level is ${delta} dBA above the ${jur.limit_dba} dBA limit — within the caution zone. Consider a higher-rated device.`;
      break;
    default:
      cssClass    = 'danger';
      pillText    = '✖ Under-protected';
      verdictText = `Protected level exceeds the ${jur.limit_dba} dBA limit by ${delta} dBA. This HPD does not provide adequate protection — select a higher-rated device.`;
  }

  // Derating description
  let derateDesc;
  if (S.hpdType === 'earplug') {
    derateDesc = `NRR ${nrr1} × 50% = ${(nrr1 * 0.50).toFixed(1)} dB`;
  } else if (S.hpdType === 'earmuff') {
    derateDesc = `NRR ${nrr1} × 70% = ${(nrr1 * 0.70).toFixed(1)} dB`;
  } else {
    const higher = Math.max(nrr1, nrr2);
    derateDesc = `(NRR ${higher} + 5) × 65% = ${((higher + 5) * 0.65).toFixed(1)} dB`;
  }

  // HPD and NRR description
  const hpdDesc = (S.hpd1Name || 'Manual entry') +
    (S.hpdType === 'dual' && S.hpd2Name ? ' + ' + S.hpd2Name : '');
  const nrrDesc = S.hpdType === 'dual'
    ? `${nrr1} (primary) + ${nrr2} (secondary)`
    : String(nrr1);

  // Correction description
  const correction = S.weighting === 'dBA' ? 3 : 0;
  const corrDesc = correction > 0 ? `+${correction} dB (dBA measurement)` : 'None (dBC)';

  // Render
  card.className = 'result-card visible ' + cssClass;
  document.getElementById('resultValue').textContent   = lprot.toFixed(1);
  document.getElementById('verdictPill').textContent   = pillText;
  document.getElementById('verdictText').textContent   = verdictText;
  document.getElementById('csaClassVal').textContent  = csa.label;
  document.getElementById('csaGradeNote').textContent = `Required for ${S.lex.toFixed(1)} dBA · verdict above confirms whether your device passes`;

  // L-suffix note (Class A/B only)
  const lNote = document.getElementById('lSuffixNote');
  if (lNote) {
    lNote.textContent = csa.l_suffix_note || '';
    lNote.style.display = csa.l_suffix_note ? '' : 'none';
  }

  // Dual min-class caution
  const dualCaution = document.getElementById('dualClassCaution');
  if (dualCaution && S.hpdType === 'dual') {
    const products = hpdData?.products ?? [];
    const p1 = products.find(p => p.brand + ' ' + p.model === S.hpd1Name);
    const p2 = products.find(p => p.brand + ' ' + p.model === S.hpd2Name);
    const warn = [];
    const plugClasses  = ['A', 'AL'];
    const muffClasses  = ['A', 'AL', 'B', 'BL'];
    if (p1?.csa_class && !plugClasses.includes(p1.csa_class)) warn.push(`Primary device (${p1.model}) is ${p1.csa_class} — minimum Class A earplug required`);
    if (p2?.csa_class && !muffClasses.includes(p2.csa_class)) warn.push(`Secondary device (${p2.model}) is ${p2.csa_class} — minimum Class B earmuff required`);
    dualCaution.textContent = warn.length ? '⚠ ' + warn.join('; ') : '';
    dualCaution.style.display = warn.length ? '' : 'none';
  } else if (dualCaution) {
    dualCaution.style.display = 'none';
  }

  // Peak limit row
  const peakRow = document.getElementById('brPeakRow');
  const peakVal = document.getElementById('brPeak');
  if (peakRow && peakVal) {
    const peak = jur.peak_limit_dbc;
    peakRow.style.display = peak != null ? '' : 'none';
    peakVal.textContent   = peak != null ? peak + ' dBC' : '';
  }

  document.getElementById('brJur').textContent       = jur.name;
  document.getElementById('brLex').textContent       = S.lex.toFixed(1) + ' ' + S.weighting;
  document.getElementById('brCorr').textContent      = corrDesc;
  document.getElementById('brHpd').textContent       = hpdDesc;
  document.getElementById('brNrr').textContent       = nrrDesc;
  document.getElementById('brDerate').textContent    = derateDesc;
  document.getElementById('brProtected').textContent = lprot.toFixed(1) + ' dBA';
  document.getElementById('brLimit').textContent     = jur.limit_dba + ' dBA (' + jur.name + ')';
}

// ── Utility ───────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();
