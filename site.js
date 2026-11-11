"use strict";
document.querySelector('.menu-button')?.addEventListener('click',function(){const n=document.getElementById('site-nav');const open=n.classList.toggle('open');this.setAttribute('aria-expanded',String(open))});
function catalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const data = window.KENTA_DATA;
  const count = document.getElementById('app-count');
  if (!data || !Array.isArray(data.apps)) {
    count.textContent = 'Registre indisponible';
    return;
  }

  const search = document.getElementById('app-search');
  const family = document.getElementById('app-family');
  const status = document.getElementById('app-status');
  const maturity = app => app.statutPublic || app.statut;
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  function element(tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  for (const [key, label] of Object.entries(data.familles)) family.add(new Option(label, key));
  for (const [key, item] of Object.entries(data.statuts)) status.add(new Option(item.label, key));

  function render() {
    const query = normalize(search.value.trim());
    const found = data.apps.filter(app =>
      (!family.value || app.fam === family.value) &&
      (!status.value || maturity(app) === status.value) &&
      (!query || normalize([app.nom, app.nomPublic, app.accroche, app.accrochePublique, app.description, data.familles[app.fam]].join(' ')).includes(query))
    );
    grid.replaceChildren();
    for (const app of found) {
      const card = element('article', '', 'catalog-card');
      card.append(
        element('span', data.familles[app.fam] || 'Application', 'category'),
        element('h3', app.nom)
      );
      const subtitle = app.nomPublic?.split(' · ').at(-1);
      if (subtitle && subtitle !== app.nom) card.append(element('p', subtitle, 'card-fonction'));
      card.append(
        element('p', app.accrochePublique || app.accroche || ''),
        element('span', data.statuts[maturity(app)]?.label || 'Statut à qualifier', 'status')
      );
      if (app.demo && window.KENTA_TERM) {
        const button = element('button', 'Essayer', 'btn catalog-essai');
        button.type = 'button';
        button.dataset.essai = app.demo;
        button.setAttribute('aria-label', 'Essayer ' + app.nom);
        card.append(button);
      }
      grid.append(card);
    }
    const plural = found.length > 1 ? 's' : '';
    count.textContent = found.length + ' application' + plural + ' affichée' + plural + ' sur ' + data.apps.length;
  }
  search.addEventListener('input', render);
  family.addEventListener('change', render);
  status.addEventListener('change', render);
  render();

  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-essai]');
    if (!button || !window.KENTA_TERM) return;
    window.KENTA_TERM.run(button.dataset.essai);
    document.getElementById('termOut').focus({ preventScroll: true });
    document.getElementById('terminal').scrollIntoView({ block: 'start' });
  });
}
document.addEventListener('DOMContentLoaded', catalog);
