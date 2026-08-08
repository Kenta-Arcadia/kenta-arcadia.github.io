# Audit de provenance KENTA — Périmètre du dépôt `kenta-arcadia.github.io`

**Date de l'audit :** 08/08/2026  
**Dépôt observé :** `https://github.com/Kenta-Arcadia/kenta-arcadia.github.io`  
**Branche :** `master`  
**Commit HEAD :** `9cb3d1e` — *Ajout témoignage praticienne Arcana — citation intégrale*  
**Statut git au lancement :** working tree clean  
**Branche d'audit créée :** `audit/kenta-provenance-rag` (aucun changement sur `master`)

---

## 1. Gel de l'état initial

Le dépôt a été cloné, son état figé (URL, branche, commit HEAD, `git status`) avant tout inventaire. Aucun fichier n'a été modifié pendant l'audit.

---

## 2. Inventaire du dépôt

### 2.1 Structure complète

| Type | Nombre | Fichiers |
|------|--------|----------|
| HTML (pages) | 9 | `index.html`, `arcana.html`, `arcana-valdoie.html`, `bien-etre.html`, `contact.html`, `formation.html`, `industrie.html`, `legacy.html`, `postier-du-reel.html` |
| HTML (redirect) | 1 | `docs/pages/arcana.html` |
| JSON (config/data) | 9 | `config.json`, `assets/data/fr/arcana-citations.json`, `assets/data/en/arcana-citations.json`, `assets/data/ja/arcana-citations.json`, `assets/data/fr/arcana-rules.json`, `assets/data/en/arcana-rules.json`, `assets/data/ja/arcana-rules.json`, `assets/data/valdoie/fr.json`, `assets/data/valdoie/en.json` |
| JavaScript (client) | 2 | `assets/js/arcana-demo.js`, `assets/js/arcana-valdoie.js` |
| Other | 1 | `.nojekyll` |

**Aucun fichier Python, Shell, YAML exécutable, Dockerfile, requirements.txt, ou script de build n'est présent dans ce dépôt.**

### 2.2 Classification par rôle

| Catégorie | Fichiers | Rôle |
|-----------|----------|------|
| Présentation / marketing | `index.html`, `bien-etre.html`, `legacy.html`, `industrie.html`, `formation.html`, `postier-du-reel.html`, `contact.html` | Pages statiques HTML/CSS/JS décrivant KENTA et ses marchés. Ne contiennent aucun code KENTA exécuté côté serveur. |
| Application client Arcana | `assets/js/arcana-demo.js` + données JSON (`arcana-citations.json`, `arcana-rules.json`) | Calcul déterministe local : hash FNV-1a → sélection élément (5 éléments) et citation (6 citations). Ne dépend d'aucun LLM. |
| Portail API KENTA | `assets/js/arcana-valdoie.js` + `config.json` | Fait un `fetch POST` vers `/api/revelation` d'un serveur HAL distant (`arcana_url` dans `config.json`). C'est le seul lien avec du code KENTA runtime (hors-dépôt). |
| Redirection | `docs/pages/arcana.html` | Simple redirect vers la URL publique. |

---

## 3. Recherche ciblée de mots-clés

### 3.1 Résultats par mot-clé

| Mot-clé | Présence dans le dépôt | Détail |
|---------|----------------------|--------|
| **Qwen** | Déclaré par l'auteur | Aucune mention textuelle dans le dépôt. Qwen 2.5 est le LLM produit par la réponse linguistique (déclaré par l'auteur, non vérifiable depuis ce repo). |
| **Ollama** | Déclaré par l'auteur | Aucunement mentionné. Runtime du modèle (déclaré par l'auteur, non vérifiable depuis ce repo). |
| **OpenWebUI** | Déclaré par l'auteur | Aucunement mentionné. N'intervient pas dans le run observé (déclaré par l'auteur, non vérifiable depuis ce repo). |
| **RAG / retrieval / embedding / vector / chunk / rerank** | Non prouvé dans ce dépôt | Aucun de ces termes n'apparaît. le retrieval, s'il existe dans cette chaîne, est hors périmètre de ce dépôt. |
| **LLM / model / inference / context / token** | Absent (hors HTML standard) | `window` et `context` présents en tant que noms HTML standards (`<meta name="robots">`, `window.location`). Aucun lien avec le traitement LLM. |
| **prompt** | CSS/HTML | `.cmd-block .prompt` — classe CSS pour affichage terminal dans les pages (ex: blocs de commande). Pas un prompt LLM. |
| **API** | Prétendu / client | `/api/revelation` dans `arcana-valdoie.js` et mentionné dans `bien-etre.html`. Le client API est prouvé, le serveur non audité. |
| **agent / agents spécialisés** | Déclaré par l'auteur | Mentionnés dans la meta description (`index.html`) et les logs HTML. 12+ noms narratifs (Hinata, Kabuto, Minato, Procyon, Iruka, Sakura, Creig, Jiraiya, Nono, Concerto). Aucun n'est implémenté en code ici. |
| **memory / mémoire** | Déclaré par l'auteur | Mentionné dans `index.html` ("mémoire interne"), `legacy.html` ("Mémoire cumulative", "Iruka cristallise"). Texte descriptif, pas d'implémentation de persistance dans ce dépôt. |
| **Procyon** | Déclaré par l'auteur | Mentionné dans les extraits statiques non vérifiables ici comme traces runtime de `index.html` (`pipeline influx/ -> Procyon`). Composant du pipeline côté serveur (déclaré par l'auteur, non vérifiable depuis ce repo). |
| **Kabuto** | Déclaré par l'auteur | Mentionné dans les logs de `legacy.html`, `industrie.html`, `index.html`. Capable d'audit et diagnostic (déclaré par l'auteur, non vérifiable depuis ce repo). |
| **ToileCollective** | Déclaré par l'auteur | Mentionné dans les logs de `index.html` et `formation.html`. Message bus / orchestration (déclaré par l'auteur, non vérifiable depuis ce repo). |

