// worker.js — AMC color API
// GET /amc/<ISIN>/(primary|secondary|json)

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));

    const url = new URL(request.url);
    const m = url.pathname.match(/^\/amc\/([A-Za-z0-9]{12})\/(primary|secondary|json)$/);
    if (!m) return cors(txt('Not found', 404));

    const [, isinRaw, kind] = m;
    const ISIN = isinRaw.toUpperCase();

    try {
      const AMCD_URL = 'https://sagnikmitra.com/amc/amc_data.json';
      const ISIN_URL = 'https://sagnikmitra.com/amc/data.json';

      const [amcRes, isinRes] = await Promise.all([
        fetch(AMCD_URL, { cf: { cacheTtl: 3600 } }),
        fetch(ISIN_URL, { cf: { cacheTtl: 3600 } }),
      ]);
      if (!amcRes.ok) throw new Error('amc_data.json ' + amcRes.status);
      if (!isinRes.ok) throw new Error('data.json ' + isinRes.status);

      const amc = await amcRes.json();
      const list = await isinRes.json();

      const rec = list.find(x => x && String(x.isin).toUpperCase() === ISIN);
      if (!rec) return cors(txt('ISIN not found', 404));
      const fund = String(rec.name);

      const COLORS  = amc.colors  || [];
      const LOGOS   = amc.logos   || [];
      const ALIASES = amc.aliases || {};

      const colorBy  = new Map(COLORS.map(x => [x.name, { p: x.primaryHex, s: x.secondaryHex }]));
      const logoBy   = new Map(LOGOS.map(x => [x.name, x.logo]));
      const amcNames = COLORS.map(c => c.name);

      const { label, known } = detectAMCLabel(fund, ALIASES, amcNames);

      let p, s, logo = null;
      if (known && colorBy.has(label)) {
        const pair = colorBy.get(label) || {};
        p = pair.p || nameToHex(label);
        s = pair.s || darken20(p);
        logo = logoBy.get(label) || null;
      } else {
        p = nameToHex(label);
        s = darken20(p);
      }

      if (kind === 'primary')   return cors(txt(p));
      if (kind === 'secondary') return cors(txt(s));
      if (kind === 'json')      return cors(json({ isin: ISIN, fund, amc: label, primary: p, secondary: s, logo }));

      return cors(txt('Not found', 404));
    } catch (e) {
      return cors(txt('Error: ' + e.message, 500));
    }
  }
};

/* ---------- helpers ---------- */
function txt(s, status = 200) {
  return new Response(s, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
function cors(res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  h.set('Access-Control-Allow-Headers', '*');
  return new Response(res.body, { status: res.status, headers: h });
}
const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function detectAMCLabel(fundName, aliases, amcNames){
  const q = norm(fundName);
  if (/\bquantum\b/.test(q)) return { label: 'Quantum', known: true };
  if (/\bquant\b/.test(q))   return { label: 'Quant',   known: true };
  for (const [amc, arr] of Object.entries(aliases || {})) {
    for (const alias of arr) if (q.includes(norm(alias))) return { label: amc, known: true };
  }
  for (const amc of amcNames || []) if (q.includes(norm(amc))) return { label: amc, known: true };
  const tokens = q.split(' ').filter(Boolean);
  const uptoFund = [];
  for (const t of tokens){ if (t==='fund') break; uptoFund.push(t); if (uptoFund.length>=3) break; }
  let label = (uptoFund.length ? uptoFund.join(' ') : tokens.slice(0,2).join(' ')).toUpperCase();
  if (label.length > 12) label = label.split(' ')[0].toUpperCase();
  return { label, known: false };
}
function rgbToHex(r,g,b){ const to2=v=>('0'+Math.max(0,Math.min(255,v|0)).toString(16)).slice(-2); return '#'+to2(r)+to2(g)+to2(b); }
function darken20(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||''); if(!m) return ''; const r=Math.floor(parseInt(m[1],16)*0.8); const g=Math.floor(parseInt(m[2],16)*0.8); const b=Math.floor(parseInt(m[3],16)*0.8); return rgbToHex(r,g,b); }
function nameToHex(name){ let h=0; for(let i=0;i<name.length;i++){h=(h*31 + name.charCodeAt(i))|0;} const hue=Math.abs(h)%360; const sat=58+(Math.abs(h)>>3)%22; const lig=46+(Math.abs(h)>>5)%12; return hsl2rgb(hue,sat,lig); }
function hsl2rgb(H,S,L){ S/=100; L/=100; const C=(1-Math.abs(2*L-1))*S; const X=C*(1-Math.abs((H/60)%2-1)); const m=L-C/2; let r=0,g=0,b=0; if(0<=H&&H<60){r=C;g=X;b=0;} else if(60<=H&&H<120){r=X;g=C;b=0;} else if(120<=H&&H<180){r=0;g=C;b=X;} else if(180<=H&&H<240){r=0;g=X;b=C;} else if(240<=H&&H<300){r=X;g=0;b=C;} else {r=C;g=0;b=X;} return rgbToHex(Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)); }