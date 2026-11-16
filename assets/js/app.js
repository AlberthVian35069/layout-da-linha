/* =====================================================================
   LAYOUT DA LINHA — protótipo funcional (vanilla JS, sem build)
   Rotas (hash):  #/inicio  #/criar  #/layouts  #/estacoes  #/config
   Dados: localStorage (ll.settings, ll.layouts, ll.current, ll.bgCustom)
   ===================================================================== */
(() => {
  'use strict';

  /* ---------------- utilidades ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fmt = (n, d = 0) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'layout';
  const isTyping = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(checkbox|radio|range|button|color)$/.test(el.type));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  function ago(ts) {
    const s = (ts - Date.now()) / 1000, a = Math.abs(s);
    if (a < 45) return 'agora';
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
    return new Date(ts).toLocaleDateString('pt-BR');
  }
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  /* ---------------- catálogo de estações ---------------- */
  const CATS = [
    ['fluxo', 'Fluxo e transporte'],
    ['processo', 'Processo'],
    ['teste', 'Testes'],
    ['qualidade', 'Qualidade e saída'],
    ['pessoas', 'Pessoas e apoio'],
  ];
  const TYPES = {
    carga:     { name: 'Carga / Entrada',     cat: 'fluxo',     icon: 'log-in',     color: '#64748b', w: 4,  h: 4, ct: 0,  flow: true,  desc: 'Entrada dos aparelhos na linha (loader ou abastecimento manual).' },
    esteira:   { name: 'Esteira',             cat: 'fluxo',     icon: 'conveyor',   color: '#94a3b8', w: 12, h: 2, ct: 0,  flow: false, desc: 'Transporte entre postos. Não entra no cálculo de ciclo.' },
    buffer:    { name: 'Buffer',              cat: 'fluxo',     icon: 'buffer',     color: '#a8a29e', w: 4,  h: 3, ct: 0,  flow: false, desc: 'Pulmão de WIP para absorver variação de ciclo entre estações.' },
    descarga:  { name: 'Saída / Descarga',    cat: 'fluxo',     icon: 'log-out',    color: '#64748b', w: 4,  h: 4, ct: 0,  flow: true,  desc: 'Fim da linha: unloader, palete ou carrinho de expedição.' },
    montagem:  { name: 'Montagem',            cat: 'processo',  icon: 'cube',       color: '#0ea5e9', w: 5,  h: 4, ct: 28, flow: true,  desc: 'Posto de montagem manual ou semiautomática.' },
    parafuso:  { name: 'Parafusadeira',       cat: 'processo',  icon: 'screw',      color: '#06b6d4', w: 4,  h: 4, ct: 22, flow: true,  desc: 'Aparafusamento automático com controle de torque.' },
    download:  { name: 'Download SW',         cat: 'processo',  icon: 'cpu',        color: '#6366f1', w: 5,  h: 4, ct: 45, flow: true,  desc: 'Gravação de firmware, IMEI e configuração de região.' },
    rf:        { name: 'Teste RF',            cat: 'teste',     icon: 'radio',      color: '#8b5cf6', w: 5,  h: 4, ct: 38, flow: true,  desc: 'Calibração e teste de radiofrequência em câmara blindada.' },
    camera:    { name: 'Teste Câmera',        cat: 'teste',     icon: 'camera',     color: '#a855f7', w: 5,  h: 4, ct: 30, flow: true,  desc: 'Foco, cor e alinhamento das câmeras com alvo padrão.' },
    display:   { name: 'Teste Display/Touch', cat: 'teste',     icon: 'monitor',    color: '#d946ef', w: 5,  h: 4, ct: 26, flow: true,  desc: 'Pixels, uniformidade de cor e resposta do touch.' },
    audio:     { name: 'Teste Áudio',         cat: 'teste',     icon: 'volume',     color: '#ec4899', w: 4,  h: 4, ct: 24, flow: true,  desc: 'Alto-falante, receptor e microfones em caixa acústica.' },
    bateria:   { name: 'Teste Bateria',       cat: 'teste',     icon: 'battery',    color: '#f59e0b', w: 4,  h: 4, ct: 32, flow: true,  desc: 'Carga, corrente de consumo e segurança da bateria.' },
    funcional: { name: 'Teste Funcional',     cat: 'teste',     icon: 'smartphone', color: '#3b5bdb', w: 6,  h: 4, ct: 40, flow: true,  desc: 'Final test: sensores, botões, conectividade e chamada.' },
    inspecao:  { name: 'Inspeção Visual',     cat: 'qualidade', icon: 'eye',        color: '#10b981', w: 4,  h: 4, ct: 20, flow: true,  desc: 'Inspeção cosmética manual ou por AOI.' },
    rework:    { name: 'Reparo / Rework',     cat: 'qualidade', icon: 'wrench',     color: '#ef4444', w: 4,  h: 4, ct: 0,  flow: false, desc: 'Posto fora de linha para análise e reparo de falhas.' },
    embalagem: { name: 'Embalagem',           cat: 'qualidade', icon: 'package',    color: '#84cc16', w: 5,  h: 4, ct: 25, flow: true,  desc: 'Acessórios, caixa, etiqueta e lacre.' },
    operador:  { name: 'Operador',            cat: 'pessoas',   icon: 'user',       color: '#f97316', w: 2,  h: 2, ct: 0,  flow: false, desc: 'Posição do operador. Entra no total de mão de obra da linha.' },
    bancada:   { name: 'Bancada de apoio',    cat: 'pessoas',   icon: 'table',      color: '#78716c', w: 5,  h: 3, ct: 0,  flow: false, desc: 'Mesa de apoio para materiais, ferramentas ou kits.' },
  };
  const hasCT = type => !['esteira', 'operador', 'bancada', 'buffer'].includes(type);
  const STATUS = { rascunho: 'Rascunho', revisao: 'Em revisão', aprovado: 'Aprovado' };
  const ACCENTS = [
    ['#1428A0', 'Samsung Blue'], ['#2563EB', 'Azul'], ['#0891B2', 'Ciano'], ['#059669', 'Verde'],
    ['#7C3AED', 'Violeta'], ['#E11D48', 'Rubi'], ['#EA580C', 'Laranja'],
  ];
  const BGS = {
    testes: { label: 'Linha de testes',   kind: 'img',   src: 'assets/img/linha-testes.jpg', credit: 'Foto: Samsung Newsroom' },
    fold:   { label: 'Linha Galaxy Fold', kind: 'img',   src: 'assets/img/linha-fold.jpg',   credit: 'Foto: Samsung Newsroom' },
    video:  { label: 'Vídeo da linha',    kind: 'video', src: 'assets/video/linha-producao.mp4', poster: 'assets/img/linha-testes.jpg', credit: 'Vídeo: Samsung Newsroom' },
    custom: { label: 'Foto da sua linha', kind: 'img',   credit: '' },
    none:   { label: 'Sem imagem',        kind: 'none',  credit: '' },
  };
  const DEFAULTS = {
    theme: 'system', accent: '#1428A0', density: 'comfortable',
    bg: 'testes', bgOverlay: 0.8, bgBlur: 3,
    sidebarCollapsed: false,
    cellM: 0.5, defaultUph: 100, showGrid: true, flowAnim: true, showSeq: true, focusEditor: true,
  };
  const G = 20; // px por célula da grade com zoom 100%

  /* ---------------- estado ---------------- */
  const S = {
    settings: Object.assign({}, DEFAULTS, LS.get('ll.settings', {})),
    layouts: LS.get('ll.layouts', null),
    currentId: LS.get('ll.current', null),
  };
  if (!Array.isArray(S.layouts)) { S.layouts = seed(); LS.set('ll.layouts', S.layouts); }
  const getLayout = id => S.layouts.find(l => l.id === id);
  const saveSettings = () => LS.set('ll.settings', S.settings);
  function saveLayouts() {
    if (!LS.set('ll.layouts', S.layouts)) toast('Não foi possível salvar no navegador (armazenamento cheio ou bloqueado).', 'err');
    $('#navCount').textContent = S.layouts.length;
  }
  const byRecent = () => S.layouts.slice().sort((a, b) => b.updatedAt - a.updatedAt);

  function seed() {
    const now = Date.now();
    const mk = (type, x, y, o = {}) => {
      const t = TYPES[type];
      return { id: uid(), type, x, y, w: o.w ?? t.w, h: o.h ?? t.h, name: o.name ?? t.name, ct: o.ct ?? t.ct, inFlow: o.inFlow ?? t.flow };
    };
    return [
      {
        id: uid(), name: 'Linha 07 — Teste Final', line: 'L07', model: 'Smartphone A', status: 'revisao', targetUph: 100, updatedAt: now - 42 * 60e3,
        items: [
          mk('carga', 1, 7), mk('esteira', 5, 8, { w: 62, name: 'Esteira principal' }),
          mk('download', 6, 2, { ct: 34 }), mk('rf', 12, 2, { ct: 38 }), mk('camera', 18, 2, { ct: 30 }),
          mk('display', 24, 2, { ct: 27 }), mk('audio', 30, 2, { ct: 24 }), mk('bateria', 35, 2, { ct: 33 }),
          mk('funcional', 40, 2, { ct: 41 }), mk('inspecao', 47, 2, { ct: 20 }), mk('embalagem', 67, 7, { ct: 25 }),
          mk('rework', 20, 12), mk('bancada', 56, 12),
          mk('operador', 7, 11, { name: 'OP 01' }), mk('operador', 42, 11, { name: 'OP 02' }), mk('operador', 48, 11, { name: 'OP 03' }),
          mk('operador', 68, 11, { name: 'OP 04' }), mk('operador', 24, 13, { name: 'OP 05' }),
        ],
      },
      {
        id: uid(), name: 'Linha 03 — Montagem + Função', line: 'L03', model: 'Tablet T9', status: 'aprovado', targetUph: 90, updatedAt: now - 3 * 3600e3,
        items: [
          mk('carga', 1, 5), mk('esteira', 5, 6, { w: 32 }),
          mk('montagem', 6, 0, { ct: 32 }), mk('parafuso', 12, 0, { ct: 28 }), mk('download', 17, 0, { ct: 38 }),
          mk('funcional', 23, 8, { ct: 36 }), mk('inspecao', 30, 0, { ct: 22 }), mk('buffer', 31, 8),
          mk('embalagem', 37, 5, { ct: 30 }),
          mk('operador', 7, 8, { name: 'OP 01' }), mk('operador', 31, 4, { name: 'OP 02' }), mk('operador', 38, 9, { name: 'OP 03' }),
        ],
      },
      {
        id: uid(), name: 'Linha 12 — Inspeção & Embalagem', line: 'L12', model: 'Fold', status: 'rascunho', targetUph: 140, updatedAt: now - 2 * 86400e3,
        items: [
          mk('carga', 1, 3), mk('esteira', 5, 4, { w: 26 }),
          mk('inspecao', 6, 7, { ct: 18 }), mk('camera', 11, 0, { ct: 22, name: 'Verificação Câmera' }),
          mk('display', 17, 7, { ct: 21 }), mk('embalagem', 23, 0, { ct: 24 }), mk('descarga', 31, 3), mk('bancada', 29, 7),
          mk('operador', 7, 11, { name: 'OP 01' }), mk('operador', 18, 11, { name: 'OP 02' }),
        ],
      },
    ];
  }

  /* ---------------- métricas da linha ---------------- */
  const sequence = items => items.filter(i => i.inFlow).sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2) || a.y - b.y);
  function metrics(L) {
    const flow = sequence(L.items);
    const st = flow.filter(i => +i.ct > 0);
    const maxCT = st.reduce((m, i) => Math.max(m, +i.ct), 0);
    const sum = st.reduce((s, i) => s + +i.ct, 0);
    const bott = st.find(i => +i.ct === maxCT) || null;
    const uph = maxCT ? Math.floor(3600 / maxCT) : 0;
    const takt = L.targetUph > 0 ? 3600 / L.targetUph : 0;
    const bal = st.length ? (sum / (st.length * maxCT)) * 100 : 0;
    const ops = L.items.filter(i => i.type === 'operador').length;
    let len = 0, dep = 0;
    if (L.items.length) {
      const minX = Math.min(...L.items.map(i => i.x)), maxX = Math.max(...L.items.map(i => i.x + i.w));
      const minY = Math.min(...L.items.map(i => i.y)), maxY = Math.max(...L.items.map(i => i.y + i.h));
      len = (maxX - minX) * S.settings.cellM; dep = (maxY - minY) * S.settings.cellM;
    }
    const over = takt ? st.filter(i => +i.ct > takt + 1e-9) : [];
    return { flow, st, maxCT, sum, bott, uph, takt, bal, ops, len, dep, over, n: st.length, meets: L.targetUph && uph ? uph >= L.targetUph : null };
  }

  /* ---------------- render SVG (miniaturas e exportação) ---------------- */
  function layoutSVG(L, { labels = false, cell = 10, pad = 2, dark = root.dataset.theme === 'dark', standalone = false } = {}) {
    const items = L.items;
    if (!items.length) return `<svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet"><text x="50" y="22" text-anchor="middle" font-family="Inter, sans-serif" font-size="5" fill="currentColor" opacity=".45">Layout vazio</text></svg>`;
    const minX = Math.min(...items.map(i => i.x)) - pad, minY = Math.min(...items.map(i => i.y)) - pad;
    const maxX = Math.max(...items.map(i => i.x + i.w)) + pad, maxY = Math.max(...items.map(i => i.y + i.h)) + pad;
    const head = standalone ? 3.2 * cell : 0;
    const W = (maxX - minX) * cell, H = (maxY - minY) * cell + head;
    const m = metrics(L);
    const txt = dark ? '#e8ecf6' : '#0b1220';
    const accent = S.settings.accent;
    const P = (x, y) => [(x - minX) * cell, (y - minY) * cell + head];
    const out = [];
    if (standalone) {
      out.push(`<rect width="${W}" height="${H}" fill="${dark ? '#0b1022' : '#ffffff'}"/>`);
      out.push(`<defs><pattern id="g" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" x="0" y="${head}"><path d="M ${cell} 0 L 0 0 0 ${cell}" fill="none" stroke="${dark ? '#ffffff' : '#0b1220'}" stroke-opacity=".06"/></pattern></defs><rect y="${head}" width="${W}" height="${H - head}" fill="url(#g)"/>`);
      out.push(`<text x="${cell}" y="${cell * 1.6}" font-family="Manrope, Inter, Arial, sans-serif" font-size="${cell * .9}" font-weight="800" fill="${txt}">${esc(L.name)}</text>`);
      out.push(`<text x="${cell}" y="${cell * 2.6}" font-family="Inter, Arial, sans-serif" font-size="${cell * .5}" fill="${txt}" opacity=".65">UPH teórico ${m.uph} · Gargalo ${m.maxCT}s · ${m.n} estações · ${m.ops} operadores · Meta ${L.targetUph} un/h</text>`);
    }
    if (m.flow.length > 1) {
      const pts = m.flow.map(i => P(i.x + i.w / 2, i.y + i.h / 2).join(',')).join(' ');
      out.push(`<polyline points="${pts}" fill="none" stroke="${accent}" stroke-width="${cell * .2}" stroke-dasharray="${cell * .6} ${cell * .5}" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`);
    }
    for (const i of items) {
      const t = TYPES[i.type] || TYPES.bancada;
      const [x, y] = P(i.x, i.y), w = i.w * cell, h = i.h * cell, c = t.color;
      if (i.type === 'operador') {
        out.push(`<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) / 2 - cell * .12}" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="${cell * .12}"/>`);
      } else {
        const dash = (!i.inFlow && t.flow) ? ` stroke-dasharray="${cell * .3} ${cell * .2}"` : '';
        const isB = m.bott && m.bott.id === i.id && m.st.length > 1;
        out.push(`<rect x="${x + cell * .08}" y="${y + cell * .08}" width="${w - cell * .16}" height="${h - cell * .16}" rx="${cell * .4}" fill="${c}" fill-opacity="${dark ? .22 : .16}" stroke="${isB ? '#ef4444' : c}" stroke-width="${cell * (isB ? .2 : .12)}"${dash}/>`);
        if (labels) {
          out.push(`<text x="${x + w / 2}" y="${y + h / 2 - (+i.ct ? cell * .25 : 0)}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial, sans-serif" font-size="${cell * .48}" font-weight="600" fill="${txt}">${esc(i.name)}</text>`);
          if (+i.ct) out.push(`<text x="${x + w / 2}" y="${y + h / 2 + cell * .55}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial, sans-serif" font-size="${cell * .44}" font-weight="700" fill="${c}">${i.ct}s</text>`);
        }
      }
    }
    const size = standalone ? ` width="${W}" height="${H}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${size} preserveAspectRatio="xMidYMid meet">${out.join('')}</svg>`;
  }

  /* ---------------- aparência: tema, cor, densidade, fundo ---------------- */
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  const resolvedTheme = () => S.settings.theme === 'system' ? (mqDark.matches ? 'dark' : 'light') : S.settings.theme;
  function applyTheme() {
    const t = resolvedTheme();
    root.dataset.theme = t;
    $$('[data-theme-set]').forEach(b => b.classList.toggle('is-on', b.dataset.themeSet === S.settings.theme));
    $('#themeQuick use').setAttribute('href', t === 'dark' ? '#i-sun' : '#i-moon');
    $('#themeQuick').title = t === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro';
  }
  mqDark.addEventListener('change', () => { if (S.settings.theme === 'system') { applyTheme(); refresh(); } });
  function setTheme(t) { S.settings.theme = t; saveSettings(); applyTheme(); refresh(); }
  const toggleTheme = () => setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark');
  function applyAccent() { root.style.setProperty('--accent', S.settings.accent); }
  function applyDensity() { root.classList.toggle('density-compact', S.settings.density === 'compact'); }

  function bgSource() {
    if (S.settings.bg === 'custom') {
      const d = LS.get('ll.bgCustom', null);
      return d ? { kind: 'img', src: d, credit: '' } : BGS.testes;
    }
    return BGS[S.settings.bg] || BGS.testes;
  }
  function mediaHTML(b) {
    if (b.kind === 'img') return `<img src="${esc(b.src)}" alt="">`;
    if (b.kind === 'video') return `<video src="${esc(b.src)}" poster="${esc(b.poster)}" ${reduceMotion ? '' : 'autoplay'} muted loop playsinline></video>`;
    return '';
  }
  const heroSource = () => { const b = bgSource(); return b.kind === 'none' ? BGS.testes : b; };
  let lastBgKey = null;
  function applyBackground(force) {
    root.style.setProperty('--bg-overlay', S.settings.bgOverlay);
    root.style.setProperty('--bg-blur', S.settings.bgBlur + 'px');
    const b = bgSource(), key = b.kind + '|' + (b.src || '').slice(0, 80) + (b.src || '').length;
    if (key === lastBgKey && !force) return;
    lastBgKey = key;
    $('#bgMedia').innerHTML = mediaHTML(b);
    const hm = $('.hero__media');
    if (hm) { hm.innerHTML = mediaHTML(heroSource()); const cr = $('.hero__credit'); if (cr) cr.textContent = heroSource().credit || ''; }
  }

  /* ---------------- menu lateral ---------------- */
  function setCollapsed(v) {
    S.settings.sidebarCollapsed = v; saveSettings();
    root.classList.toggle('sb-collapsed', v);
    $('#sbToggle').setAttribute('aria-label', v ? 'Expandir menu' : 'Recolher menu');
    const sw = $('[data-setting="sidebarCollapsed"]'); if (sw) sw.checked = v;
  }
  const isCollapsed = () => root.classList.contains('sb-collapsed');
  const toggleSidebar = () => setCollapsed(!isCollapsed());
  $('#sbToggle').addEventListener('click', toggleSidebar);
  $('#mobileMenu').addEventListener('click', () => root.classList.add('sb-open'));
  $('#scrim').addEventListener('click', () => root.classList.remove('sb-open'));
  $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));
  $('#themeQuick').addEventListener('click', toggleTheme);
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'palette') openPalette();
    if (a.dataset.action === 'shortcuts') openShortcuts();
  });

  /* ---------------- toasts / modal / arquivos ---------------- */
  function toast(msg, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    el.innerHTML = icon({ ok: 'check', err: 'alert', info: 'info' }[kind] || 'info') + `<span>${esc(msg)}</span>`;
    $('#toasts').append(el);
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 300); }, 2800);
  }

  let modalClose = null;
  function openModal(html, { onClose, init, width } = {}) {
    if (modalClose) modalClose();
    const m = $('#modal'), p = $('#modalPanel');
    const prev = document.activeElement;
    p.innerHTML = html; p.style.width = width || ''; m.hidden = false;
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    function close(val) {
      if (modalClose !== close) return;
      modalClose = null; m.hidden = true; p.innerHTML = '';
      document.removeEventListener('keydown', onKey, true);
      if (prev && prev.focus) prev.focus({ preventScroll: true });
      if (onClose) onClose(val);
    }
    modalClose = close;
    document.addEventListener('keydown', onKey, true);
    $('.modal__backdrop', m).onclick = () => close();
    $$('[data-close]', p).forEach(b => { b.onclick = () => close(); });
    if (init) init(p, close);
    const f = $('[autofocus]', p) || $('input, button', p); if (f) f.focus();
    return close;
  }
  function confirmDialog({ title, text, ok = 'Confirmar', danger = false }) {
    return new Promise(res => {
      openModal(`
        <div class="modal__head"><h2>${esc(title)}</h2><button class="icon-btn icon-btn--sm" data-close aria-label="Fechar">${icon('x')}</button></div>
        <div class="modal__body">${text}</div>
        <div class="modal__foot"><button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-ok autofocus>${esc(ok)}</button></div>`,
        { onClose: v => res(v === true), init: (p, close) => { $('[data-ok]', p).onclick = () => close(true); } });
    });
  }
  function pickFile(accept) {
    return new Promise(res => {
      const inp = $('#fileInput'); inp.value = ''; inp.accept = accept;
      inp.onchange = () => res(inp.files[0] || null);
      inp.click();
    });
  }
  function download(name, content, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  const exportJSON = l => { const { id, ...rest } = l; download(slug(l.name) + '.json', JSON.stringify({ app: 'layout-da-linha', version: 1, ...rest }, null, 2), 'application/json'); };
  function sanitizeLayout(r) {
    if (!r || typeof r !== 'object' || !Array.isArray(r.items)) return null;
    return {
      id: uid(), name: String(r.name || 'Layout importado').slice(0, 120), line: String(r.line || '').slice(0, 40), model: String(r.model || '').slice(0, 60),
      status: STATUS[r.status] ? r.status : 'rascunho', targetUph: Math.max(1, +r.targetUph || S.settings.defaultUph), updatedAt: Date.now(),
      items: r.items.filter(i => i && TYPES[i.type]).map(i => ({
        id: uid(), type: i.type, x: Math.round(+i.x || 0), y: Math.round(+i.y || 0),
        w: clamp(Math.round(+i.w || TYPES[i.type].w), 1, 300), h: clamp(Math.round(+i.h || TYPES[i.type].h), 1, 300),
        name: String(i.name ?? TYPES[i.type].name).slice(0, 60), ct: Math.max(0, +i.ct || 0), inFlow: !!i.inFlow,
      })),
    };
  }
  async function importLayouts() {
    const f = await pickFile('.json,application/json');
    if (!f) return [];
    try {
      const data = JSON.parse(await f.text());
      const arr = Array.isArray(data) ? data : Array.isArray(data.layouts) ? data.layouts : [data];
      const got = arr.map(sanitizeLayout).filter(Boolean);
      if (!got.length) throw new Error('vazio');
      S.layouts.unshift(...got); saveLayouts();
      toast(`${got.length} layout(s) importado(s)`, 'ok');
      return got;
    } catch (e) { toast('Arquivo inválido — use um JSON exportado pelo portal.', 'err'); return []; }
  }

  /* ---------------- paleta de comandos (Ctrl+K) ---------------- */
  const NAV_ICON = { inicio: 'home', criar: 'plus-square', layouts: 'layers', estacoes: 'boxes', config: 'settings' };
  function openPalette() {
    const all = [
      ...Object.entries(ROUTES).map(([k, r]) => ({ group: 'Páginas', label: r.title, icon: NAV_ICON[k], run: () => go('#/' + k) })),
      { group: 'Ações', label: 'Criar novo layout', icon: 'plus', run: () => go('#/criar?novo=1') },
      { group: 'Ações', label: 'Alternar tema claro / escuro', icon: resolvedTheme() === 'dark' ? 'sun' : 'moon', run: toggleTheme },
      { group: 'Ações', label: isCollapsed() ? 'Expandir menu lateral' : 'Recolher menu lateral', icon: 'sidebar', hint: '[', run: toggleSidebar },
      { group: 'Ações', label: 'Trocar imagem de fundo', icon: 'image', run: () => go('#/config', 'fundo') },
      { group: 'Ações', label: 'Atalhos de teclado', icon: 'keyboard', hint: '?', run: openShortcuts },
      ...byRecent().map(l => ({ group: 'Layouts', label: l.name, icon: 'layers', hint: STATUS[l.status], run: () => go('#/criar?id=' + l.id) })),
    ];
    openModal(`
      <div class="cmdk__input">${icon('search')}<input id="cmdkIn" placeholder="Buscar páginas, layouts e ações…" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
      <div class="cmdk__list" id="cmdkList" role="listbox"></div>
      <div class="cmdk__foot"><span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></div>`,
      {
        width: '620px',
        init: (p, close) => {
          const input = $('#cmdkIn', p), box = $('#cmdkList', p);
          let list = all, idx = 0;
          const mark = () => $$('.cmdk__item', box).forEach(el => el.classList.toggle('is-active', +el.dataset.i === idx));
          const draw = () => {
            if (!list.length) { box.innerHTML = `<div class="empty" style="padding:28px">${icon('search')}<span>Nada encontrado</span></div>`; return; }
            let g = null, h = '';
            list.forEach((it, i) => {
              if (it.group !== g) { g = it.group; h += `<div class="cmdk__group">${g}</div>`; }
              h += `<div class="cmdk__item${i === idx ? ' is-active' : ''}" data-i="${i}" role="option">${icon(it.icon)}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</div>`;
            });
            box.innerHTML = h;
          };
          const run = it => { if (!it) return; close(); it.run(); };
          input.addEventListener('input', () => {
            const q = norm(input.value.trim());
            list = q ? all.filter(it => norm(it.label + ' ' + it.group).includes(q)) : all; idx = 0; draw();
          });
          input.addEventListener('keydown', e => {
            if (!list.length) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length; mark();
              const a = $('.is-active', box); if (a) a.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') { e.preventDefault(); run(list[idx]); }
          });
          box.addEventListener('click', e => { const el = e.target.closest('.cmdk__item'); if (el) run(list[+el.dataset.i]); });
          box.addEventListener('mousemove', e => { const el = e.target.closest('.cmdk__item'); if (el && +el.dataset.i !== idx) { idx = +el.dataset.i; mark(); } });
          draw();
        },
      });
  }
  function openShortcuts() {
    const k = (...keys) => keys.map(x => `<kbd>${x}</kbd>`).join('');
    const rows = [
      ['h', 'Geral'], ['Busca rápida', k('Ctrl', 'K')], ['Recolher / expandir menu', k('[')], ['Esta ajuda', k('?')],
      ['h', 'Editor de layout'], ['Salvar agora', k('Ctrl', 'S')], ['Desfazer / refazer', k('Ctrl', 'Z') + ' ' + k('Ctrl', 'Shift', 'Z')],
      ['Duplicar seleção', k('Ctrl', 'D')], ['Selecionar tudo', k('Ctrl', 'A')], ['Excluir seleção', k('Del')], ['Girar 90°', k('R')],
      ['Mover 1 célula (5 com Shift)', k('←', '↑', '→', '↓')], ['Zoom', k('+') + ' ' + k('−') + ' ou roda do mouse'], ['Enquadrar layout', k('0')],
      ['Seleção múltipla', k('Shift') + ' + clique'], ['Mover a visão', 'arrastar o fundo'],
    ];
    openModal(`
      <div class="modal__head"><h2>Atalhos de teclado</h2><button class="icon-btn icon-btn--sm" data-close aria-label="Fechar">${icon('x')}</button></div>
      <div class="modal__body"><dl class="keys">${rows.map(([a, b]) => a === 'h' ? `<dt class="keys__h">${b}</dt>` : `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>`);
  }

  /* ---------------- roteador ---------------- */
  const ROUTES = {
    inicio:   { title: 'Início',                 render: renderHome },
    criar:    { title: 'Criar layout',           render: renderEditor },
    layouts:  { title: 'Meus layouts',           render: renderLayouts },
    estacoes: { title: 'Biblioteca de estações', render: renderLibrary },
    config:   { title: 'Configurações',          render: renderSettings },
  };
  let cleanup = null, pendingJump = null;
  function parseHash() {
    const [p, q] = location.hash.replace(/^#\/?/, '').split('?');
    return { path: p || 'inicio', params: new URLSearchParams(q || '') };
  }
  function go(hash, jump) {
    pendingJump = jump || null;
    if (location.hash === hash) route(); else location.hash = hash;
  }
  function route() {
    const { path, params } = parseHash();
    const key = ROUTES[path] ? path : 'inicio';
    if (cleanup) { cleanup(); cleanup = null; }
    const view = $('#view');
    view.onclick = view.oninput = view.onchange = null;
    view.innerHTML = '';
    $('#crumbTitle').textContent = ROUTES[key].title;
    document.title = `${ROUTES[key].title} · Layout da Linha`;
    $$('.sb-link').forEach(a => { const on = a.dataset.route === key; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    root.classList.remove('sb-open');
    window.scrollTo(0, 0);
    const c = ROUTES[key].render(view, params);
    if (typeof c === 'function') cleanup = c;
  }
  // re-renderiza a página atual quando muda algo visual (ex.: tema → miniaturas)
  function refresh() { const { path } = parseHash(); if (path === 'inicio' || path === 'layouts') route(); }
  window.addEventListener('hashchange', route);

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (!$('#modal').hidden || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '[') { e.preventDefault(); toggleSidebar(); }
    else if (e.key === '?') { e.preventDefault(); openShortcuts(); }
  });

  /* =================================================================
     PÁGINA: INÍCIO
     ================================================================= */
  function renderHome(view) {
    const list = byRecent();
    const last = getLayout(S.currentId) || list[0];
    const ms = new Map(list.map(l => [l.id, metrics(l)]));
    const totalSt = list.reduce((s, l) => s + ms.get(l.id).n, 0);
    const totalOps = list.reduce((s, l) => s + ms.get(l.id).ops, 0);
    const withUph = list.filter(l => ms.get(l.id).uph);
    const avgUph = withUph.length ? Math.round(withUph.reduce((s, l) => s + ms.get(l.id).uph, 0) / withUph.length) : 0;
    const approved = list.filter(l => l.status === 'aprovado').length;
    const meeting = list.filter(l => ms.get(l.id).meets).length;
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
    const lm = last ? ms.get(last.id) : null;
    const hs = heroSource();
    const maxBar = Math.max(1, ...list.map(l => Math.max(ms.get(l.id).uph, l.targetUph || 0))) * 1.1;

    view.innerHTML = `
    <div class="page">
      <section class="hero">
        <div class="hero__media">${mediaHTML(hs)}</div>
        <div>
          <span class="eyebrow"><span class="pulse"></span>${greet}, Engenharia · ${list.length} layouts no portal</span>
          <h1>Projete, balanceie e padronize a sua linha.</h1>
          <p>Arraste estações para o canvas, acompanhe gargalo, takt e UPH em tempo real e mantenha todas as linhas de teste no mesmo padrão.</p>
          <div class="hero__cta">
            <a class="btn btn--primary" href="#/criar?novo=1">${icon('plus')} Criar novo layout</a>
            ${last ? `<a class="btn btn--light" href="#/criar?id=${last.id}">${icon('pencil')} Continuar editando</a>` : ''}
            <a class="btn btn--light" href="#/layouts">${icon('layers')} Ver todos</a>
          </div>
        </div>
        ${last ? `
        <a class="hero__panel" href="#/criar?id=${last.id}" style="color:inherit;text-decoration:none">
          <div class="hero__panel-head">
            <div><small>Último editado · ${ago(last.updatedAt)}</small><strong>${esc(last.name)}</strong></div>
            <span class="chip chip--${last.status}">${STATUS[last.status]}</span>
          </div>
          <div class="hero__preview">${layoutSVG(last, { dark: true })}</div>
          <div class="hero__stats">
            <div><small>UPH teórico</small><b class="num">${lm.uph || '—'}</b></div>
            <div><small>Gargalo</small><b class="num">${lm.maxCT ? fmt(lm.maxCT, lm.maxCT % 1 ? 1 : 0) + 's' : '—'}</b></div>
            <div><small>Estações</small><b class="num">${lm.n}</b></div>
          </div>
        </a>` : ''}
        <span class="hero__credit">${esc(hs.credit || '')}</span>
      </section>

      <section class="kpis">
        ${kpi('layers', 'Layouts no portal', list.length, '', `<b>${approved}</b> aprovado(s)`)}
        ${kpi('boxes', 'Estações mapeadas', totalSt, '', 'em todas as linhas')}
        ${kpi('gauge', 'UPH teórico médio', avgUph, 'un/h', `<b>${meeting}</b> de ${list.length} atingem a meta`)}
        ${kpi('users', 'Operadores alocados', totalOps, '', 'somando todos os layouts')}
      </section>

      <section class="grid-2">
        <div class="card">
          <div class="card__head">
            <div><h2 class="card__title">Layouts recentes</h2><p class="card__sub">Clique em uma linha para abrir no editor</p></div>
            <a class="btn btn--sm" href="#/layouts">Ver todos ${icon('arrow-right')}</a>
          </div>
          ${list.length ? `
          <div style="overflow-x:auto"><table class="table">
            <thead><tr><th>Layout</th><th>Status</th><th class="t-right">Estações</th><th class="t-right">UPH</th><th class="hide-md">Atualizado</th></tr></thead>
            <tbody>${list.slice(0, 6).map(l => { const m = ms.get(l.id); return `
              <tr data-href="#/criar?id=${l.id}">
                <td><div class="table-name"><span class="thumb-sq">${layoutSVG(l, { pad: 1 })}</span><div><strong>${esc(l.name)}</strong><small>${esc([l.line, l.model].filter(Boolean).join(' · ') || '—')}</small></div></div></td>
                <td><span class="chip chip--${l.status}">${STATUS[l.status]}</span></td>
                <td class="t-right num">${m.n}</td>
                <td class="t-right num"><strong style="color:${m.meets === false ? 'var(--err)' : 'inherit'}">${m.uph || '—'}</strong></td>
                <td class="hide-md muted nowrap">${ago(l.updatedAt)}</td>
              </tr>`; }).join('')}</tbody>
          </table></div>` : `<div class="empty">${icon('layers')}<strong>Nenhum layout ainda</strong><a class="btn btn--primary" href="#/criar?novo=1">${icon('plus')} Criar o primeiro</a></div>`}
        </div>

        <div class="card">
          <div class="card__head"><div><h2 class="card__title">Capacidade × meta</h2><p class="card__sub">UPH teórico pelo gargalo de cada linha</p></div></div>
          <div class="bars">${list.slice(0, 6).map(l => { const m = ms.get(l.id); return `
            <div class="bar__row" title="${esc(l.name)}: ${m.uph} un/h (meta ${l.targetUph})">
              <span class="bar__name">${esc(l.line || l.name)}</span>
              <span class="bar__val num">${m.uph} <span class="muted">/ ${l.targetUph}</span></span>
              <div class="bar__track"><div class="bar__fill ${m.meets === false ? 'is-bad' : ''}" style="width:${(m.uph / maxBar) * 100}%"></div><i class="bar__goal" style="left:${(l.targetUph / maxBar) * 100}%"></i></div>
            </div>`; }).join('') || '<p class="muted">Sem dados.</p>'}</div>
          <div class="legend"><span><i style="background:var(--accent)"></i>Atende a meta</span><span><i style="background:var(--err)"></i>Abaixo da meta</span><span><i style="background:var(--text);opacity:.55;width:3px"></i>Meta</span></div>
          <div class="quick">
            <a href="#/criar?novo=1">${icon('plus-square')} Novo layout</a>
            <a href="#/estacoes">${icon('boxes')} Estações</a>
            <a href="#/config">${icon('image')} Trocar fundo</a>
            <a href="#" data-action="shortcuts">${icon('keyboard')} Atalhos</a>
          </div>
        </div>
      </section>
    </div>`;

    view.onclick = e => {
      const tr = e.target.closest('tr[data-href]'); if (tr) go(tr.dataset.href);
      const sc = e.target.closest('a[data-action]'); if (sc) e.preventDefault();
    };
    function kpi(ic, label, value, unit, foot) {
      return `<div class="card kpi"><div class="kpi__top"><span class="kpi__label">${label}</span><span class="kpi__icon">${icon(ic)}</span></div>
        <div class="kpi__value">${fmt(value)}${unit ? `<small>${unit}</small>` : ''}</div><div class="kpi__foot">${foot}</div></div>`;
    }
  }

  /* =================================================================
     PÁGINA: MEUS LAYOUTS
     ================================================================= */
  function renderLayouts(view) {
    const st = { q: '', status: 'all', sort: 'recent' };
    view.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div><h1>Meus layouts</h1><p id="lCount"></p></div>
        <div class="page-head__actions">
          <button class="btn" data-act="import">${icon('upload')} Importar JSON</button>
          <a class="btn btn--primary" href="#/criar?novo=1">${icon('plus')} Novo layout</a>
        </div>
      </div>
      <div class="card toolbar" style="padding:10px">
        <div class="input-icon">${icon('search')}<input class="input" id="lSearch" placeholder="Buscar por nome, linha ou modelo…" autocomplete="off"></div>
        <div class="seg" id="lStatus">
          <button data-status="all" class="is-on">Todos</button>
          ${Object.entries(STATUS).map(([k, v]) => `<button data-status="${k}">${v}</button>`).join('')}
        </div>
        <select class="select" id="lSort" style="width:auto">
          <option value="recent">Mais recentes</option><option value="name">Nome (A–Z)</option><option value="uph">Maior UPH</option>
        </select>
      </div>
      <div class="lgrid" id="lGrid"></div>
    </div>`;

    const draw = () => {
      const q = norm(st.q);
      let list = S.layouts.filter(l => (st.status === 'all' || l.status === st.status) && (!q || norm(`${l.name} ${l.line} ${l.model}`).includes(q)));
      const ms = new Map(list.map(l => [l.id, metrics(l)]));
      list.sort(st.sort === 'name' ? (a, b) => a.name.localeCompare(b.name, 'pt-BR') : st.sort === 'uph' ? (a, b) => ms.get(b.id).uph - ms.get(a.id).uph : (a, b) => b.updatedAt - a.updatedAt);
      $('#lCount').textContent = `${S.layouts.length} layout(s) salvos neste navegador · mostrando ${list.length}`;
      $('#lGrid').innerHTML = list.map(l => {
        const m = ms.get(l.id);
        return `
        <article class="card lcard" data-id="${l.id}">
          <div class="lcard__preview" data-act="open" title="Abrir no editor">${layoutSVG(l)}<span class="chip chip--${l.status}">${STATUS[l.status]}</span></div>
          <div class="lcard__body">
            <h3 data-act="open">${esc(l.name)}</h3>
            <div class="lcard__meta">${esc([l.line, l.model].filter(Boolean).join(' · ') || 'Sem linha/modelo')}</div>
            <div class="lcard__stats">
              <div><small>UPH</small><b style="color:${m.meets === false ? 'var(--err)' : 'inherit'}">${m.uph || '—'}</b></div>
              <div><small>Estações</small><b>${m.n}</b></div>
              <div><small>Operadores</small><b>${m.ops}</b></div>
            </div>
          </div>
          <div class="lcard__foot">
            <span class="muted">${icon('clock', 'ic--sm')} ${ago(l.updatedAt)}</span>
            <button class="icon-btn icon-btn--sm" data-act="dup" title="Duplicar" aria-label="Duplicar">${icon('copy')}</button>
            <button class="icon-btn icon-btn--sm" data-act="export" title="Exportar JSON" aria-label="Exportar JSON">${icon('download')}</button>
            <button class="icon-btn icon-btn--sm" data-act="del" title="Excluir" aria-label="Excluir">${icon('trash')}</button>
          </div>
        </article>`;
      }).join('') + `<a class="card lcard lcard--new" href="#/criar?novo=1"><div>${icon('plus-square')}<div>Novo layout</div></div></a>`;
    };
    draw();

    $('#lSearch').addEventListener('input', e => { st.q = e.target.value; draw(); });
    $('#lSort').addEventListener('change', e => { st.sort = e.target.value; draw(); });
    $('#lStatus').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      st.status = b.dataset.status; $$('#lStatus button').forEach(x => x.classList.toggle('is-on', x === b)); draw();
    });
    view.onclick = async e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'import') { if ((await importLayouts()).length) draw(); return; }
      const card = a.closest('[data-id]'); const l = card && getLayout(card.dataset.id); if (!l) return;
      if (a.dataset.act === 'open') go('#/criar?id=' + l.id);
      else if (a.dataset.act === 'export') exportJSON(l);
      else if (a.dataset.act === 'dup') {
        const c = JSON.parse(JSON.stringify(l));
        c.id = uid(); c.name = l.name + ' (cópia)'; c.status = 'rascunho'; c.updatedAt = Date.now(); c.items.forEach(i => { i.id = uid(); });
        S.layouts.unshift(c); saveLayouts(); draw(); toast('Layout duplicado', 'ok');
      } else if (a.dataset.act === 'del') {
        const ok = await confirmDialog({ title: 'Excluir layout?', text: `<p>“<strong>${esc(l.name)}</strong>” será removido deste navegador. Exporte o JSON antes se quiser guardar uma cópia.</p>`, ok: 'Excluir', danger: true });
        if (!ok) return;
        S.layouts = S.layouts.filter(x => x.id !== l.id); if (S.currentId === l.id) { S.currentId = null; LS.del('ll.current'); }
        saveLayouts(); draw(); toast('Layout excluído');
      }
    };
  }

  /* =================================================================
     PÁGINA: BIBLIOTECA DE ESTAÇÕES
     ================================================================= */
  function renderLibrary(view) {
    const m = S.settings.cellM;
    view.innerHTML = `
    <div class="page">
      <div class="page-head"><div><h1>Biblioteca de estações</h1><p>${Object.keys(TYPES).length} tipos de posto padronizados. Tempo de ciclo e dimensão são os valores padrão ao inserir no editor.</p></div></div>
      ${CATS.map(([cid, cname]) => `
      <section class="lib-cat">
        <h2>${cname}</h2>
        <div class="lib-grid">${Object.entries(TYPES).filter(([, t]) => t.cat === cid).map(([k, t]) => `
          <article class="card lib-item" style="--c:${t.color}">
            <span class="lib-item__icon">${icon(t.icon, 'ic--lg')}</span>
            <div>
              <h3>${t.name}</h3>
              <p>${t.desc}</p>
              <div class="lib-item__tags">
                <span class="chip chip--plain">${fmt(t.w * m, 1)} × ${fmt(t.h * m, 1)} m</span>
                ${t.ct ? `<span class="chip chip--plain">CT ${t.ct}s</span>` : ''}
                ${t.flow ? '' : '<span class="chip chip--plain">Fora do fluxo</span>'}
              </div>
              <a class="btn btn--sm" href="#/criar?add=${k}">${icon('plus')} Usar no layout atual</a>
            </div>
          </article>`).join('')}
        </div>
      </section>`).join('')}
    </div>`;
  }

  /* =================================================================
     PÁGINA: CONFIGURAÇÕES
     ================================================================= */
  function renderSettings(view) {
    view.innerHTML = `
    <div class="page">
      <div class="page-head"><div><h1>Configurações</h1><p>Aparência do portal, imagem de fundo e preferências do editor. Tudo fica salvo neste navegador.</p></div></div>
      <div class="settings">
        <nav class="card set-nav" aria-label="Seções">
          <a href="#" data-jump="aparencia">${icon('palette')} Aparência</a>
          <a href="#" data-jump="fundo">${icon('image')} Fundo do portal</a>
          <a href="#" data-jump="menu">${icon('sidebar')} Menu lateral</a>
          <a href="#" data-jump="editor">${icon('grid')} Editor</a>
          <a href="#" data-jump="dados">${icon('database')} Dados</a>
        </nav>
        <div class="set-sections" id="setSections"></div>
      </div>
    </div>`;
    const box = $('#setSections');
    const sw = (key, label, sub) => `
      <div class="set-row"><div class="set-row__txt"><strong>${label}</strong><small>${sub}</small></div>
      <label class="switch"><input type="checkbox" data-setting="${key}" ${S.settings[key] ? 'checked' : ''} aria-label="${esc(label)}"><span></span></label></div>`;

    const draw = () => {
      const s = S.settings;
      const isPreset = ACCENTS.some(([c]) => c.toLowerCase() === s.accent.toLowerCase());
      const custom = LS.get('ll.bgCustom', null);
      const bgOpt = (k, thumbStyle, inner, badge) => `
        <button class="bg-opt ${s.bg === k ? 'is-on' : ''}" data-bg="${k}" aria-pressed="${s.bg === k}">
          <span class="bg-opt__thumb" style="${thumbStyle}">${inner}${badge ? `<span class="badge">${badge}</span>` : ''}</span>
          <span>${BGS[k].label}${s.bg === k ? icon('check', 'ic--sm') : ''}</span>
        </button>`;
      box.innerHTML = `
      <section class="card set-section" id="sec-aparencia">
        <div class="card__head"><div><h2 class="card__title">Aparência</h2><p class="card__sub">Tema, cor de destaque e densidade da interface.</p></div></div>
        <div class="set-row set-row--stack">
          <div class="set-row__txt"><strong>Tema</strong><small>“Automático” acompanha o tema do sistema operacional.</small></div>
          <div class="theme-opts">${[['light', 'Claro', 'sun'], ['dark', 'Escuro', 'moon'], ['system', 'Automático', 'monitor']].map(([k, l, i]) => `
            <button class="theme-opt ${s.theme === k ? 'is-on' : ''}" data-set-theme="${k}" aria-pressed="${s.theme === k}">
              <span class="theme-mock theme-mock--${k}"><i></i><b></b></span><span>${icon(i, 'ic--sm')} ${l}</span>
            </button>`).join('')}
          </div>
        </div>
        <div class="set-row">
          <div class="set-row__txt"><strong>Cor de destaque</strong><small>Botões, seleção, links e fluxo do editor.</small></div>
          <div class="swatches">
            ${ACCENTS.map(([c, n]) => `<button class="swatch ${s.accent.toLowerCase() === c.toLowerCase() ? 'is-on' : ''}" style="--c:${c}" data-accent="${c}" title="${n}" aria-label="${n}"></button>`).join('')}
            <label class="swatch swatch--custom ${isPreset ? '' : 'is-on'}" style="--c:${s.accent}" title="Cor personalizada"><input type="color" id="accentCustom" value="${s.accent}" aria-label="Cor personalizada"></label>
          </div>
        </div>
        <div class="set-row">
          <div class="set-row__txt"><strong>Densidade</strong><small>Compacta mostra mais conteúdo em telas menores.</small></div>
          <div class="seg"><button data-density="comfortable" class="${s.density !== 'compact' ? 'is-on' : ''}">Confortável</button><button data-density="compact" class="${s.density === 'compact' ? 'is-on' : ''}">Compacta</button></div>
        </div>
      </section>

      <section class="card set-section" id="sec-fundo">
        <div class="card__head"><div><h2 class="card__title">Fundo do portal</h2><p class="card__sub">A cara do portal: a linha de testes ao fundo de todas as telas.</p></div>
          <button class="btn btn--sm" data-act="upload">${icon('upload')} Enviar foto da sua linha</button></div>
        <div class="set-row set-row--stack">
          <div class="bg-opts">
            ${bgOpt('testes', `background-image:url('${BGS.testes.src}')`, '', '')}
            ${bgOpt('fold', `background-image:url('${BGS.fold.src}')`, '', '')}
            ${bgOpt('video', '', `<video src="${BGS.video.src}#t=2" muted preload="metadata" playsinline></video>`, `${icon('video')} vídeo`)}
            ${bgOpt('custom', custom ? `background-image:url('${custom}')` : '', custom ? '' : icon('upload', 'ic--lg'), '')}
            ${bgOpt('none', '', icon('x', 'ic--lg'), '')}
          </div>
        </div>
        <div class="set-row">
          <div class="set-row__txt"><strong>Intensidade da camada</strong><small>Mais alta = foto mais discreta e conteúdo mais legível.</small></div>
          <div class="range-wrap"><input type="range" min="0.4" max="0.96" step="0.01" data-range="bgOverlay" value="${s.bgOverlay}" aria-label="Intensidade da camada"><span class="range-val" data-val="bgOverlay">${Math.round(s.bgOverlay * 100)}%</span></div>
        </div>
        <div class="set-row">
          <div class="set-row__txt"><strong>Desfoque da imagem</strong><small>Suaviza a foto para não competir com o conteúdo.</small></div>
          <div class="range-wrap"><input type="range" min="0" max="16" step="1" data-range="bgBlur" value="${s.bgBlur}" aria-label="Desfoque"><span class="range-val" data-val="bgBlur">${s.bgBlur}px</span></div>
        </div>
      </section>

      <section class="card set-section" id="sec-menu">
        <div class="card__head"><div><h2 class="card__title">Menu lateral</h2><p class="card__sub">A barra à esquerda pode ficar só com ícones para liberar espaço.</p></div></div>
        ${sw('sidebarCollapsed', 'Menu recolhido', 'Mostra apenas ícones, com dica ao passar o mouse. Atalho: tecla [')}
        ${sw('focusEditor', 'Recolher ao abrir o editor', 'Libera espaço para o canvas; o menu volta ao sair do editor.')}
      </section>

      <section class="card set-section" id="sec-editor">
        <div class="card__head"><div><h2 class="card__title">Editor de layout</h2><p class="card__sub">Escala, metas e visualização do canvas.</p></div></div>
        <div class="set-row">
          <div class="set-row__txt"><strong>Escala da grade</strong><small>Tamanho real de cada célula do canvas.</small></div>
          <div class="set-row__ctrl"><select class="select" data-setting="cellM">
            ${[0.25, 0.5, 1].map(v => `<option value="${v}" ${s.cellM === v ? 'selected' : ''}>1 célula = ${fmt(v, 2)} m</option>`).join('')}
          </select></div>
        </div>
        <div class="set-row">
          <div class="set-row__txt"><strong>Meta de UPH padrão</strong><small>Usada ao criar novos layouts (takt = 3600 ÷ UPH).</small></div>
          <div class="set-row__ctrl"><div class="input-group" style="width:180px"><input class="input" type="number" min="1" step="1" data-setting="defaultUph" value="${s.defaultUph}"><span class="input-group__suffix">un/h</span></div></div>
        </div>
        ${sw('showGrid', 'Mostrar grade', 'Linhas de referência no canvas (a cada célula e a cada 5).')}
        ${sw('flowAnim', 'Animar fluxo e esteiras', 'Setas tracejadas em movimento indicam o sentido da linha.')}
        ${sw('showSeq', 'Números de sequência', 'Ordem das estações no fluxo, da esquerda para a direita.')}
      </section>

      <section class="card set-section danger-zone" id="sec-dados">
        <div class="card__head"><div><h2 class="card__title">Dados</h2><p class="card__sub">Os layouts ficam no armazenamento local deste navegador.</p></div></div>
        <div class="set-row">
          <div class="set-row__txt"><strong>Backup</strong><small>Exporte todos os layouts em um único arquivo JSON ou importe um backup.</small></div>
          <div class="set-row__ctrl"><button class="btn btn--sm" data-act="import">${icon('upload')} Importar</button><button class="btn btn--sm" data-act="exportAll">${icon('download')} Exportar tudo</button></div>
        </div>
        <div class="set-row">
          <div class="set-row__txt"><strong>Restaurar padrão</strong><small>Volta as configurações e os layouts de exemplo. Os layouts atuais serão apagados.</small></div>
          <div class="set-row__ctrl"><button class="btn btn--sm btn--danger" data-act="reset">${icon('trash')} Restaurar</button></div>
        </div>
      </section>`;
    };
    draw();
    if (pendingJump) { const j = pendingJump; pendingJump = null; requestAnimationFrame(() => { const el = $('#sec-' + j); if (el) el.scrollIntoView({ behavior: 'smooth' }); }); }

    view.onclick = async e => {
      const t = e.target;
      const jump = t.closest('[data-jump]');
      if (jump) { e.preventDefault(); $('#sec-' + jump.dataset.jump).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
      const th = t.closest('[data-set-theme]'); if (th) { setTheme(th.dataset.setTheme); draw(); return; }
      const ac = t.closest('[data-accent]'); if (ac) { S.settings.accent = ac.dataset.accent; saveSettings(); applyAccent(); draw(); return; }
      const de = t.closest('[data-density]'); if (de) { S.settings.density = de.dataset.density; saveSettings(); applyDensity(); draw(); return; }
      const bg = t.closest('[data-bg]');
      if (bg) {
        if (bg.dataset.bg === 'custom' && !LS.get('ll.bgCustom', null)) { if (await uploadCustomBg()) draw(); return; }
        S.settings.bg = bg.dataset.bg; saveSettings(); applyBackground(); draw(); return;
      }
      const act = t.closest('[data-act]'); if (!act) return;
      if (act.dataset.act === 'upload') { if (await uploadCustomBg()) draw(); }
      else if (act.dataset.act === 'import') { await importLayouts(); }
      else if (act.dataset.act === 'exportAll') { download('layouts-da-linha-backup.json', JSON.stringify({ app: 'layout-da-linha', version: 1, layouts: S.layouts }, null, 2), 'application/json'); }
      else if (act.dataset.act === 'reset') {
        const ok = await confirmDialog({ title: 'Restaurar padrão?', text: '<p>Configurações, foto personalizada e <strong>todos os layouts</strong> deste navegador serão substituídos pelos exemplos. Essa ação não pode ser desfeita.</p>', ok: 'Restaurar tudo', danger: true });
        if (!ok) return;
        S.settings = Object.assign({}, DEFAULTS); S.layouts = seed(); S.currentId = null;
        LS.del('ll.bgCustom'); LS.del('ll.current'); saveSettings(); saveLayouts();
        applyAccent(); applyDensity(); applyTheme(); applyBackground(true); setCollapsed(false); draw();
        toast('Padrões restaurados', 'ok');
      }
    };
    view.oninput = e => {
      const t = e.target;
      if (t.id === 'accentCustom') { S.settings.accent = t.value; saveSettings(); applyAccent(); const l = t.closest('.swatch'); if (l) l.style.setProperty('--c', t.value); return; }
      if (t.dataset.range) {
        const k = t.dataset.range; S.settings[k] = +t.value; saveSettings(); applyBackground();
        $(`[data-val="${k}"]`).textContent = k === 'bgOverlay' ? Math.round(+t.value * 100) + '%' : t.value + 'px';
      }
    };
    view.onchange = e => {
      const t = e.target;
      if (t.id === 'accentCustom') { draw(); return; }
      const k = t.dataset.setting; if (!k) return;
      if (k === 'sidebarCollapsed') { setCollapsed(t.checked); return; }
      if (t.type === 'checkbox') S.settings[k] = t.checked;
      else if (k === 'cellM') S.settings[k] = +t.value;
      else if (k === 'defaultUph') S.settings[k] = Math.max(1, Math.round(+t.value || DEFAULTS.defaultUph));
      saveSettings();
    };
  }

  async function uploadCustomBg() {
    const f = await pickFile('image/*');
    if (!f) return false;
    try {
      const url = URL.createObjectURL(f);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const k = Math.min(1, 1920 / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      if (!LS.set('ll.bgCustom', c.toDataURL('image/jpeg', 0.82))) { toast('Imagem grande demais para salvar no navegador.', 'err'); return false; }
      S.settings.bg = 'custom'; saveSettings(); applyBackground(true);
      toast('Foto de fundo atualizada', 'ok');
      return true;
    } catch (e) { toast('Não foi possível ler essa imagem.', 'err'); return false; }
  }

  /* =================================================================
     PÁGINA: EDITOR DE LAYOUT
     ================================================================= */
  function renderEditor(view, params) {
    let L = null;
    if (params.get('novo')) {
      L = { id: uid(), name: `Novo layout ${S.layouts.length + 1}`, line: '', model: '', status: 'rascunho', targetUph: S.settings.defaultUph, updatedAt: Date.now(), items: [] };
      S.layouts.unshift(L); saveLayouts();
    } else if (params.get('id')) L = getLayout(params.get('id'));
    if (!L) L = getLayout(S.currentId) || byRecent()[0];
    if (!L) { L = { id: uid(), name: 'Novo layout 1', line: '', model: '', status: 'rascunho', targetUph: S.settings.defaultUph, updatedAt: Date.now(), items: [] }; S.layouts.unshift(L); saveLayouts(); }
    const addType = params.get('add');
    S.currentId = L.id; LS.set('ll.current', L.id);
    history.replaceState(null, '', '#/criar?id=' + L.id);
    $('#crumbTitle').textContent = L.name;

    const ed = { sel: new Set(), zoom: 1, px: 40, py: 40, hist: [], fut: [], drag: null, fieldBefore: null, touched: false };
    const autoCollapsed = S.settings.focusEditor && !isCollapsed() && innerWidth > 900;
    if (autoCollapsed) root.classList.add('sb-collapsed');
    const byId = id => L.items.find(i => i.id === id);
    const snapshot = () => JSON.stringify(L.items);

    view.innerHTML = `
    <div class="editor">
      <div class="ed-bar glass">
        <div class="ed-title">
          <input class="ed-name" id="edName" value="${esc(L.name)}" maxlength="120" aria-label="Nome do layout" spellcheck="false">
          <div class="ed-meta">
            <input class="input input--sm" id="edLine" placeholder="Linha (ex.: L07)" value="${esc(L.line)}" aria-label="Linha">
            <input class="input input--sm" id="edModel" placeholder="Modelo" value="${esc(L.model)}" aria-label="Modelo">
            <select class="select select--sm" id="edStatus" aria-label="Status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${L.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <span class="save-state" id="saveState">Salvo automaticamente</span>
          </div>
        </div>
        <div class="ed-actions">
          <div class="ed-group">
            <button class="icon-btn icon-btn--sm" id="bUndo" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">${icon('undo')}</button>
            <button class="icon-btn icon-btn--sm" id="bRedo" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer">${icon('redo')}</button>
          </div>
          <div class="ed-group">
            <button class="icon-btn icon-btn--sm" id="bZoomOut" title="Diminuir zoom (−)" aria-label="Diminuir zoom">${icon('zoom-out')}</button>
            <button class="zoom-val" id="zoomVal" title="Voltar para 100%">100%</button>
            <button class="icon-btn icon-btn--sm" id="bZoomIn" title="Aumentar zoom (+)" aria-label="Aumentar zoom">${icon('zoom-in')}</button>
            <button class="icon-btn icon-btn--sm" id="bFit" title="Enquadrar layout (0)" aria-label="Enquadrar">${icon('fit')}</button>
          </div>
          <div class="ed-group">
            <button class="icon-btn icon-btn--sm ${S.settings.showGrid ? 'is-on' : ''}" id="bGrid" title="Mostrar grade" aria-label="Mostrar grade">${icon('grid')}</button>
            <button class="icon-btn icon-btn--sm ${S.settings.flowAnim ? 'is-on' : ''}" id="bFlow" title="Animar fluxo" aria-label="Animar fluxo">${icon('flow')}</button>
          </div>
          <div class="ed-group">
            <button class="icon-btn icon-btn--sm" id="bImport" title="Importar JSON" aria-label="Importar JSON">${icon('upload')}</button>
            <button class="icon-btn icon-btn--sm" id="bExport" title="Exportar JSON" aria-label="Exportar JSON">${icon('download')}</button>
            <button class="icon-btn icon-btn--sm" id="bSvg" title="Exportar imagem (SVG)" aria-label="Exportar SVG">${icon('image')}</button>
          </div>
          <button class="btn btn--primary btn--sm" id="bSave" title="Ctrl+S">${icon('save')} Salvar</button>
        </div>
      </div>

      <div class="ed-body">
        <aside class="ed-palette glass" aria-label="Estações">
          <div class="input-icon">${icon('search')}<input class="input input--sm" id="palSearch" placeholder="Buscar estação…" autocomplete="off"></div>
          <div class="ed-palette__list" id="palList"></div>
          <div class="ed-palette__hint">${icon('info')}<span>Arraste para o canvas ou clique para inserir no centro da tela.</span></div>
        </aside>

        <div class="ed-canvas ${S.settings.showGrid ? 'show-grid' : ''} ${S.settings.flowAnim && !reduceMotion ? 'flow-anim' : ''}" id="canvas" tabindex="0" aria-label="Canvas do layout">
          <div class="world" id="world">
            <svg class="flow-layer" id="flowSvg" width="1" height="1" aria-hidden="true"></svg>
            <div id="items"></div>
          </div>
          <div class="canvas-empty" id="canvasEmpty" hidden><div>${icon('plus-square')}<strong>Comece arrastando uma estação</strong><p>Use a paleta à esquerda. O fluxo, o gargalo e o UPH são calculados automaticamente.</p></div></div>
          <div class="canvas-hud"><span><i class="scale-bar" id="scaleBar"></i><b id="scaleTxt">1 m</b></span><span id="hudInfo"></span></div>
        </div>

        <aside class="ed-props glass" id="props" aria-label="Propriedades">
          <div id="propsSel"></div>
          <div class="props-sec">
            <h3>Resumo da linha</h3>
            <div class="field" style="margin-bottom:12px">
              <label for="pTarget">Meta de produção</label>
              <div class="input-group"><input class="input input--sm" type="number" id="pTarget" min="1" step="1" value="${L.targetUph}"><span class="input-group__suffix">un/h</span></div>
            </div>
            <div id="sumBody"></div>
          </div>
          <div class="props-sec">
            <h3>Balanceamento por estação</h3>
            <div id="chart"></div>
          </div>
        </aside>
      </div>
    </div>`;

    const canvas = $('#canvas'), world = $('#world'), itemsEl = $('#items');

    /* ----- paleta ----- */
    const drawPalette = (q = '') => {
      const nq = norm(q);
      $('#palList').innerHTML = CATS.map(([cid, cname]) => {
        const its = Object.entries(TYPES).filter(([, t]) => t.cat === cid && (!nq || norm(t.name).includes(nq)));
        if (!its.length) return '';
        return `<div class="pal-cat">${cname}</div>` + its.map(([k, t]) => `
          <div class="pal-item" role="button" tabindex="0" draggable="true" data-type="${k}" style="--c:${t.color}" title="${esc(t.desc)}">
            <span class="pal-item__icon">${icon(t.icon)}</span>
            <span><strong>${t.name}</strong><small>${t.ct ? `CT ${t.ct}s · ` : ''}${fmt(t.w * S.settings.cellM, 1)}×${fmt(t.h * S.settings.cellM, 1)} m</small></span>
          </div>`).join('');
      }).join('') || '<p class="muted" style="padding:8px">Nenhuma estação encontrada.</p>';
    };
    drawPalette();
    $('#palSearch').addEventListener('input', e => drawPalette(e.target.value));
    $('#palList').addEventListener('dragstart', e => {
      const b = e.target.closest('.pal-item'); if (!b) return;
      e.dataTransfer.setData('text/x-ll-type', b.dataset.type); e.dataTransfer.effectAllowed = 'copy';
    });
    $('#palList').addEventListener('click', e => {
      const b = e.target.closest('.pal-item'); if (!b) return;
      const c = viewCenter(); addItem(b.dataset.type, c.x, c.y);
    });
    $('#palList').addEventListener('keydown', e => {
      const b = e.target.closest('.pal-item'); if (!b || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault(); const c = viewCenter(); addItem(b.dataset.type, c.x, c.y);
    });

    /* ----- visão (pan/zoom) ----- */
    function applyView() {
      world.style.transform = `translate(${ed.px}px, ${ed.py}px) scale(${ed.zoom})`;
      canvas.style.setProperty('--gs', G * ed.zoom + 'px');
      canvas.style.setProperty('--gx', ed.px + 'px');
      canvas.style.setProperty('--gy', ed.py + 'px');
      $('#zoomVal').textContent = Math.round(ed.zoom * 100) + '%';
      const pxPerM = (G * ed.zoom) / S.settings.cellM;
      const meters = [0.5, 1, 2, 5, 10, 20, 50].find(v => v * pxPerM >= 48) || 50;
      $('#scaleBar').style.width = meters * pxPerM + 'px';
      $('#scaleTxt').textContent = fmt(meters, meters % 1 ? 1 : 0) + ' m';
    }
    const toWorld = (cx, cy) => { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left - ed.px) / ed.zoom / G, y: (cy - r.top - ed.py) / ed.zoom / G }; };
    const viewCenter = () => { const r = canvas.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); };
    function zoomAt(f, cx, cy) {
      const nz = clamp(ed.zoom * f, 0.25, 3), k = nz / ed.zoom;
      ed.px = cx - (cx - ed.px) * k; ed.py = cy - (cy - ed.py) * k; ed.zoom = nz; applyView();
    }
    const zoomCenter = f => { ed.touched = true; const r = canvas.getBoundingClientRect(); zoomAt(f, r.width / 2, r.height / 2); };
    function fit() {
      const r = canvas.getBoundingClientRect();
      if (!L.items.length || !r.width) { ed.zoom = 1; ed.px = 40; ed.py = 40; applyView(); return; }
      const minX = Math.min(...L.items.map(i => i.x)) * G, minY = Math.min(...L.items.map(i => i.y)) * G;
      const maxX = Math.max(...L.items.map(i => i.x + i.w)) * G, maxY = Math.max(...L.items.map(i => i.y + i.h)) * G;
      const pad = 56, bw = maxX - minX, bh = maxY - minY;
      ed.zoom = clamp(Math.min((r.width - pad * 2) / bw, (r.height - pad * 2) / bh), 0.25, 1.6);
      ed.px = (r.width - bw * ed.zoom) / 2 - minX * ed.zoom;
      ed.py = (r.height - bh * ed.zoom) / 2 - minY * ed.zoom;
      applyView();
    }

    /* ----- render dos itens / fluxo / painel ----- */
    function drawFlow(m) {
      const svg = $('#flowSvg');
      if (m.flow.length < 2) { svg.innerHTML = ''; return; }
      const pts = m.flow.map(i => [(i.x + i.w / 2) * G, (i.y + i.h / 2) * G]);
      svg.innerHTML = `<path class="flow-path" d="M${pts.map(p => p.join(',')).join(' L')}"/>` + pts.map(p => `<circle class="flow-dot" cx="${p[0]}" cy="${p[1]}" r="4"/>`).join('');
    }
    function renderItems() {
      const m = metrics(L);
      const seqN = new Map(m.flow.map((it, i) => [it.id, i + 1]));
      const over = new Set(m.over.map(i => i.id));
      itemsEl.innerHTML = L.items.map(it => {
        const t = TYPES[it.type];
        const isB = m.bott && m.bott.id === it.id && m.st.length > 1;
        const cls = ['st', 'st--' + it.type];
        if (ed.sel.has(it.id)) cls.push('is-selected');
        if (isB) cls.push('st--gargalo');
        if (over.has(it.id)) cls.push('st--over');
        if (!it.inFlow && t.flow) cls.push('st--off');
        if (it.type === 'esteira' && it.h > it.w) cls.push('is-vertical');
        if (!['operador', 'esteira'].includes(it.type) && (it.w < 3 || it.h < 3)) cls.push('st--tiny');
        const n = S.settings.showSeq && seqN.get(it.id);
        const ct = +it.ct && hasCT(it.type) ? `<span class="st__ct">${fmt(it.ct, it.ct % 1 ? 1 : 0)}s</span>` : '';
        const body = it.type === 'operador' ? icon('user')
          : it.type === 'esteira' ? `${icon('arrow-right')}<span class="st__name">${esc(it.name)}</span>`
          : `${icon(t.icon)}<span class="st__name">${esc(it.name)}</span>${ct}`;
        return `<div class="${cls.join(' ')}" data-id="${it.id}" style="left:${it.x * G}px;top:${it.y * G}px;width:${it.w * G}px;height:${it.h * G}px;--c:${t.color}" title="${esc(it.name)}${+it.ct ? ' · ' + it.ct + 's' : ''}">
          ${n ? `<span class="st__seq">${n}</span>` : ''}${isB ? '<span class="st__flag">Gargalo</span>' : ''}${body}<span class="st__resize" data-resize title="Redimensionar"></span></div>`;
      }).join('');
      drawFlow(m);
      $('#canvasEmpty').hidden = L.items.length > 0;
      $('#hudInfo').textContent = `${L.items.length} itens · ${fmt(m.len, 1)} × ${fmt(m.dep, 1)} m`;
      return m;
    }
    function renderSummary(m = metrics(L)) {
      const diff = m.uph - L.targetUph;
      $('#sumBody').innerHTML = `
        <div class="metrics">
          <div class="metric metric--hl"><small>UPH teórico</small><b>${m.uph || '—'}<em>un/h</em></b></div>
          <div class="metric ${m.meets === false ? 'metric--bad' : m.meets ? 'metric--ok' : ''}"><small>Takt da meta</small><b>${m.takt ? fmt(m.takt, 1) : '—'}<em>s</em></b></div>
          <div class="metric ${m.meets === false ? 'metric--bad' : ''}"><small>Gargalo</small><b>${m.maxCT ? fmt(m.maxCT, m.maxCT % 1 ? 1 : 0) : '—'}<em>s</em></b></div>
          <div class="metric"><small>Balanceamento</small><b>${m.n ? fmt(m.bal) : '—'}<em>%</em></b></div>
          <div class="metric"><small>Estações no fluxo</small><b>${m.n}</b></div>
          <div class="metric"><small>Operadores</small><b>${m.ops}</b></div>
          <div class="metric full"><small>Área ocupada (C × L)</small><b>${fmt(m.len, 1)} × ${fmt(m.dep, 1)}<em>m</em></b></div>
        </div>
        ${!m.n ? '' : m.meets ? `<div class="alert alert--ok">${icon('check')}<span><b>Meta atendida.</b> Capacidade de ${m.uph} un/h (+${diff} acima da meta).</span></div>`
          : `<div class="alert alert--bad">${icon('alert')}<span><b>Faltam ${-diff} un/h.</b> ${m.over.length} estação(ões) acima do takt: ${m.over.map(i => esc(i.name)).join(', ')}.</span></div>`}`;
      // gráfico de balanceamento
      const scale = Math.max(m.maxCT, m.takt || 0) * 1.18 || 1;
      const seqN = new Map(m.flow.map((it, i) => [it.id, i + 1]));
      $('#chart').innerHTML = m.st.length ? `
        <div class="balance">
          <div class="balance__chart">
            ${m.takt ? `<div class="balance__takt" style="bottom:${(m.takt / scale) * 100}%"><em>takt ${fmt(m.takt, 1)}s</em></div>` : ''}
            ${m.st.map(i => `<div class="balance__bar ${m.takt && +i.ct > m.takt ? 'is-over' : ''} ${+i.ct === m.maxCT ? 'is-max' : ''} ${ed.sel.has(i.id) ? 'is-sel' : ''}" data-id="${i.id}" style="height:${(+i.ct / scale) * 100}%" title="${esc(i.name)}: ${i.ct}s"><span>${fmt(i.ct, i.ct % 1 ? 1 : 0)}</span></div>`).join('')}
          </div>
          <div class="balance__labels">${m.st.map(i => `<span>${seqN.get(i.id)}</span>`).join('')}</div>
          <p class="hint">Barras = tempo de ciclo (s) por estação na ordem do fluxo. Clique para selecionar.</p>
        </div>` : '<p class="hint">Adicione estações com tempo de ciclo para ver o gráfico.</p>';
    }
    function renderSelection() {
      const box = $('#propsSel');
      const sel = [...ed.sel].map(byId).filter(Boolean);
      if (!sel.length) {
        box.innerHTML = `<div class="props-sec"><h3>Seleção</h3><p class="hint" style="margin:0">Clique em uma estação para editar nome, tempo de ciclo e tamanho. <kbd>Shift</kbd> + clique seleciona várias.</p></div>`;
        return;
      }
      if (sel.length > 1) {
        box.innerHTML = `<div class="props-sec">
          <h3>${sel.length} itens selecionados <button class="icon-btn icon-btn--sm" data-p="clear" aria-label="Limpar seleção">${icon('x')}</button></h3>
          <p class="hint" style="margin:0 0 4px">Arraste qualquer item para mover o grupo.</p>
          <div class="props-actions"><button class="btn btn--sm" data-p="align">${icon('align')} Alinhar</button><button class="btn btn--sm" data-p="distribute">${icon('distribute')} Distribuir</button></div>
          <div class="props-actions" style="margin-top:6px"><button class="btn btn--sm" data-p="dup">${icon('copy')} Duplicar</button><button class="btn btn--sm btn--danger" data-p="del">${icon('trash')} Excluir</button></div>
        </div>`;
        return;
      }
      const it = sel[0], t = TYPES[it.type], cm = S.settings.cellM;
      box.innerHTML = `<div class="props-sec">
        <h3>Item selecionado <button class="icon-btn icon-btn--sm" data-p="clear" aria-label="Limpar seleção">${icon('x')}</button></h3>
        <div class="props-type"><span class="pal-item__icon" style="--c:${t.color}">${icon(t.icon)}</span><div><strong>${t.name}</strong><small>${CATS.find(c => c[0] === t.cat)[1]}</small></div></div>
        <div class="props-grid">
          <div class="field full"><label for="pName">Nome</label><input class="input input--sm" id="pName" data-f="name" value="${esc(it.name)}" maxlength="60"></div>
          ${hasCT(it.type) ? `<div class="field full"><label for="pCt">Tempo de ciclo</label><div class="input-group"><input class="input input--sm" type="number" id="pCt" data-f="ct" min="0" step="0.5" value="${it.ct}"><span class="input-group__suffix">s</span></div></div>` : ''}
          <div class="field"><label for="pX">Posição X</label><input class="input input--sm" type="number" id="pX" data-f="x" step="1" value="${it.x}"></div>
          <div class="field"><label for="pY">Posição Y</label><input class="input input--sm" type="number" id="pY" data-f="y" step="1" value="${it.y}"></div>
          <div class="field"><label for="pW">Largura</label><input class="input input--sm" type="number" id="pW" data-f="w" min="1" step="1" value="${it.w}"></div>
          <div class="field"><label for="pH">Profundidade</label><input class="input input--sm" type="number" id="pH" data-f="h" min="1" step="1" value="${it.h}"></div>
          <p class="hint full" id="pSize" style="margin:-2px 0 0">Em células · ${fmt(it.w * cm, 2)} × ${fmt(it.h * cm, 2)} m</p>
          ${t.flow || hasCT(it.type) ? `<div class="full check-row"><span>Faz parte do fluxo principal</span><label class="switch"><input type="checkbox" data-f="inFlow" ${it.inFlow ? 'checked' : ''} aria-label="Faz parte do fluxo principal"><span></span></label></div>` : ''}
        </div>
        <div class="props-actions">
          <button class="btn btn--sm" data-p="rotate" title="R">${icon('rotate')} Girar</button>
          <button class="btn btn--sm" data-p="dup" title="Ctrl+D">${icon('copy')} Duplicar</button>
          <button class="btn btn--sm btn--danger" data-p="del" title="Delete">${icon('trash')}</button>
        </div>
      </div>`;
    }
    function renderAll() {
      const m = renderItems();
      renderSummary(m);
      renderSelection();
      $('#bUndo').disabled = !ed.hist.length;
      $('#bRedo').disabled = !ed.fut.length;
    }

    /* ----- histórico e salvamento ----- */
    let saveTimer = null;
    function setSaveState(saving) {
      const el = $('#saveState'); if (!el) return;
      el.classList.toggle('is-saving', saving);
      el.textContent = saving ? 'Salvando…' : 'Salvo automaticamente';
    }
    function scheduleSave() { setSaveState(true); clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 500); }
    function saveNow(withToast) {
      clearTimeout(saveTimer); saveTimer = null;
      L.updatedAt = Date.now(); saveLayouts(); setSaveState(false);
      if (withToast === true) toast('Layout salvo', 'ok');
    }
    function commit(before) {
      if (before !== snapshot()) { ed.hist.push(before); if (ed.hist.length > 150) ed.hist.shift(); ed.fut = []; scheduleSave(); }
      renderAll();
    }
    function undo() { if (!ed.hist.length) return; ed.fut.push(snapshot()); L.items = JSON.parse(ed.hist.pop()); pruneSel(); renderAll(); scheduleSave(); }
    function redo() { if (!ed.fut.length) return; ed.hist.push(snapshot()); L.items = JSON.parse(ed.fut.pop()); pruneSel(); renderAll(); scheduleSave(); }
    const pruneSel = () => { ed.sel = new Set([...ed.sel].filter(id => byId(id))); };

    /* ----- operações ----- */
    function autoName(type) {
      const t = TYPES[type];
      const n = L.items.filter(i => i.type === type).length + 1;
      if (type === 'operador') return 'OP ' + String(n).padStart(2, '0');
      return n > 1 ? `${t.name} ${n}` : t.name;
    }
    function addItem(type, cx, cy) {
      const t = TYPES[type]; if (!t) return;
      const before = snapshot();
      const it = { id: uid(), type, x: Math.round(cx - t.w / 2), y: Math.round(cy - t.h / 2), w: t.w, h: t.h, name: autoName(type), ct: t.ct, inFlow: t.flow };
      let guard = 0;
      while (L.items.some(o => o.x === it.x && o.y === it.y) && guard++ < 30) { it.x += 1; it.y += 1; }
      L.items.push(it); ed.sel = new Set([it.id]); commit(before);
      return it;
    }
    function deleteSel() { if (!ed.sel.size) return; const b = snapshot(); L.items = L.items.filter(i => !ed.sel.has(i.id)); ed.sel.clear(); commit(b); }
    function duplicateSel() {
      if (!ed.sel.size) return; const b = snapshot(); const ns = new Set();
      [...ed.sel].map(byId).filter(Boolean).forEach(i => { const c = { ...i, id: uid(), x: i.x + 2, y: i.y + 2 }; L.items.push(c); ns.add(c.id); });
      ed.sel = ns; commit(b);
    }
    function rotateSel() {
      if (!ed.sel.size) return; const b = snapshot();
      [...ed.sel].map(byId).forEach(i => { const cx = i.x + i.w / 2, cy = i.y + i.h / 2; [i.w, i.h] = [i.h, i.w]; i.x = Math.round(cx - i.w / 2); i.y = Math.round(cy - i.h / 2); });
      commit(b);
    }
    function nudge(dx, dy) { const b = snapshot(); [...ed.sel].map(byId).forEach(i => { i.x += dx; i.y += dy; }); commit(b); }
    function alignSel() {
      const s = [...ed.sel].map(byId); if (s.length < 2) return; const b = snapshot();
      const cy = s.reduce((a, i) => a + i.y + i.h / 2, 0) / s.length;
      s.forEach(i => { i.y = Math.round(cy - i.h / 2); }); commit(b);
    }
    function distributeSel() {
      const s = [...ed.sel].map(byId).sort((a, b) => a.x - b.x);
      if (s.length < 3) { toast('Selecione 3 ou mais itens para distribuir.'); return; }
      const b = snapshot();
      const first = s[0], last = s[s.length - 1];
      const span = last.x + last.w - first.x, sumW = s.reduce((a, i) => a + i.w, 0);
      const gap = (span - sumW) / (s.length - 1);
      let x = first.x;
      s.forEach(i => { i.x = Math.round(x); x += i.w + gap; }); commit(b);
    }

    /* ----- interação no canvas ----- */
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 1) return;
      canvas.focus({ preventScroll: true });
      const stEl = e.button === 0 && e.target.closest('.st');
      if (stEl) {
        const id = stEl.dataset.id;
        if (e.shiftKey || e.ctrlKey || e.metaKey) { if (ed.sel.has(id)) ed.sel.delete(id); else ed.sel.add(id); renderAll(); return; }
        const resizing = !!e.target.closest('[data-resize]');
        if (!ed.sel.has(id) || resizing) ed.sel = new Set([id]);
        const ids = resizing ? [id] : [...ed.sel];
        ed.drag = { mode: resizing ? 'resize' : 'move', sx: e.clientX, sy: e.clientY, moved: false, before: snapshot(), orig: new Map(ids.map(i => { const it = byId(i); return [i, { x: it.x, y: it.y, w: it.w, h: it.h }]; })) };
        canvas.setPointerCapture(e.pointerId);
        renderAll();
        return;
      }
      e.preventDefault();
      ed.drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, px: ed.px, py: ed.py, moved: false };
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-panning');
    });
    canvas.addEventListener('pointermove', e => {
      const d = ed.drag; if (!d) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < 3) return;
      d.moved = true;
      if (d.mode === 'pan') { ed.touched = true; ed.px = d.px + dx; ed.py = d.py + dy; applyView(); return; }
      const gx = Math.round(dx / (G * ed.zoom)), gy = Math.round(dy / (G * ed.zoom));
      for (const [id, o] of d.orig) {
        const it = byId(id); if (!it) continue;
        if (d.mode === 'move') { it.x = o.x + gx; it.y = o.y + gy; } else { it.w = Math.max(1, o.w + gx); it.h = Math.max(1, o.h + gy); }
        const el = itemsEl.querySelector(`[data-id="${id}"]`);
        if (el) { el.style.left = it.x * G + 'px'; el.style.top = it.y * G + 'px'; el.style.width = it.w * G + 'px'; el.style.height = it.h * G + 'px'; el.classList.add('is-dragging'); }
      }
      drawFlow(metrics(L));
    });
    const endDrag = () => {
      const d = ed.drag; if (!d) return;
      ed.drag = null; canvas.classList.remove('is-panning');
      if (d.mode === 'pan') { if (!d.moved && ed.sel.size) { ed.sel.clear(); renderAll(); } return; }
      if (d.moved) commit(d.before); else renderAll();
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', e => {
      e.preventDefault(); ed.touched = true;
      const r = canvas.getBoundingClientRect();
      if (e.shiftKey) { ed.px -= e.deltaY || e.deltaX; applyView(); return; }
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    canvas.addEventListener('dblclick', e => { if (!e.target.closest('.st')) fit(); });

    // arrastar da paleta
    const hasType = e => Array.from(e.dataTransfer.types || []).includes('text/x-ll-type');
    canvas.addEventListener('dragover', e => { if (!hasType(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; canvas.classList.add('is-dropping'); });
    canvas.addEventListener('dragleave', e => { if (!canvas.contains(e.relatedTarget)) canvas.classList.remove('is-dropping'); });
    canvas.addEventListener('drop', e => {
      canvas.classList.remove('is-dropping');
      const type = e.dataTransfer.getData('text/x-ll-type'); if (!type) return;
      e.preventDefault(); const w = toWorld(e.clientX, e.clientY); addItem(type, w.x, w.y);
    });

    /* ----- painel de propriedades ----- */
    const propsSel = $('#propsSel');
    propsSel.addEventListener('click', e => {
      const b = e.target.closest('[data-p]'); if (!b) return;
      ({ clear: () => { ed.sel.clear(); renderAll(); }, del: deleteSel, dup: duplicateSel, rotate: rotateSel, align: alignSel, distribute: distributeSel })[b.dataset.p]();
    });
    propsSel.addEventListener('focusin', e => { if (e.target.dataset.f) ed.fieldBefore = snapshot(); });
    propsSel.addEventListener('input', e => {
      const f = e.target.dataset.f; if (!f || f === 'inFlow') return;
      const it = byId([...ed.sel][0]); if (!it) return;
      const v = e.target.value;
      if (f === 'name') it.name = v;
      else if (f === 'ct') it.ct = Math.max(0, +v || 0);
      else if (v !== '' && !Number.isNaN(+v)) it[f] = (f === 'w' || f === 'h') ? Math.max(1, Math.round(+v)) : Math.round(+v);
      const sz = $('#pSize'); if (sz) sz.textContent = `Em células · ${fmt(it.w * S.settings.cellM, 2)} × ${fmt(it.h * S.settings.cellM, 2)} m`;
      renderSummary(renderItems()); scheduleSave();
    });
    propsSel.addEventListener('change', e => {
      const f = e.target.dataset.f; if (!f) return;
      const it = byId([...ed.sel][0]); if (!it) return;
      if (f === 'inFlow') { const b = snapshot(); it.inFlow = e.target.checked; commit(b); return; }
      if (ed.fieldBefore && ed.fieldBefore !== snapshot()) { ed.hist.push(ed.fieldBefore); ed.fut = []; }
      ed.fieldBefore = snapshot();
      $('#bUndo').disabled = !ed.hist.length; $('#bRedo').disabled = true;
    });
    $('#chart').addEventListener('click', e => {
      const b = e.target.closest('.balance__bar'); if (!b) return;
      ed.sel = new Set([b.dataset.id]); renderAll();
    });
    $('#pTarget').addEventListener('input', e => { const v = Math.round(+e.target.value); if (v > 0) { L.targetUph = v; renderSummary(renderItems()); scheduleSave(); } });

    /* ----- cabeçalho / barra de ferramentas ----- */
    $('#edName').addEventListener('input', e => { L.name = e.target.value || 'Sem nome'; $('#crumbTitle').textContent = L.name; scheduleSave(); });
    $('#edLine').addEventListener('input', e => { L.line = e.target.value; scheduleSave(); });
    $('#edModel').addEventListener('input', e => { L.model = e.target.value; scheduleSave(); });
    $('#edStatus').addEventListener('change', e => { L.status = e.target.value; scheduleSave(); });
    $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
    $('#bZoomIn').onclick = () => zoomCenter(1.2); $('#bZoomOut').onclick = () => zoomCenter(1 / 1.2);
    $('#zoomVal').onclick = () => zoomCenter(1 / ed.zoom);
    $('#bFit').onclick = fit;
    $('#bGrid').onclick = e => { S.settings.showGrid = !S.settings.showGrid; saveSettings(); canvas.classList.toggle('show-grid', S.settings.showGrid); e.currentTarget.classList.toggle('is-on', S.settings.showGrid); };
    $('#bFlow').onclick = e => { S.settings.flowAnim = !S.settings.flowAnim; saveSettings(); canvas.classList.toggle('flow-anim', S.settings.flowAnim && !reduceMotion); e.currentTarget.classList.toggle('is-on', S.settings.flowAnim); };
    $('#bSave').onclick = () => saveNow(true);
    $('#bExport').onclick = () => exportJSON(L);
    $('#bSvg').onclick = () => download(slug(L.name) + '.svg', layoutSVG(L, { labels: true, standalone: true, dark: false, cell: 24 }), 'image/svg+xml');
    $('#bImport').onclick = async () => { const got = await importLayouts(); if (got.length) go('#/criar?id=' + got[0].id); };

    /* ----- teclado ----- */
    const onKey = e => {
      if (!$('#modal').hidden) return;
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (mod && k === 's') { e.preventDefault(); saveNow(true); return; }
      if (isTyping(e.target)) return;
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); redo(); return; }
      if (mod && k === 'd') { e.preventDefault(); duplicateSel(); return; }
      if (mod && k === 'a') { e.preventDefault(); ed.sel = new Set(L.items.map(i => i.id)); renderAll(); return; }
      if (mod || e.altKey) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { if (ed.sel.size) { e.preventDefault(); deleteSel(); } return; }
      if (e.key === 'Escape') { if (ed.sel.size) { ed.sel.clear(); renderAll(); } return; }
      if (k === 'r') { rotateSel(); return; }
      if (e.key.startsWith('Arrow') && ed.sel.size) {
        e.preventDefault(); const s = e.shiftKey ? 5 : 1;
        nudge(e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0); return;
      }
      if (e.key === '+' || e.key === '=') zoomCenter(1.2);
      else if (e.key === '-') zoomCenter(1 / 1.2);
      else if (e.key === '0') fit();
    };
    document.addEventListener('keydown', onKey);
    const onUnload = () => { if (saveTimer) saveNow(); };
    window.addEventListener('beforeunload', onUnload);

    /* ----- início ----- */
    renderAll();
    applyView();
    const ro = new ResizeObserver(() => { if (!ed.touched) fit(); });
    ro.observe(canvas);
    requestAnimationFrame(() => {
      fit();
      if (addType && TYPES[addType]) { const c = viewCenter(); addItem(addType, c.x, c.y); toast(`${TYPES[addType].name} adicionado(a) em “${L.name}”`, 'ok'); }
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onUnload);
      ro.disconnect();
      if (saveTimer) saveNow();
      if (autoCollapsed && !S.settings.sidebarCollapsed) root.classList.remove('sb-collapsed');
    };
  }

  /* ---------------- boot ---------------- */
  applyAccent(); applyDensity(); applyTheme(); applyBackground();
  root.classList.toggle('sb-collapsed', !!S.settings.sidebarCollapsed);
  $('#navCount').textContent = S.layouts.length;
  route();
})();
