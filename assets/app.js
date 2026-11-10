'use strict';
/* KENTA · site V3 · catalogue, gardiens, combinaisons, fiches et guide. Aucun appel réseau. */
(function () {
  const D = window.KENTA_DATA;
  if (!D) return;

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* Menu mobile */
  const menu = document.getElementById('menuToggle');
  const nav = document.getElementById('navigation');
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }));

  /* Dialogues */
  const showDialog = id => { const d = document.getElementById(id); if (d && !d.open) d.showModal(); };
  const closeDialog = id => { const d = document.getElementById(id); if (d && d.open) d.close(); };
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeDialog(b.dataset.close)));
  document.querySelectorAll('[data-guide-link]').forEach(a => a.addEventListener('click', () => closeDialog('guideDialog')));

  /* Pont vers le terminal */
  function essayer(cmd) {
    closeDialog('ficheDialog'); closeDialog('guideDialog');
    document.getElementById('terminal').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (window.KENTA_TERM) window.KENTA_TERM.run(cmd);
  }
  window.KENTA_ESSAYER = essayer;

  /* Compteurs */
  document.querySelectorAll('.js-app-count').forEach(n => { n.textContent = D.apps.length; });

  /* Filtres */
  const famBar = document.getElementById('famFilters');
  const statBar = document.getElementById('statFilters');
  const search = document.getElementById('appSearch');
  const grid = document.getElementById('appGrid');
  const countLine = document.getElementById('catalogCount');
  const state = { fam: 'all', statut: 'all', q: '' };

  function filterButton(bar, key, value, label, n) {
    const b = el('button', 'filter', label);
    b.type = 'button';
    if (key === 'statut' && value !== 'all') b.dataset.statut = value;
    b.dataset.value = value;
    b.append(el('span', 'n', String(n)));
    b.setAttribute('aria-pressed', String(state[key] === value));
    if (state[key] === value) b.classList.add('active');
    b.addEventListener('click', () => {
      state[key] = value;
      bar.querySelectorAll('.filter').forEach(x => { const on = x.dataset.value === value; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
      renderApps();
    });
    bar.append(b);
  }
  filterButton(famBar, 'fam', 'all', 'Toutes les familles', D.apps.length);
  Object.entries(D.familles).forEach(([k, v]) => filterButton(famBar, 'fam', k, v, D.apps.filter(a => a.fam === k).length));
  filterButton(statBar, 'statut', 'all', 'Toutes maturités', D.apps.length);
  Object.entries(D.statuts).forEach(([k, v]) => filterButton(statBar, 'statut', k, v.label, D.apps.filter(a => a.statut === k).length));
  search.addEventListener('input', () => { state.q = norm(search.value.trim()); renderApps(); });

  function pill(statut) { return el('span', 'pill s-' + statut, D.statuts[statut].label); }

  function renderApps() {
    grid.replaceChildren();
    const list = D.apps.filter(a =>
      (state.fam === 'all' || a.fam === state.fam) &&
      (state.statut === 'all' || a.statut === state.statut) &&
      (!state.q || norm([a.nom, a.accroche, a.role, a.organes.join(' '), a.facultes.join(' ')].join(' ')).includes(state.q)));
    list.forEach(a => {
      const card = el('article', 'app-card');
      const top = el('div', 'app-top');
      top.append(el('span', 'fam', D.familles[a.fam]), pill(a.statut));
      const tags = el('ul', 'tags');
      a.organes.slice(0, 4).forEach(o => tags.append(el('li', null, o)));
      const actions = el('div', 'card-actions');
      const open = el('button', 'mini', 'Fiche');
      open.type = 'button';
      open.setAttribute('aria-label', 'Ouvrir la fiche ' + a.nom);
      open.addEventListener('click', () => openFiche(a.id));
      actions.append(open);
      if (a.demo) {
        const tr = el('button', 'mini dark', 'Essayer ↗');
        tr.type = 'button';
        tr.setAttribute('aria-label', 'Essayer ' + a.nom + ' dans le terminal');
        tr.addEventListener('click', () => essayer(a.demo));
        actions.append(tr);
      }
      card.append(top, el('h3', null, a.nom), el('p', null, a.accroche), tags, actions);
      grid.append(card);
    });
    countLine.textContent = list.length === D.apps.length
      ? D.apps.length + ' applications affichées.'
      : list.length + ' sur ' + D.apps.length + ' applications.' + (list.length === 0 ? ' Aucune ne correspond : élargissez un filtre.' : '');
  }
  renderApps();

  /* Légende */
  const legend = document.getElementById('legend');
  Object.entries(D.statuts).forEach(([k, v]) => { const w = el('div'); const dt = el('dt'); dt.append(pill(k)); w.append(dt, el('dd', null, v.detail)); legend.append(w); });

  /* Fiche */
  function openFiche(id) {
    const a = D.apps.find(x => x.id === id);
    if (!a) return false;
    document.getElementById('ficheTitle').textContent = a.nom;
    const body = document.getElementById('ficheBody');
    body.replaceChildren();
    const meta = el('div', 'fiche-meta');
    meta.append(el('span', 'fam', D.familles[a.fam]), pill(a.statut));
    const wrap = el('div', 'fiche-body');
    wrap.append(el('p', 'lead-line', a.accroche));
    const sec = (titre, node) => { wrap.append(el('h3', null, titre), node); };
    sec('Rôle', el('p', null, a.role));
    const ul = (arr) => { const u = el('ul'); arr.forEach(x => u.append(el('li', null, x))); return u; };
    sec('Facultés', ul(a.facultes));
    sec('Interactions', ul(a.liens));
    sec('Organes mobilisés', el('p', null, a.organes.join(' · ')));
    sec('Maturité', el('p', null, a.maturite));
    const acts = el('div', 'fiche-actions');
    if (a.demo) { const b = el('button', 'button primary', 'Essayer dans le terminal ↗'); b.type = 'button'; b.addEventListener('click', () => essayer(a.demo)); acts.append(b); }
    const c = el('button', 'button secondary', 'Fermer'); c.type = 'button'; c.addEventListener('click', () => closeDialog('ficheDialog')); acts.append(c);
    body.append(meta, wrap, acts);
    showDialog('ficheDialog');
    return true;
  }
  window.KENTA_FICHE = openFiche;

  /* Combinaisons */
  const comboGrid = document.getElementById('comboGrid');
  D.combos.forEach(c => {
    const card = el('article', 'combo-card');
    const ch = el('ul', 'combo-chain');
    c.chaine.forEach(x => ch.append(el('li', null, x)));
    card.append(el('h3', null, c.titre), ch, el('p', null, c.effet));
    if (c.cmd) { const b = el('button', 'mini', 'Voir dans le terminal ↗'); b.type = 'button'; b.addEventListener('click', () => essayer(c.cmd)); card.append(b); }
    comboGrid.append(card);
  });

  /* Chaîne */
  const strip = document.getElementById('chainStrip');
  strip.append(el('span', 'lbl', 'ORDRE DE PASSAGE'));
  D.chaine.forEach((g, i) => { strip.append(el('span', 'c', g)); if (i < D.chaine.length - 1) strip.append(el('span', 'a', '→')); });

  /* Gardiens */
  const gGrid = document.getElementById('guardianGrid');
  D.gardiens.forEach(g => {
    const card = el('article', 'g-card');
    const tags = el('ul', 'tags');
    g.facultes.forEach(f => tags.append(el('li', null, f)));
    const b = el('button', 'mini', 'Bingo ↗');
    b.type = 'button';
    b.setAttribute('aria-label', 'Fiche Bingo de ' + g.nom + ' dans le terminal');
    b.addEventListener('click', () => essayer('bingo ' + g.nom));
    card.append(el('span', 'g-sigle', g.sigle), el('h3', null, g.nom), el('p', null, g.role), tags, b);
    gGrid.append(card);
  });
  const vGrid = document.getElementById('voiceGrid');
  D.voix.forEach(v => { const a = el('article'); a.append(el('h4', null, v.nom), el('p', null, v.role)); vGrid.append(a); });

  /* Guide des commandes */
  const guide = [
    ['cercles', 'Lance l’empilement de 26 cercles par vibration. Rien n’est calculé à l’avance.'],
    ['labyrinthe', 'Célégans cherche la sortie en sept tentatives, guidé par ses phéromones.'],
    ['forge', 'Rejoue la naissance d’un organe : sept votes, sceau, matérialisation.'],
    ['regarde le jardin', 'Envoie une intention dans l’entonnoir : réduction, influx, Toile, gardiens.'],
    ['kirigakure', 'Cherche les présences sans déclaration dans ce terminal même.'],
    ['byakugan', 'Lit réellement cette page, en lecture seule, et en rend compte.']
  ];
  const gc = document.getElementById('guideCmds');
  guide.forEach(([cmd, txt]) => {
    const row = el('div', 'guide-cmd');
    const b = el('button', 'mini dark', 'Lancer'); b.type = 'button';
    b.setAttribute('aria-label', 'Lancer ' + cmd);
    b.addEventListener('click', () => essayer(cmd));
    row.append(el('code', null, cmd), el('span', null, txt), b);
    gc.append(row);
  });
  document.getElementById('guideBtn').addEventListener('click', () => showDialog('guideDialog'));
})();
