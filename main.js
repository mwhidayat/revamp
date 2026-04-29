// Alpha Factor — Shared Components & Chart Engine

// ── Navigation ──
function renderNav(activePage) {
  const pages = [
    { href: '../index.html', label: 'Home' },
    { href: '../pages/about.html', label: 'About' },
    { href: '../pages/catalog.html', label: 'Factor Data' },
    { href: '../pages/blog.html', label: 'Research Notes' },
    { href: '../pages/contact.html', label: 'Contact' },
  ];
  const links = pages.map(p =>
    `<a href="${p.href}" class="${p.label === activePage ? 'active' : ''}">${p.label}</a>`
  ).join('');
  return `
    <nav class="nav">
      <div class="container nav-inner">
        <a href="../index.html" class="nav-logo">Alpha<span>Factor</span></a>
        <div class="nav-links">
          ${links}
          <a href="../pages/login.html" class="nav-links" style="color:var(--text-muted);font-size:.875rem;padding:8px 12px;">Login</a>
          <a href="../pages/contact.html" class="btn btn-primary btn-sm nav-cta">Institutional Inquiry</a>
        </div>
      </div>
    </nav>`;
}

function renderNavHome(activePage) {
  const pages = [
    { href: 'index.html', label: 'Home' },
    { href: 'pages/about.html', label: 'About' },
    { href: 'pages/catalog.html', label: 'Factor Data' },
    { href: 'pages/blog.html', label: 'Research Notes' },
    { href: 'pages/contact.html', label: 'Contact' },
  ];
  const links = pages.map(p =>
    `<a href="${p.href}" class="${p.label === activePage ? 'active' : ''}">${p.label}</a>`
  ).join('');
  return `
    <nav class="nav">
      <div class="container nav-inner">
        <a href="index.html" class="nav-logo">Alpha<span>Factor</span></a>
        <div class="nav-links">
          ${links}
          <a href="pages/login.html" style="color:var(--text-muted);font-size:.875rem;padding:8px 12px;">Login</a>
          <a href="pages/contact.html" class="btn btn-primary btn-sm nav-cta">Institutional Inquiry</a>
        </div>
      </div>
    </nav>`;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer-top">
          <div>
            <div class="footer-brand">Alpha<span>Factor</span></div>
            <p class="footer-desc">Institutional-grade factor data, built on empirical validation and academic rigour. Serving quantitative researchers and institutional investors.</p>
          </div>
          <div>
            <div class="footer-heading">Platform</div>
            <ul class="footer-links">
              <li><a href="pages/catalog.html">Factor Catalog</a></li>
              <li><a href="pages/about.html">Methodology</a></li>
              <li><a href="pages/blog.html">Research Notes</a></li>
              <li><a href="pages/login.html">Subscriber Login</a></li>
            </ul>
          </div>
          <div>
            <div class="footer-heading">Company</div>
            <ul class="footer-links">
              <li><a href="pages/about.html">About Us</a></li>
              <li><a href="pages/contact.html">Contact</a></li>
              <li><a href="pages/contact.html">Institutional Access</a></li>
            </ul>
          </div>
          <div>
            <div class="footer-heading">Legal</div>
            <ul class="footer-links">
              <li><a href="#">Terms of Use</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Data Licence</a></li>
              <li><a href="#">Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span class="footer-legal">© 2025 Alpha Factor Research Ltd. All rights reserved.</span>
        </div>
        <p class="footer-disclaimer">Past performance of any factor or portfolio presented on this site does not guarantee future results. All data is provided for informational and research purposes only and does not constitute investment advice. Factor datasets are backtested and subject to look-ahead bias, survivorship bias, and other limitations inherent to historical simulation. Alpha Factor Research Ltd is not a registered investment adviser.</p>
      </div>
    </footer>`;
}

// ── Chart Engine ──
class FactorChartEngine {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
    this.W = rect.width;
    this.H = rect.height;
    this.draw();
  }

  // Seeded random for deterministic charts
  rand(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // Generate equity curve data
  genEquityCurve(seed, n, annualVol, annualReturn, drawdownProb) {
    const r = this.rand(seed);
    const dailyRet = annualReturn / 252;
    const dailyVol = annualVol / Math.sqrt(252);
    let val = 100, vals = [100];
    for (let i = 1; i < n; i++) {
      const shock = (r() - 0.5) * 2 * dailyVol * 2.5;
      const drawdown = r() < drawdownProb ? -(r() * 0.015) : 0;
      val *= (1 + dailyRet + shock + drawdown);
      vals.push(val);
    }
    return vals;
  }

  genDrawdown(equityCurve) {
    let peak = equityCurve[0], dds = [];
    for (let v of equityCurve) {
      if (v > peak) peak = v;
      dds.push(((v - peak) / peak) * 100);
    }
    return dds;
  }

  genRollingSharpe(seed, n, base) {
    const r = this.rand(seed + 99);
    let vals = [base];
    for (let i = 1; i < n; i++) {
      const change = (r() - 0.5) * 0.3;
      vals.push(Math.max(-0.5, Math.min(3.5, vals[i-1] + change)));
    }
    return vals;
  }

  // Draw line chart
  drawLine(data, color, fillColor, yMin, yMax, pad = {t:20,r:16,b:30,l:48}) {
    const ctx = this.ctx;
    const { W, H } = this;
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const xScale = (i) => pad.l + (i / (data.length - 1)) * pw;
    const yScale = (v) => pad.t + ph - ((v - yMin) / (yMax - yMin)) * ph;

    // Grid
    ctx.strokeStyle = '#E8ECEF';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * ph;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      const val = yMax - (i / 4) * (yMax - yMin);
      ctx.fillStyle = '#9AA5AE'; ctx.font = '10px Roboto Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), pad.l - 6, y + 3);
    }

    // Fill
    if (fillColor) {
      ctx.beginPath();
      ctx.moveTo(xScale(0), yScale(data[0]));
      data.forEach((v, i) => ctx.lineTo(xScale(i), yScale(v)));
      ctx.lineTo(xScale(data.length - 1), pad.t + ph);
      ctx.lineTo(xScale(0), pad.t + ph);
      ctx.closePath();
      ctx.fillStyle = fillColor; ctx.fill();
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    data.forEach((v, i) => {
      if (i === 0) ctx.moveTo(xScale(i), yScale(v));
      else ctx.lineTo(xScale(i), yScale(v));
    });
    ctx.stroke();

    // X labels
    ctx.fillStyle = '#9AA5AE'; ctx.font = '10px Lato, sans-serif'; ctx.textAlign = 'center';
    const xLabels = this.config.xLabels || [];
    const step = Math.floor((data.length - 1) / (xLabels.length - 1));
    xLabels.forEach((label, i) => {
      ctx.fillText(label, xScale(i * step), H - 6);
    });
  }

  drawHeatmap(data, pad = {t:24,r:16,b:40,l:36}) {
    const ctx = this.ctx;
    const { W, H } = this;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const years = data.map(d => d.year);
    const cellW = (W - pad.l - pad.r) / 12;
    const cellH = (H - pad.t - pad.b) / years.length;

    data.forEach((row, yi) => {
      row.values.forEach((val, mi) => {
        const x = pad.l + mi * cellW;
        const y = pad.t + yi * cellH;
        const intensity = Math.min(Math.abs(val) / 5, 1);
        const color = val >= 0
          ? `rgba(39,174,96,${0.15 + intensity * 0.7})`
          : `rgba(231,76,60,${0.15 + intensity * 0.7})`;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        ctx.fillStyle = Math.abs(val) > 2 ? '#fff' : (val >= 0 ? '#1E8449' : '#922B21');
        ctx.font = '9px Roboto Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText(val.toFixed(1) + '%', x + cellW/2, y + cellH/2 + 3);
      });
      ctx.fillStyle = '#9AA5AE'; ctx.font = '10px Lato, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(row.year, pad.l - 4, pad.t + yi * cellH + cellH/2 + 3);
    });
    months.forEach((m, mi) => {
      ctx.fillStyle = '#9AA5AE'; ctx.font = '10px Lato, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(m, pad.l + mi * cellW + cellW/2, H - 6);
    });
  }

  drawBars(data, colors, pad = {t:20,r:16,b:30,l:48}) {
    const ctx = this.ctx;
    const { W, H } = this;
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const max = Math.max(...data.map(Math.abs)) * 1.1;
    const barW = (pw / data.length) * 0.7;
    const zeroY = pad.t + ph * (max / (2 * max));

    ctx.strokeStyle = '#E8ECEF'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, zeroY); ctx.lineTo(pad.l + pw, zeroY); ctx.stroke();

    data.forEach((v, i) => {
      const x = pad.l + (i / data.length) * pw + (pw / data.length - barW) / 2;
      const barH = (Math.abs(v) / max) * (ph / 2);
      const y = v >= 0 ? zeroY - barH : zeroY;
      ctx.fillStyle = v >= 0 ? 'rgba(39,174,96,0.7)' : 'rgba(231,76,60,0.7)';
      ctx.fillRect(x, y, barW, barH);
    });
  }

  draw() {
    const ctx = this.ctx;
    const { W, H } = this;
    ctx.clearRect(0, 0, W, H);

    const cfg = this.config;
    const seed = cfg.seed || 42;
    const n = 252 * (cfg.years || 2);

    if (cfg.type === 'equity') {
      const data = this.genEquityCurve(seed, n, cfg.vol || 0.12, cfg.ret || 0.08, cfg.ddProb || 0.05);
      const min = Math.min(...data), max = Math.max(...data);
      const pad = max - min;
      this.drawLine(data, '#1A5276', 'rgba(26,82,118,0.07)', min - pad*0.05, max + pad*0.05);
    } else if (cfg.type === 'drawdown') {
      const equity = this.genEquityCurve(seed, n, cfg.vol || 0.12, cfg.ret || 0.08, cfg.ddProb || 0.05);
      const data = this.genDrawdown(equity);
      const min = Math.min(...data);
      this.drawLine(data, '#E74C3C', 'rgba(231,76,60,0.1)', min * 1.1, 1);
    } else if (cfg.type === 'sharpe') {
      const data = this.genRollingSharpe(seed, Math.floor(n / 21), cfg.sharpe || 1.2);
      this.drawLine(data, '#27AE60', null, -0.5, 3.5);
    } else if (cfg.type === 'heatmap') {
      const r = this.rand(seed + 1000);
      const years = cfg.years || 2;
      const data = [];
      for (let y = 2025 - years + 1; y <= 2025; y++) {
        const values = Array.from({length: 12}, () => ((r() - 0.47) * 10).toFixed(1) * 1);
        data.push({ year: y, values });
      }
      this.drawHeatmap(data);
    } else if (cfg.type === 'spread') {
      const r = this.rand(seed + 500);
      const data = Array.from({length: n}, () => (r() - 0.5) * 2 * 0.04);
      let cum = 0, vals = [];
      data.forEach(v => { cum += v; vals.push(cum); });
      const min = Math.min(...vals), max = Math.max(...vals);
      this.drawLine(vals, '#8E44AD', 'rgba(142,68,173,0.07)', min * 1.1, max * 1.1);
    } else if (cfg.type === 'turnover') {
      const r = this.rand(seed + 750);
      const data = Array.from({length: 52}, () => 0.1 + r() * 0.5);
      this.drawBars(data, ['rgba(26,82,118,0.6)']);
    }
  }
}

// ── Init charts on page ──
function initCharts(configs) {
  configs.forEach(cfg => {
    const canvas = document.getElementById(cfg.id);
    if (!canvas) return;
    new FactorChartEngine(canvas, cfg);
  });
}

// ── Tabs ──
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.tabs').dataset.group;
      document.querySelectorAll(`[data-group="${group}"] .tab-btn`).forEach(b => b.classList.remove('active'));
      document.querySelectorAll(`.tab-panel[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`.tab-panel[data-group="${group}"][data-tab="${btn.dataset.tab}"]`)?.classList.add('active');
    });
  });
}

// ── Catalog filter ──
function initCatalogFilter() {
  const search = document.getElementById('factor-search');
  const catFilter = document.getElementById('cat-filter');
  const tierFilter = document.getElementById('tier-filter');
  const cards = document.querySelectorAll('.factor-card-wrap');

  function filter() {
    const q = search ? search.value.toLowerCase() : '';
    const cat = catFilter ? catFilter.value : '';
    const tier = tierFilter ? tierFilter.value : '';
    cards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const cardCat = card.dataset.cat || '';
      const cardTier = card.dataset.tier || '';
      const show = (!q || name.includes(q)) &&
                   (!cat || cardCat === cat) &&
                   (!tier || cardTier === tier);
      card.style.display = show ? '' : 'none';
    });
  }

  if (search) search.addEventListener('input', filter);
  if (catFilter) catFilter.addEventListener('change', filter);
  if (tierFilter) tierFilter.addEventListener('change', filter);
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initCatalogFilter();
});
