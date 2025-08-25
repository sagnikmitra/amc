// ui.js – DOM refs + rendering + tiny toast

import { textOn, darken20, nameToHex } from './color.js';

const $ = id => document.getElementById(id);
export const refs = {
  msg: $('msg'),
  cardEl: $('card'),
  amcNameEl: $('amc-name'),
  hostEl: $('host'),
  logoEl: $('logo'),
  gradEl: $('grad'),
  fundNameEl: $('fund-name'),
  fundIsinEl: $('fund-isin'),
  pchip: $('pchip'),
  schip: $('schip'),
  pcopy: $('pcopy'),
  scopy: $('scopy'),
  isinInput: $('isin'),
  goBtn: $('go'),
  demoBtn: $('demo'),
};

export function showMsg(text){
  refs.msg.textContent = text;
  refs.msg.style.display = 'block';
  refs.cardEl.classList.remove('show');
}

export function hideMsg(){
  refs.msg.style.display = 'none';
}

export function renderAMC({ amcLabel, fundName, isin, known, colorPair, logoUrl }) {
  const p = colorPair?.p || nameToHex(amcLabel);
  const s = colorPair?.s || darken20(p);

  refs.amcNameEl.textContent = amcLabel;
  refs.fundNameEl.textContent = fundName || '—';
  refs.fundIsinEl.textContent = (isin || '—').toUpperCase();

  refs.gradEl.style.background = `linear-gradient(to right, ${p}, ${s})`;
  refs.pchip.textContent = p; refs.pchip.style.background = p; refs.pchip.style.color = textOn(p);
  refs.schip.textContent = s; refs.schip.style.background = s; refs.schip.style.color = textOn(s);

  refs.pcopy.disabled = !p; refs.scopy.disabled = !s;
  refs.pcopy.onclick = async () => { await navigator.clipboard.writeText(p); toast(refs.pcopy); };
  refs.scopy.onclick = async () => { await navigator.clipboard.writeText(s); toast(refs.scopy); };

  if (logoUrl){
    try { refs.hostEl.textContent = new URL(logoUrl).hostname; }
    catch { refs.hostEl.textContent = 'Logo'; }
    refs.logoEl.src = logoUrl;
  } else {
    refs.hostEl.textContent = 'No logo';
    refs.logoEl.removeAttribute('src');
  }

  hideMsg();
  refs.cardEl.classList.add('show');
}

function toast(btn){
  const old = btn.textContent;
  btn.textContent = 'Copied!';
  btn.disabled = true;
  setTimeout(()=>{ btn.textContent = old; btn.disabled = false; }, 700);
}