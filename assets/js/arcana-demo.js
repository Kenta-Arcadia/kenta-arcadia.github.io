(function () {
  "use strict";

  const lang = (document.documentElement.lang || "fr").toLowerCase().startsWith("ja")
    ? "ja"
    : (document.documentElement.lang || "fr").toLowerCase().startsWith("en")
      ? "en"
      : "fr";

  const i18n = {
    fr: {
      missing: "Merci de renseigner au moins le prénom et la date de naissance.",
      seed: "Empreinte déterministe locale",
      day: "jour",
      dominant: "Intention dominante",
      freeTag: "intention-libre",
    },
    en: {
      missing: "Please provide at least first name and birth date.",
      seed: "Local deterministic fingerprint",
      day: "day",
      dominant: "Dominant intention",
      freeTag: "free-intention",
    },
    ja: {
      missing: "名と生年月日を入力してください。",
      seed: "ローカル決定論フィンガープリント",
      day: "day",
      dominant: "主要意図",
      freeTag: "自由意図",
    },
  }[lang];

  const form = document.getElementById("arcana-demo-form");
  if (!form) return;

  const placeholder = document.getElementById("result-placeholder");
  const view = document.getElementById("result-view");
  const outMainPhrase = document.getElementById("result-main-phrase");
  const outShortReading = document.getElementById("result-short-reading");
  const outElement = document.getElementById("result-element");
  const outMeridian = document.getElementById("result-meridian");
  const outDirection = document.getElementById("result-direction");
  const outSeed = document.getElementById("result-seed");
  const outTags = document.getElementById("result-tags");

  let citations = null;
  let rules = null;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const firstName = (document.getElementById("firstName").value || "").trim();
    const birthDate = (document.getElementById("birthDate").value || "").trim();
    const intention = (document.getElementById("intention").value || "").trim();

    if (!firstName || !birthDate) return renderError(i18n.missing);
    await ensureDataLoaded();

    const today = formatTodayLocal();
    const intentionKey = normalize(intention);
    const seed = hashString([firstName.toLowerCase(), birthDate, today, intentionKey].join("|"));

    const selectedElement = selectElement(seed, intentionKey);
    const selectedCitation = selectCitation(seed, selectedElement.id);
    const tags = detectIntentionTags(intentionKey);

    placeholder.hidden = true;
    view.hidden = false;
    outMainPhrase.textContent = `"${selectedCitation.text}" - ${selectedCitation.auteur}`;
    outShortReading.textContent = `${firstName}, ${selectedElement.lectureTemplate} ${i18n.dominant}: ${tags.join(", ")}.`;
    outElement.textContent = selectedElement.label;
    outMeridian.textContent = `${selectedElement.meridian} - ${selectedElement.energie}`;
    outDirection.textContent = selectedElement.direction;
    outSeed.textContent = `${i18n.seed}: ${seed} (${i18n.day} ${today})`;

    outTags.innerHTML = "";
    ["element:" + selectedElement.id].concat(tags.map(function (t) { return "intention:" + t; })).forEach(function (text) {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = text;
      outTags.appendChild(span);
    });
  });

  async function ensureDataLoaded() {
    if (!citations) {
      citations = await fetchJson(`/assets/data/${lang}/arcana-citations.json`)
        || await fetchJson(`/assets/data/fr/arcana-citations.json`);
    }
    if (!rules) {
      rules = await fetchJson(`/assets/data/${lang}/arcana-rules.json`)
        || await fetchJson(`/assets/data/fr/arcana-rules.json`);
    }
  }

  async function fetchJson(path) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  function selectElement(seed, intentionKey) {
    const elements = (rules && rules.elements) || [];
    let index = seed % elements.length;
    const hit = ((rules && rules.intentions) || []).find(function (entry) {
      return (entry.keywords || []).some(function (k) { return intentionKey.includes(normalize(k)); });
    });
    if (hit && hit.biasElement) {
      const biasIndex = elements.findIndex(function (el) { return el.id === hit.biasElement; });
      if (biasIndex >= 0) index = (index + biasIndex) % elements.length;
    }
    return elements[index];
  }

  function selectCitation(seed) {
    const list = (citations && citations.citations) || [];
    return list[seed % list.length];
  }

  function detectIntentionTags(intentionKey) {
    const tags = [];
    ((rules && rules.intentions) || []).forEach(function (entry) {
      if ((entry.keywords || []).some(function (k) { return intentionKey.includes(normalize(k)); }) && entry.tag) {
        tags.push(entry.tag);
      }
    });
    return tags.length ? tags.slice(0, 3) : [i18n.freeTag];
  }

  function renderError(message) {
    placeholder.hidden = false;
    view.hidden = true;
    placeholder.textContent = message;
  }

  function formatTodayLocal() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function normalize(value) {
    return (value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }
})();
