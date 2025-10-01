
/* BIST Pro v4 — Hisse + Kripto (Client) */
const state = {
  market: localStorage.getItem('bp_market') || 'BIST', // 'BIST' | 'CRYPTO'
  symbol: localStorage.getItem('bp_symbol') || 'BIST:XU100',
  timeframe: localStorage.getItem('bp_timeframe') || '1D',
  watchlist: JSON.parse(localStorage.getItem('bp_watchlist') || '["BIST:XU100","BIST:THYAO","BIST:ASELS","BINANCE:BTCUSDT"]'),
  settings: JSON.parse(localStorage.getItem('bp_settings') || JSON.stringify({
    tick: 0.01, tz: 'Europe/Istanbul', theme: 'dark', serverUrl: '', vapidPublicKey: ''
  })),
  bistList: []
};

// ----- Theme -----
function applyTheme(){ document.documentElement.setAttribute('data-theme', state.settings.theme || 'dark'); }
function toggleTheme(){ state.settings.theme = (state.settings.theme==='dark')?'light':'dark'; saveState(); applyTheme(); }

// ----- Helpers -----
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const roundToTick = (x, tick) => Math.round(x / tick) * tick;
function saveState(){
  localStorage.setItem('bp_market', state.market);
  localStorage.setItem('bp_symbol', state.symbol);
  localStorage.setItem('bp_timeframe', state.timeframe);
  localStorage.setItem('bp_watchlist', JSON.stringify(state.watchlist));
  localStorage.setItem('bp_settings', JSON.stringify(state.settings));
}
function symbolForTV(sym){
  if (state.market==='CRYPTO'){
    // Accept 'BTCUSDT' or 'BINANCE:BTCUSDT'
    if (!sym.includes(':')) return 'BINANCE:'+sym.toUpperCase();
    return sym;
  }
  return sym; // BIST already in format 'BIST:THYAO'
}

// ----- Load BIST list -----
async function loadBistList(){
  try{
    const res = await fetch('./data/bist-tickers.json');
    const arr = await res.json(); state.bistList = arr.map(o=>o.symbol);
    const dl = qs('#bist-list'); dl.innerHTML='';
    state.bistList.forEach(s => { const opt = document.createElement('option'); opt.value = s; dl.appendChild(opt); });
  }catch{}
}

// ----- Screener (BIST / CRYPTO) -----
let currentScreen = 'top_gainers';
function mountScreener(){
  const root = qs('#screenerWrap'); root.innerHTML='';
  if (state.market==='BIST'){
    const wrap = document.createElement('div'); wrap.className='tradingview-widget-container';
    const slot = document.createElement('div'); slot.className='tradingview-widget-container__widget'; wrap.appendChild(slot);
    const s = document.createElement('script'); s.type='text/javascript'; s.async=true;
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    s.innerHTML = JSON.stringify({
      width:"100%", height:540, defaultColumn:"overview", defaultScreen: currentScreen,
      showToolbar:true, locale:"tr", market:"turkey", colorTheme: (state.settings.theme==='dark')?'dark':'light'
    });
    wrap.appendChild(s); root.appendChild(wrap);
    qs('#screenerNote').textContent = 'Kaynak: TradingView Screener (market: turkey).';
  }else{
    // Crypto market widget (list of coins)
    const wrap = document.createElement('div'); wrap.className='tradingview-widget-container';
    const slot = document.createElement('div'); slot.className='tradingview-widget-container__widget'; wrap.appendChild(slot);
    const s = document.createElement('script'); s.type='text/javascript'; s.async=true;
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-cryptocurrency-market.js';
    s.innerHTML = JSON.stringify({
      width:"100%", height:540, colorTheme:(state.settings.theme==='dark')?'dark':'light', locale:"tr",
      isTransparent:false, marketCapFilter:"all", sortBy:"market_cap_desc"
    });
    wrap.appendChild(s); root.appendChild(wrap);
    qs('#screenerNote').textContent = 'Kaynak: TradingView Cryptocurrency Market.';
  }
}

