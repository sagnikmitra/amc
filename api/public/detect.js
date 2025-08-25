// detect.js – AMC detection from fund title

function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }

/**
 * detectAMCLabel(fundName, { aliases, amcNames })
 * @returns { label: string, known: boolean }
 */
export function detectAMCLabel(fundName, { aliases, amcNames }) {
  const q = norm(fundName);

  // explicit disambiguation
  if (/\bquantum\b/.test(q)) return { label: 'Quantum', known: true };
  if (/\bquant\b/.test(q))   return { label: 'Quant',   known: true };

  // alias pass
  for (const [amc, arr] of Object.entries(aliases || {})){
    for (const alias of arr){
      if (q.includes(norm(alias))) return { label: amc, known: true };
    }
  }

  // direct AMC names
  for (const amc of amcNames || []){
    if (q.includes(norm(amc))) return { label: amc, known: true };
  }

  // heuristic: take tokens up to "fund", else first 1–2 tokens
  const tokens = q.split(' ').filter(Boolean);
  const uptoFund = [];
  for (const t of tokens){
    if (t === 'fund') break;
    uptoFund.push(t);
    if (uptoFund.length >= 3) break;
  }
  let label = (uptoFund.length ? uptoFund.join(' ') : tokens.slice(0,2).join(' ')).toUpperCase();
  if (label.length > 12) label = label.split(' ')[0].toUpperCase();
  return { label, known: false };
}