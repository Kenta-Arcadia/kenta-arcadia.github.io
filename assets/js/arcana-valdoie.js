(function () {
  "use strict";

  const lang = document.documentElement.lang === "ja"
    ? "ja"
    : document.documentElement.lang === "en"
      ? "en"
      : "fr";

  const form = document.getElementById("valdoie-form");
  if (!form) return;

  const outRoot = document.getElementById("valdoie-output");
  const outSteps = document.getElementById("valdoie-steps");
  const outSummary = document.getElementById("valdoie-summary");
  const outMeta = document.getElementById("valdoie-meta");

  let data = null;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstName = (document.getElementById("firstName").value || "").trim();
    const lastName = (document.getElementById("lastName").value || "").trim();
    const birthDate = (document.getElementById("birthDate").value || "").trim();
    const intention = (document.getElementById("intention").value || "").trim();

    if (!firstName || !birthDate) return;
    data = data || await loadData();
    if (!data) return;

    const today = new Date();
    const isoDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const seed = hash(`${firstName}|${lastName}|${birthDate}|${normalize(intention)}|${isoDay}`);
    const lifePath = numerologyLifePath(birthDate);
    const expression = numerologyExpression(`${firstName} ${lastName}`);
    const enneatype = ((lifePath + expression + (seed % 9)) % 9) + 1;
    const enne = data.enneagram.types.find(function (t) { return t.id === enneatype; });
    const element = data.elements[(seed + lifePath + expression) % data.elements.length];

    const opening = data.narration.opening[seed % data.narration.opening.length];
    const closing = data.narration.closing[(seed + 1) % data.narration.closing.length];

    const steps = [
      { title: data.ui.stepLabels[0], body: `${opening}` },
      { title: data.ui.stepLabels[1], body: `Life path: ${lifePath} · Expression: ${expression}` },
      { title: data.ui.stepLabels[2], body: `${enne.nom} — focus: ${enne.focus}. Vigilance: ${enne.vigilance}.` },
      { title: data.ui.stepLabels[3], body: `${element.label} · ${element.axe} · ${element.meridien}` },
      { title: data.ui.stepLabels[4], body: `${enne.cle}` },
      { title: data.ui.stepLabels[5], body: `${element.direction}` },
      { title: data.ui.stepLabels[6], body: `${closing}` }
    ];

    outSteps.innerHTML = "";
    steps.forEach(function (step, idx) {
      const row = document.createElement("div");
      row.className = "step";
      row.innerHTML = `<h3>${idx + 1}. ${escapeHtml(step.title)}</h3><p>${escapeHtml(step.body)}</p>`;
      outSteps.appendChild(row);
    });

    outSummary.textContent = `${firstName}, ${closing}`;
    outMeta.textContent = `${data.ui.privacy} · seed:${seed} · day:${isoDay}`;
    outRoot.hidden = false;
  });

  async function loadData() {
    try {
      const res = await fetch(`/assets/data/valdoie/${lang}.json`, { cache: "no-store" });
      if (!res.ok) return null;
      const d = await res.json();
      applyI18n(d);
      return d;
    } catch (_) {
      return null;
    }
  }

  function applyI18n(d) {
    const t = d.ui;
    document.getElementById("page-title").textContent = t.title;
    document.getElementById("page-subtitle").textContent = t.subtitle;
    document.getElementById("submit-btn").textContent = t.submit;
    document.getElementById("privacy-note").textContent = t.privacy;
  }

  function numerologyLifePath(dateStr) {
    const digits = (dateStr || "").replace(/\D/g, "").split("").map(Number);
    return reduceToCore(digits.reduce((a, b) => a + b, 0));
  }

  function numerologyExpression(name) {
    const letters = normalize(name).replace(/[^a-z]/g, "");
    const sum = letters.split("").reduce((acc, c) => acc + ((c.charCodeAt(0) - 96) % 9 || 9), 0);
    return reduceToCore(sum);
  }

  function reduceToCore(n) {
    let v = n;
    while (v > 9 && v !== 11 && v !== 22 && v !== 33) {
      v = String(v).split("").map(Number).reduce((a, b) => a + b, 0);
    }
    return v;
  }

  function normalize(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function escapeHtml(v) {
    return String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
