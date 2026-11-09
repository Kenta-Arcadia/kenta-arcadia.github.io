'use strict';
/* KENTA · terminal de démonstration.
   Tout s'exécute dans le navigateur : aucune requête réseau, aucune liaison avec l'instance privée.
   Les principes sont reconstitués ; les traces historiques de KENTA sont citées comme telles. */
(function () {
  const D = window.KENTA_DATA;
  const out = document.getElementById('termOut');
  const form = document.getElementById('termForm');
  const input = document.getElementById('termInput');
  const canvas = document.getElementById('scene');
  const sceneTitle = document.getElementById('sceneTitle');
  const sceneMeta = document.getElementById('sceneMeta');
  const sceneNote = document.getElementById('sceneNote');
  const chipsBox = document.getElementById('termChips');
  if (!D || !out || !canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ---------- Sortie ---------- */
  const MAX_LINES = 600;
  function line(text, cls) {
    const d = document.createElement('div');
    d.className = 'tl ' + (cls || '');
    d.textContent = text;
    out.append(d);
    while (out.childElementCount > MAX_LINES) out.firstElementChild.remove();
    out.scrollTop = out.scrollHeight;
    return d;
  }
  const lines = (arr, cls) => arr.forEach(t => line(t, cls));
  const blank = () => line('', '');

  /* ---------- Toile de la session ---------- */
  const toile = [];
  let origine = '';
  function vibrer(gardien, objet, note, silencieux) {
    toile.push({ n: toile.length + 1, gardien, objet, note: note || '', origine });
    if (!silencieux) line('~ vibration ' + toile.length + ' · ' + gardien + ' › ' + objet + (note ? '  (' + note + ')' : ''), 'vib');
  }

  /* ---------- Séquences temporisées ---------- */
  let seqTok = 0;
  const sleep = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
  async function say(tok, text, cls, ms) { if (tok !== seqTok) return false; line(text, cls); await sleep(ms == null ? 240 : ms); return tok === seqTok; }

  /* ---------- Scène ---------- */
  const P = { bg: '#0b1d1a', grid: '#163430', line: '#2c4943', text: '#cfe0d8', dim: '#6f8c83', acc: '#c99a66', ok: '#6fbf9f', blue: '#8db8e0', red: '#e08a78', violet: '#a993d6', white: '#f4f8f6' };
  const VW = 640, VH = 520;
  let raf = 0, loopId = 0;
  function begin() {
    const w = canvas.clientWidth || VW;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(w * dpr), ch = Math.round(w * VH / VW * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, cw, ch);
    const s = cw / VW; ctx.setTransform(s, 0, 0, s, 0, 0);
  }
  function font(size, weight) { ctx.font = (weight || 400) + ' ' + size + "px ui-monospace, 'Ubuntu Mono', 'DejaVu Sans Mono', monospace"; }
  function text(s, x, y, col, size, align, weight) { font(size || 12, weight); ctx.fillStyle = col || P.text; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); }
  function dot(x, y, r, col) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }
  function seg(x1, y1, x2, y2, col, w) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.stroke(); }
  function stopScene() { loopId++; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function loop(step) {
    stopScene();
    const id = loopId;
    const f = t => { if (id !== loopId) return; const cont = step(t); if (cont !== false && id === loopId) raf = requestAnimationFrame(f); else if (id === loopId) raf = 0; };
    raf = requestAnimationFrame(f);
    return id;
  }
  function scene(title, note, meta) { sceneTitle.textContent = title; sceneNote.textContent = note; sceneMeta.textContent = meta || ''; }

  /* ---------- Hasard reproductible ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* =========================================================
     CONSTELLATION · projection 3D du registre
     ========================================================= */
  function constellation(ombre) {
    const G = D.gardiens;
    const nodes = [], links = [];
    const n = G.length;
    G.forEach((g, i) => {
      const y = 1 - (i + 0.5) / n * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
      const gx = Math.cos(th) * rad, gz = Math.sin(th) * rad;
      const gi = nodes.push({ x: gx, y, z: gz, kind: 'g', label: g.nom }) - 1;
      const r = rng(hash(g.nom));
      g.facultes.forEach(f => {
        const d = 0.23, a = r() * 6.283, b = r() * 6.283;
        const fi = nodes.push({ x: gx * 1.25 + Math.cos(a) * Math.sin(b) * d, y: y * 1.25 + Math.cos(b) * d, z: gz * 1.25 + Math.sin(a) * Math.sin(b) * d, kind: 'f', label: f }) - 1;
        links.push([gi, fi, 'f']);
      });
    });
    const idx = name => nodes.findIndex(x => x.kind === 'g' && x.label === name);
    for (let i = 0; i < D.chaine.length - 1; i++) { const a = idx(D.chaine[i]), b = idx(D.chaine[i + 1]); if (a >= 0 && b >= 0) links.push([a, b, 'c']); }
    if (ombre) {
      const r = rng(7);
      hidden().forEach(h => { const a = r() * 6.283, b = Math.acos(2 * r() - 1); nodes.push({ x: Math.cos(a) * Math.sin(b) * 0.55, y: Math.cos(b) * 0.55, z: Math.sin(a) * Math.sin(b) * 0.55, kind: 'o', label: h }); });
    }
    scene(ombre ? 'Matière noire · ce qui répond sans être déclaré' : 'Constellation des gardiens',
      ombre ? 'En violet : présences actives absentes de l’aide. Kirigakure les perçoit, sans leur inventer de cause.' : 'Projection du registre : gardien, facultés, liens de chaîne. Même grammaire que la scène Blender : gardien → capacité → organe.',
      G.length + ' gardiens · ' + (nodes.filter(x => x.kind === 'f').length) + ' facultés · ' + links.filter(l => l[2] === 'c').length + ' liens de chaîne');
    let ang = 0.6;
    const draw = () => {
      begin();
      const ca = Math.cos(ang), sa = Math.sin(ang), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
      const pr = nodes.map(p => { const x = p.x * ca + p.z * sa, z0 = -p.x * sa + p.z * ca; const y = p.y * ct - z0 * st, z = p.y * st + z0 * ct; const k = 2.6 / (2.6 + z); return { sx: VW / 2 + x * 175 * k, sy: VH / 2 + y * 175 * k, z, k, p }; });
      links.forEach(([a, b, t]) => { const A = pr[a], B = pr[b]; const alpha = Math.max(0.12, Math.min(0.85, 0.55 - (A.z + B.z) * 0.25)); ctx.globalAlpha = alpha; seg(A.sx, A.sy, B.sx, B.sy, t === 'c' ? P.acc : P.line, t === 'c' ? 1.3 : 1); });
      ctx.globalAlpha = 1;
      pr.slice().sort((a, b) => b.z - a.z).forEach(q => {
        const front = q.z < 0.2;
        if (q.p.kind === 'g') { dot(q.sx, q.sy, 5.5 * q.k, front ? P.ok : '#3f6f61'); if (front) text(q.p.label, q.sx + 8, q.sy, P.white, 11); }
        else if (q.p.kind === 'f') dot(q.sx, q.sy, 2.2 * q.k, front ? P.blue : '#35506a');
        else { dot(q.sx, q.sy, 4 * q.k, P.violet); if (front) text(q.p.label, q.sx + 7, q.sy, P.violet, 10); }
      });
      text('KENTA', VW / 2, 18, P.dim, 10, 'center');
    };
    if (reduced) { draw(); return; }
    loop(() => { ang += 0.0035; draw(); });
  }

  /* =========================================================
     PIPELINE · scène de mission
     ========================================================= */
  function scenePipeline(actifs, titre) {
    const etapes = ['Humain', 'Cyrano', 'Influx', 'Procyon', 'Toile', 'Gardiens', 'Cristal.'];
    const gard = D.chaine.slice();
    actifs.forEach(a => { if (!gard.includes(a)) gard.push(a); });
    scene(titre || 'Pipeline canonique', 'Le signal traverse les étapes, puis seuls les gardiens dont l’ADN déclare la résonance s’allument.', actifs.length ? 'résonants : ' + actifs.join(', ') : 'aucune résonance');
    const t0 = performance.now();
    const draw = t => {
      begin();
      const el = Math.min(1, (t - t0) / 2200), xs = i => 50 + i * 90;
      for (let i = 0; i < etapes.length; i++) {
        if (i < etapes.length - 1) seg(xs(i) + 18, 80, xs(i + 1) - 18, 80, P.line, 1.5);
        const lit = el * (etapes.length - 1) >= i - 0.01;
        dot(xs(i), 80, 16, lit ? '#1f4a40' : '#13302b');
        ctx.beginPath(); ctx.arc(xs(i), 80, 16, 0, 6.283); ctx.strokeStyle = lit ? P.ok : P.line; ctx.lineWidth = 1.4; ctx.stroke();
        text(etapes[i], xs(i), 112, lit ? P.white : P.dim, 10.5, 'center');
      }
      const px = 50 + el * 540; dot(px, 80, 5, P.acc);
      const cols = 6, cw = 96, top = 170;
      gard.forEach((g, i) => {
        const cx = 60 + (i % cols) * cw, cy = top + Math.floor(i / cols) * 70;
        const on = actifs.includes(g) && el >= 1;
        if (on) seg(VW / 2 + 0, 96, cx, cy - 16, 'rgba(201,154,102,.45)', 1);
        dot(cx, cy, 15, on ? '#2a5a4c' : '#112b27');
        ctx.beginPath(); ctx.arc(cx, cy, 15, 0, 6.283); ctx.strokeStyle = on ? P.acc : P.line; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
        text(g.slice(0, 2), cx, cy, on ? P.white : P.dim, 11, 'center', 700);
        text(g, cx, cy + 25, on ? P.white : P.dim, 10, 'center');
      });
      return el < 1 || !reduced;
    };
    if (reduced) { draw(t0 + 5000); return; }
    let done = false;
    loop(t => { draw(t); if ((t - t0) > 2600 && !done) { done = true; } return !done; });
  }

  /* =========================================================
     ENTONNOIR · Cyrano réduit, ou demande
     ========================================================= */
  const STOP = new Set('le la les un une des du de d l au aux et ou a en dans sur pour par avec ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs je tu il elle on nous vous ils elles me te se moi toi lui y est sont fais fait faire peux peut veux veut stp svp merci bonjour qui que quoi quel quelle comment pourquoi tout tous toute toutes plus moins tres bien'.split(' '));
  const LEX = [
    { re: /(regard|\bvoi[rs]\b|\bvue\b|scan|observ|explor|inspect)/, proches: ['voir', 'regarder', 'observer'], geste: 'voir', objet: 'mission_voir', gardiens: ['Hinata'], capacite: 'byakugan', effet: 'lecture seule ouverte, aucune écriture', suite: 'byakugan' },
    { re: /(cherch|trouv|retrouv|fouill)/, proches: ['chercher', 'trouver'], geste: 'chercher', objet: 'mission_chercher', gardiens: ['Iruka', 'Kabuto'], capacite: 'recherche', effet: 'recherche locale d’abord ; l’extérieur seulement si l’ADN le déclare', suite: '' },
    { re: /(marqu|\breli(e|er|ez|ent|ons)\b|repere|pointe|kunai)/, proches: ['marquer', 'relier', 'repérer'], geste: 'marquer', objet: 'mission_marquer', gardiens: ['Minato'], capacite: 'kunaï', effet: 'repère posé, filiation de la mission conservée', suite: 'chaine' },
    { re: /(archiv|range|purge|nettoi|menage|conserv)/, proches: ['archiver', 'conserver', 'ranger'], geste: 'conserver', objet: 'mission_conserver', gardiens: ['Nono'], capacite: 'archive', effet: 'éphémères archivés, cristallisations protégées', suite: 'toile' },
    { re: /(soign|repar|gueri|regener|malade)/, proches: ['soigner', 'réparer'], geste: 'soigner', objet: 'mission_soigner', gardiens: ['Sakura', 'Tsunade'], capacite: 'soin', effet: 'soin proposé, guérison vérifiée par Tsunade', suite: '' },
    { re: /(profil|naissance|element|signe|astro|chinois)/, proches: ['profil', 'élément'], geste: 'profiler', objet: 'profil_arcana', gardiens: ['Arcana'], capacite: 'profil symbolique', effet: 'profil composé depuis les bibliothèques, rien d’inventé', suite: 'arcana 1984' },
    { re: /(jardin|vigne|\bsols?\b|semi|plant|recolt|potager|meteo|cultur)/, proches: ['jardin', 'culture'], geste: 'cultiver', objet: 'mission_territoire', gardiens: ['Gaïa'], capacite: 'fenêtres de travail', effet: 'fenêtres déposées sur la Toile, Rythma les lira', suite: 'rythma' },
    { re: /(moment|rythm|agenda|meridien|energi|horloge)/, proches: ['moment', 'rythme'], geste: 'rythmer', objet: 'mission_rythme', gardiens: ['Rythma'], capacite: 'lecture des méridiens', effet: 'état du moment montré, rien de prescrit', suite: 'rythma' },
    { re: /(publi|poste|histoir|recit|raconte|chroniq)/, proches: ['publier', 'raconter'], geste: 'publier', objet: 'mission_publier', gardiens: ['Célégans', 'Tachikoma', 'Rythma'], capacite: 'faire naître une histoire, engager la publication', effet: 'histoire assemblée sans modèle ; les voix habillent, Rythma choisit le moment', suite: '' },
    { re: /(ticket|caisse|compta|depens|facture)/, proches: ['ticket', 'compta'], geste: 'qualifier', objet: 'ticket_texte_recu', gardiens: ['Hinata', 'Kabuto'], capacite: 'qualifier le ticket, rétro-calcul', effet: 'lignes qualifiées ; les inconnus restent inconnus', suite: 'retro 2 3 6 | 4 5 20 | 7 3 21' },
    { re: /(calcul|regle|colonne|chiffr|nombre)/, proches: ['calculer', 'règle'], geste: 'calculer', objet: 'retro_calcul', gardiens: ['Kabuto'], capacite: 'rétro-calcul', effet: 'règle retrouvée avec son taux de confiance', suite: 'retro 2 3 6 | 4 5 20 | 7 3 21' },
    { re: /(forg|organe|fabriqu|naitre|creer)/, proches: ['forger', 'créer'], geste: 'forger', objet: 'proposition_a_voter', gardiens: ['Hinata', 'Jiraiya', 'Minato', 'Tsunade', 'Célégans', 'Itachi', 'Sakura'], capacite: 'vote de forge', effet: 'le collège vote ; l’unanimité seule fait naître', suite: 'forge' },
    { re: /(attaq|intrus|inject|pirat|menace|defend|virus)/, proches: ['défendre', 'attaque'], geste: 'défendre', objet: 'anomalie_comportement', gardiens: ['Hinata', 'Itachi', 'Tsunade'], capacite: 'isolement', effet: 'comportement repéré, isolé, puis vérifié', suite: 'tsukuyomi' },
    { re: /(coeur|stress|tachy|pouls|signal|muscle|prothes|sante)/, proches: ['cœur', 'signal'], geste: 'surveiller', objet: 'diagnostic_physiologique', gardiens: ['Hinata', 'Célégans'], capacite: 'motif individuel', effet: 'écart au motif propre de la personne, alerte si besoin', suite: '' },
    { re: /(inconnu|myster|bizarre|anomal|etrange)/, proches: ['inconnu', 'étrange'], geste: 'percevoir', objet: 'presence_inconnue', gardiens: ['Célégans'], capacite: 'kirigakure', effet: 'présence nommée, cause non inventée', suite: 'kirigakure' },
    { re: /(carte|atlas|represent|dessin|blender|constell)/, proches: ['carte', 'dessiner'], geste: 'représenter', objet: 'mission_representer', gardiens: ['Minato', 'Hinata'], capacite: 'remembrement', effet: 'KENTA se décrit puis se figure', suite: 'constellation' },
    { re: /(\bjeu|\bjou|sudoku|grille)/, proches: ['jouer', 'jeu'], geste: 'jouer', objet: 'mission_jeu', gardiens: ['Shikamaru', 'Nono'], capacite: 'indice borné', effet: 'aide qui oriente sans résoudre', suite: 'sudoku' },
    { re: /(musiq|chant|melodi)/, proches: ['musique', 'chanter'], geste: 'chanter', objet: 'melodie', gardiens: ['Orphée'], capacite: 'concerto', effet: 'vibrations composées en mélodie', suite: '' },
    { re: /(trad|bourse|marche|crypto|action)/, proches: ['trader', 'marché'], geste: 'jauger un flux', objet: 'flux_marche', gardiens: ['Picsou', 'Hinata'], capacite: 'motifs cristallisés', effet: 'décision rare, attente assumée', suite: 'picsou' },
    { re: /^$/, cache: true, proches: ['relique', 'ancien', 'vieux', 'héritage', 'legacy'], geste: 'jauger une relique', objet: 'analyse_relique', gardiens: ['Picsou', 'Jiraiya'], capacite: 'analyse de relique', effet: 'verdict d’assimilation : garder, remembrer ou écarter', suite: 'forge' }
  ];
  const appris = new Map();
  const incompris = [];
  let enAttente = null;

  function trigrams(w) { const s = '  ' + norm(w) + ' '; const t = new Set(); for (let i = 0; i < s.length - 2; i++) t.add(s.slice(i, i + 3)); return t; }
  function proximite(mot, entry) {
    const a = trigrams(mot); let best = 0;
    entry.proches.forEach(p => { if (norm(p) === norm(mot)) best = Math.max(best, 10); const b = trigrams(p); let c = 0; a.forEach(x => { if (b.has(x)) c++; }); best = Math.max(best, c / Math.max(a.size, b.size)); });
    return best;
  }

  function mission(texte, opts) {
    const tok = ++seqTok;
    const n = norm(texte);
    const mots = n.replace(/[^a-z0-9\s'-]/g, ' ').split(/[\s']+/).filter(Boolean);
    const touches = [];
    LEX.forEach(e => { if (!e.cache && e.re.test(n)) touches.push(e); });
    mots.forEach(m => { if (appris.has(m)) { const e = appris.get(m); if (!touches.includes(e)) touches.push(e); } });
    if (!touches.length) {
      const inconnus = mots.filter(m => m.length >= 4 && !STOP.has(m));
      if (!inconnus.length) { lines(['Rien à réduire. Formulez une intention : un verbe, un objet.', 'Exemple : regarde le jardin · cherche la relique · publie une histoire'], 'sys'); return; }
      const mot = inconnus[0];
      incompris.push(mot);
      origine = texte;
      line('Cyrano › « ' + mot + ' » ne correspond à aucun objet interne.', 'warn');
      line('KENTA ne fait pas semblant de comprendre : il demande.', 'sys');
      vibrer('Cyrano', 'incomprehension_' + mot.replace(/[^a-z0-9]/g, ''));
      const ranked = LEX.map(e => ({ e, s: proximite(mot, e) })).sort((a, b) => b.s - a.s);
      const opts4 = [];
      ranked.forEach(r => { if (r.s > 0.22 && opts4.length < 2 && !opts4.includes(r.e)) opts4.push(r.e); });
      ['voir', 'chercher', 'marquer', 'conserver'].forEach(g => { const e = LEX.find(x => x.geste === g); if (opts4.length < 4 && !opts4.includes(e)) opts4.push(e); });
      blank();
      line('Que voulez-vous faire de « ' + mot + ' » ?', 'q');
      opts4.forEach((e, i) => line('  ' + (i + 1) + '. ' + e.geste + '  (' + e.gardiens.join(', ') + ')', 'q'));
      line('Répondez 1 à 4, ou « non ».', 'dim');
      enAttente = { mot, texte, opts: opts4 };
      scene('Entonnoir sémantique', 'Terme inconnu : aucune exécution directe. Deux à quatre options, la réponse humaine devient une association apprise.', 'en attente de clarification');
      drawEntonnoir(mot, opts4);
      return;
    }
    origine = texte;
    const cible = mots.filter(m => !STOP.has(m) && !touches.some(e => e.re.test(m))).slice(0, 4).join(' ');
    const gardiens = [...new Set(touches.flatMap(e => e.gardiens))];
    (async () => {
      if (!opts || !opts.silencieuxEntete) line('Rejeu du pipeline canonique, calculé dans votre navigateur.', 'dim');
      if (!await say(tok, 'Cyrano › réduction : ' + touches.map(e => e.geste).join(' + ') + (cible ? ' · cible « ' + cible + ' »' : ''), 'sys')) return;
      if (!await say(tok, 'influx déposé :', 'dim', 80)) return;
      const yaml = ['  type: information', '  objet: ' + touches[0].objet, '  source: Humain', '  message: "' + texte.replace(/"/g, '”').slice(0, 80) + '"', '  metadata: { gestes: [' + touches.map(e => e.geste).join(', ') + ']' + (cible ? ', cible: "' + cible + '"' : '') + ' }'];
      for (const y of yaml) { if (!await say(tok, y, 'yaml', 70)) return; }
      if (!await say(tok, 'Procyon › canonicalisé · signature vérifiée · déposé sur la Toile', 'ok')) return;
      vibrer('Procyon', touches[0].objet);
      await sleep(200);
      for (const e of touches) {
        for (const g of e.gardiens) {
          if (!await say(tok, g + ' › résonne · ' + e.capacite, 'ok', 160)) return;
        }
        vibrer(e.gardiens[0], e.objet + '_traite');
        if (!await say(tok, '  effet : ' + e.effet, 'sys')) return;
      }
      vibrer('Nono', 'cristallisation');
      if (!await say(tok, 'Nono › cristallisé. La trace reste dans la Toile de cette page (commande « toile »).', 'ok')) return;
      const suites = [...new Set(touches.map(e => e.suite).filter(Boolean))];
      if (suites.length) line('→ pour aller plus loin : ' + suites.join(' · '), 'dim');
    })();
    scenePipeline(gardiens, 'Mission · ' + touches.map(e => e.geste).join(' + '));
  }

  function drawEntonnoir(mot, opts) {
    stopScene(); begin();
    ctx.beginPath(); ctx.moveTo(120, 60); ctx.lineTo(520, 60); ctx.lineTo(360, 250); ctx.lineTo(360, 330); ctx.lineTo(280, 330); ctx.lineTo(280, 250); ctx.closePath();
    ctx.strokeStyle = P.line; ctx.lineWidth = 1.5; ctx.stroke();
    text('« ' + mot + ' »', 320, 40, P.acc, 15, 'center', 700);
    text('terme inconnu', 320, 95, P.dim, 11, 'center');
    text('aucune exécution', 320, 120, P.dim, 11, 'center');
    opts.forEach((e, i) => { const x = 110 + i * 140; dot(x, 410, 22, '#173a33'); ctx.beginPath(); ctx.arc(x, 410, 22, 0, 6.283); ctx.strokeStyle = P.acc; ctx.lineWidth = 1.2; ctx.stroke(); text(String(i + 1), x, 410, P.white, 14, 'center', 700); text(e.geste, x, 448, P.text, 11, 'center'); seg(320, 332, x, 388, P.line, 1); });
    text('votre réponse devient une association apprise', 320, 488, P.dim, 11, 'center');
  }

  function repondre(txt) {
    const r = norm(txt.trim());
    const ctxA = enAttente;
    if (/^(non|aucun|aucune|annule|n)$/.test(r)) {
      enAttente = null;
      line('Aucune association. L’incompréhension reste tracée ; une recherche extérieure exigerait une validation humaine.', 'sys');
      vibrer('Cyrano', 'incomprehension_maintenue');
      return true;
    }
    const k = parseInt(r, 10);
    if (k >= 1 && k <= ctxA.opts.length && /^\d$/.test(r)) {
      enAttente = null;
      const e = ctxA.opts[k - 1];
      appris.set(norm(ctxA.mot), e);
      lines(['association cristallisée :', '  - terme: "' + ctxA.mot + '"', '    objet: ' + e.objet, '    confiance: 0.6', '    source: humain'], 'yaml');
      vibrer('Cyrano', 'association_apprise', ctxA.mot + ' → ' + e.geste);
      line('La prochaine fois, « ' + ctxA.mot + ' » ira droit au but, sans question.', 'dim');
      blank();
      mission(ctxA.texte, { silencieuxEntete: false });
      return true;
    }
    enAttente = null;
    line('Clarification abandonnée. Nouvelle demande prise en compte.', 'dim');
    return false;
  }

  /* =========================================================
     CERCLES · verser, vibrer, laisser s'emboîter
     ========================================================= */
  function cercles() {
    const tok = ++seqTok;
    const N = 26, R = rng((Date.now() & 0xffff) + 26);
    let C = Array.from({ length: N }, () => ({ x: 0.05 + R() * 0.9, y: 0.05 + R() * 0.9, r: 0 }));
    const grow = i => { const c = C[i]; let r = Math.min(c.x, 1 - c.x, c.y, 1 - c.y); for (let j = 0; j < N; j++) { if (j === i) continue; const o = C[j]; const d = Math.hypot(c.x - o.x, c.y - o.y) - o.r; if (d < r) r = d; } return r > 0 ? r : 0; };
    const regrow = () => { for (let i = 0; i < N; i++) C[i].r = grow(i); };
    const sum = () => C.reduce((s, c) => s + c.r, 0);
    regrow(); regrow();
    let score = sum(), best = score, bestC = C.map(c => ({ ...c })), trials = 0, stag = 0, shakes = 0, lastShake = [];
    const RECORD = 2.635, HISTO = 2.15, MAXT = 90000;
    const chev = () => { let k = 0; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (Math.hypot(C[i].x - C[j].x, C[i].y - C[j].y) < C[i].r + C[j].r - 1e-9) k++; return k; };
    scene('Les Cercles · 26 cercles, verser et vibrer', 'Chaque cercle grandit jusqu’au contact ; on secoue, on garde ce qui se tasse. Reconstitution du principe dans votre navigateur.', '');
    line('Les Cercles : 26 cercles dans un carré unité, maximiser la somme des rayons.', 'title');
    line('Positions calculées ici par itérations et contraintes de contact : aucun placement prédéfini.', 'sys');
    vibrer('Craag', 'cercles_verses', '26 cercles');
    const step = () => {
      for (let t = 0; t < 220 && trials < MAXT; t++, trials++) {
        let i = Math.floor(R() * N);
        if (R() < 0.5) { let m = 0; for (let k = 1; k < N; k++) if (C[k].r < C[m].r) m = k; i = m; }
        const save = C.map(c => ({ ...c }));
        const s = 0.004 + 0.18 * Math.pow(R(), 3);
        C[i].x = Math.min(0.9999, Math.max(0.0001, C[i].x + (R() * 2 - 1) * s));
        C[i].y = Math.min(0.9999, Math.max(0.0001, C[i].y + (R() * 2 - 1) * s));
        C[i].r = 0; C[i].r = grow(i); regrow();
        const ns = sum();
        if (ns >= score - 1e-12) { if (ns > score + 1e-6) stag = 0; else stag++; score = ns; }
        else { C = save; stag++; }
        if (score > best + 1e-9) { best = score; bestC = C.map(c => ({ ...c })); }
        if (stag > 2600) {
          const ord = C.map((c, k) => [c.r, k]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(a => a[1]);
          ord.forEach(k => { C[k].x = 0.05 + R() * 0.9; C[k].y = 0.05 + R() * 0.9; C[k].r = 0; });
          regrow(); regrow(); score = sum(); stag = 0; shakes++; lastShake = ord;
          if (tok === seqTok && shakes <= 6) line('[' + trials + '] secousse des coupables [' + ord.join(', ') + '] · meilleur ' + best.toFixed(4), 'vib');
        }
      }
      begin();
      const S = 440, ox = (VW - S) / 2, oy = 30;
      ctx.strokeStyle = P.line; ctx.lineWidth = 1.2; ctx.strokeRect(ox, oy, S, S);
      C.forEach((c, k) => {
        ctx.beginPath(); ctx.arc(ox + c.x * S, oy + c.y * S, Math.max(0.5, c.r * S), 0, 6.283);
        ctx.fillStyle = lastShake.includes(k) ? 'rgba(224,138,120,.22)' : 'rgba(111,191,159,.16)'; ctx.fill();
        ctx.strokeStyle = lastShake.includes(k) ? P.red : P.ok; ctx.lineWidth = 1.1; ctx.stroke();
        if (c.r * S > 9) text(String(k), ox + c.x * S, oy + c.y * S, P.dim, 9, 'center');
      });
      const pct = (best / RECORD * 100).toFixed(1);
      text('somme des rayons ' + score.toFixed(4) + '   meilleur ' + best.toFixed(4) + '   (' + pct + ' % du record publié)', VW / 2, oy + S + 22, P.white, 11.5, 'center');
      text('chevauchements ' + chev() + '   secousses ' + shakes + '   essais ' + trials, VW / 2, oy + S + 42, P.dim, 11, 'center');
      sceneMeta.textContent = 'meilleur ' + best.toFixed(4);
      if (trials >= MAXT) {
        C = bestC;
        if (tok === seqTok) {
          blank();
          line('Équilibre atteint après ' + trials + ' essais, ' + shakes + ' secousses.', 'ok');
          line('Somme des rayons : ' + best.toFixed(4) + ' · chevauchements : ' + chev() + ' · ' + (best / RECORD * 100).toFixed(1) + ' % du meilleur résultat publié (2,635).', 'ok');
          line('Trace historique sur l’organisme : 2,15 en architecture NO-DEF pure, chaque gardien ne faisant qu’un geste.', 'dim');
          vibrer('Célégans', 'equilibre_cercles', best.toFixed(4));
        }
        return false;
      }
    };
    if (reduced) { while (step() !== false); return; }
    loop(step);
  }

  /* =========================================================
     LABYRINTHE · Célégans et ses phéromones
     ========================================================= */
  function labyrinthe() {
    const tok = ++seqTok;
    const Wc = 11, Hc = 11, R = rng(Date.now() & 0xffff);
    const open = Array.from({ length: Wc * Hc }, () => [false, false, false, false]); // N E S O
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
    const seen = new Array(Wc * Hc).fill(false), st = [0]; seen[0] = true;
    while (st.length) {
      const c = st[st.length - 1], x = c % Wc, y = (c / Wc) | 0;
      const nb = [0, 1, 2, 3].filter(d => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < Wc && ny < Hc && !seen[ny * Wc + nx]; });
      if (!nb.length) { st.pop(); continue; }
      const d = nb[Math.floor(R() * nb.length)], n = (y + DY[d]) * Wc + x + DX[d];
      open[c][d] = true; open[n][(d + 2) % 4] = true; seen[n] = true; st.push(n);
    }
    const EXIT = Wc * Hc - 1, MAXM = 1000, TENT = 7;
    const pe = new Float64Array(Wc * Hc * 4), visites = new Float64Array(Wc * Hc);
    const pher = c => pe[c * 4] + pe[c * 4 + 1] + pe[c * 4 + 2] + pe[c * 4 + 3];
    const dist = new Array(Wc * Hc).fill(-1); dist[0] = 0; { const q = [0]; while (q.length) { const c = q.shift(), x = c % Wc, y = (c / Wc) | 0; for (let d = 0; d < 4; d++) if (open[c][d]) { const n = (y + DY[d]) * Wc + x + DX[d]; if (dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } } } }
    const OPT = dist[EXIT];
    const series = [];
    let tent = 0, pos = 0, prev = -1, moves = 0, path = [0], pause = 0;
    const HISTO = [1000, 118, 86, 534, 146, 474, 54];
    scene('Célégans · le labyrinthe', 'Chaque pas est une vibration ; la trajectoire réussie laisse des phéromones dont la tentative suivante hérite. Reconstitution du principe.', '');
    line('Célégans entre dans un labyrinthe de ' + Wc + ' × ' + Hc + '. Sept tentatives, mille mouvements au plus.', 'title');
    line('Il ne connaît ni la carte ni le chemin. Il marque seulement, en partant, la direction prise.', 'sys');
    vibrer('Célégans', 'labyrinthe_entree');
    function choisir() {
      const x = pos % Wc, y = (pos / Wc) | 0;
      const ds = [0, 1, 2, 3].filter(d => open[pos][d]);
      const nb = ds.map(d => (y + DY[d]) * Wc + x + DX[d]);
      const w = ds.map((d, i) => Math.pow(0.8 + pe[pos * 4 + d], 2) / (1 + visites[nb[i]] * 0.6) * (nb[i] === prev && nb.length > 1 ? 0.12 : 1));
      let s = w.reduce((a, b) => a + b, 0), r = R() * s;
      for (let i = 0; i < nb.length; i++) { r -= w[i]; if (r <= 0) return nb[i]; }
      return nb[nb.length - 1];
    }
    function finTentative(ok) {
      series.push(ok ? moves : 1000);
      if (tok === seqTok) line('tentative ' + (tent + 1) + ' · ' + (ok ? moves + ' mouvements' : '1000 mouvements, échec'), ok ? 'ok' : 'warn');
      vibrer('Célégans', ok ? 'sortie_atteinte' : 'tentative_echouee', moves + ' mouvements', true);
      for (let i = 0; i < pe.length; i++) pe[i] *= 0.55;
      for (let i = 0; i < visites.length; i++) visites[i] *= 0.2;
      if (ok) for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1]; const d = [0, 1, 2, 3].find(d => open[a][d] && (((a / Wc) | 0) + DY[d]) * Wc + (a % Wc) + DX[d] === b); pe[a * 4 + d] += 1; }
      tent++; pos = 0; prev = -1; moves = 0; path = [0]; pause = 24;
      if (tent >= TENT && tok === seqTok) {
        blank();
        line('Série reconstituée : ' + series.join(' · ') + ' · plus court chemin possible : ' + OPT + ' pas, jamais calculé par l’agent.', 'ok');
        line('Série réelle de KENTA (tentatives archivées) : 1000 (échec) · 118 · 86 · 534 · 146 · 474 · 54', 'dim');
        line('Ni carte ni calcul de chemin : une mémoire chimique, qui s’efface et se renforce.', 'sys');
      }
    }
    function pas() {
      const n = choisir(); prev = pos; pos = n; moves++; visites[n] += 1;
      const k = path.indexOf(n); if (k >= 0) path.length = k + 1; else path.push(n);
      if (pos === EXIT) return finTentative(true);
      if (moves >= MAXM) return finTentative(false);
    }
    const draw = () => {
      begin();
      const cs = 36, ox = (VW - Wc * cs) / 2, oy = 22;
      let pm = 0; for (let i = 0; i < Wc * Hc; i++) pm = Math.max(pm, pher(i));
      for (let c = 0; c < Wc * Hc; c++) {
        const x = c % Wc, y = (c / Wc) | 0;
        if (pher(c) > 0.01) { ctx.fillStyle = 'rgba(201,154,102,' + Math.min(0.55, pher(c) / (pm || 1) * 0.55).toFixed(3) + ')'; ctx.fillRect(ox + x * cs + 2, oy + y * cs + 2, cs - 4, cs - 4); }
        if (visites[c] > 0.05) { ctx.fillStyle = 'rgba(141,184,224,' + Math.min(0.18, visites[c] * 0.03).toFixed(3) + ')'; ctx.fillRect(ox + x * cs + 2, oy + y * cs + 2, cs - 4, cs - 4); }
        const X = ox + x * cs, Y = oy + y * cs;
        if (!open[c][0]) seg(X, Y, X + cs, Y, P.text, 1.4);
        if (!open[c][1]) seg(X + cs, Y, X + cs, Y + cs, P.text, 1.4);
        if (!open[c][2]) seg(X, Y + cs, X + cs, Y + cs, P.text, 1.4);
        if (!open[c][3]) seg(X, Y, X, Y + cs, P.text, 1.4);
      }
      ctx.beginPath(); path.forEach((c, i) => { const x = ox + (c % Wc) * cs + cs / 2, y = oy + ((c / Wc) | 0) * cs + cs / 2; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.strokeStyle = 'rgba(111,191,159,.8)'; ctx.lineWidth = 2; ctx.stroke();
      dot(ox + cs / 2, oy + cs / 2, 6, P.blue); dot(ox + (Wc - 0.5) * cs, oy + (Hc - 0.5) * cs, 7, P.acc);
      dot(ox + (pos % Wc) * cs + cs / 2, oy + ((pos / Wc) | 0) * cs + cs / 2, 6.5, P.white);
      const lab = tent < TENT ? 'tentative ' + (tent + 1) + ' / ' + TENT + ' · ' + moves + ' mouvements' : 'série : ' + series.join(' · ');
      text(lab, VW / 2, oy + Hc * cs + 20, P.white, 11.5, 'center');
      text('ocre : phéromones   bleu : passages   vert : trajectoire', VW / 2, oy + Hc * cs + 38, P.dim, 10.5, 'center');
      sceneMeta.textContent = series.length ? series.join(' · ') : '';
    };
    const step = () => {
      if (tent >= TENT) { draw(); return false; }
      if (pause > 0) { pause--; draw(); return; }
      const k = tent === 0 ? 14 : 5;
      for (let i = 0; i < k && tent < TENT && pause === 0; i++) pas();
      draw();
    };
    if (reduced) { while (tent < TENT) { pas(); pause = 0; } draw(); return; }
    loop(step);
  }

  /* =========================================================
     FORGE · le collège des sept
     ========================================================= */
  const COLLEGE = [
    ['Hinata', 'lisible et mesurable'],
    ['Jiraiya', 'NO-DEF : aucun métier codé, aucune écriture d’ADN, aucune décision confiée à un modèle'],
    ['Minato', 'cible dans la racine des organes, filiation complète'],
    ['Tsunade', 'réversible : sauvegarde et restauration possibles'],
    ['Célégans', 'homéostasie : l’organisme n’est pas surchargé'],
    ['Itachi', 'aucun accès caché, aucun secret exposé'],
    ['Sakura', 'aucun poison, aucun doublon']
  ];
  function forge(args) {
    const tok = ++seqTok;
    const refus = args.some(a => /refus|99/.test(norm(a)));
    const votes = COLLEGE.map(([g]) => (refus && g === 'Jiraiya') ? 99.99 : 100);
    let k = -1, phase = 0;
    scene('Forge gouvernée · le collège des sept', 'Rejeu illustratif du protocole : votants et sceau conformes, libellés des prismes simplifiés.', refus ? 'variante : un vote à 99,99' : 'unanimité requise');
    const draw = () => {
      begin();
      const cx = VW / 2, cy = 230, R0 = 165;
      COLLEGE.forEach(([g], i) => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 7, x = cx + Math.cos(a) * R0, y = cy + Math.sin(a) * R0;
        const done = i <= k, ok = votes[i] === 100;
        seg(cx, cy, x, y, done ? (ok ? 'rgba(111,191,159,.6)' : 'rgba(224,138,120,.7)') : P.line, done ? 1.6 : 1);
        dot(x, y, 24, done ? (ok ? '#1f4a40' : '#4a2a24') : '#112b27');
        ctx.beginPath(); ctx.arc(x, y, 24, 0, 6.283); ctx.strokeStyle = done ? (ok ? P.ok : P.red) : P.line; ctx.lineWidth = 1.6; ctx.stroke();
        text(g, x, y - 4, P.white, 10.5, 'center', 700);
        if (done) text(ok ? '100' : '99,99', x, y + 9, ok ? P.ok : P.red, 10, 'center');
      });
      const sealed = phase >= 2;
      dot(cx, cy, 38, sealed ? (refus ? '#4a2a24' : '#2a5a4c') : '#173a33');
      ctx.beginPath(); ctx.arc(cx, cy, 38, 0, 6.283); ctx.strokeStyle = sealed ? (refus ? P.red : P.acc) : P.line; ctx.lineWidth = 2; ctx.stroke();
      text(phase < 2 ? 'proposition' : (refus ? 'recalée' : 'scellée'), cx, cy - 6, P.white, 11, 'center', 700);
      text(phase < 2 ? 'à voter' : (refus ? 'aucun sceau' : 'collège unanime'), cx, cy + 10, P.dim, 10, 'center');
      if (phase >= 3 && !refus) text('Craag matérialise · organe greffé', cx, 448, P.acc, 12, 'center', 700);
      if (phase >= 3 && refus) text('rien n’est écrit · le refus est tracé', cx, 448, P.red, 12, 'center', 700);
      text('100 % : l’organe naît.   99,99 % : il est refusé.', cx, 482, P.dim, 10.5, 'center');
    };
    draw();
    (async () => {
      line('Forge gouvernée' + (refus ? ' · variante de refus' : ''), 'title');
      if (!await say(tok, 'Proposition déposée : un organe candidat, son empreinte, sa cible dans la racine des organes.', 'sys')) return;
      vibrer('Craag', 'proposition_a_voter');
      for (let i = 0; i < COLLEGE.length; i++) {
        k = i; draw();
        const [g, prisme] = COLLEGE[i];
        if (!await say(tok, g.padEnd(9) + '› ' + (votes[i] === 100 ? '100   ' : '99,99 ') + prisme + (votes[i] !== 100 ? '  · réserve : l’organe confie une décision à un modèle' : ''), votes[i] === 100 ? 'ok' : 'err', 330)) return;
        vibrer(g, 'vote_forge', String(votes[i]), true);
      }
      phase = 1; draw();
      if (!await say(tok, 'Célégans › agrégation : ' + (refus ? 'bilan recalé (unanimité manquée)' : 'bilan valide, score 100'), refus ? 'warn' : 'ok', 380)) return;
      phase = 2; draw();
      if (refus) {
        await say(tok, 'Minato › aucun sceau. Le refus est tracé avec sa cause, pour reprise bornée.', 'warn', 380);
        phase = 3; draw();
        vibrer('Célégans', 'bilan_vote_recale');
        line('Pas de vote à la majorité, pas de moyenne pondérée. Le coût du vote fait la rareté.', 'dim');
        return;
      }
      if (!await say(tok, 'Minato › sceau collégial : autorité « collège unanime », sept empreintes de votes, aucune signature humaine.', 'ok', 380)) return;
      vibrer('Minato', 'autorisation_scellee');
      phase = 3; draw();
      if (!await say(tok, 'Craag › matérialisation conforme à l’empreinte · capacité greffée chez son porteur.', 'ok', 300)) return;
      vibrer('Craag', 'organe_materialise');
      line('Des organes sont déjà nés ainsi sur l’organisme vivant. Essayez « forge refus ».', 'dim');
    })();
  }

  /* =========================================================
     BORD · l'inconnu par le bord
     ========================================================= */
  function bord(args) {
    const tok = ++seqTok;
    const objet = (args.join('_') || 'image_ticket_recu').replace(/[^\w-]/g, '').slice(0, 40) || 'objet_inconnu';
    const etapes = [['Hinata', 'reçoit'], ['Le bord', 'insuffisance'], ['Iruka', 'cherche'], ['Tachikoma', 'propose'], ['Collège', 'qualifiera']];
    let k = -1;
    scene('L’inconnu par le bord', 'Le gardien ne nomme pas l’inconnu : c’est le bord de ses capacités qui le signale.', 'objet : ' + objet);
    const draw = () => {
      begin();
      etapes.forEach(([n, v], i) => {
        const x = 70 + i * 125, y = 220, on = i <= k;
        if (i < etapes.length - 1) seg(x + 30, y, x + 95, y, on ? P.acc : P.line, 1.5);
        dot(x, y, 30, on ? (i === 4 ? '#3a3350' : '#1f4a40') : '#112b27');
        ctx.beginPath(); ctx.arc(x, y, 30, 0, 6.283); ctx.strokeStyle = on ? (i === 4 ? P.violet : P.ok) : P.line; ctx.lineWidth = 1.6; ctx.stroke();
        text(n, x, y - 4, P.white, 10.5, 'center', 700); text(v, x, y + 11, P.dim, 9.5, 'center');
      });
      text(objet, 70, 150, P.acc, 12, 'left', 700);
      text('hypothèse texte, aucune exécution : les mains sont volontairement absentes', VW / 2, 330, P.dim, 10.5, 'center');
    };
    draw();
    (async () => {
      line('L’inconnu par le bord · objet « ' + objet + ' »', 'title');
      k = 0; draw(); if (!await say(tok, 'Hinata › objet reçu. Aucune de mes capacités ne le traite.', 'warn', 380)) return;
      k = 1; draw(); vibrer('Hinata', 'insuffisance_capacite', 'objet_recu: ' + objet); await sleep(300);
      k = 2; draw(); if (!await say(tok, 'Iruka › recherche locale dans les capacités déclarées… non résolue.', 'sys', 420)) return;
      if (!await say(tok, 'Iruka › dossier d’effet de bord constitué (cause et filiation conservées).', 'sys', 300)) return;
      k = 3; draw(); if (!await say(tok, 'Tachikoma › proposition : « un organe au geste unique qui lit cet objet et rend une forme qualifiable ».', 'ok', 380)) return;
      vibrer('Tachikoma', 'proposition_effet_de_bord');
      k = 4; draw(); await say(tok, 'Toile › proposition en attente de qualification. Ici, l’autorité reste au collège.', 'sys', 200);
      line('→ suite naturelle : forge', 'dim');
    })();
  }

  /* =========================================================
     KIRIGAKURE · MATIÈRE NOIRE · IZANAMI · TSUKUYOMI
     ========================================================= */
  function hidden() { return Object.keys(CMD).filter(k => CMD[k].cache && CMD[k].primaire === k); }
  function kirigakure() {
    const tok = ++seqTok;
    const h = hidden();
    scene('Kirigakure · le brouillard', 'Des présences perçues sans déclaration. La question est posée, la cause n’est pas inventée.', h.length + ' présences');
    const R = rng(11);
    const fog = Array.from({ length: 70 }, () => ({ x: R() * VW, y: R() * VH, r: 30 + R() * 70, v: (R() - 0.5) * 0.3 }));
    const pts = h.map((n, i) => ({ n, x: 110 + (i % 3) * 210, y: 150 + Math.floor(i / 3) * 170 }));
    let t0 = performance.now();
    const draw = t => {
      begin();
      fog.forEach(f => { f.x += f.v; if (f.x < -100) f.x = VW + 100; if (f.x > VW + 100) f.x = -100; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fillStyle = 'rgba(207,224,216,.035)'; ctx.fill(); });
      const reveal = Math.min(1, (t - t0) / 2500);
      pts.forEach(p => { ctx.globalAlpha = reveal; dot(p.x, p.y, 7, P.violet); text('?', p.x, p.y - 22, P.violet, 16, 'center', 700); text(p.n, p.x, p.y + 22, P.text, 11, 'center'); ctx.globalAlpha = 1; });
      incompris.slice(-3).forEach((m, i) => text('trace sans résonance : « ' + m + ' »', 20, VH - 60 + i * 16, P.dim, 10.5));
      text('pourquoi cette présence existe-t-elle ?', VW / 2, 40, P.white, 13, 'center', 700);
      return reduced ? false : undefined;
    };
    if (reduced) draw(t0 + 5000); else loop(draw);
    (async () => {
      line('Kirigakure › perception des présences sans déclaration dans ce terminal.', 'title');
      for (const n of h) { if (!await say(tok, 'présence : ' + n.padEnd(11) + '· déclarée dans l’aide : non · répond : oui', 'q', 220)) return; vibrer('Célégans', 'kirigakure_presence_inconnue', n, true); }
      for (const m of incompris.slice(-5)) { if (!await say(tok, 'trace : « ' + m + ' » · incompréhension sans résonance', 'q', 160)) return; }
      await say(tok, 'question : pourquoi ces présences existent-elles ?', 'sys', 200);
      await say(tok, 'cause : non qualifiée. Inventer une cause est interdit. Niveau : suspicion.', 'warn', 200);
      line('→ matiere-noire', 'dim');
    })();
  }
  function matiereNoire() {
    ++seqTok;
    const h = hidden();
    lines(['Matière noire', ], 'title');
    lines([
      h.length + ' commandes répondent dans ce terminal sans figurer dans l’aide.',
      'Dans KENTA, c’est la part des organes chargés à la demande, invisibles à l’analyse statique,',
      'et l’emprunt de capacités d’un gardien à l’autre. Ce qui agit sans être déclaré.',
      'KENTA ne l’efface pas : il apprend à la percevoir (Kirigakure), à la distiller (Miimé),',
      'puis à la réintégrer dans sa carte (Remembrement).'
    ], 'sys');
    line('→ kirigakure', 'dim');
    constellation(true);
  }
  function izanami() {
    ++seqTok;
    const sans = toile.filter(v => !v.origine).length;
    line('Izanami › examen de la Toile de cette page.', 'title');
    line(toile.length + ' vibrations · ' + sans + ' action' + (sans > 1 ? 's' : '') + ' sans influx traçable.', sans ? 'warn' : 'ok');
    line('Chaque vibration de ce terminal remonte à une entrée de votre main. Rien ne s’agite seul.', 'sys');
  }
  const PIEGE = /(\bor\b\s+1\s*=\s*1|<\s*script|drop\s+table|rm\s+-rf|;\s*--|\$\(|`|\.\.\/|union\s+select)/i;
  function tsukuyomi(txt) {
    ++seqTok;
    line('Tsukuyomi › illusion refermée sur l’entrée.', 'err');
    line('Itachi › entrée isolée, aucune exécution. Rien dans ce terminal n’est jamais interprété comme du code.', 'warn');
    vibrer('Itachi', 'tentative_injection_piegee', txt.slice(0, 40));
    line('Trace forensique conservée dans la Toile de cette page (vibration ' + toile.length + ').', 'dim');
  }

  /* =========================================================
     BYAKUGAN · lecture réelle de cette page
     ========================================================= */
  function byakugan() {
    const tok = ++seqTok;
    const sections = document.querySelectorAll('main section').length;
    const scripts = [...document.scripts];
    const local = s => { try { return !s.src || new URL(s.src, location.href).origin === location.origin; } catch (e) { return false; } };
    let ext = 0; try { ext = performance.getEntriesByType('resource').filter(r => { try { return new URL(r.name).origin !== location.origin; } catch (e) { return false; } }).length; } catch (e) { ext = -1; }
    let cookies = 'illisible'; try { cookies = document.cookie ? document.cookie.split(';').length + ' cookie(s)' : 'aucun'; } catch (e) { /* bac à sable */ }
    let stock = 'inaccessible'; try { stock = window.localStorage.length + ' entrée(s)'; } catch (e) { /* bac à sable */ }
    const csp = (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '';
    const liens = [...document.querySelectorAll('a[href^="http"]')].length;
    const rap = [
      ['sections perçues', String(sections)],
      ['applications au registre', String(D.apps.length)],
      ['gardiens au registre', String(D.gardiens.length)],
      ['scripts', scripts.length + ' · ' + (scripts.every(local) ? 'tous de même origine' : 'origine mixte')],
      ['ressources d’autres origines', ext < 0 ? 'mesure indisponible' : String(ext)],
      ['requêtes réseau autorisées aux scripts', /connect-src 'none'/.test(csp) ? 'aucune (politique de sécurité)' : 'non bornées'],
      ['cookies', cookies],
      ['stockage local', stock],
      ['liens sortants', String(liens)]
    ];
    scene('Byakugan · lecture de cette page', 'Vision réelle, en lecture seule : ce que Hinata voit de la page que vous lisez.', sections + ' sections');
    const t0 = performance.now();
    const draw = t => {
      begin();
      const cx = VW / 2, cy = 250, a = ((t - t0) / 1400) * Math.PI * 2;
      for (let r = 50; r <= 200; r += 50) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.stroke(); }
      for (let i = 0; i < 24; i++) { const b = a - i * 0.04; ctx.globalAlpha = (24 - i) / 60; seg(cx, cy, cx + Math.cos(b) * 200, cy + Math.sin(b) * 200, P.ok, 2); }
      ctx.globalAlpha = 1;
      rap.forEach((r, i) => { const b = i / rap.length * 6.283, rr = 70 + (i % 3) * 45; const x = cx + Math.cos(b) * rr, y = cy + Math.sin(b) * rr; dot(x, y, 4, P.acc); });
      text('360°', cx, cy, P.white, 12, 'center', 700);
      text('lecture seule · rien n’est écrit', cx, 480, P.dim, 10.5, 'center');
      return reduced ? false : undefined;
    };
    if (reduced) draw(t0 + 900); else loop(draw);
    (async () => {
      line('Byakugan › vision complète de cette page, en lecture seule.', 'title');
      for (const [k, v] of rap) { if (!await say(tok, '  ' + k.padEnd(40, '.') + ' ' + v, 'ok', 110)) return; }
      vibrer('Hinata', 'vision_page', sections + ' sections');
      line('Rien n’a été écrit. Voir n’est pas toucher.', 'sys');
    })();
  }

  /* =========================================================
     ARCANA · aperçu par l'année chinoise
     ========================================================= */
  const ANIMAUX = ['Rat', 'Bœuf', 'Tigre', 'Lapin', 'Dragon', 'Serpent', 'Cheval', 'Chèvre', 'Singe', 'Coq', 'Chien', 'Cochon'];
  const ELEMENTS = { Bois: ['Foie et Vésicule biliaire', 'printemps', 'croissance, élan, vision'], Feu: ['Cœur et Intestin grêle', 'été', 'rayonnement, lien, expression'], Terre: ['Rate et Estomac', 'intersaisons', 'ancrage, nourriture, soin'], 'Métal': ['Poumon et Gros intestin', 'automne', 'rigueur, tri, essentiel'], Eau: ['Rein et Vessie', 'hiver', 'profondeur, réserve, volonté'] };
  const ORDRE5 = ['Bois', 'Feu', 'Terre', 'Métal', 'Eau'];
  const COUL = { Bois: '#6fae7c', Feu: '#d9785f', Terre: '#d4b062', 'Métal': '#b9c2c4', Eau: '#6f95c9' };
  function arcana(args) {
    ++seqTok;
    const an = parseInt(args[0], 10);
    if (!(an >= 1900 && an <= 2100)) { line('Usage : arcana <année de naissance>, par exemple arcana 1984.', 'sys'); return; }
    const animal = ANIMAUX[((an - 4) % 12 + 12) % 12];
    const el = ['Métal', 'Métal', 'Eau', 'Eau', 'Bois', 'Bois', 'Feu', 'Feu', 'Terre', 'Terre'][an % 10];
    const pol = an % 2 === 0 ? 'yang' : 'yin';
    const [organes, saison, qualites] = ELEMENTS[el];
    line('Arcana · aperçu par l’année chinoise ' + an, 'title');
    lines(['  animal ............ ' + animal, '  élément ........... ' + el + ' (' + pol + ')', '  organes ........... ' + organes, '  saison ............ ' + saison, '  qualités .......... ' + qualites], 'ok');
    line('Né en janvier ou au début de février ? L’année chinoise peut être la précédente.', 'dim');
    line('Le profil complet croise six traditions et un questionnement pondéré. Ici, une seule porte.', 'sys');
    vibrer('Arcana', 'profil_apercu', animal + ' de ' + el);
    scene('Arcana · cinq éléments', 'Cycle d’engendrement (pentagone) et de contrôle (étoile). L’élément de l’année est mis en lumière.', animal + ' de ' + el);
    stopScene(); begin();
    const cx = VW / 2, cy = 245, R0 = 160;
    const pos = ORDRE5.map((e, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * R0, cy + Math.sin(a) * R0]; });
    for (let i = 0; i < 5; i++) { const [x1, y1] = pos[i], [x2, y2] = pos[(i + 1) % 5]; seg(x1, y1, x2, y2, P.line, 1.5); const [x3, y3] = pos[(i + 2) % 5]; seg(x1, y1, x3, y3, 'rgba(111,149,201,.25)', 1); }
    ORDRE5.forEach((e, i) => { const [x, y] = pos[i]; const on = e === el; dot(x, y, on ? 36 : 26, on ? COUL[e] : '#122b27'); ctx.beginPath(); ctx.arc(x, y, on ? 36 : 26, 0, 6.283); ctx.strokeStyle = COUL[e]; ctx.lineWidth = 2; ctx.stroke(); text(e, x, y, on ? '#0b1d1a' : COUL[e], on ? 13 : 11, 'center', 700); });
    text(animal, cx, cy - 6, P.white, 20, 'center', 700);
    text(pol, cx, cy + 18, P.dim, 12, 'center');
    text('engendrement : Bois → Feu → Terre → Métal → Eau', cx, 470, P.dim, 10.5, 'center');
  }

  /* =========================================================
     RYTHMA · horloge des méridiens
     ========================================================= */
  const MERIDIENS = [['Vésicule biliaire', 'Bois', 23], ['Foie', 'Bois', 1], ['Poumon', 'Métal', 3], ['Gros intestin', 'Métal', 5], ['Estomac', 'Terre', 7], ['Rate-Pancréas', 'Terre', 9], ['Cœur', 'Feu', 11], ['Intestin grêle', 'Feu', 13], ['Vessie', 'Eau', 15], ['Rein', 'Eau', 17], ['Maître du cœur', 'Feu', 19], ['Triple réchauffeur', 'Feu', 21]];
  function rythma() {
    ++seqTok;
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    const i = Math.floor(((Math.floor(h) + 1) % 24) / 2), o = (i + 6) % 12;
    const [m, e, deb] = MERIDIENS[i], [mo] = MERIDIENS[o];
    line('Rythma · horloge des méridiens', 'title');
    line('  méridien en pleine marée, à l’instant du regard : ' + m + ' · ' + e + ' · ' + deb + ' h à ' + ((deb + 2) % 24) + ' h', 'ok');
    line('  méridien au plus bas, à l’opposé du cercle ..... ' + mo, 'ok');
    line('Rythma complet croise ce cycle avec le profil Arcana, les fenêtres de Gaïa et le contexte astral.', 'sys');
    line('Il montre, il ne prescrit pas.', 'sys');
    vibrer('Rythma', 'lecture_meridiens', m);
    scene('Rythma · horloge des méridiens', 'Douze méridiens, deux heures chacun ; l’aiguille suit l’horloge de votre appareil.', m);
    stopScene(); begin();
    const cx = VW / 2, cy = 250, R1 = 190, R2 = 120;
    MERIDIENS.forEach(([nom, el, debut], k) => {
      const a0 = ((debut / 24) * 2 - 0.5) * Math.PI, a1 = (((debut + 2) / 24) * 2 - 0.5) * Math.PI;
      ctx.beginPath(); ctx.arc(cx, cy, R1, a0, a1); ctx.arc(cx, cy, R2, a1, a0, true); ctx.closePath();
      ctx.fillStyle = k === i ? COUL[el] : (k === o ? '#16302b' : 'rgba(255,255,255,.04)'); ctx.fill();
      ctx.strokeStyle = COUL[el]; ctx.lineWidth = 1.2; ctx.stroke();
      const am = (a0 + a1) / 2, rx = cx + Math.cos(am) * (R1 + 22), ry = cy + Math.sin(am) * (R1 + 22);
      text(nom.length > 12 ? nom.split(' ')[0] : nom, rx, ry, k === i ? P.white : P.dim, 10, 'center', k === i ? 700 : 400);
      const nx = cx + Math.cos(am) * ((R1 + R2) / 2), ny = cy + Math.sin(am) * ((R1 + R2) / 2);
      text(debut + 'h', nx, ny, k === i ? '#0b1d1a' : P.dim, 10, 'center', 700);
    });
    const ah = ((h / 24) * 2 - 0.5) * Math.PI;
    seg(cx, cy, cx + Math.cos(ah) * (R1 + 6), cy + Math.sin(ah) * (R1 + 6), P.white, 2);
    dot(cx, cy, 5, P.white);
    text(m, cx, cy - 8, P.white, 14, 'center', 700);
    text(e, cx, cy + 14, COUL[e], 12, 'center');
  }

  /* =========================================================
     SUDOKU VIVANT · Shikamaru et l'indice borné
     ========================================================= */
  let SDK = null;
  function sudoku() {
    ++seqTok;
    const R = rng(Date.now() & 0xffffff);
    let g = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];
    const perm = [1, 2, 3, 4].sort(() => R() - 0.5);
    g = g.map(r => r.map(v => perm[v - 1]));
    if (R() < 0.5) g = g[0].map((_, c) => g.map(r => r[c]));
    if (R() < 0.5) g = [g[1], g[0], g[2], g[3]];
    if (R() < 0.5) g = g.map(r => [r[0], r[1], r[3], r[2]]);
    const given = g.map(r => r.map(() => R() < 0.45));
    let nGiven = given.flat().filter(Boolean).length;
    while (nGiven < 6) { const r = Math.floor(R() * 4), c = Math.floor(R() * 4); if (!given[r][c]) { given[r][c] = true; nGiven++; } }
    SDK = { g: g.map((r, i) => r.map((v, j) => given[i][j] ? v : 0)), given, erreurs: 0 };
    line('Sudoku vivant · grille 4 × 4', 'title');
    line('Posez avec « pose L C V » (ligne, colonne, valeur). « indice » pour Shikamaru.', 'sys');
    vibrer('Nono', 'partie_ouverte');
    afficherGrille();
  }
  function conflits(gr) { const bad = new Set(); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = gr[r][c]; if (!v) continue; for (let k = 0; k < 4; k++) { if (k !== c && gr[r][k] === v) bad.add(r * 4 + c); if (k !== r && gr[k][c] === v) bad.add(r * 4 + c); } const br = r - r % 2, bc = c - c % 2; for (let i = br; i < br + 2; i++) for (let j = bc; j < bc + 2; j++) if ((i !== r || j !== c) && gr[i][j] === v) bad.add(r * 4 + c); } return bad; }
  function candidats(gr, r, c) { const s = new Set([1, 2, 3, 4]); for (let k = 0; k < 4; k++) { s.delete(gr[r][k]); s.delete(gr[k][c]); } const br = r - r % 2, bc = c - c % 2; for (let i = br; i < br + 2; i++) for (let j = bc; j < bc + 2; j++) s.delete(gr[i][j]); return s; }
  function afficherGrille() {
    const gr = SDK.g, bad = conflits(gr);
    const row = r => (r + 1) + ' │ ' + gr[r].slice(0, 2).map(v => v || '·').join(' ') + ' │ ' + gr[r].slice(2).map(v => v || '·').join(' ') + ' │';
    lines(['    1 2   3 4', '  ┌─────┬─────┐', row(0), row(1), '  ├─────┼─────┤', row(2), row(3), '  └─────┴─────┘'], 'yaml');
    scene('Sudoku vivant', 'Grille de démonstration. Les gardiens vous voient jouer ; Shikamaru oriente sans résoudre.', bad.size ? bad.size + ' conflit(s)' : 'aucun conflit');
    stopScene(); begin();
    const S = 340, ox = (VW - S) / 2, oy = 70, cs = S / 4;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = gr[r][c], x = ox + c * cs, y = oy + r * cs;
      if (bad.has(r * 4 + c)) { ctx.fillStyle = 'rgba(224,138,120,.2)'; ctx.fillRect(x, y, cs, cs); }
      if (v) text(String(v), x + cs / 2, y + cs / 2, SDK.given[r][c] ? P.white : (bad.has(r * 4 + c) ? P.red : P.acc), 34, 'center', SDK.given[r][c] ? 700 : 400);
    }
    for (let k = 0; k <= 4; k++) { seg(ox + k * cs, oy, ox + k * cs, oy + S, k % 2 ? P.line : P.text, k % 2 ? 1 : 2); seg(ox, oy + k * cs, ox + S, oy + k * cs, k % 2 ? P.line : P.text, k % 2 ? 1 : 2); }
    text('blanc : donné   ocre : posé   rouge : conflit', VW / 2, oy + S + 30, P.dim, 10.5, 'center');
  }
  function pose(args) {
    if (!SDK) { line('Aucune partie ouverte. Tapez « sudoku ».', 'sys'); return; }
    const [r, c, v] = args.map(x => parseInt(x, 10));
    if (!(r >= 1 && r <= 4 && c >= 1 && c <= 4 && v >= 0 && v <= 4)) { line('Usage : pose L C V, valeurs de 1 à 4 (0 pour effacer).', 'sys'); return; }
    if (SDK.given[r - 1][c - 1]) { line('Cette case est donnée. Shikamaru › on ne déplace pas les fondations.', 'warn'); return; }
    SDK.g[r - 1][c - 1] = v;
    vibrer('Shikamaru', 'coup_observe', 'L' + r + 'C' + c + '=' + v, true);
    const bad = conflits(SDK.g);
    if (bad.has((r - 1) * 4 + c - 1)) {
      SDK.erreurs++;
      line('Conflit en ligne ' + r + ', colonne ' + c + '.', 'err');
      if (SDK.erreurs >= 2) { line('Shikamaru › stagnation perçue. Je m’en mêle, un peu.', 'q'); indice(true); SDK.erreurs = 0; }
    } else SDK.erreurs = 0;
    afficherGrille();
    if (SDK.g.flat().every(Boolean) && conflits(SDK.g).size === 0) { line('Grille résolue. Nono › partie cristallisée.', 'ok'); vibrer('Nono', 'partie_cristallisee'); SDK = null; }
  }
  function indice(auto) {
    if (!SDK) { line('Aucune partie ouverte. Tapez « sudoku ».', 'sys'); return; }
    let best = null;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!SDK.g[r][c]) { const k = candidats(SDK.g, r, c).size; if (!best || k < best.k) best = { r, c, k }; }
    if (!best) { line('Shikamaru › la grille est pleine. Cherche plutôt le conflit en rouge.', 'q'); return; }
    line('Shikamaru › ligne ' + (best.r + 1) + ', colonne ' + (best.c + 1) + ' : ' + (best.k === 1 ? 'une seule valeur possible' : best.k + ' valeurs possibles') + '. Je te montre où regarder, pas quoi écrire.', 'q');
    if (!auto) vibrer('Shikamaru', 'indice_borne');
  }

  /* =========================================================
     PICSOU · lire un flux, décider rarement
     ========================================================= */
  function picsou() {
    const tok = ++seqTok;
    const R = rng(Date.now() & 0xffffff), N = 260;
    const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); };
    const p = [100]; let regime = 0;
    for (let t = 1; t < N; t++) { if (t % 45 === 0) regime = [1, -1, 0][Math.floor(R() * 3)]; p.push(p[t - 1] * (1 + 0.006 * gauss() + regime * 0.0022)); }
    const W = new Map(); let energie = 10, pnl = 0, naif = 0; const dec = [];
    for (let t = 4; t < N - 1; t++) {
      const key = [1, 2, 3].map(k => p[t - k + 1] > p[t - k] ? '+' : '-').join('');
      const w = W.get(key) || 0; let d = 'WAIT';
      if (energie >= 2 && w > 1.2) d = 'BUY'; else if (energie >= 2 && w < -1.2) d = 'SELL';
      const dx = p[t + 1] - p[t];
      if (d === 'BUY') { pnl += dx; energie -= 2; } if (d === 'SELL') { pnl -= dx; energie -= 2; }
      naif += (p[t] > p[t - 1] ? 1 : -1) * dx;
      W.set(key, w * 0.85 + (dx > 0 ? 1 : -1));
      energie = Math.min(10, energie + 0.35);
      dec.push([t, d]);
    }
    const nb = d => dec.filter(x => x[1] === d).length;
    scene('Picsou · lire un flux, décider rarement', 'Flux synthétique, simulation pure, aucun capital. Vert : achat, rouge : vente, le reste est attente.', '');
    let shown = 4;
    const draw = () => {
      begin();
      const mn = Math.min(...p), mx = Math.max(...p), ox = 30, oy = 40, w = 580, hh = 360;
      const X = t => ox + t / (N - 1) * w, Y = v => oy + (1 - (v - mn) / (mx - mn || 1)) * hh;
      for (let k = 0; k <= 4; k++) seg(ox, oy + k * hh / 4, ox + w, oy + k * hh / 4, P.grid, 1);
      ctx.beginPath(); for (let t = 0; t <= shown; t++) { if (t) ctx.lineTo(X(t), Y(p[t])); else ctx.moveTo(X(t), Y(p[t])); } ctx.strokeStyle = P.text; ctx.lineWidth = 1.3; ctx.stroke();
      dec.forEach(([t, d]) => { if (t > shown || d === 'WAIT') return; dot(X(t), Y(p[t]), 3.5, d === 'BUY' ? P.ok : P.red); });
      dot(X(shown), Y(p[shown]), 4, P.acc);
      const vis = dec.filter(x => x[0] <= shown), a = vis.filter(x => x[1] !== 'WAIT').length;
      text('décisions ' + vis.length + ' · transactions ' + a + ' · attentes ' + (vis.length - a), VW / 2, 440, P.white, 11.5, 'center');
      text('énergie limitée : chaque transaction fatigue, l’attente régénère', VW / 2, 462, P.dim, 10.5, 'center');
    };
    line('Picsou · flux synthétique de ' + N + ' points, motifs de trois mouvements.', 'title');
    vibrer('Picsou', 'flux_ouvert');
    const fin = () => {
      if (tok !== seqTok) return;
      lines(['  attentes ........... ' + nb('WAIT') + ' sur ' + dec.length + ' décisions', '  achats / ventes ..... ' + nb('BUY') + ' / ' + nb('SELL'), '  résultat simulé ..... ' + pnl.toFixed(2) + ' points', '  suiveur naïf ........ ' + naif.toFixed(2) + ' points (agit à chaque pas)'], 'ok');
      line('Simulation sur flux aléatoire : ni conseil, ni promesse. Le principe montré est la rareté de l’acte.', 'dim');
      vibrer('Picsou', 'bilan_simulation', pnl.toFixed(2));
    };
    if (reduced) { shown = N - 1; draw(); fin(); return; }
    loop(() => { shown = Math.min(N - 1, shown + 2); draw(); if (shown >= N - 1) { fin(); return false; } });
  }

  /* =========================================================
     RÉTRO-CALCUL
     ========================================================= */
  function retro(args, raw) {
    ++seqTok;
    const corps = raw.replace(/^\S+\s*/, '');
    const rangs = corps.split('|').map(s => s.trim().split(/\s+/).map(x => parseFloat(x.replace(',', '.')))).filter(r => r.length === 3 && r.every(Number.isFinite));
    if (!rangs.length) { line('Usage : retro C1 C2 A | C1 C2 A | …   par exemple retro 2 3 6 | 4 5 20 | 7 3 21', 'sys'); return; }
    const regles = [['A = C1 + C2', (a, b) => a + b], ['A = C1 − C2', (a, b) => a - b], ['A = C2 − C1', (a, b) => b - a], ['A = C1 × C2', (a, b) => a * b], ['A = C1 ÷ C2', (a, b) => b ? a / b : NaN], ['A = C2 ÷ C1', (a, b) => a ? b / a : NaN]];
    const sc = regles.map(([n, f]) => [n, rangs.filter(([a, b, c]) => Math.abs(f(a, b) - c) <= 1e-9 * Math.max(1, Math.abs(c))).length / rangs.length]);
    sc.sort((x, y) => y[1] - x[1]);
    const [nom, conf] = sc[0];
    line('Kabuto › rétro-calcul sur ' + rangs.length + ' ligne(s).', 'title');
    if (conf === 1) line('règle identifiée : ' + nom + ' · confiance 100 %', 'ok');
    else if (conf >= 0.5) line('règle partielle : ' + nom + ' · confiance ' + Math.round(conf * 100) + ' %', 'warn');
    else line('règle inconnue : aucune règle simple ne dépasse ' + Math.round(conf * 100) + ' %. KENTA ne la devine pas.', 'warn');
    vibrer('Kabuto', conf === 1 ? 'regle_calcul_identifiee' : 'regle_calcul_inconnue', nom);
    scene('Rétro-calcul', 'Chaque règle candidate est confrontée à toutes les lignes ; seule une concordance totale vaut identification.', nom);
    stopScene(); begin();
    sc.forEach(([n, c], i) => { const y = 70 + i * 62; text(n, 40, y, i === 0 && c === 1 ? P.white : P.text, 13, 'left', i === 0 ? 700 : 400); ctx.fillStyle = '#112b27'; ctx.fillRect(220, y - 12, 360, 24); ctx.fillStyle = c === 1 ? P.ok : (c > 0 ? P.acc : P.line); ctx.fillRect(220, y - 12, 360 * c, 24); text(Math.round(c * 100) + ' %', 590, y, P.dim, 11, 'right'); });
  }

  /* =========================================================
     Commandes simples
     ========================================================= */
  function aide() {
    ++seqTok;
    line('Commandes déclarées', 'title');
    Object.keys(CMD).filter(k => !CMD[k].cache && CMD[k].primaire === k).forEach(k => line('  ' + (k + (CMD[k].args ? ' ' + CMD[k].args : '')).padEnd(26) + CMD[k].desc, 'sys'));
    line('Ou écrivez une intention en français : « regarde le jardin », « publie une histoire »…', 'dim');
  }
  function apps() {
    ++seqTok;
    Object.entries(D.familles).forEach(([k, v]) => { line(v, 'title'); line('  ' + D.apps.filter(a => a.fam === k).map(a => a.nom).join(' · '), 'sys'); });
    line('« fiche <nom> » ouvre une fiche, par exemple fiche kirigakure.', 'dim');
  }
  function fiche(args) {
    const q = norm(args.join(' '));
    if (!q) { line('Usage : fiche <nom>, par exemple fiche rythma.', 'sys'); return; }
    const a = D.apps.find(x => x.id === q) || D.apps.find(x => norm(x.nom).includes(q)) || D.apps.find(x => norm(x.id).includes(q));
    if (!a) { line('Aucune application ne répond à « ' + args.join(' ') + ' ». Essayez « apps ».', 'warn'); return; }
    line(a.nom + ' · ' + D.statuts[a.statut].label, 'title');
    line(a.role, 'sys');
    line('maturité : ' + a.maturite, 'dim');
    if (window.KENTA_FICHE) window.KENTA_FICHE(a.id);
  }
  function gardiens() {
    ++seqTok;
    line('Gardiens', 'title');
    D.gardiens.forEach(g => line('  ' + g.nom.padEnd(11) + g.role, 'sys'));
    line('Voix : ' + D.voix.map(v => v.nom).join(' · '), 'dim');
    line('« bingo <nom> » pour une fiche.', 'dim');
    constellation(false);
  }
  function bingo(args) {
    ++seqTok;
    const q = norm(args.join(' '));
    if (!q) { line('Bingo Book · ' + D.gardiens.map(g => g.nom).join(' · '), 'sys'); line('Usage : bingo <gardien>', 'dim'); return; }
    const g = D.gardiens.find(x => norm(x.nom) === q) || D.gardiens.find(x => norm(x.nom).startsWith(q));
    const v = D.voix.find(x => norm(x.nom) === q);
    if (!g && !v) { line('Bingo › « ' + args.join(' ') + ' » n’a pas de fiche. Ce qui n’est pas déclaré n’est pas affirmé.', 'warn'); return; }
    if (v) { line('Bingo › ' + v.nom + ' (voix, pas gardien)', 'title'); line('  ' + v.role, 'sys'); return; }
    line('Bingo › ' + g.nom, 'title');
    lines(['  essence ........... ' + g.role, '  facultés .......... ' + g.facultes.join(' · '), '  dans la chaîne .... ' + (D.chaine.includes(g.nom) ? 'oui, rang ' + (D.chaine.indexOf(g.nom) + 1) + ' sur ' + D.chaine.length : 'hors passage ordinaire')], 'ok');
    line('Fiche éditoriale. Sur l’organisme, le Bingo vivant lit l’ADN réel et signale les capacités absentes.', 'dim');
    vibrer('Remembrement', 'fiche_bingo', g.nom, true);
  }
  function chaine() {
    ++seqTok;
    line('Chaîne canonique · ordre de passage', 'title');
    line('  ' + D.chaine.join(' → '), 'ok');
    line('Elle ne s’ouvre que par un geste déclaré. Pas de minuterie, pas de scrutation.', 'sys');
    scenePipeline(D.chaine, 'Chaîne canonique');
  }
  function doctrine() {
    ++seqTok;
    lines(['KENTA ne comprend pas.', 'Il réduit vers une action interne ou demande clarification.'], 'title');
    lines(['La Toile est le flux. Procyon est la bouche. Cyrano est la réduction.', 'Le code est libre ; c’est la mission qui porte le sens.', 'Un organe, un geste. L’unanimité fait naître. Des yeux, jamais de mains.', 'Ce n’est pas que KENTA ne comprend pas : il refuse de faire semblant de comprendre.'], 'sys');
  }
  function voirToile() {
    ++seqTok;
    line('Toile de cette page · ' + toile.length + ' vibration(s)', 'title');
    if (!toile.length) { line('Vide pour l’instant. Chaque commande y laisse une trace.', 'dim'); return; }
    toile.slice(-25).forEach(v => line('- n: ' + v.n + '  gardien: ' + v.gardien + '  objet: ' + v.objet + (v.note ? '  note: "' + v.note + '"' : ''), 'yaml'));
    line('Elle disparaît quand vous fermez la page : rien n’est conservé ni transmis.', 'dim');
  }
  function effacer() { ++seqTok; out.replaceChildren(); }
  function stop() { ++seqTok; stopScene(); line('Scène arrêtée.', 'dim'); }

  /* =========================================================
     Registre des commandes
     ========================================================= */
  const CMD = {};
  function def(noms, desc, fn, opts) { const o = opts || {}; noms.forEach(n => { CMD[n] = { desc, fn, primaire: noms[0], cache: !!o.cache, args: o.args || '' }; }); }
  def(['aide', 'help', '?'], 'liste des commandes', aide);
  def(['mission'], 'envoyer une intention dans l’entonnoir', (a, raw) => mission(raw.replace(/^\S+\s*/, '') || ''), { args: '<texte>' });
  def(['cercles', 'packing'], '26 cercles, verser et vibrer', cercles);
  def(['labyrinthe', 'celegans'], 'Célégans et ses phéromones', labyrinthe);
  def(['forge'], 'naissance d’un organe par le collège', forge, { args: '[refus]' });
  def(['bord'], 'l’inconnu signalé par le bord', bord, { args: '[objet]' });
  def(['kirigakure'], 'présences sans déclaration', kirigakure);
  def(['matiere-noire', 'ombre', 'matiere'], 'ce qui agit sans être déclaré', matiereNoire);
  def(['byakugan'], 'vision réelle de cette page', byakugan);
  def(['arcana'], 'aperçu par l’année chinoise', arcana, { args: '<année>' });
  def(['rythma'], 'horloge des méridiens', rythma);
  def(['sudoku'], 'grille vivante avec Shikamaru', sudoku);
  def(['pose'], 'poser une valeur au sudoku', pose, { args: 'L C V' });
  def(['indice'], 'indice borné de Shikamaru', () => indice(false));
  def(['picsou', 'trader'], 'lire un flux, décider rarement', picsou);
  def(['retro', 'retro-calcul'], 'retrouver la règle derrière les chiffres', retro, { args: 'C1 C2 A | …' });
  def(['constellation', 'atlas', 'blender', 'carte'], 'KENTA en trois dimensions', () => { ++seqTok; constellation(false); line('Constellation : ' + D.gardiens.length + ' gardiens, leurs facultés, les liens de chaîne.', 'sys'); });
  def(['chaine'], 'ordre de passage des gardiens', chaine);
  def(['gardiens', 'organes'], 'les gardiens et leur rôle', gardiens);
  def(['bingo'], 'fiche d’un gardien', bingo, { args: '<nom>' });
  def(['apps', 'applications'], 'toutes les applications', apps);
  def(['fiche'], 'ouvrir la fiche d’une application', fiche, { args: '<nom>' });
  def(['doctrine', 'axiome'], 'les phrases qui tiennent l’organisme', doctrine);
  def(['toile'], 'vibrations de cette session', voirToile);
  def(['stop'], 'arrêter la scène', stop);
  def(['effacer', 'clear', 'cls'], 'vider le terminal', effacer);
  def(['miime'], '', () => { ++seqTok; line('Miimé › sans corps, invoquée. Je réduis la parole et distille ce que l’ADN ne déclare pas. Je ne décide de rien.', 'q'); vibrer('Miimé', 'invocation'); }, { cache: true });
  def(['izanami'], '', izanami, { cache: true });
  def(['tsukuyomi'], '', () => { ++seqTok; line('Tsukuyomi veille sur l’entrée de ce terminal. Une tentative d’injection y reste enfermée, et tracée.', 'q'); }, { cache: true });
  def(['kenta'], '', doctrine, { cache: true });
  def(['connecter', 'hal', 'ssh'], '', () => { ++seqTok; line('Aucune liaison avec l’instance privée. Une frontière, pas une fenêtre.', 'warn'); vibrer('Procyon', 'refus_liaison'); }, { cache: true });

  /* =========================================================
     Entrée
     ========================================================= */
  const hist = []; let hIdx = 0;
  function run(raw) {
    const txt = String(raw || '').trim();
    if (!txt) return;
    hist.push(txt); hIdx = hist.length;
    line(txt, 'cmd');
    if (PIEGE.test(txt)) { origine = txt; tsukuyomi(txt); return; }
    if (enAttente && repondre(txt)) return;
    const [tete, ...reste] = txt.split(/\s+/);
    const k = norm(tete);
    if (CMD[k]) { origine = txt; vibrer('Procyon', 'commande_' + CMD[k].primaire, '', true); CMD[k].fn(reste, txt); }
    else mission(txt);
  }
  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; run(v); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { if (hIdx > 0) { hIdx--; input.value = hist[hIdx]; } e.preventDefault(); }
    else if (e.key === 'ArrowDown') { if (hIdx < hist.length) { hIdx++; input.value = hist[hIdx] || ''; } e.preventDefault(); }
    else if (e.key === 'Tab') {
      const v = norm(input.value.trim());
      if (!v || v.includes(' ')) return;
      const m = Object.keys(CMD).filter(k => !CMD[k].cache && CMD[k].primaire === k && k.startsWith(v));
      if (m.length === 1) { input.value = m[0] + ' '; e.preventDefault(); }
      else if (m.length > 1) { line(m.join('   '), 'dim'); e.preventDefault(); }
    }
  });

  const CHIPS = ['aide', 'regarde le jardin', 'analyse la relique', 'cercles', 'labyrinthe', 'forge', 'forge refus', 'bord', 'kirigakure', 'byakugan', 'arcana 1984', 'rythma', 'sudoku', 'picsou', 'retro 2 3 6 | 4 5 20 | 7 3 21', 'constellation', 'toile'];
  CHIPS.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.addEventListener('click', () => run(c)); chipsBox.append(b); });

  window.KENTA_TERM = { run };

  lines(['KENTA · terminal de démonstration', ''], 'title');
  lines(['Exécution locale dans votre navigateur. Aucune liaison avec l’instance privée.', 'Tapez une commande, ou écrivez une intention en français.', 'Commencez par « aide », « cercles » ou « regarde le jardin ».'], 'sys');
  blank();
  constellation(false);
  window.addEventListener('resize', () => { if (!raf) { /* scène fixe : redessinée à la prochaine commande */ } });
})();
