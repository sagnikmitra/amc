// data.js – loading + in‑memory caching + tiny localStorage cache guard

const LSC = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

async function fetchJsonOnce(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

let _amcData = null;     // { colors, logos, aliases }
let _isinMap = null;     // Map(ISIN -> fundName)

export async function loadAmcData() {
  if (_amcData) return _amcData;

  // try localStorage first (optional)
  const cached = LSC.get('amc_data_v1');
  if (cached && cached.colors && cached.logos && cached.aliases) {
    _amcData = cached;
    // fire and forget refresh
    fetchJsonOnce('./amc_data.json').then(fresh => { _amcData = fresh; LSC.set('amc_data_v1', fresh); }).catch(()=>{});
    return _amcData;
  }

  const data = await fetchJsonOnce('./amc_data.json');
  _amcData = data;
  LSC.set('amc_data_v1', data);
  return _amcData;
}

export async function loadIsinMap() {
  if (_isinMap) return _isinMap;
  const list = await fetchJsonOnce('./data.json');
  const m = new Map();
  for (const row of list) {
    if (row && row.isin && row.name) m.set(String(row.isin).toUpperCase(), String(row.name));
  }
  if (m.size === 0) throw new Error('data.json has no valid rows');
  _isinMap = m;
  return _isinMap;
}