// ----- TradingView Technical & Chart -----
function mountTechSummary(targetId, interval) {
  const root = qs('#'+targetId); root.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'tradingview-widget-container';
  const slot = document.createElement('div'); slot.className = 'tradingview-widget-container__widget'; wrap.appendChild(slot);
  const s = document.createElement('script'); s.type = 'text/javascript'; s.async = true;
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
  s.innerHTML = JSON.stringify({
    symbol: symbolForTV(state.symbol), interval: interval, width: "100%", height: 360,
    colorTheme: (state.settings.theme==='dark')?"dark":"light", displayMode: "single", isTransparent: false, locale: "tr", showIntervalTabs: false
  });
  wrap.appendChild(s); root.appendChild(wrap);
}
function mountAdvancedChart(targetId) {
  const root = qs('#'+targetId); root.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'tradingview-widget-container';
  const slot = document.createElement('div'); slot.className = 'tradingview-widget-container__widget'; wrap.appendChild(slot);
  const s = document.createElement('script'); s.type = 'text/javascript'; s.async = true;
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  s.innerHTML = JSON.stringify({
    autosize: true, symbol: symbolForTV(state.symbol),
    interval: state.timeframe === '1D' ? 'D' : (state.timeframe === '1h' ? '60' : (state.timeframe === '5m' ? '5' : '1')),
    timezone: "Europe/Istanbul", theme: (state.settings.theme==='dark')?"dark":"light",
    style: "1", locale: "tr", enable_publishing: false, allow_symbol_change: false, calendar: false, hide_top_toolbar: false, withdateranges: true, support_host: "https://www.tradingview.com"
  });
  wrap.appendChild(s); root.appendChild(wrap);
}
function mountAll(){ mountTechSummary('tv-tech-1d','1D'); mountTechSummary('tv-tech-1h','1h'); mountTechSummary('tv-tech-1m','1m'); mountAdvancedChart('tv-adv-chart'); }

// ----- Controls -----
function bindControls(){
  // Market switch
  qsa('.seg[aria-label="Pazar"] button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      qsa('.seg[aria-label="Pazar"] button').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
      state.market = btn.dataset.mkt; saveState(); mountScreener(); mountAll();
      // Default symbol for crypto
      if (state.market==='CRYPTO' && !state.symbol.toUpperCase().includes('BTCUSDT')){
        state.symbol = 'BINANCE:BTCUSDT'; qs('#symbolInput').value = state.symbol; saveState(); mountAll();
      }
    });
    if (btn.dataset.mkt === state.market) btn.classList.add('active');
  });
  // Top20 tabs
  qsa('.seg[aria-label="Top20"] button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      qsa('.seg[aria-label="Top20"] button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); currentScreen = btn.dataset.screen; mountScreener();
    });
  });
  // Symbol & timeframe
  const symbolInput = qs('#symbolInput'); symbolInput.value = state.symbol;
  qs('#applyBtn').addEventListener('click', ()=>{
    const val=(symbolInput.value||'').trim(); if(!val) return;
    state.symbol = val; saveState(); mountAll();
  });
  qsa('.seg[aria-label="Görünüm"] button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      qsa('.seg[aria-label="Görünüm"] button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); state.timeframe = btn.dataset.ival; saveState(); mountAll();
    });
    if (btn.dataset.ival===state.timeframe) btn.classList.add('active');
  });
  // Watchlist
  qs('#addWatch').addEventListener('click', ()=>{
    if (!state.watchlist.includes(state.symbol)){ state.watchlist.push(state.symbol); saveState(); renderWatchlist(); }
  });
  // Theme
  qs('#themeBtn').addEventListener('click', toggleTheme);
  // Settings
  const dlg = qs('#settingsDlg');
  qs('#openSettings').addEventListener('click', ()=>{
    qs('#setTheme').value = state.settings.theme;
    qs('#setTick').value = state.settings.tick;
    qs('#setTZ').value = state.settings.tz;
    qs('#setServer').value = state.settings.serverUrl||'';
    qs('#setVapid').value = state.settings.vapidPublicKey||'';
    dlg.showModal();
  });
  qs('#btnSaveSettings').addEventListener('click', (e)=>{
    e.preventDefault();
    state.settings.theme = qs('#setTheme').value;
    state.settings.tick = Math.max(0.0001, Number(qs('#setTick').value||0.01));
    state.settings.tz = qs('#setTZ').value;
    state.settings.serverUrl = qs('#setServer').value.trim();
    state.settings.vapidPublicKey = qs('#setVapid').value.trim();
    saveState(); applyTheme(); mountScreener(); mountAll(); dlg.close();
  });
  // Strategy Lab
  qs('#stAnalyze').addEventListener('click', analyzeStrategy);
  qs('#stBacktest').addEventListener('click', quickBacktest);
  qs('#stAlert').addEventListener('click', createStrategyAlert);
  // Midas quick ticket
  qs('#mdCopy').addEventListener('click', ()=>{
    const side = qs('#mdSide').value; const qty = Number(qs('#mdQty').value||1);
    const typ = qs('#mdType').value; const px = Number(qs('#mdPx').value||0);
    const note = (qs('#mdNote').value||'').trim();
    const txt = `[Midas Emir] ${side} ${state.symbol} ${qty} adet, ${typ}${px?(' @ '+px):''}${note?(' — '+note):''}`;
    navigator.clipboard.writeText(txt).then(()=> alert('Emir metni kopyalandı. Midas uygulamasına geçip yapıştırın.'));
  });
  // Push buttons
  qs('#subPush').addEventListener('click', subscribePush);
  qs('#testPush').addEventListener('click', testPush);
}