---

## 4. Audit du chemin RAG

```
document          → NON PROUVÉ DANS CE DÉPÔT   (aucun document à ingérer)
  ↓
extraction        → NON PROUVÉ DANS CE DÉPÔT   (aucun script d'extraction)
  ↓
découpage         → NON PROUVÉ DANS CE DÉPÔT   (aucun chunker)
  ↓
indexation        → NON PROUVÉ DANS CE DÉPÔT   (aucun vectordb, aucun embedding)
  ↓
retrieval         → CLIENT PROUVÉ / SERVEUR NON AUDITÉ  (arcana-valdoie.js fait un POST vers /api/revelation)
  ↓
résultats récupérés → CLIENT PROUVÉ / SERVEUR NON AUDITÉ  (réponse JSON reçue par le client, structure inconnue côté serveur)
  ↓
construction du prompt → NON PROUVÉ DANS CE DÉPÔT   (hors-dépôt, côté HAL/OpenWebUI)
  ↓
Qwen 2.5          → DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO   (LLM produisant la réponse linguistique)
  ↓
Ollama            → DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO   (runtime du modèle)
```

**Verdict RAG :** Le dépôt ne contient aucun evidence d'un pipeline RAG complet. Le seul lien observable est le client `arcana-valdoie.js` qui appelle `/api/revelation`. Le serveur HAL (configuré via `config.json.arcana_url`) est observable côté client, mais ces composants sont hors périmètre et non vérifiables depuis ce dépôt.

---

## 5. Tableau de provenance des capacités

Pour chaque affirmation importante présente dans le dépôt :

