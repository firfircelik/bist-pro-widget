
/* BIST Pro v2 — App logic (PWA, Clock, TradingView embeds, Risk & Monte Carlo, Journal, Watchlist, Settings) */
const loadStateItem = (key, defaultValue) => {
  const item = localStorage.getItem(`bp_${key}`);
  if (item === null) return defaultValue;
  try {
    return JSON.parse(item);
  } catch (e) {
    return item;
  }
};

const state = {
  symbol: loadStateItem('symbol', 'BIST:XU100'),
  timeframe: loadStateItem('timeframe', '1D'),
  watchlist: loadStateItem('watchlist', ["BIST:XU100","BIST:THYAO","BIST:ASELS","BIST:GARAN","BIST:AKBNK","BIST:TUPRS"]),
  settings: loadStateItem('settings', {
    tick: 0.01,
    tz: 'Europe/Istanbul',
    theme: 'dark',
    sessions: {open1:'10:00', breakStart:'13:00', breakEnd:'14:00', close2:'18:00'}
  }),
  market: loadStateItem('market', 'BIST'),
};

// Dynamically load watchlist from bist-tickers.json
async function loadBistTickers() {
  try {
    const response = await fetch('./data/bist-tickers.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Assuming bist-tickers.json is an array of objects with a 'symbol' property
    const symbols = data.map(item => item.symbol);
    if (symbols.length > 0) {
      state.watchlist = symbols;
      saveState();
      renderWatchlist();
    }
  } catch (e) {
    console.error('Failed to load bist-tickers.json:', e);
    // Fallback to hardcoded watchlist already in state
  }
}

loadBistTickers();

// ----- Theme -----
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme || 'dark');
}
function toggleTheme() {
  state.settings.theme = (state.settings.theme === 'dark') ? 'light' : 'dark';
  saveState(); applyTheme();
}

// ----- Helpers -----
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const roundToTick = (x, tick) => Math.round(x / tick) * tick;
function saveState() {
  for (const key in state) {
    const value = state[key];
    localStorage.setItem(`bp_${key}`, typeof value === 'object' ? JSON.stringify(value) : value);
  }
}