// ----- Watchlist UI -----
function renderWatchlist(){
  const ul = qs('#watchlist'); ul.innerHTML='';
  state.watchlist.forEach(sym => {
    const li = document.createElement('li');
    const a = document.createElement('a'); a.href='#'; a.textContent=sym;
    a.addEventListener('click', (e)=>{ e.preventDefault(); state.symbol=sym; qs('#symbolInput').value=sym; saveState(); mountAll(); });
    const rm = document.createElement('span'); rm.className='rm'; rm.textContent='×'; rm.title='Kaldır';
    rm.addEventListener('click', ()=>{ state.watchlist = state.watchlist.filter(s=>s!==sym); saveState(); renderWatchlist(); });
    li.appendChild(a); li.appendChild(rm); ul.appendChild(li);
  });
}

// ----- Risk Calculator -----
function refreshRisk(){
  const eq = Math.max(0, Number(qs('#equity').value||0));
  const rp = Math.max(0, Number(qs('#riskPct').value||0))/100;
  const st = Math.max(0.0001, Number(qs('#stop').value||0.0001));
  const sl = Math.max(0, Number(qs('#slip').value||0));
  const price = Math.max(0.01, Number(qs('#price').value||0.01));
  const tick = Math.max(0.0001, Number(qs('#tick').value||state.settings.tick||0.01));
  const riskAmt = eq * rp; const lots = Math.max(0, Math.floor(riskAmt / (st + sl)));
  const estCost = roundToTick(lots * price, tick);
  qs('#riskOut').innerHTML = `<span class="pill">Maks Risk: <b>${riskAmt.toFixed(2)}</b> TL</span>
    <span class="pill">Önerilen Lot: <b>${isFinite(lots)?lots:0}</b></span>
    <span class="pill">Tahmini Maliyet: <b>${estCost.toFixed(2)}</b> TL</span>`;
}
['equity','riskPct','stop','slip','price','tick'].forEach(id => document.addEventListener('input', e=>{ if(e.target.id===id) refreshRisk(); }));