| Affirmation | Composant | Preuve dans le dépôt | Statut |
|-------------|-----------|---------------------|--------|
| "mémoire interne" | KENTA (Iruka) | Texte descriptif dans `legacy.html`, `bien-etre.html` | **HORS DÉPÔT** |
| "agents spécialisés" (12+ noms) | KENTA orchestrator | Logs HTML statiques (`index.html`, `legacy.html`, `industrie.html`, `formation.html`) | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** |
| "API live /api/revelation" | HAL serveur distant | `arcana-valdoie.js` fait un `fetch POST` vers ce endpoint | **CLIENT PROUVÉ / SERVEUR NON AUDITÉ** |
| "RAG / embeddings / retrieval" | KENTA pipeline | Aucun evidence textuel ou code | **NON PROUVÉ DANS CE DÉPÔT** |
| "Qwen 2.5" comme LLM | Modèle de langage | Non mentionné dans le dépôt | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** |
| "Ollama" comme runtime | Runtime | Non mentionné dans le dépôt | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** |
| "OpenWebUI" comme interface | Interface | Non mentionné dans le dépôt | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** |
| "SHA-256 signé par Minato" | Signature | Mentionné dans les logs de presque toutes les pages | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** (Minato est un nom narratif, pas implémenté en JS ici) |
| "Arcana calcule un profil symbolique local" | `arcana-demo.js` | Hash FNV-1a → sélection élément/citation depuis JSON local | **PROUVÉ** |
| "PyYAML seule dépendance pip" | Build/runtime | Mentionné dans `formation.html` | **HORS DÉPÔT** (pas de `requirements.txt` ou équivalent) |
| "100% offline" | Architecture | `arcana-demo.js` fonctionne offline ✅ — `arcana-valdoie.js` appelle un serveur distant ❌ | **PARTIEL** |
| "KENTA apprend / fait du lien" | KENTA learning | Témoignage praticien dans `index.html` ("il apprend, il fait du lien") | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** (description par l'utilisateur) |
| "NO-DEF comme discipline" | Validation architecture | Mentionné dans `formation.html`, `legacy.html` | **HORS DÉPÔT** (aucun validateur Jiraiya dans ce dépôt) |
| "ADN déclaratif YAML" | Configuration | Mentionné dans `formation.html`, `industrie.html` | **HORS DÉPÔT** (aucun fichier YAML de configuration dans ce dépôt) |

---

## 6. Test anti-simulation narrative

### 6.1 Énoncé du test

> « Si je remplace Qwen 2.5 par un modèle qui refuse complètement de jouer le rôle de KENTA et ne décrit que les appels effectivement observés, quelles capacités de KENTA restent visibles ? »

### 6.2 Résultat — sortie d'un LLM neutre sur ce dépôt

> "Le site `kenta-arcadia.github.io` est un site statique GitHub Pages. Il contient 10 pages HTML, 2 scripts JavaScript côté client, et 9 fichiers JSON de données. Le seul appel API externe observable est un `fetch POST` vers `/api/revelation` depuis `assets/js/arcana-valdoie.js`, utilisant l'URL configurée dans `config.json`. Le calcul Arcana (`assets/js/arcana-demo.js`) est un hash FNV-1a déterministe qui sélectionne une citation et un élément parmi des listes JSON locales."

### 6.3 Capacités visibles depuis le dépôt uniquement

| Capacité | Statut |
|----------|--------|
| Calcul symbolique local (Arcana demo) — hash → citation | **PROUVÉ** |
| Appel API `/api/revelation` (client side) | **CLIENT PROUVÉ / SERVEUR NON AUDITÉ** |
| RAG, embeddings, retrieval | **NON PROUVÉ DANS CE DÉPÔT** |
| Agents spécialisés (Hinata, Kabuto, Minato…) | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** |
| Mémoire cumulative (Iruka) | **HORS DÉPÔT** |
| Signature Minato SHA-256 | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** |

### 6.4 Constat

Le dépôt décrit un organisme complet (12+ agents, RAG, apprentissage, signature) mais ne contient que du HTML statique + un calcul symbolique local déterministe + un client API. L'implémentation runtime correspondant à ces capacités n'est pas présente dans ce dépôt. Un client vers un serveur HAL est observable, mais l'architecture serveur complète n'est pas auditable ici.

---

## 7. Clarification fournie par l'auteur (Jean)

Jean a fourni la clarification suivante sur le run observé :

> « Ce run ne démontre pas de retrieval autonome ; OpenWebUI n'intervient pas dans ce run ; Qwen 2.5 produit la réponse linguistique ; Ollama est le runtime ; KENTA orchestre, borne, trace et produit le YAML final. »

**Intégration à l'audit :**

| Élément | Statut depuis ce repo |
|---------|----------------------|
| Pas de retrieval autonome dans ce run | **NON PROUVÉ DANS CE DÉPÔT** (cohérent avec l'absence de pipeline RAG) |
| OpenWebUI n'intervient pas | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** (non mentionné dans le dépôt) |
| Qwen 2.5 produit la réponse linguistique | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** (non mentionné dans le dépôt) |
| Ollama est le runtime | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** (non mentionné dans le dépôt) |
| KENTA orchestre, borne, trace, produit YAML final | **DÉCLARÉ PAR L'AUTEUR / NON VÉRIFIABLE DEPUIS CE REPO** (le client `arcana-valdoie.js` reçoit un JSON, pas un YAML) |

---

## 8. Template de provenance des sorties (recommandé)

Pour chaque rapport futur, il est recommandé d'exposer la provenance sous cette forme :

```yaml
orchestrateur: kenta (HAL serveur)
retrieval: openwebui | kenta | none
llm: qwen2.5
runtime: ollama
documents_retrieved: [...]
tools_called: [...]
kenta_actions: [...]
```

Cela permet au lecteur de distinguer brutalement **l'organisme logiciel** (ce qui est exécuté) de **l'histoire racontée par le modèle** (ce qui est décrit).

---

## 9. Patch minimal — Transparence

Aucun changement logiciel n'est requis dans ce dépôt, car le code runtime KENTA n'y est pas présent. Le patch consiste en :

- **`AUDIT_PROVENANCE.md`** (ce fichier) — rapport complet de provenance
- Branches `master` inchangée
- Aucun merge, aucune PR — validation humaine requise avant intégration

---

## 10. Commit

```
audit: expose component provenance and RAG boundaries
```

---

*Audit réalisé le 08/08/2026 —分支 audit/kenta-provenance-rag — master inchangé*
