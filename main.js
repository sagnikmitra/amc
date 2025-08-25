// main.js – wire everything together

import { loadAmcData, loadIsinMap } from './data.js';
import { detectAMCLabel } from './detect.js';
import { renderAMC, showMsg, hideMsg, refs } from './ui.js';

const amcData = await loadAmcData();
const COLORS = amcData.colors || [];
const LOGOS  = amcData.logos  || [];
const ALIASES = amcData.aliases || {};

const logoBy  = new Map(LOGOS.map(x => [x.name, x.logo]));
const colorBy = new Map(COLORS.map(x => [x.name, { p: x.primaryHex, s: x.secondaryHex }]));
const AMC_NAMES = COLORS.map(c => c.name);

const ISIN_MAP = await loadIsinMap();

async function lookupISIN(isinRaw){
  const key = (isinRaw||'').trim().toUpperCase();
  if (!key) { showMsg('Please enter an ISIN.'); return; }

  const fundName = ISIN_MAP.get(key);
  if (!fundName){ showMsg('ISIN not found in data.json.'); return; }

  const { label, known } = detectAMCLabel(fundName, { aliases: ALIASES, amcNames: AMC_NAMES });

  const colorPair = colorBy.get(label) || null;
  const logoUrl = logoBy.get(label) || null;

  renderAMC({
    amcLabel: label,
    fundName,
    isin: key,
    known,
    colorPair,
    logoUrl
  });

  // put isin in URL for deep‑linking
  const u = new URL(location.href);
  u.searchParams.set('isin', key);
  history.replaceState(null, '', u);
}

// UI bindings
refs.goBtn.onclick = () => lookupISIN(refs.isinInput.value);
refs.isinInput.addEventListener('keydown', e => { if (e.key === 'Enter') refs.goBtn.click(); });
refs.demoBtn.onclick = async ()=>{
  const demos = ['INF178L01012','INF189A01046'];
  refs.isinInput.value = demos[0];
  await lookupISIN(demos[0]);
  setTimeout(()=> lookupISIN(demos[1]), 800);
};

// Deep‑link support: ?isin=INF189A01046
const qp = new URLSearchParams(location.search);
const prefill = qp.get('isin');
if (prefill) {
  refs.isinInput.value = prefill;
  lookupISIN(prefill);
} else {
  hideMsg();
}