// ----- Strategy Lab: analyze (server signals) -----
async function analyzeStrategy(){
  const serverUrl = (state.settings.serverUrl||'').trim();
  if (!serverUrl){ alert('Ayarlar > Sunucu URL giriniz.'); return; }
  const sym = state.symbol;
  const isCrypto = (state.market==='CRYPTO');
  const url = isCrypto ? `${serverUrl}/api/crypto/signal?symbol=${encodeURIComponent(sym.replace('BINANCE:',''))}` : `${serverUrl}/api/bist/signal?symbol=${encodeURIComponent(sym)}`;
  const res = await fetch(url);
  const data = await res.json();
  const o = qs('#stOut');
  if (!res.ok){ o.textContent = 'Hata: ' + (data && data.error || res.status); return; }
  const pills = [];
  pills.push(`<span class="pill">Trend(1D): <b>${data.trendUp?'Yukarı':'Aşağı'}</b></span>`);
  pills.push(`<span class="pill">Momentum(1h): <b>${data.momentumUp?'Güçlü':'Zayıf'}</b></span>`);
  pills.push(`<span class="pill">Breakout(5m): <b>${data.breakout?'Evet':'Hayır'}</b></span>`);
  pills.push(`<span class="pill">Skor: <b>${data.score}/3</b></span>`);
  pills.push(`<span class="pill">ATR(1D): <b>${data.atr.toFixed(2)}</b></span>`);
  if (data.entry){ pills.push(`<span class="pill">Öneri: Giriş ${data.entry.toFixed(2)} | Stop ${data.stop.toFixed(2)} | 2R Hedef ${data.target2R.toFixed(2)}</span>`); }
  o.innerHTML = pills.join(' ');
  // Draw simple bar for score
  const ctx = qs('#stChart').getContext('2d'); const W=ctx.canvas.width, H=ctx.canvas.height; ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(40, H-60, (W-80), 20);
  ctx.fillStyle='#41d1c6'; ctx.fillRect(40, H-60, (W-80)*(data.score/3), 20);
  ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('MTF Skor', 40, H-70);
}