// ----- Market Clock -----
function parseHM(t){ const [h,m] = (t||'00:00').split(':').map(n=>+n); return {h:clamp(h,0,23), m:clamp(m,0,59)}; }
function nowInIstanbul() {
  const tz = state.settings.tz === 'local' ? undefined : 'Europe/Istanbul';
  const d = tz ? new Date(new Date().toLocaleString('en-US', {timeZone: tz})) : new Date();
  return d;
}
function fmtTime(d) {
  const pad = n => String(n).padStart(2,'0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function buildTodayTimes() {
  const {open1, breakStart, breakEnd, close2} = state.settings.sessions;
  const base = nowInIstanbul();
  const y=base.getFullYear(), mo=base.getMonth(), da=base.getDate();
  const mk = (hm)=>{ const {h,m}=parseHM(hm); return new Date(y,mo,da,h,m,0); };
  return { tOpen1: mk(open1), tBreakStart: mk(breakStart), tBreakEnd: mk(breakEnd), tClose2: mk(close2) };
}
function humanDur(ms){
  const s=Math.max(0,Math.floor(ms/1000));
  const hh = Math.floor(s/3600);
  const mm = Math.floor((s%3600)/60);
  const ss = s%60;
  const pad = n => String(n).padStart(2,'0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
function updateClockUI(){
  const now = nowInIstanbul();
  qs('#nowIST').textContent = fmtTime(now);

  const {tOpen1, tBreakStart, tBreakEnd, tClose2} = buildTodayTimes();
  qs('#sess1').textContent = `${fmtTime(tOpen1)}–${fmtTime(tBreakStart)}`;
  qs('#break').textContent = `${fmtTime(tBreakStart)}–${fmtTime(tBreakEnd)}`;
  qs('#sess2').textContent = `${fmtTime(tBreakEnd)}–${fmtTime(tClose2)}`;

  let status = 'Kapalı', until = 0;
  if (now < tOpen1) { status = 'Kapalı'; until = tOpen1 - now; }
  else if (now >= tOpen1 && now < tBreakStart) { status = 'Açık (Seans 1)'; until = tBreakStart - now; }
  else if (now >= tBreakStart && now < tBreakEnd) { status = 'Ara'; until = tBreakEnd - now; }
  else if (now >= tBreakEnd && now < tClose2) { status = 'Açık (Seans 2)'; until = tClose2 - now; }
  else { status = 'Kapalı'; const tomorrow = new Date(tOpen1); tomorrow.setDate(tOpen1.getDate()+1); until = tomorrow - now; }
  qs('#mktStatus').textContent = status;
  qs('#countdown').textContent = humanDur(until);
}
setInterval(updateClockUI, 1000);

// ----- TradingView Embeds -----
function mountTechSummary(targetId, interval) {
  const root = qs('#'+targetId);
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'tradingview-widget-container';
  const slot = document.createElement('div');
  slot.className = 'tradingview-widget-container__widget';
  wrap.appendChild(slot);
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
  s.async = true;
  s.innerHTML = JSON.stringify({
    symbol: state.symbol,
    interval: interval, // '1m','5m','1h','1D'
    width: "100%",
    height: 360,
    colorTheme: (state.settings.theme==='dark')?"dark":"light",
    displayMode: "single",
    isTransparent: false,
    locale: "tr",
    showIntervalTabs: false
  });
  wrap.appendChild(s);
  root.appendChild(wrap);
}
function mountAdvancedChart(targetId) {
  const root = qs('#'+targetId);
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'tradingview-widget-container';
  const slot = document.createElement('div');
  slot.className = 'tradingview-widget-container__widget';
  wrap.appendChild(slot);
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  s.async = true;
  s.innerHTML = JSON.stringify({
    autosize: true,
    symbol: state.symbol,
    interval: state.timeframe === '1D' ? 'D' : (state.timeframe === '1h' ? '60' : (state.timeframe === '5m' ? '5' : '1')),
    timezone: "Europe/Istanbul",
    theme: (state.settings.theme==='dark')?"dark":"light",
    style: "1",
    locale: "tr",
    enable_publishing: false,
    allow_symbol_change: false,
    calendar: false,
    hide_top_toolbar: false,
    withdateranges: true,
    support_host: "https://www.tradingview.com"
  });
  wrap.appendChild(s);
  root.appendChild(wrap);
}
function mountAll() {
  mountTechSummary('tv-tech-1d', '1D');
  mountTechSummary('tv-tech-1h', '1h');
  mountTechSummary('tv-tech-1m', '1m');
  mountAdvancedChart('tv-adv-chart');
}

// ----- Controls -----
function bindControls() {
  const symbolInput = qs('#symbolInput');
  symbolInput.value = state.symbol;
  qs('#applyBtn').addEventListener('click', () => {
    const val = (symbolInput.value || '').trim();
    if (!val) return;
    state.symbol = val; saveState(); mountAll(); refreshRisk();
  });
  qsa('.seg button').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.seg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.timeframe = btn.dataset.ival; saveState(); mountAll();
    });
    if (btn.dataset.ival === state.timeframe) btn.classList.add('active');
  });
  qs('#addWatch').addEventListener('click', () => {
    if (!state.watchlist.includes(state.symbol)) { state.watchlist.push(state.symbol); saveState(); renderWatchlist(); }
  });
  // Theme button
  qs('#themeBtn').addEventListener('click', toggleTheme);
  // Settings modal
  const dlg = qs('#settingsDlg');
  qs('#openSettings').addEventListener('click', ()=>{
    qs('#setOpen1').value = state.settings.sessions.open1;
    qs('#setBreakStart').value = state.settings.sessions.breakStart;
    qs('#setBreakEnd').value = state.settings.sessions.breakEnd;
    qs('#setClose2').value = state.settings.sessions.close2;
    qs('#setTick').value = state.settings.tick;
    qs('#setTZ').value = state.settings.tz;
    qs('#setTheme').value = state.settings.theme;
    dlg.showModal();
  });
  qs('#btnSaveSettings').addEventListener('click', (e)=>{
    e.preventDefault();
    state.settings.sessions.open1 = qs('#setOpen1').value || '10:00';
    state.settings.sessions.breakStart = qs('#setBreakStart').value || '13:00';
    state.settings.sessions.breakEnd = qs('#setBreakEnd').value || '14:00';
    state.settings.sessions.close2 = qs('#setClose2').value || '18:00';
    state.settings.tick = Math.max(0.0001, Number(qs('#setTick').value||0.01));
    state.settings.tz = qs('#setTZ').value;
    state.settings.theme = qs('#setTheme').value;
    saveState(); applyTheme(); mountAll(); updateClockUI(); dlg.close();
  });
}

