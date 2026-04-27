/**
 * Valdoie : appelle l’API KENTA /api/revelation.
 * N’affiche que les champs présents dans la réponse (pas de simulation).
 */
(function () {
  "use strict";

  const form = document.getElementById("valdoie-form");
  const outRoot = document.getElementById("valdoie-output");
  const errBox = document.getElementById("valdoie-error");
  const btnSubmit = document.getElementById("submit-btn");

  if (!form || !outRoot) return;

  let arcanaBase = "";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Cherche config.json à plusieurs endroits selon le déploiement :
   * - même dossier que la page (ex. /pages/config.json si page /pages/arcana-valdoie.html)
   * - racine du site (/config.json)
   * - dossier pages à la racine (/pages/config.json) si la page est à la racine
   * data-config-base optionnel : dossier absolu ou relatif pointant vers un répertoire contenant config.json
   */
  function resolveConfigUrls() {
    const override =
      document.body.getAttribute("data-config-base") ||
      document.documentElement.getAttribute("data-config-base") ||
      "";
    if (override) {
      const base = override.replace(/\/?$/, "/");
      return [base + "config.json"];
    }
    const origin = window.location.origin;
    const href = window.location.href;
    const candidates = [
      new URL("config.json", href).href,
      origin + "/config.json",
      origin + "/pages/config.json",
    ];
    return candidates.filter(function (u, i, arr) {
      return arr.indexOf(u) === i;
    });
  }

  async function loadConfig() {
    const urls = resolveConfigUrls();
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const cfg = await res.json();
        if (typeof cfg.arcana_url === "string" && cfg.arcana_url.trim()) {
          return cfg.arcana_url.replace(/\/?$/, "");
        }
      } catch (_) {}
    }
    return "";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (errBox) errBox.hidden = true;
    outRoot.hidden = true;
    outRoot.innerHTML = "";

    const prenom = (document.getElementById("firstName").value || "").trim();
    const nom = (document.getElementById("lastName").value || "").trim();
    const date_naissance = (document.getElementById("birthDate").value || "").trim();
    const intentionEl = document.getElementById("intention");
    const intention = intentionEl ? (intentionEl.value || "").trim() : "";

    if (!prenom || !date_naissance) return;

    if (!arcanaBase) arcanaBase = (await loadConfig()) || "";
    if (!arcanaBase) {
      if (errBox) {
        errBox.textContent = "Configuration absente : définitions arcana_url dans config.json.";
        errBox.hidden = false;
      }
      return;
    }

    const apiUrl = arcanaBase + "/api/revelation";
    const payload = { prenom, nom, date_naissance, intention };

    const prevLabel = btnSubmit ? btnSubmit.textContent : "";
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "…";
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("http_" + response.status);
      }

      const rev = await response.json();
      renderRevelation(rev);
      outRoot.hidden = false;
    } catch (_) {
      if (errBox) {
        errBox.textContent = "KENTA est en veille.";
        errBox.hidden = false;
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = prevLabel || "Générer mon parcours";
      }
    }
  });

  function renderRevelation(rev) {
    const parts = [];

    const salutName = escapeHtml(rev.prenom || "");
    if (salutName) {
      parts.push('<p class="valdoie-salut">' + salutName + "</p>");
    }

    if (rev.phrase_astro) {
      parts.push('<div class="valdoie-block"><p class="valdoie-label">Phrase astro</p><p class="valdoie-main">' + escapeHtml(rev.phrase_astro) + "</p></div>");
    }
    if (rev.phrase_nombre) {
      parts.push('<div class="valdoie-block"><p class="valdoie-label">Nombre</p><p class="valdoie-main">' + escapeHtml(rev.phrase_nombre) + "</p></div>");
    }

    const phrases = Array.isArray(rev.phrases) ? rev.phrases : [];
    if (phrases.length > 0) {
      parts.push('<div class="valdoie-block"><p class="valdoie-label">Phrase principale</p><p class="valdoie-lead">' + escapeHtml(phrases[0]) + "</p>");
      if (phrases.length > 1) {
        parts.push('<p class="valdoie-label">Autres phrases</p><ul class="valdoie-list">');
        for (let i = 1; i < phrases.length; i++) {
          parts.push("<li>" + escapeHtml(phrases[i]) + "</li>");
        }
        parts.push("</ul>");
      }
      parts.push("</div>");
    }

    const citations = Array.isArray(rev.citations) ? rev.citations : [];
    if (citations.length > 0) {
      parts.push('<div class="valdoie-block"><p class="valdoie-label">Citations</p><ul class="valdoie-citations">');
      citations.forEach(function (c) {
        if (!c || typeof c !== "object") return;
        const texte =
          c.citation ||
          c.texte ||
          (typeof c === "string" ? c : "");
        if (!texte) return;
        const src = c.source ? " — " + escapeHtml(c.source) : "";
        const perso = c.personnage ? '<span class="valdoie-meta">' + escapeHtml(c.personnage) + "</span>" : "";
        parts.push(
          '<li><blockquote>« ' +
            escapeHtml(texte) +
            ' »' +
            src +
            "</blockquote>" +
            perso +
            "</li>"
        );
      });
      parts.push("</ul></div>");
    }

    const tensions = Array.isArray(rev.tensions) ? rev.tensions : [];
    if (tensions.length > 0) {
      parts.push('<div class="valdoie-block"><p class="valdoie-label">Tensions</p><ul class="valdoie-list">');
      tensions.forEach(function (t) {
        parts.push("<li>" + escapeHtml(t) + "</li>");
      });
      parts.push("</ul></div>");
    }

    const aty = rev.atypique;
    if (aty && aty.est_atypique === true) {
      parts.push('<div class="valdoie-block valdoie-atypique"><p class="valdoie-label">Atypique</p>');
      if (typeof aty.score === "number") {
        parts.push("<p>Score : " + escapeHtml(String(aty.score)) + "</p>");
      }
      const signaux = Array.isArray(aty.signaux) ? aty.signaux : [];
      if (signaux.length > 0) {
        parts.push("<ul class=\"valdoie-list\">");
        signaux.forEach(function (s) {
          parts.push("<li>" + escapeHtml(s) + "</li>");
        });
        parts.push("</ul>");
      }
      parts.push("</div>");
    }

    outRoot.innerHTML = parts.join("") || '<p class="valdoie-muted">Réponse vide.</p>';
  }

  loadConfig().then(function (u) {
    arcanaBase = u || "";
  });
})();