// ----- Strategy Lab: quick backtest (client) -----
async function fetchOHLC(range='3mo', interval='1d'){
  const serverUrl = (state.settings.serverUrl||'').trim(); if(!serverUrl) throw new Error('Sunucu URL yok');
  const isCrypto = (state.market==='CRYPTO');
  if (isCrypto){
    const sym = state.symbol.replace('BINANCE:','').toUpperCase();
    const limit = interval==='1d' ? 180 : (interval==='1h' ? 720 : 1000);
    const res = await fetch(`${serverUrl}/api/crypto/ohlc?symbol=${sym}&interval=${interval==='5m'?'5m':(interval==='1h'?'1h':'1d')}&limit=${limit}`);
    if(!res.ok) throw new Error('OHLC alınamadı'); return await res.json();
  }else{
    const sym = state.symbol; // BIST:THYAO
    const res = await fetch(`${serverUrl}/api/bist/ohlc?symbol=${encodeURIComponent(sym)}&range=${range}&interval=${interval}`);
    if(!res.ok) throw new Error('OHLC alınamadı'); return await res.json();
  }
}
async function quickBacktest(){
  try{
    const range = qs('#stRange').value; const atrK = Math.max(0.1, Number(qs('#stATR').value||1.5));
    // Use 1d data for trend + backtest baseline
    const data = await fetchOHLC(range, '1d'); const closes = data.c;
    // Simple breakout system: entry when close > rolling max of last 20; stop = atrK * ATR14; TP = 2R
    const highs=data.h, lows=data.l, times=data.t, opens=data.o;
    // compute ATR14
    const tr = []; const atr = [];
    for(let i=0;i<highs.length;i++){
      const prevClose = i>0?closes[i-1]:closes[i];
      const tr1 = highs[i]-lows[i];
      const tr2 = Math.abs(highs[i]-prevClose);
      const tr3 = Math.abs(lows[i]-prevClose);
      tr.push(Math.max(tr1,tr2,tr3));
      if(i===0) atr.push(tr[0]); else atr.push( (atr[i-1]*13 + tr[i]) / 14 );
    }
    let eq=0, peak=0, dd=0, wins=0, losses=0, rSum=0, trades=0;
    const eqSeries=[];
    for(let i=21;i<closes.length;i++){
      const hh = Math.max(...highs.slice(i-20,i));
      const entry = closes[i] > hh ? closes[i] : null;
      if(entry){
        const stop = entry - atrK*atr[i];
        const risk = entry - stop;
        // Next bars: if price rises 2R -> win, if falls to stop -> loss, else exit at next bar close
        let outcomeR = 0; let j=i+1;
        for(; j<closes.length; j++){
          const h = highs[j], l = lows[j], c = closes[j];
          if (h >= entry + 2*risk){ outcomeR = 2; break; }
          if (l <= stop){ outcomeR = -1; break; }
          if (j===closes.length-1){ outcomeR = (c-entry)/risk; }
        }
        trades++; if(outcomeR>0) wins++; else losses++; rSum += outcomeR; i=j;
        eq += outcomeR; peak = Math.max(peak, eq); dd = Math.max(dd, peak-eq);
      }
      eqSeries.push(eq);
    }
    const wr = trades? (wins/trades):0; const expectancy = trades? (rSum/trades):0;
    const o = qs('#stOut');
    o.innerHTML = `<span class="pill">İşlem: <b>${trades}</b></span>
      <span class="pill">Kazanç Oranı: <b>${(wr*100).toFixed(1)}%</b></span>
      <span class="pill">Expectancy: <b>${expectancy.toFixed(2)} R</b></span>
      <span class="pill">Max DD: <b>${dd.toFixed(2)} R</b></span>`;
    const ctx = qs('#stChart').getContext('2d'); const W=ctx.canvas.width, H=ctx.canvas.height; ctx.clearRect(0,0,W,H);
    // axes
    ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,H-20); ctx.lineTo(W-10,H-20); ctx.stroke();
    // equity
    const yMin = Math.min(...eqSeries,0), yMax = Math.max(...eqSeries,1);
    const xStep=(W-60)/Math.max(1,eqSeries.length-1);
    const yMap=v=> (H-20) - ((v-yMin)/(yMax-yMin))*(H-30);
    ctx.strokeStyle='#41d1c6'; ctx.lineWidth=2; ctx.beginPath();
    eqSeries.forEach((v,i)=>{ const x=40+i*xStep; const y=yMap(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.stroke();
  }catch(e){ qs('#stOut').textContent='Hata: '+e.message; }
}

// ----- Web Push (client) -----
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64); const outputArray = new Uint8Array(rawData.length);
  for (let i=0; i<rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
async function ensureSW(){
  if (!('serviceWorker' in navigator)) throw new Error('SW yok');
  const reg = await navigator.serviceWorker.register('./service-worker.js');
  return reg;
}
async function subscribePush(){
  const serverUrl = (state.settings.serverUrl||'').trim();
  const vapid = (state.settings.vapidPublicKey||'').trim();
  if (!serverUrl || !vapid){ alert('Ayarlar > Sunucu URL + VAPID public key giriniz.'); return; }
  const reg = await ensureSW();
  const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlB64ToUint8Array(vapid) });
  await fetch(serverUrl+'/subscribe', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(sub) });
  alert('Abone oldunuz.');
}
async function testPush(){
  const serverUrl = (state.settings.serverUrl||'').trim(); if(!serverUrl){ alert('Ayarlar > Sunucu URL'); return; }
  await fetch(serverUrl+'/notify-test', {method:'POST'}); alert('Test bildirimi gönderildi.');
}
async function createStrategyAlert(){
  try{
    const serverUrl = (state.settings.serverUrl||'').trim(); if(!serverUrl){ alert('Sunucu URL girin'); return; }
    const reg = await ensureSW(); const sub = await reg.pushManager.getSubscription();
    if (!sub){ await subscribePush(); return; }
    const sym = state.symbol; const type = (state.market==='CRYPTO')?'crypto':'bist';
    const body = { subscription: sub, rule: { type, symbol: sym, cond: 'strategy_mtf_long', params: { atrK: Number(qs('#stATR').value||1.5) } } };
    const res = await fetch(serverUrl+'/alerts/subscribe', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    alert(res.ok?'Kural kaydedildi.':'Kural kaydedilemedi.');
  }catch(e){ alert('Hata: '+e.message); }
}

// ----- Service Worker register -----
if ('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./service-worker.js'); }); }

// ----- Init -----
function init(){
  applyTheme();
  loadBistList();
  bindControls();
  renderWatchlist();
  mountScreener();
  mountAll();
  refreshRisk();
}
document.addEventListener('DOMContentLoaded', init);