// ----- Watchlist -----
function renderWatchlist() {
  const ul = qs('#watchlist'); ul.innerHTML = '';
  state.watchlist.forEach(sym => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#'; a.textContent = sym;
    a.addEventListener('click', (e)=>{ e.preventDefault(); state.symbol = sym; qs('#symbolInput').value = sym; saveState(); mountAll(); });
    const rm = document.createElement('span');
    rm.className = 'rm'; rm.textContent = '×'; rm.title = 'Kaldır';
    rm.addEventListener('click', ()=>{ state.watchlist = state.watchlist.filter(s => s !== sym); saveState(); renderWatchlist(); });
    li.appendChild(a); li.appendChild(rm); ul.appendChild(li);
  });
  // Export CSV
  qs('#wlExport').addEventListener('click', ()=>{
    const csv = state.watchlist.join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'watchlist.csv'; a.click(); URL.revokeObjectURL(url);
  });
  // Import CSV
  qs('#wlImport').addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const text = await file.text();
    const syms = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    state.watchlist = Array.from(new Set(syms)); saveState(); renderWatchlist();
    e.target.value = '';
  });
}

// ----- Risk Calculator -----
function refreshRisk() {
  const eq = Math.max(0, Number(qs('#equity').value || 0));
  const rp = Math.max(0, Number(qs('#riskPct').value || 0)) / 100;
  const st = Math.max(0.0001, Number(qs('#stop').value || 0.0001));
  const sl = Math.max(0, Number(qs('#slip').value || 0));
  const price = Math.max(0.01, Number(qs('#price').value || 0.01));
  const tick = Math.max(0.0001, Number(qs('#tick').value || state.settings.tick || 0.01));

  const riskAmt = eq * rp;
  const lotsRaw = riskAmt / (st + sl);
  const lots = Math.max(0, Math.floor(lotsRaw));
  const estCost = roundToTick(lots * price, tick);

  const out = qs('#riskOut');
  out.innerHTML = `
    <span class="pill">Maks Risk: <b>${riskAmt.toFixed(2)}</b> TL</span>
    <span class="pill">Önerilen Lot: <b>${isFinite(lots) ? lots : 0}</b></span>
    <span class="pill">Tahmini Maliyet: <b>${estCost.toFixed(2)}</b> TL</span>
    <span class="pill">Tick: <b>${tick}</b></span>
  `;
}
['equity','riskPct','stop','slip','price','tick'].forEach(id => {
  document.addEventListener('input', (e) => { if(e.target.id === id) refreshRisk(); });
});

