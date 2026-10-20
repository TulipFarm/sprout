'use strict';

(() => {
  const STATES = ['TODO', 'PICK', 'REVIEW', 'DONE'];
  const ACTIVE_STAGES = new Set(['preparing', 'building', 'validating', 'waiting-integration', 'integrating']);
  const STAGE_LABELS = {
    idle: 'Idle',
    queued: 'Queued',
    preparing: 'Preparing copy',
    building: 'Building',
    validating: 'Validating',
    'waiting-integration': 'Waiting to integrate',
    integrating: 'Integrating',
    review: 'Ready for review',
    error: 'Error',
  };
  const EMPTY_HINTS = {
    TODO: 'Nothing left to pick.',
    PICK: 'Move a card here to start a build. Up to 5 at once.',
    REVIEW: 'Finished builds land here for your check.',
    DONE: 'Only you mark cards done.',
  };
  const PREVIEW_ORIGIN = 'http://127.0.0.1:4321';
  const LOG_LIMIT = 20000;
  const LOG_POLL_MS = 3000;
  const QUEUE_KEY = 'queue';
  const THEMES = ['system', 'light', 'dark'];
  const THEME_KEY = 'sprout-board-theme';
  const ONBOARDING_KEY = 'sprout-board-onboarding';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    imports: 'M8 2.5v7M5 6.75 8 9.75l3-3M3 12v1.5h10V12',
    external: 'M9 3h4v4M13 3 7 9M11 9.5V13H3V5h3.5',
    lock: 'M5 7V5.25a3 3 0 0 1 6 0V7M3.75 7h8.5v6.25h-8.5z',
    check: 'M3.5 8.5 6.5 11.5 12.5 4.5',
  };

  const $ = id => document.getElementById(id);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'i');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS[name]);
    svg.append(path);
    return svg;
  }

  function setText(node, text) {
    const value = text == null ? '' : String(text);
    if (node.textContent !== value) node.textContent = value;
  }

  function setAttr(node, name, value) {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function readStore(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  }

  const dom = {
    root: document.documentElement,
    conn: $('conn'),
    connLabel: $('conn-label'),
    model: $('model-badge'),
    theme: $('theme-toggle'),
    onboarding: $('onboarding'),
    mTotal: $('m-total'),
    mPicked: $('m-picked'),
    mReview: $('m-review'),
    mDone: $('m-done'),
    progress: $('progress'),
    progressFill: $('progress-fill'),
    progressLabel: $('progress-label'),
    search: $('search'),
    catBtn: $('cat-btn'),
    catLabel: $('cat-label'),
    catPop: $('cat-pop'),
    clearFilters: $('clear-filters'),
    pause: $('pause-toggle'),
    pauseState: $('pause-state'),
    inventory: $('inventory-meta'),
    offline: $('offline-banner'),
    queueBanner: $('queue-banner'),
    boardState: $('board-state'),
    board: $('board'),
    dialog: $('detail'),
    shot: $('shot'),
    shotTitle: $('shot-title'),
    shotImg: $('shot-img'),
    shotClose: $('shot-close'),
    dTitle: $('d-title'),
    dCategory: $('d-category'),
    dState: $('d-state'),
    dClose: $('d-close'),
    dGone: $('d-gone'),
    dStage: $('d-stage'),
    dStageText: $('d-stage-text'),
    dUpdated: $('d-updated'),
    dPreview: $('d-preview'),
    dMessage: $('d-message'),
    dError: $('d-error'),
    dSummary: $('d-summary'),
    dIds: $('d-ids'),
    dSource: $('d-source'),
    dMissing: $('d-missing'),
    dExports: $('d-exports'),
    dExportsCount: $('d-exports-count'),
    dDeps: $('d-deps'),
    dDepsCount: $('d-deps-count'),
    dImporters: $('d-importers'),
    dImportersCount: $('d-importers-count'),
    dFeedback: $('d-feedback'),
    dLastFeedback: $('d-last-feedback'),
    dLastFeedbackText: $('d-last-feedback-text'),
    dLog: $('d-log'),
    dLogEmpty: $('d-log-empty'),
    dLogStatus: $('d-log-status'),
    dLogTrim: $('d-log-trim'),
    dLogRefresh: $('d-log-refresh'),
    dActions: $('d-actions'),
    toasts: $('toasts'),
  };

  const columns = {};
  for (const state of STATES) {
    const sec = dom.board.querySelector(`.column[data-state="${state}"]`);
    columns[state] = {
      sec,
      list: sec.querySelector('[data-list]'),
      count: sec.querySelector('[data-count]'),
      note: sec.querySelector('[data-note]'),
      empty: sec.querySelector('[data-empty]'),
    };
  }

  const ui = {
    board: null,
    revision: -1,
    connection: 'connecting',
    query: '',
    category: 'all',
    pending: new Set(),
    drafts: new Map(),
    cardEls: new Map(),
    refs: new WeakMap(),
    dragId: null,
    deferredPlacement: false,
    detailId: null,
    shotId: null,
    detailOpener: null,
    logTimer: null,
    logReq: 0,
    logInflight: false,
    logShown: null,
    es: null,
    reconnectTimer: null,
    retryDelay: 1000,
    hadConnection: false,
    acceptNextEvent: true,
    categorySig: '',
  };

  /* ---------- Helpers ---------- */

  const getCard = id => (ui.board ? ui.board.cards.find(c => c.id === id) || null : null);
  const cardKey = id => `card:${id}`;
  const stageLabel = stage => STAGE_LABELS[stage] || (stage ? String(stage) : 'Idle');
  const isActive = card => card.state === 'PICK' && ACTIVE_STAGES.has(card.stage);
  const maxPicked = () => (ui.board && Number.isInteger(ui.board.maxPicked) ? ui.board.maxPicked : 5);
  const picksUsed = () => (ui.board ? ui.board.cards.filter(c => c.state === 'PICK').length : 0);
  const canMutate = () => !!ui.board && ui.connection !== 'offline';
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const arr = value => (Array.isArray(value) ? value.filter(v => typeof v === 'string') : []);

  function sourceContext(source) {
    if (typeof source !== 'string' || !source) return '';
    const parts = source.replace(/\\/g, '/').split('/').filter(Boolean);
    const srcAt = parts.lastIndexOf('src');
    const rel = srcAt >= 0 ? parts.slice(srcAt + 1) : parts;
    const dirs = rel.slice(0, -1);
    if (!dirs.length) return '';
    return dirs.slice(0, 2).join('/');
  }

  function modelLabel(model) {
    if (typeof model !== 'string' || !model) return 'Opus 5.5';
    const match = /opus[-\s]?(\d+(?:[.-]\d+)?)/i.exec(model);
    return match ? `Opus ${match[1].replace('-', '.')}` : model;
  }

  const rtf =
    typeof Intl.RelativeTimeFormat === 'function' ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }) : null;

  function ago(iso) {
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) return '';
    const secs = Math.round((time - Date.now()) / 1000);
    const abs = Math.abs(secs);
    if (abs < 45 || !rtf) return 'just now';
    if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour');
    return rtf.format(Math.round(secs / 86400), 'day');
  }

  function safePreview(value) {
    if (typeof value !== 'string' || !value) return null;
    try {
      const url = new URL(value);
      if (
        url.protocol === 'http:' &&
        url.origin === PREVIEW_ORIGIN &&
        !url.username &&
        !url.password &&
        url.pathname.startsWith('/components/') &&
        url.pathname.length > '/components/'.length
      ) {
        return url.href;
      }
    } catch {
      /* invalid URL */
    }
    return null;
  }

  function compareCards(a, b) {
    const diff = (Number(b.usageCount) || 0) - (Number(a.usageCount) || 0);
    if (diff) return diff;
    const byName = String(a.name).localeCompare(String(b.name));
    return byName || String(a.id).localeCompare(String(b.id));
  }

  function matchesFilter(card) {
    if (ui.category !== 'all' && card.category !== ui.category) return false;
    if (!ui.query) return true;
    const haystack = [card.name, card.category, card.source, stageLabel(card.stage), ...arr(card.exports)]
      .join(' ')
      .toLowerCase();
    return ui.query.split(/\s+/).every(term => haystack.includes(term));
  }

  function targetsFor(card) {
    if (!canMutate() || ui.pending.has(cardKey(card.id))) return [];
    const pickOpen = picksUsed() < maxPicked();
    switch (card.state) {
      case 'TODO':
        return pickOpen ? ['PICK'] : [];
      case 'PICK':
        return isActive(card) ? [] : ['TODO'];
      case 'REVIEW':
        return pickOpen ? ['DONE', 'PICK', 'TODO'] : ['DONE', 'TODO'];
      case 'DONE':
        return pickOpen ? ['PICK', 'TODO'] : ['TODO'];
      default:
        return [];
    }
  }

  /* ---------- Toasts ---------- */

  function toast(message, kind = 'info') {
    const node = el('div', `toast toast-${kind}`);
    node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    node.append(el('span', 'toast-msg', message));
    const close = el('button', 'icon-btn', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss message');
    close.addEventListener('click', () => node.remove());
    node.append(close);
    dom.toasts.append(node);
    while (dom.toasts.children.length > 4) dom.toasts.firstElementChild.remove();
    setTimeout(() => node.remove(), kind === 'error' ? 9000 : 4500);
  }

  /* ---------- Theme & onboarding ---------- */

  function applyTheme(theme) {
    const value = THEMES.includes(theme) ? theme : 'system';
    dom.root.dataset.theme = value;
    const next = THEMES[(THEMES.indexOf(value) + 1) % THEMES.length];
    const cap = s => s[0].toUpperCase() + s.slice(1);
    const label = `Theme: ${cap(value)}. Switch to ${next}.`;
    dom.theme.setAttribute('aria-label', label);
    dom.theme.title = label;
  }

  applyTheme(readStore(THEME_KEY));
  dom.theme.addEventListener('click', () => {
    const current = dom.root.dataset.theme;
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    applyTheme(next);
    writeStore(THEME_KEY, next);
  });

  if (readStore(ONBOARDING_KEY) === 'closed') dom.onboarding.open = false;
  dom.onboarding.addEventListener('toggle', () => {
    writeStore(ONBOARDING_KEY, dom.onboarding.open ? 'open' : 'closed');
  });

  /* ---------- Connection ---------- */

  const CONN_LABELS = {
    connecting: 'Connecting…',
    live: 'Live',
    reconnecting: 'Reconnecting…',
    offline: 'Offline',
  };

  function setConnection(state) {
    if (ui.connection === state) return;
    ui.connection = state;
    dom.conn.dataset.state = state;
    setText(dom.connLabel, CONN_LABELS[state] || state);
    dom.offline.hidden = !(state === 'offline' && ui.board);
    if (ui.board) render();
  }

  function scheduleReconnect() {
    clearTimeout(ui.reconnectTimer);
    ui.reconnectTimer = setTimeout(connect, ui.retryDelay);
    ui.retryDelay = Math.min(ui.retryDelay * 2, 15000);
  }

  function connect() {
    clearTimeout(ui.reconnectTimer);
    if (ui.es) ui.es.close();
    if (typeof EventSource !== 'function') {
      setConnection('offline');
      return;
    }
    if (ui.connection !== 'connecting') setConnection('reconnecting');
    const es = new EventSource('/api/events');
    ui.es = es;
    es.addEventListener('open', () => {
      if (ui.es !== es) return;
      ui.retryDelay = 1000;
      ui.acceptNextEvent = true;
      setConnection('live');
      if (ui.hadConnection) loadBoard();
      ui.hadConnection = true;
    });
    es.addEventListener('board', event => {
      if (ui.es !== es) return;
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      applyBoard(data, ui.acceptNextEvent);
      ui.acceptNextEvent = false;
      setConnection('live');
    });
    es.addEventListener('error', () => {
      if (ui.es !== es) return;
      if (es.readyState === EventSource.CLOSED) {
        setConnection('offline');
        scheduleReconnect();
      } else {
        setConnection('reconnecting');
      }
    });
  }

  window.addEventListener('online', () => {
    if (ui.connection === 'offline') connect();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ui.connection === 'offline') connect();
  });

  /* ---------- Data loading ---------- */

  async function loadBoard() {
    try {
      const res = await fetch('/api/board', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`The board request failed (${res.status}).`);
      applyBoard(await res.json(), true);
    } catch (error) {
      if (!ui.board) showFailure(error instanceof Error ? error.message : 'The board could not load.');
      else toast('Could not refresh the board.', 'error');
    }
  }

  function applyBoard(next, force = false) {
    if (!next || typeof next !== 'object' || !Array.isArray(next.cards)) return;
    const revision = Number(next.revision);
    if (ui.board && !force && Number.isFinite(revision) && revision < ui.revision) return;
    ui.board = next;
    ui.revision = Number.isFinite(revision) ? revision : ui.revision;
    render();
  }

  /* ---------- Board states ---------- */

  function showLoading() {
    dom.board.classList.add('is-loading');
    dom.board.setAttribute('aria-busy', 'true');
    for (const state of STATES) {
      const col = columns[state];
      const skeletons = [];
      for (let i = 0; i < 3; i += 1) {
        const li = el('li', 'skeleton');
        li.setAttribute('aria-hidden', 'true');
        skeletons.push(li);
      }
      col.list.replaceChildren(...skeletons);
      setText(col.count, '');
    }
  }

  function setBoardState(title, text, action) {
    const nodes = [el('h2', null, title)];
    if (text) nodes.push(el('p', null, text));
    if (action) {
      const btn = el('button', 'btn', action.label);
      btn.type = 'button';
      btn.addEventListener('click', action.run);
      nodes.push(btn);
    }
    dom.boardState.replaceChildren(...nodes);
    dom.boardState.hidden = false;
  }

  function showFailure(message) {
    dom.board.hidden = true;
    setBoardState('Board unavailable', `${message} Check that the local board server is running.`, {
      label: 'Try again',
      run: () => {
        dom.boardState.hidden = true;
        dom.board.hidden = false;
        showLoading();
        loadBoard();
        if (ui.connection === 'offline') connect();
      },
    });
  }

  /* ---------- Rendering ---------- */

  function render() {
    if (!ui.board) return;
    if (dom.board.classList.contains('is-loading')) {
      dom.board.classList.remove('is-loading');
      dom.board.removeAttribute('aria-busy');
      for (const state of STATES) {
        for (const sk of columns[state].list.querySelectorAll('.skeleton')) sk.remove();
      }
    }

    const cards = ui.board.cards.filter(c => c && typeof c.id === 'string' && STATES.includes(c.state));
    if (!cards.length) {
      dom.board.hidden = true;
      setBoardState(
        'No components in the inventory',
        'The inventory has no component cards yet. Regenerate it, then reload this page.',
      );
    } else {
      dom.board.hidden = false;
      dom.boardState.hidden = true;
    }

    renderHeader(cards);
    syncCategories(cards);

    const groups = { TODO: [], PICK: [], REVIEW: [], DONE: [] };
    const totals = { TODO: 0, PICK: 0, REVIEW: 0, DONE: 0 };
    const seen = new Set();
    for (const card of [...cards].sort(compareCards)) {
      seen.add(card.id);
      let li = ui.cardEls.get(card.id);
      if (!li) {
        li = createCardEl(card);
        ui.cardEls.set(card.id, li);
      }
      updateCardEl(li, card);
      li.hidden = !matchesFilter(card);
      groups[card.state].push(li);
      totals[card.state] += 1;
    }

    for (const [id, li] of ui.cardEls) {
      if (seen.has(id) || id === ui.dragId) continue;
      if (li.contains(document.activeElement)) dom.board.focus({ preventScroll: true });
      li.remove();
      ui.cardEls.delete(id);
    }

    if (ui.dragId) ui.deferredPlacement = true;
    else placeCards(groups);

    updateColumns(groups, totals);
    if (ui.detailId) updateDetail();
  }

  function placeCards(groups) {
    const active = document.activeElement;
    for (const state of STATES) {
      const list = columns[state].list;
      let ref = list.firstElementChild;
      for (const li of groups[state]) {
        if (li === ref) ref = ref.nextElementSibling;
        else list.insertBefore(li, ref);
      }
    }
    if (active && active !== document.activeElement && active.isConnected && !active.closest('[hidden]')) {
      active.focus({ preventScroll: true });
    }
  }

  function updateColumns(groups, totals) {
    const filtering = ui.query !== '' || ui.category !== 'all';
    const paused = !!ui.board.paused;
    for (const state of STATES) {
      const col = columns[state];
      const visible = groups[state].filter(li => !li.hidden).length;
      const total = totals[state];
      let countText = filtering ? `${visible}/${total}` : String(total);
      if (state === 'PICK') countText = `${total}/${maxPicked()} slots`;
      setText(col.count, countText);
      setAttr(
        col.count,
        'aria-label',
        state === 'PICK' ? `${total} of ${maxPicked()} build slots used` : plural(total, 'card'),
      );
      if (visible === 0) {
        setText(col.empty, total > 0 ? 'No matches for the current filters.' : EMPTY_HINTS[state]);
        col.empty.hidden = false;
      } else {
        col.empty.hidden = true;
      }
      if (state === 'PICK') {
        setText(col.note, paused ? 'Queue paused. Picked cards wait until you resume.' : '');
        col.note.hidden = !paused;
      }
    }
    dom.clearFilters.hidden = !filtering;
  }

  function renderHeader(cards) {
    const board = ui.board;
    const model = typeof board.model === 'string' ? board.model : '';
    setText(dom.model, modelLabel(model));
    dom.model.title = model ? `Builds run with ${model}` : 'Model used for builds';

    const count = state => cards.filter(c => c.state === state).length;
    const total = cards.length;
    const done = count('DONE');
    setText(dom.mTotal, total);
    setText(dom.mPicked, `${count('PICK')}/${maxPicked()}`);
    setText(dom.mReview, count('REVIEW'));
    setText(dom.mDone, done);
    const pct = total ? Math.round((done / total) * 100) : 0;
    dom.progressFill.style.setProperty('--progress', `${pct}%`);
    setAttr(dom.progress, 'aria-valuenow', String(pct));
    setAttr(dom.progress, 'aria-valuetext', `${done} of ${total} components done`);
    setText(dom.progressLabel, `${pct}% done`);

    const paused = !!board.paused;
    setAttr(dom.pause, 'aria-checked', String(paused));
    setText(dom.pauseState, paused ? 'Paused' : 'Running');
    const pauseOff = !canMutate() || ui.pending.has(QUEUE_KEY);
    setAttr(dom.pause, 'aria-disabled', String(pauseOff));

    const meta = [];
    const generated = ago(board.inventoryGeneratedAt);
    if (generated) meta.push(`Inventory updated ${generated}`);
    if (typeof board.sourceRoot === 'string' && board.sourceRoot) meta.push(board.sourceRoot);
    meta.push('Sprout only · Cloud read-only');
    setText(dom.inventory, meta.join(' · '));
    dom.inventory.title = typeof board.inventoryGeneratedAt === 'string' ? board.inventoryGeneratedAt : '';

    const queueError = typeof board.queueError === 'string' && board.queueError ? board.queueError : '';
    setText(dom.queueBanner, queueError ? `Queue error: ${queueError}` : '');
    dom.queueBanner.hidden = !queueError;
    dom.offline.hidden = ui.connection !== 'offline';
  }

  /* ---------- Cards ---------- */

  function createCardEl(card) {
    const li = el('li', 'card');
    li.dataset.id = card.id;
    li.dataset.cardId = card.id;

    const top = el('div', 'card-top');
    const title = el('button', 'card-title');
    title.type = 'button';
    title.addEventListener('click', () => openDetail(li.dataset.id, { opener: title }));
    const category = el('span', 'chip');
    top.append(title, category);

    const context = el('p', 'card-context');

    const shot = el('button', 'card-shot');
    shot.type = 'button';
    const shotImg = el('img');
    shotImg.loading = 'lazy';
    shotImg.draggable = false;
    shot.append(shotImg);
    shot.addEventListener('click', () => openShot(li.dataset.id));

    const meta = el('div', 'card-meta');
    const imports = el('span', 'imports');
    const importsText = el('span');
    imports.append(icon('imports'), importsText);
    const stage = el('span', 'stage');
    const stageDot = el('span', 'stage-dot');
    stageDot.setAttribute('aria-hidden', 'true');
    const stageText = el('span');
    stage.append(stageDot, stageText);
    const missing = el('span', 'chip chip-warn', 'Source missing');
    meta.append(imports, stage, missing);

    const message = el('p', 'card-msg');
    const error = el('p', 'card-error');
    const preview = el('a', 'card-preview');
    preview.target = '_blank';
    preview.rel = 'noopener noreferrer';
    preview.draggable = false;
    preview.append(el('span', null, 'Open preview'), icon('external'));
    const actions = el('div', 'actions');

    li.append(top, context, shot, meta, message, error, preview, actions);
    ui.refs.set(li, {
      title,
      category,
      context,
      shot,
      shotImg,
      importsText,
      imports,
      stage,
      stageText,
      missing,
      message,
      error,
      preview,
      actions,
    });

    li.addEventListener('dragstart', event => onDragStart(event, li));
    li.addEventListener('dragend', endDrag);
    return li;
  }

  function updateCardEl(li, card) {
    const r = ui.refs.get(li);
    const label = stageLabel(card.stage);
    const name = String(card.name || card.id);

    if (li.dataset.state && li.dataset.state !== card.state) {
      li.classList.remove('card-moved');
      void li.offsetWidth;
      li.classList.add('card-moved');
    }
    li.dataset.state = card.state;
    li.dataset.stage = card.stage || 'idle';

    setText(r.title, name);
    setAttr(r.title, 'aria-label', `Open details: ${name}`);
    r.title.title = `${card.state} · ${label}`;
    setText(r.category, card.category || 'Uncategorized');
    r.category.title = card.category || '';

    const context = sourceContext(card.source);
    setText(r.context, context);
    r.context.title = typeof card.source === 'string' ? card.source : '';
    r.context.hidden = !context;

    if (card.screenshot) {
      setAttr(r.shotImg, 'src', card.screenshot);
      setAttr(r.shotImg, 'alt', `${name} screenshot`);
      setAttr(r.shot, 'aria-label', `Open screenshot: ${name}`);
      r.shot.hidden = false;
      if (dom.shot.open && ui.shotId === card.id) setAttr(dom.shotImg, 'src', card.screenshot);
    } else {
      r.shot.hidden = true;
      r.shotImg.removeAttribute('src');
    }

    const n = Number(card.usageCount) || 0;
    setText(r.importsText, plural(n, 'import'));
    r.imports.title = `${plural(n, 'direct importer')}`;

    const showStage = card.state === 'PICK' || card.state === 'REVIEW' || card.stage === 'error';
    r.stage.hidden = !showStage;
    r.stage.dataset.stage = card.stage || 'idle';
    r.stage.classList.toggle('is-active', isActive(card));
    setText(r.stageText, label);

    r.missing.hidden = !card.sourceMissing;

    const message = typeof card.message === 'string' ? card.message.trim() : '';
    const error = typeof card.error === 'string' ? card.error.trim() : '';
    setText(r.message, message);
    r.message.hidden = !message || message === label || message === error || card.state === 'TODO';
    r.message.title = message;

    setText(r.error, error);
    r.error.hidden = !error;
    r.error.title = error;

    const href = card.state === 'REVIEW' || card.state === 'DONE' ? safePreview(card.previewUrl) : null;
    if (href) {
      if (r.preview.getAttribute('href') !== href) r.preview.setAttribute('href', href);
      setAttr(r.preview, 'aria-label', `Open preview of ${name} in a new tab`);
      r.preview.hidden = false;
    } else {
      r.preview.removeAttribute('href');
      r.preview.hidden = true;
    }

    const pending = ui.pending.has(cardKey(card.id));
    li.classList.toggle('is-pending', pending);
    li.draggable = targetsFor(card).length > 0;
    syncActions(r.actions, card, 'card', r.title);
  }

  /* ---------- Actions ---------- */

  function actionsFor(card, where) {
    const name = String(card.name || card.id);
    const off = !canMutate() || ui.pending.has(cardKey(card.id));
    const offWhy = !canMutate() ? 'Actions are paused while the board is offline' : '';
    const pickFull = picksUsed() >= maxPicked();
    const fullWhy = `All ${maxPicked()} build slots are in use`;
    const acts = [];
    const add = (key, label, aria, run, opts = {}) => acts.push({ key, label, aria, run, ...opts });
    const rework = () => {
      if (where === 'dialog') moveCard(card.id, 'PICK');
      else openDetail(card.id, { focusFeedback: true });
    };

    switch (card.state) {
      case 'TODO':
        add(
          'pick',
          'Move to PICK',
          `Move to PICK: ${name} (starts a paid local build)`,
          () => moveCard(card.id, 'PICK'),
          {
            primary: true,
            disabled: off || pickFull,
            why: offWhy || (pickFull ? fullWhy : ''),
          },
        );
        break;
      case 'PICK':
        if (card.stage === 'error') {
          add('retry', 'Retry', `Retry: ${name}`, () => retryCard(card.id), {
            primary: true,
            disabled: off,
            why: offWhy,
          });
        }
        if (!isActive(card)) {
          add('todo', 'Move to TODO', `Move to TODO: ${name}`, () => moveCard(card.id, 'TODO'), {
            disabled: off,
            why: offWhy,
          });
        }
        break;
      case 'REVIEW':
        add('done', 'Mark done', `Mark done: ${name}`, () => moveCard(card.id, 'DONE'), {
          primary: true,
          disabled: off,
          why: offWhy,
        });
      // falls through
      case 'DONE': {
        const dialogRework = where === 'dialog';
        add(
          'rework',
          dialogRework ? 'Send back to PICK' : 'Rework…',
          dialogRework ? `Send back to PICK: ${name}` : `Rework: ${name}`,
          rework,
          {
            primary: card.state === 'DONE' && dialogRework,
            disabled: dialogRework ? off || pickFull : false,
            why: dialogRework ? offWhy || (pickFull ? fullWhy : '') : '',
          },
        );
        add('todo', 'Move to TODO', `Move to TODO: ${name}`, () => moveCard(card.id, 'TODO'), {
          disabled: off,
          why: offWhy,
        });
        break;
      }
      default:
        break;
    }
    return acts;
  }

  function syncActions(container, card, where, fallback) {
    const acts = card ? actionsFor(card, where) : [];
    const locked = card ? isActive(card) : false;
    const pending = card ? ui.pending.has(cardKey(card.id)) : false;
    const sig = `${acts.map(a => `${a.key}:${a.label}:${a.disabled ? 1 : 0}:${a.why || ''}`).join('|')}#${locked}#${pending}`;
    if (container.dataset.sig === sig) {
      container._acts = acts;
      return;
    }
    const focused = container.contains(document.activeElement) ? document.activeElement.dataset.action : null;
    container.dataset.sig = sig;
    container._acts = acts;

    const nodes = acts.map(act => {
      const btn = el('button', `btn${act.primary ? ' btn-primary' : ''}`, act.label);
      btn.type = 'button';
      btn.dataset.action = act.key;
      btn.setAttribute('aria-label', act.aria);
      if (act.disabled) {
        btn.setAttribute('aria-disabled', 'true');
        if (act.why) btn.title = act.why;
      }
      btn.addEventListener('click', () => {
        const current = (container._acts || []).find(a => a.key === act.key);
        if (!current) return;
        if (current.disabled) {
          if (current.why) toast(current.why);
          return;
        }
        current.run();
      });
      return btn;
    });

    if (pending) {
      const note = el('span', 'pending-note');
      const spin = el('span', 'spinner');
      spin.setAttribute('aria-hidden', 'true');
      note.append(spin, el('span', null, 'Saving…'));
      nodes.push(note);
    } else if (locked) {
      const note = el('span', 'lock-note');
      note.append(icon('lock'), el('span', null, 'Locked until the build finishes'));
      nodes.push(note);
    }

    container.replaceChildren(...nodes);
    if (focused) {
      const again = container.querySelector(`[data-action="${focused}"]`);
      const target = again || fallback;
      if (target && target.isConnected) target.focus({ preventScroll: true });
    }
  }

  async function mutate(key, url, body) {
    if (!ui.board || ui.pending.has(key)) return false;
    ui.pending.add(key);
    render();
    try {
      const res = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Board-Token': String(ui.board.csrfToken || ''),
        },
        body: JSON.stringify(body),
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        const message =
          data && typeof data.error === 'string' && data.error ? data.error : `Request failed (${res.status}).`;
        toast(res.status === 409 ? `${message} The board was refreshed; nothing was retried.` : message, 'error');
        if (res.status === 409) loadBoard();
        return false;
      }
      applyBoard(data, true);
      return true;
    } catch {
      toast('Network error. Nothing was retried automatically.', 'error');
      return false;
    } finally {
      ui.pending.delete(key);
      render();
    }
  }

  async function moveCard(id, state) {
    const card = getCard(id);
    if (!card) return;
    const name = String(card.name || id);
    const body = { state, revision: ui.revision };
    const feedback = (ui.drafts.get(id) || '').trim();
    const sendsFeedback = state === 'PICK' && (card.state === 'REVIEW' || card.state === 'DONE') && feedback !== '';
    if (sendsFeedback) body.feedback = feedback;
    const ok = await mutate(cardKey(id), `/api/cards/${encodeURIComponent(id)}/move`, body);
    if (!ok) return;
    if (sendsFeedback) clearDraft(id);
    const messages = {
      PICK: card.state === 'TODO' ? `${name} picked. A local build is queued.` : `${name} sent back to PICK.`,
      TODO: `${name} moved to TODO.`,
      DONE: `${name} marked done.`,
    };
    toast(messages[state] || `${name} moved.`);
  }

  async function retryCard(id) {
    const card = getCard(id);
    if (!card) return;
    const body = { revision: ui.revision };
    const feedback = (ui.drafts.get(id) || '').trim();
    if (feedback) body.feedback = feedback;
    const ok = await mutate(cardKey(id), `/api/cards/${encodeURIComponent(id)}/retry`, body);
    if (!ok) return;
    if (feedback) clearDraft(id);
    toast(`${String(card.name || id)} queued for another try.`);
  }

  function clearDraft(id) {
    ui.drafts.delete(id);
    if (ui.detailId === id) dom.dFeedback.value = '';
  }

  dom.pause.addEventListener('click', async () => {
    if (!ui.board) return;
    if (dom.pause.getAttribute('aria-disabled') === 'true') {
      if (!canMutate()) toast('Actions are paused while the board is offline');
      return;
    }
    const paused = !ui.board.paused;
    const ok = await mutate(QUEUE_KEY, '/api/queue', {
      paused,
      revision: ui.revision,
    });
    if (ok) toast(paused ? 'Queue paused. Running builds finish; new ones wait.' : 'Queue resumed.');
  });

  /* ---------- Drag and drop ---------- */

  function onDragStart(event, li) {
    if (event.target !== li) return;
    const card = getCard(li.dataset.id);
    const targets = card ? targetsFor(card) : [];
    if (!targets.length) {
      event.preventDefault();
      return;
    }
    ui.dragId = card.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.id);
    li.classList.add('is-dragging');
    dom.board.classList.add('is-dragging');
    for (const state of STATES) {
      columns[state].sec.dataset.drop = targets.includes(state) ? 'ok' : state === card.state ? 'self' : 'no';
    }
  }

  function endDrag() {
    if (!ui.dragId) return;
    const li = ui.cardEls.get(ui.dragId);
    if (li) li.classList.remove('is-dragging');
    ui.dragId = null;
    dom.board.classList.remove('is-dragging');
    for (const state of STATES) {
      delete columns[state].sec.dataset.drop;
      columns[state].sec.classList.remove('drop-hover');
    }
    if (ui.deferredPlacement) {
      ui.deferredPlacement = false;
      render();
    }
  }

  for (const state of STATES) {
    const sec = columns[state].sec;
    sec.addEventListener('dragover', event => {
      if (!ui.dragId || sec.dataset.drop !== 'ok') return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      sec.classList.add('drop-hover');
    });
    sec.addEventListener('dragleave', event => {
      if (!sec.contains(event.relatedTarget)) sec.classList.remove('drop-hover');
    });
    sec.addEventListener('drop', event => {
      if (!ui.dragId) return;
      event.preventDefault();
      const id = ui.dragId;
      const allowed = sec.dataset.drop === 'ok';
      endDrag();
      if (allowed) moveCard(id, state);
    });
  }

  /* ---------- Filters ---------- */

  let searchTimer = null;
  dom.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      ui.query = dom.search.value.trim().toLowerCase();
      render();
    }, 80);
  });
  dom.search.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dom.search.value) {
      event.preventDefault();
      dom.search.value = '';
      ui.query = '';
      render();
    }
  });

  dom.clearFilters.addEventListener('click', () => {
    dom.search.value = '';
    ui.query = '';
    setCategory('all');
    dom.search.focus();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (dom.dialog.open) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName)))
      return;
    event.preventDefault();
    dom.search.focus();
  });

  function setCategory(category) {
    ui.category = category;
    setText(dom.catLabel, category === 'all' ? 'All' : category);
    for (const item of dom.catPop.querySelectorAll('.menu-item')) {
      setAttr(item, 'aria-checked', String(item.dataset.category === category));
    }
    render();
  }

  function syncCategories(cards) {
    const counts = new Map();
    for (const card of cards) {
      const name = card.category || 'Uncategorized';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    if (ui.category !== 'all' && !counts.has(ui.category)) names.push(ui.category);
    const entries = [['all', 'All categories', cards.length], ...names.map(n => [n, n, counts.get(n) || 0])];
    const sig = entries.map(e => `${e[0]}\u0000${e[2]}`).join('\u0001');
    if (sig === ui.categorySig) return;
    ui.categorySig = sig;

    const focused = dom.catPop.contains(document.activeElement) ? document.activeElement.dataset.category : null;
    const items = entries.map(([value, label, count]) => {
      const item = el('button', 'menu-item');
      item.type = 'button';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(value === ui.category));
      item.tabIndex = -1;
      item.dataset.category = value;
      const check = icon('check');
      check.classList.add('check');
      item.append(check, el('span', 'menu-label', label), el('span', 'menu-count', String(count)));
      item.addEventListener('click', () => {
        closeCategories(true);
        setCategory(value);
      });
      return item;
    });
    dom.catPop.replaceChildren(...items);
    if (focused != null) {
      const again = items.find(i => i.dataset.category === focused) || items[0];
      again.focus({ preventScroll: true });
    }
  }

  function menuItems() {
    return [...dom.catPop.querySelectorAll('.menu-item')];
  }

  function openCategories() {
    if (!ui.board) return;
    dom.catPop.hidden = false;
    dom.catBtn.setAttribute('aria-expanded', 'true');
    const items = menuItems();
    const selected = items.find(i => i.getAttribute('aria-checked') === 'true') || items[0];
    if (selected) selected.focus({ preventScroll: true });
  }

  function closeCategories(restoreFocus) {
    if (dom.catPop.hidden) return;
    dom.catPop.hidden = true;
    dom.catBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) dom.catBtn.focus({ preventScroll: true });
  }

  dom.catBtn.addEventListener('click', () => {
    if (dom.catPop.hidden) openCategories();
    else closeCategories(true);
  });
  dom.catBtn.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openCategories();
    }
  });
  dom.catPop.addEventListener('keydown', event => {
    const items = menuItems();
    const index = items.indexOf(document.activeElement);
    let next = null;
    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length];
    else if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
    else if (event.key === 'Home') next = items[0];
    else if (event.key === 'End') next = items[items.length - 1];
    else if (event.key === 'Escape') {
      event.preventDefault();
      closeCategories(true);
      return;
    } else if (event.key === 'Tab') {
      closeCategories(false);
      return;
    }
    if (next) {
      event.preventDefault();
      next.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (dom.catPop.hidden) return;
    if (dom.catPop.contains(event.target) || dom.catBtn.contains(event.target)) return;
    closeCategories(false);
  });

  /* ---------- Screenshot viewer ---------- */

  function openShot(id) {
    const card = getCard(id);
    if (!card || !card.screenshot || dom.shot.open) return;
    const name = String(card.name || card.id);
    ui.shotId = id;
    setText(dom.shotTitle, `${name} screenshot`);
    dom.shotImg.alt = `${name} screenshot`;
    dom.shotImg.src = card.screenshot;
    dom.shot.showModal();
    dom.shotClose.focus();
  }

  dom.shotClose.addEventListener('click', () => dom.shot.close());
  dom.shot.addEventListener('click', event => {
    if (event.target === dom.shot) dom.shot.close();
  });
  dom.shot.addEventListener('close', () => {
    ui.shotId = null;
  });

  /* ---------- Detail dialog ---------- */

  function openDetail(id, options = {}) {
    const card = getCard(id);
    if (!card || dom.dialog.open) return;
    closeCategories(false);
    ui.detailId = id;
    ui.detailOpener = options.opener || document.activeElement;
    dom.dFeedback.value = ui.drafts.get(id) || '';
    dom.dActions.dataset.sig = '';
    ui.logShown = null;
    dom.dLog.textContent = '';
    dom.dLog.hidden = true;
    dom.dLogEmpty.hidden = false;
    setText(dom.dLogEmpty, 'Loading log…');
    dom.dLogTrim.hidden = true;
    setText(dom.dLogStatus, '');
    updateDetail();
    dom.dialog.showModal();
    dom.dialog.querySelector('.dlg-body').scrollTop = 0;
    if (options.focusFeedback) dom.dFeedback.focus();
    else dom.dClose.focus();
    startLogPolling();
  }

  function updateDetail() {
    const id = ui.detailId;
    const card = getCard(id);
    dom.dGone.hidden = !!card;
    if (!card) {
      syncActions(dom.dActions, null, 'dialog', dom.dClose);
      return;
    }
    const name = String(card.name || card.id);
    const label = stageLabel(card.stage);
    setText(dom.dTitle, name);
    setText(dom.dCategory, card.category || 'Uncategorized');
    setText(dom.dState, card.state);

    dom.dStage.dataset.stage = card.stage || 'idle';
    dom.dStage.dataset.done = String(card.state === 'DONE' && card.stage !== 'error');
    dom.dStage.classList.toggle('is-active', isActive(card));
    setText(dom.dStageText, card.state === 'DONE' && card.stage !== 'error' ? 'Done' : label);
    const updated = ago(card.updatedAt);
    setText(dom.dUpdated, updated ? `Updated ${updated}` : '');
    dom.dUpdated.title = typeof card.updatedAt === 'string' ? card.updatedAt : '';

    const href = card.state === 'REVIEW' || card.state === 'DONE' ? safePreview(card.previewUrl) : null;
    if (href) {
      if (dom.dPreview.getAttribute('href') !== href) dom.dPreview.setAttribute('href', href);
      setAttr(dom.dPreview, 'aria-label', `Open preview of ${name} in a new tab`);
      dom.dPreview.hidden = false;
    } else {
      dom.dPreview.removeAttribute('href');
      dom.dPreview.hidden = true;
    }

    const message = typeof card.message === 'string' ? card.message.trim() : '';
    setText(dom.dMessage, message);
    dom.dMessage.hidden = !message;
    const error = typeof card.error === 'string' ? card.error.trim() : '';
    setText(dom.dError, error);
    dom.dError.hidden = !error;
    const summary = typeof card.summary === 'string' ? card.summary.trim() : '';
    setText(dom.dSummary, summary);
    dom.dSummary.hidden = !summary;

    const ids = [
      ['Job', card.jobId],
      ['Workspace', card.workspaceId],
      ['Pane', card.paneId],
    ].filter(([, v]) => typeof v === 'string' && v);
    const idSig = JSON.stringify(ids);
    if (dom.dIds.dataset.sig !== idSig) {
      dom.dIds.dataset.sig = idSig;
      dom.dIds.replaceChildren(
        ...ids.map(([k, v]) => {
          const row = el('div');
          row.append(el('dt', null, k), el('dd', null, v));
          return row;
        }),
      );
    }
    dom.dIds.hidden = ids.length === 0;

    setText(dom.dSource, typeof card.source === 'string' ? card.source : '');
    dom.dMissing.hidden = !card.sourceMissing;

    syncList(dom.dExports, dom.dExportsCount, arr(card.exports), 'No exports listed.');
    syncList(dom.dDeps, dom.dDepsCount, arr(card.dependencies), 'No local dependencies.');
    syncList(dom.dImporters, dom.dImportersCount, arr(card.importers), 'No direct importers.');

    const lastFeedback = typeof card.feedback === 'string' ? card.feedback.trim() : '';
    setText(dom.dLastFeedbackText, lastFeedback);
    dom.dLastFeedback.hidden = !lastFeedback;

    syncActions(dom.dActions, card, 'dialog', dom.dClose);
  }

  function syncList(list, countNode, items, emptyText) {
    setText(countNode, String(items.length));
    const sig = items.join('\u0000');
    if (list.dataset.sig === sig && list.childElementCount) return;
    list.dataset.sig = sig;
    if (!items.length) {
      list.replaceChildren(el('li', 'd-empty', emptyText));
      return;
    }
    list.replaceChildren(...items.map(item => el('li', null, item)));
  }

  dom.dFeedback.addEventListener('input', () => {
    if (!ui.detailId) return;
    if (dom.dFeedback.value) ui.drafts.set(ui.detailId, dom.dFeedback.value);
    else ui.drafts.delete(ui.detailId);
  });

  dom.dClose.addEventListener('click', () => dom.dialog.close());
  dom.dialog.addEventListener('click', event => {
    if (event.target === dom.dialog) dom.dialog.close();
  });
  dom.dialog.addEventListener('close', () => {
    stopLogPolling();
    const id = ui.detailId;
    ui.detailId = null;
    const opener = ui.detailOpener;
    ui.detailOpener = null;
    let target = opener && opener.isConnected && !opener.closest('[hidden]') ? opener : null;
    if (!target && id) {
      const li = ui.cardEls.get(id);
      const refs = li && ui.refs.get(li);
      if (refs && li.isConnected && !li.hidden) target = refs.title;
    }
    (target || dom.board).focus({ preventScroll: true });
  });

  /* ---------- Log viewer ---------- */

  function startLogPolling() {
    stopLogPolling();
    loadLog(true);
    ui.logTimer = setInterval(() => {
      const card = getCard(ui.detailId);
      if (document.hidden || !card || card.state !== 'PICK') return;
      loadLog(false);
    }, LOG_POLL_MS);
  }

  function stopLogPolling() {
    clearInterval(ui.logTimer);
    ui.logTimer = null;
    ui.logReq += 1;
    ui.logInflight = false;
  }

  async function loadLog(manual) {
    const id = ui.detailId;
    if (!id || (ui.logInflight && !manual)) return;
    const req = ++ui.logReq;
    ui.logInflight = true;
    if (manual) setText(dom.dLogStatus, 'Loading…');
    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(id)}/log`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (req !== ui.logReq || ui.detailId !== id) return;
      renderLog(data && typeof data.text === 'string' ? data.text : '');
      const card = getCard(id);
      const live = card && card.state === 'PICK';
      setText(
        dom.dLogStatus,
        live ? 'Auto-refreshing while the build runs' : `Updated ${new Date().toLocaleTimeString()}`,
      );
    } catch {
      if (req !== ui.logReq || ui.detailId !== id) return;
      setText(dom.dLogStatus, 'Could not load the log.');
      if (ui.logShown == null) setText(dom.dLogEmpty, 'The log is unavailable right now. Try Refresh.');
    } finally {
      if (req === ui.logReq) ui.logInflight = false;
    }
  }

  function renderLog(text) {
    let shown = text;
    let trimmed = false;
    if (shown.length > LOG_LIMIT) {
      shown = shown.slice(-LOG_LIMIT);
      const newline = shown.indexOf('\n');
      if (newline >= 0 && newline < 2000) shown = shown.slice(newline + 1);
      trimmed = true;
    }
    dom.dLogTrim.hidden = !trimmed;
    if (shown === ui.logShown) return;
    const first = ui.logShown == null;
    const pre = dom.dLog;
    const atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 24;
    const previousTop = pre.scrollTop;
    ui.logShown = shown;
    const empty = shown.trim() === '';
    pre.hidden = empty;
    dom.dLogEmpty.hidden = !empty;
    setText(dom.dLogEmpty, 'No log output yet.');
    pre.textContent = shown;
    pre.scrollTop = first || atBottom ? pre.scrollHeight : previousTop;
  }

  dom.dLogRefresh.addEventListener('click', () => loadLog(true));

  /* ---------- Start ---------- */

  showLoading();
  loadBoard();
  connect();
  setInterval(() => {
    if (ui.board && !ui.dragId) renderHeader(ui.board.cards.filter(c => c && STATES.includes(c.state)));
  }, 60000);
})();
