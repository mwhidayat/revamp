(() => {
  const instances = new WeakMap();

  const rnd = (seed) => {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  };

  const lineData = (seed, n = 72, start = 100, drift = 0.2, vol = 1.0) => {
    const r = rnd(seed);
    const out = [start];
    let v = start;
    for (let i = 1; i < n; i++) {
      v = Math.max(
        18,
        v * (1 + drift / 100 + ((r() - 0.5) * vol) / 100 + Math.sin(i / 7) * 0.001)
      );
      out.push(v);
    }
    return out;
  };

  const barData = (seed, n = 24) =>
    Array.from({ length: n }, (_, i) =>
      +(
        Math.sin(i / 3) * 0.8 +
        (rnd(seed)() - 0.5) * 1.6
      ).toFixed(1)
    );

  const heatData = (seed, rows = 5) => {
    const r = rnd(seed);
    const out = [];
    for (let y = 0; y < rows; y++) {
      const values = [];
      for (let x = 0; x < 12; x++) {
        values.push(
          +(
            Math.sin(x / 2 + y * 0.6) * 2 +
            (r() - 0.5) * 2.2
          ).toFixed(1)
        );
      }
      out.push({ year: String(2021 + y), values });
    }
    return out;
  };

  class Chart {
    constructor(canvas, cfg) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cfg = cfg || {};
      this.dpr = window.devicePixelRatio || 1;
      this.raf = 0;

      this.resize = this.resize.bind(this);
      this.draw = this.draw.bind(this);

      this.resize();

      if ('ResizeObserver' in window) {
        this.ro = new ResizeObserver(() => this.queueResize());
        this.ro.observe(canvas.parentElement);
      } else {
        window.addEventListener('resize', this.queueResize.bind(this), { passive: true });
      }
    }

    queueResize() {
      if (this.raf) return;
      this.raf = window.requestAnimationFrame(() => {
        this.raf = 0;
        this.resize();
      });
    }

    resize() {
      const wrap = this.canvas.parentElement;
      if (!wrap || !this.ctx) return;

      const rect = wrap.getBoundingClientRect();
      const css = window.getComputedStyle(this.canvas);

      const nextW = Math.max(260, Math.floor(rect.width));
      const cssHeight = parseFloat(css.height) || 380;
      const nextH = Math.max(320, Math.floor(cssHeight));

      if (nextW === this.W && nextH === this.H) return;

      this.W = nextW;
      this.H = nextH;

      this.canvas.width = Math.round(this.W * this.dpr);
      this.canvas.height = Math.round(this.H * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.draw();
    }

    clear() {
      this.ctx.fillStyle = 'rgba(255,255,255,.98)';
      this.ctx.fillRect(0, 0, this.W, this.H);
    }

    line(data, color = '#0B6E6E', fill = 'rgba(11,110,110,.10)') {
      const pad = { t: 18, r: 18, b: 28, l: 50 };
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const pw = W - pad.l - pad.r;
      const ph = H - pad.t - pad.b;
      const min = Math.min(...data) * 0.96;
      const max = Math.max(...data) * 1.04;

      ctx.strokeStyle = 'rgba(22,42,74,.08)';
      ctx.fillStyle = '#7A96B4';
      ctx.font = '10px Space Mono, monospace';
      ctx.textAlign = 'right';

      for (let i = 0; i <= 4; i++) {
        const yy = pad.t + (i / 4) * ph;
        ctx.beginPath();
        ctx.moveTo(pad.l, yy);
        ctx.lineTo(pad.l + pw, yy);
        ctx.stroke();
        ctx.fillText((max - (i / 4) * (max - min)).toFixed(1), pad.l - 8, yy + 3);
      }

      const x = (i) => pad.l + (i / (data.length - 1)) * pw;
      const y = (v) => pad.t + ph - ((v - min) / (max - min)) * ph;

      if (fill) {
        ctx.beginPath();
        ctx.moveTo(x(0), y(data[0]));
        data.forEach((v, i) => ctx.lineTo(x(i), y(v)));
        ctx.lineTo(x(data.length - 1), pad.t + ph);
        ctx.lineTo(x(0), pad.t + ph);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      data.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
      ctx.stroke();
    }

    lines(seriesData) {
      const pad = { t: 45, r: 18, b: 38, l: 55 };
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const pw = W - pad.l - pad.r;
      const ph = H - pad.t - pad.b;
      
      // Find global min/max across all series
      let globalMin = Infinity;
      let globalMax = -Infinity;
      
      seriesData.forEach(series => {
        const min = Math.min(...series.data) * 0.96;
        const max = Math.max(...series.data) * 1.04;
        globalMin = Math.min(globalMin, min);
        globalMax = Math.max(globalMax, max);
      });
      
      const min = globalMin;
      const max = globalMax;

      // Draw horizontal grid lines
      ctx.strokeStyle = 'rgba(22,42,74,.08)';
      ctx.fillStyle = '#7A96B4';
      ctx.font = '10px Space Mono, monospace';
      ctx.textAlign = 'right';

      for (let i = 0; i <= 4; i++) {
        const yy = pad.t + (i / 4) * ph;
        ctx.beginPath();
        ctx.moveTo(pad.l, yy);
        ctx.lineTo(pad.l + pw, yy);
        ctx.stroke();
        ctx.fillText((max - (i / 4) * (max - min)).toFixed(0), pad.l - 8, yy + 3);
      }

      // Draw vertical grid lines
      for (let i = 1; i <= 3; i++) {
        const xx = pad.l + (i / 4) * pw;
        ctx.beginPath();
        ctx.moveTo(xx, pad.t);
        ctx.lineTo(xx, pad.t + ph);
        ctx.stroke();
      }

      const x = (i) => pad.l + (i / (seriesData[0].data.length - 1)) * pw;
      const y = (v) => pad.t + ph - ((v - min) / (max - min)) * ph;

      // Draw each line
      seriesData.forEach(series => {
        ctx.beginPath();
        ctx.strokeStyle = series.lineColor;
        ctx.lineWidth = 2.5;
        series.data.forEach((v, i) => {
          if (i === 0) {
            ctx.moveTo(x(i), y(v));
          } else {
            ctx.lineTo(x(i), y(v));
          }
        });
        ctx.stroke();
      });

      // Draw legend
      const legendY = 22;
      let legendX = pad.l;
      seriesData.forEach((series, idx) => {
        ctx.fillStyle = series.lineColor;
        ctx.fillRect(legendX, legendY, 12, 12);
        ctx.fillStyle = '#2C3E50';
        ctx.font = 'bold 10px Space Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(series.name, legendX + 16, legendY + 10);
        legendX += 80 + ctx.measureText(series.name).width;
      });

      // X-axis labels
      ctx.fillStyle = '#7A96B4';
      ctx.font = '9px Space Mono, monospace';
      ctx.textAlign = 'center';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const labelStep = seriesData[0].data.length / months.length;
      for (let i = 0; i < months.length; i++) {
        const idx = Math.floor(i * labelStep);
        if (idx < seriesData[0].data.length) {
          ctx.fillText(months[i], x(idx), H - 10);
        }
      }
    }

    bars(data) {
      const pad = { t: 18, r: 18, b: 24, l: 42 };
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const ph = H - pad.t - pad.b;
      const pw = W - pad.l - pad.r;
      const max = Math.max(...data.map((v) => Math.abs(v))) || 1;
      const zeroY = pad.t + ph / 2;
      const step = pw / data.length;
      const barW = step * 0.7;

      ctx.strokeStyle = 'rgba(22,42,74,.08)';
      ctx.beginPath();
      ctx.moveTo(pad.l, zeroY);
      ctx.lineTo(pad.l + pw, zeroY);
      ctx.stroke();

      data.forEach((v, i) => {
        const h = (Math.abs(v) / max) * (ph * 0.42);
        const x = pad.l + i * step + (step - barW) / 2;
        const y = v >= 0 ? zeroY - h : zeroY;
        ctx.fillStyle = v >= 0 ? 'rgba(23,122,80,.72)' : 'rgba(190,50,50,.72)';
        ctx.fillRect(x, y, barW, h);
      });
    }

    heat(data) {
      const pad = { t: 18, r: 16, b: 28, l: 38 };
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const pw = W - pad.l - pad.r;
      const ph = H - pad.t - pad.b;
      const cellW = pw / 12;
      const cellH = ph / data.length;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      data.forEach((row, yi) => {
        row.values.forEach((v, mi) => {
          const x = pad.l + mi * cellW;
          const y = pad.t + yi * cellH;
          const intensity = Math.min(Math.abs(v) / 5, 1);
          ctx.fillStyle = v >= 0
            ? `rgba(23,122,80,${0.12 + intensity * 0.62})`
            : `rgba(190,50,50,${0.12 + intensity * 0.62})`;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
          ctx.fillStyle = Math.abs(v) > 2 ? '#fff' : (v >= 0 ? '#1E8449' : '#922B21');
          ctx.font = '9px Space Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(v.toFixed(1) + '%', x + cellW / 2, y + cellH / 2 + 3);
        });

        ctx.fillStyle = '#7A96B4';
        ctx.font = '10px Space Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(row.year, pad.l - 4, pad.t + yi * cellH + cellH / 2 + 3);
      });

      months.forEach((m, i) => {
        ctx.fillStyle = '#7A96B4';
        ctx.font = '10px Space Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(m, pad.l + i * cellW + cellW / 2, H - 8);
      });
    }

    draw() {
      if (!this.ctx) return;
      this.clear();
      const cfg = this.cfg || {};
      const type = (cfg.type || 'line').toLowerCase();

      if (type === 'bar') {
        this.bars(barData(cfg.seed || 1, cfg.points || 24));
      } else if (type === 'heatmap') {
        this.heat(heatData(cfg.seed || 1, cfg.rows || 5));
      } else if (cfg.series && Array.isArray(cfg.series) && cfg.series.length > 0) {
        // Handle multiple series (for comparison charts)
        const seriesData = cfg.series.map(series => ({
          name: series.name || 'Series',
          lineColor: series.lineColor || '#0B6E6E',
          fillColor: series.fillColor || 'rgba(11,110,110,.10)',
          data: lineData(
            series.seed || cfg.seed || 1, 
            series.points || cfg.points || 72, 
            series.start || cfg.start || 100, 
            series.drift || cfg.drift || 0.2, 
            series.volatility || cfg.volatility || 1.0
          )
        }));
        this.lines(seriesData);
      } else {
        // Single line (backward compatibility)
        this.line(
          lineData(cfg.seed || 1, cfg.points || 72, cfg.start || 100, cfg.drift || 0.2, cfg.volatility || 1.0),
          cfg.lineColor || '#0B6E6E',
          cfg.fillColor || 'rgba(11,110,110,.10)'
        );
      }
    }
  }

  function initCharts() {
    document.querySelectorAll('canvas[data-chart]').forEach((canvas) => {
      if (instances.has(canvas)) return;
      let cfg = {};
      try {
        cfg = JSON.parse(canvas.dataset.chart || '{}');
      } catch {
        cfg = {};
      }
      instances.set(canvas, new Chart(canvas, cfg));
    });
  }

  function initFilter() {
    const search = document.getElementById('factor-search');
    const cat = document.getElementById('cat-filter');
    const tier = document.getElementById('tier-filter');
    const cards = [...document.querySelectorAll('[data-factor-card]')];

    if (!cards.length) return;

    const apply = () => {
      const q = (search?.value || '').trim().toLowerCase();
      const c = cat?.value || '';
      const t = tier?.value || '';

      cards.forEach((card) => {
        const show =
          (!q || (card.dataset.name || '').toLowerCase().includes(q)) &&
          (!c || card.dataset.cat === c) &&
          (!t || card.dataset.tier === t);
        card.style.display = show ? '' : 'none';
      });
    };

    search?.addEventListener('input', apply);
    cat?.addEventListener('change', apply);
    tier?.addEventListener('change', apply);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFilter();
    initCharts();
  });
})();