// ----- Monte Carlo -----
function drawMCChart(ctx, series) {
  // series: array of equity curves (downsampled)
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0,0,W,H);
  // axes
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,H-20); ctx.lineTo(W-10,H-20); ctx.stroke();
  // compute min/max
  let minY = Infinity, maxY = -Infinity;
  for (const s of series) for (const y of s) { if (y<minY) minY=y; if (y>maxY) maxY=y; }
  if (!isFinite(minY) || !isFinite(maxY)) return;
  if (minY === maxY) { minY*=0.9; maxY*=1.1; }
  const xStep = (W-60)/(series[0].length-1);
  const yMap = v => (H-20) - ( (v - minY) / (maxY - minY) ) * (H-30);
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 1;
  for (const s of series) {
    ctx.beginPath(); ctx.strokeStyle = '#41d1c6';
    s.forEach((v,i) => { const x=40 + i*xStep; const y=yMap(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // labels
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`Min: ${minY.toFixed(0)} TL`, 50, 18);
  ctx.fillText(`Max: ${maxY.toFixed(0)} TL`, 150, 18);
}
function runMonteCarlo() {
  const eq0 = Math.max(0, Number(qs('#mcEquity').value||0));
  const risk = Math.max(0, Number(qs('#mcRisk').value||0))/100;
  const win = clamp(Number(qs('#mcWin').value||0),0,100)/100;
  const rr = Math.max(0.0001, Number(qs('#mcRR').value||0));
  const N = Math.max(1, Number(qs('#mcN').value||1));
  const runs = Math.max(100, Number(qs('#mcRuns').value||1000));

  const curves = [];
  const finals = new Float64Array(runs);
  let ruin20 = 0, ruin50 = 0;
  for (let r=0; r<runs; r++) {
    let eq = eq0, peak = eq0, ddMax = 0;
    const path = new Float64Array(N);
    for (let i=0;i<N;i++) {
      // Bernoulli win/loss
      const u = Math.random();
      if (u < win) eq *= (1 + risk*rr);
      else eq *= (1 - risk);
      peak = Math.max(peak, eq);
      ddMax = Math.max(ddMax, (peak-eq)/peak);
      path[i] = eq;
    }
    finals[r] = eq;
    if (ddMax >= 0.2) ruin20++;
    if (ddMax >= 0.5) ruin50++;
    // Downsample to 200 points max for chart perf
    const ds = [];
    const step = Math.max(1, Math.floor(N/200));
    for (let i=0;i<N;i+=step) ds.push(path[i]);
    curves.push(ds);
  }
  // Stats
  const sorted = Array.from(finals).sort((a,b)=>a-b);
  const mean = Array.from(finals).reduce((a,b)=>a+b,0)/runs;
  const pct = (p)=> sorted[Math.floor(clamp(p,0,1)*(runs-1))];
  const med = pct(0.5), p05 = pct(0.05), p95 = pct(0.95);
  const out = qs('#mcOut');
  const expPerTrade = (win*rr - (1-win)*1); // in R units
  out.innerHTML = `
    <span class="pill">Beklenen R/işlem: <b>${expPerTrade.toFixed(3)}</b></span>
    <span class="pill">Ortalama Son: <b>${mean.toFixed(0)}</b> TL</span>
    <span class="pill">Medyan Son: <b>${med.toFixed(0)}</b> TL</span>
    <span class="pill">%5–%95 Bant: <b>${p05.toFixed(0)}–${p95.toFixed(0)}</b> TL</span>
    <span class="pill">≥20% DD olasılığı: <b>${(ruin20/runs*100).toFixed(1)}%</b></span>
    <span class="pill">≥50% DD olasılığı: <b>${(ruin50/runs*100).toFixed(1)}%</b></span>
  `;
  const ctx = qs('#mcChart').getContext('2d');
  drawMCChart(ctx, curves.slice(0, 60)); // show first 60 curves to keep it readable
}
function bindMC() {
  qs('#mcRun').addEventListener('click', runMonteCarlo);
  qs('#mcReset').addEventListener('click', ()=>{
    ['mcEquity','mcRisk','mcWin','mcRR','mcN','mcRuns'].forEach((id,i)=>{
      const v = [1000,1.0,45,1.5,100,2000][i]; qs('#'+id).value = v;
    });
    qs('#mcOut').innerHTML=''; const ctx = qs('#mcChart').getContext('2d'); ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  });
}

// ----- Journal -----
function jnlLoad() { try { return JSON.parse(localStorage.getItem('bp_journal') || '[]'); } catch { return []; } }
function jnlSave(rows) { localStorage.setItem('bp_journal', JSON.stringify(rows)); }
function jnlRender() {
  const tbody = qs('#jnl-table tbody');
  tbody.innerHTML = '';
  const rows = jnlLoad();
  // sort by date asc
  rows.sort((a,b)=> (new Date(a.date||0)) - (new Date(b.date||0)));
  for (const [i,r] of rows.entries()) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.date||''}</td><td>${r.symbol||''}</td><td>${r.side||''}</td>
      <td>${r.entry||''}</td><td>${r.stop||''}</td><td>${r.target||''}</td><td>${r.risk||''}</td><td>${r.result||''}</td><td>${r.notes||''}</td>
      <td><button class="btn danger jnl-del" data-i="${i}">Sil</button></td>`;
    tbody.appendChild(tr);
  }
  qsa('.jnl-del').forEach(b => b.addEventListener('click', ()=>{
    const i = Number(b.dataset.i);
    const rows = jnlLoad(); rows.splice(i,1); jnlSave(rows); jnlRender(); drawEqCurve();
  }));
  updateStats(); drawEqCurve();
}
function jnlBind() {
  qs('#jnl-add').addEventListener('click', ()=>{
    const r = {
      date: qs('#jnl-date').value || new Date().toISOString(),
      symbol: qs('#jnl-symbol').value || state.symbol,
      side: qs('#jnl-side').value || 'Long',
      entry: Number(qs('#jnl-entry').value||'')||'',
      stop: Number(qs('#jnl-stop').value||'')||'',
      target: Number(qs('#jnl-target').value||'')||'',
      risk: Number(qs('#jnl-risk').value||'')||'',
      result: Number(qs('#jnl-result').value||'')||'',
      notes: qs('#jnl-notes').value||''
    };
    const rows = jnlLoad(); rows.push(r); jnlSave(rows); jnlRender();
    ['jnl-entry','jnl-stop','jnl-target','jnl-risk','jnl-result','jnl-notes'].forEach(id => qs('#'+id).value='');
  });
  qs('#jnl-export').addEventListener('click', ()=>{
    const rows = jnlLoad();
    const headers = ['date','symbol','side','entry','stop','target','risk','result','notes'];
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => JSON.stringify(r[h]??'')).join(','))).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bist-pro-journal.csv'; a.click();
    URL.revokeObjectURL(url);
  });
  qs('#jnl-import').addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$|\r/g,''));
    const idx = {date:headers.indexOf('date'), symbol:headers.indexOf('symbol'), side:headers.indexOf('side'),
      entry:headers.indexOf('entry'), stop:headers.indexOf('stop'), target:headers.indexOf('target'),
      risk:headers.indexOf('risk'), result:headers.indexOf('result'), notes:headers.indexOf('notes')};
    const rows = jnlLoad();
    for (let i=1;i<lines.length;i++){
      const cells = lines[i].split(',').map(c=>c.replace(/^"|"$|\r/g,''));
      if (!cells.length) continue;
      rows.push({
        date: cells[idx.date]||'',
        symbol: cells[idx.symbol]||'',
        side: cells[idx.side]||'',
        entry: Number(cells[idx.entry]||'')||'',
        stop: Number(cells[idx.stop]||'')||'',
        target: Number(cells[idx.target]||'')||'',
        risk: Number(cells[idx.risk]||'')||'',
        result: Number(cells[idx.result]||'')||'',
        notes: cells[idx.notes]||''
      });
    }
    jnlSave(rows); jnlRender(); e.target.value='';
  });
  qs('#jnl-clear').addEventListener('click', ()=>{
    if (confirm('Tüm günlük silinsin mi?')) { jnlSave([]); jnlRender(); drawEqCurve(); }
  });
}

// ----- Journal stats & equity curve -----
function updateStats(){
  const rows = jnlLoad();
  const n = rows.length;
  let wins=0, losses=0, pnl=0, sumWin=0, sumLoss=0, rList=[];
  for (const r of rows){
    const res = Number(r.result||0); pnl += res;
    if (res>0){ wins++; sumWin+=res; } else if (res<0){ losses++; sumLoss+=res; }
    const risk = Number(r.risk||0); if (risk>0) rList.push(res/risk);
  }
  const wr = n ? wins/n : 0;
  const avgW = wins? (sumWin/wins):0;
  const avgL = losses? (sumLoss/losses):0;
  const expectancy = (wr*avgW + (1-wr)*avgL); // per trade in TRY
  // Max DD on equity curve
  let eq=0, peak=0, dd=0; // equity as cumulative PnL
  for (const r of rows){ eq += Number(r.result||0); peak = Math.max(peak, eq); dd = Math.max(dd, (peak-eq)); }
  const stat = (h,v)=>`<div class="stat"><div class="h">${h}</div><div class="v">${v}</div></div>`;
  qs('#jnl-stats').innerHTML = [
    stat('Toplam İşlem', n),
    stat('Kazanma Oranı', (wr*100).toFixed(1)+'%'),
    stat('Ortalama Kazanç', avgW.toFixed(2)+' TL'),
    stat('Ortalama Kayıp', avgL.toFixed(2)+' TL'),
    stat('Expectancy (TRY/işlem)', expectancy.toFixed(2)),
    stat('Max Drawdown (TRY)', dd.toFixed(2)),
    stat('Toplam PnL', pnl.toFixed(2)+' TL'),
    stat('Ortalama R (varsa risk)', rList.length? (rList.reduce((a,b)=>a+b,0)/rList.length).toFixed(2) : '—'),
  ].join('');
}
function drawEqCurve(){
  const rows = jnlLoad();
  const ctx = qs('#eqChart').getContext('2d');
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0,0,W,H);
  // Build cumulative equity
  let eq=0;
  const xs=[], ys=[];
  rows.sort((a,b)=> (new Date(a.date||0)) - (new Date(b.date||0)));
  for (const r of rows){ eq += Number(r.result||0); xs.push(xs.length); ys.push(eq); }
  if (ys.length === 0){ return; }
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const yMin = minY===maxY ? minY-1 : minY, yMax = minY===maxY ? maxY+1 : maxY;
  const xStep = (W-60)/Math.max(1,xs.length-1);
  const yMap = v => (H-20) - ( (v - yMin) / (yMax - yMin) ) * (H-30);
  // axes
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,H-20); ctx.lineTo(W-10,H-20); ctx.stroke();
  // line
  ctx.strokeStyle = '#41d1c6'; ctx.lineWidth = 2; ctx.beginPath();
  ys.forEach((v,i)=>{ const x=40+i*xStep; const y=yMap(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  // labels
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(`Son PnL: ${ys[ys.length-1].toFixed(2)} TL`, 50, 18);
}

// ----- Share & Install -----
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  qs('#installBtn').hidden = false;
});
qs('#installBtn').addEventListener('click', async ()=>{
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  qs('#installBtn').hidden = true;
});
qs('#shareBtn').addEventListener('click', async ()=>{
  try {
    if (navigator.share) { await navigator.share({title:'BIST Pro v2', text:'BIST Pro v2 PWA', url: location.href}); }
    else { await navigator.clipboard.writeText(location.href); alert('Bağlantı panoya kopyalandı.'); }
  } catch {}
});

// ----- Service Worker -----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}

// ----- Init -----
function init() {
  applyTheme();
  qs('#symbolInput').value = state.symbol;
  qsa('.seg button').forEach(b => b.classList.remove('active'));
  (qsa('.seg button').find(b => b.dataset.ival === state.timeframe) || qsa('.seg button')[0]).classList.add('active');
  bindControls();
  renderWatchlist();
  mountAll();
  refreshRisk();
  jnlBind(); jnlRender();
  bindMC();
  updateClockUI();
}
document.addEventListener('DOMContentLoaded', init);
