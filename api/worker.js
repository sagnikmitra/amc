// worker.js — UI + API under /amc/*
//
// API:
//   /amc/<ISIN>/primary
//   /amc/<ISIN>/secondary
//   /amc/<ISIN>/json          // { isin, name, amc, logo, primary, secondary }
//   /amc/<ISIN>/name          // plain text
//   /amc/<ISIN>/logo          // plain text (204 if unknown)
//   /amc/<ISIN>/amc           // plain text
//
// Static: anything else under /amc/* is served from ./public (prefix stripped)

import amcData from './public/amc_data.json';
import isinList from './public/data.json';
import enrichedBase from './public/enriched.json';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    const url = new URL(request.url);

    // Add new kinds here:
    const m = url.pathname.match(/^\/amc\/([A-Za-z0-9]{12})\/(primary|secondary|json|name|logo|amc)$/);
    if (m) {
      const [, isinRaw, kind] = m;
      const ISIN = isinRaw.toUpperCase();

      try {
        const info = getMergedRecord(ISIN);
        if (!info) return cors(txt('ISIN not found', 404));

        if (kind === 'primary')   return cors(txt(info.primary));
        if (kind === 'secondary') return cors(txt(info.secondary));
        if (kind === 'json')      return cors(json(info));
        if (kind === 'name')      return cors(txt(info.name));
        if (kind === 'amc')       return cors(txt(info.amc));
        if (kind === 'logo') {
          if (!info.logo) return cors(new Response(null, { status: 204 })); // no logo known
          return cors(txt(info.logo));
        }

        return cors(txt('Not found', 404));
      } catch (e) {
        return cors(txt('Error: ' + e.message, 500));
      }
    }

    // ---- Static fallback: strip /amc prefix and serve from /public
    let assetPath = url.pathname.replace(/^\/amc\/?/, '/');
    if (assetPath === '/') assetPath = '/index.html';
    const assetUrl = new URL(assetPath, 'http://assets.local');
    return env.ASSETS.fetch(new Request(assetUrl, request));
  }
};

/* ---------------- merge logic ---------------- */

function getMergedRecord(ISIN) {
  // base name from data.json
  const base = isinList.find(x => x && String(x.isin).toUpperCase() === ISIN);
  if (!base) return null;

  // prefilled values (if any) from enriched.json
  const found = (enrichedBase || []).find(x => x && String(x.isin).toUpperCase() === ISIN) || {};
  const name = String(found.name || base.name || '');

  // shortcut: if enriched already has colors/logo/amc, return it (with amc fallback)
  if ((found.primary && found.secondary) || found.logo || found.amc) {
    const COLORS = amcData.colors || [];
    const ALIASES = amcData.aliases || {};
    const { label } = detectAMCLabel(name, ALIASES, COLORS.map(c => c.name));
    return {
      isin: ISIN,
      name,
      amc: found.amc ?? label,
      logo: found.logo ?? null,
      primary: found.primary ?? nameToHex(found.amc ?? label),
      secondary: found.secondary ?? darken20(found.primary ?? nameToHex(found.amc ?? label))
    };
  }

  // compute from amc_data.json
  const COLORS  = amcData.colors  || [];
  const LOGOS   = amcData.logos   || [];
  const ALIASES = amcData.aliases || {};

  const colorBy  = new Map(COLORS.map(x => [x.name, { p: x.primaryHex, s: x.secondaryHex }]));
  const logoBy   = new Map(LOGOS.map(x => [x.name, x.logo]));
  const amcNames = COLORS.map(c => c.name);

  const { label, known } = detectAMCLabel(name, ALIASES, amcNames);

  let p, s, logo = null;
  if (known && colorBy.has(label)) {
    const pair = colorBy.get(label) || {};
    p = pair.p || nameToHex(label);
    s = pair.s || darken20(p);
    logo = logoBy.get(label) || null;
  } else {
    p = nameToHex(label);
    s = darken20(p);
    logo = null;
  }

  return { isin: ISIN, name, amc: label, logo, primary: p, secondary: s };
}

/* ---------------- helpers ---------------- */

function txt(s, status = 200) {
  return new Response(s, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
function cors(res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  h.set('Access-Control-Allow-Headers', '*');
  return new Response(res.body, { status: res.status, headers: h });
}

// ---- AMC detection + color helpers ----
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