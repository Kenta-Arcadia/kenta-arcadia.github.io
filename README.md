# KENTA — Vitrine du produit commercial

Sept pages réelles : `index.html`, `histoire.html`, `architecture.html`, `applications.html`, `experiences.html`, `atlas.html`, `contact.html`.

Le laboratoire est accessible sous `laboratoire.html` avec ses scripts et sa scène Canvas (`assets/data.js`, `assets/app.js`, `assets/terminal.js`) ; il n'a **aucun accès** à la machine privée de KENTA. Le catalogue des 48 applications est directement alimenté par le registre V3 fourni, aux maturités éditoriales non certifiées.

La charte utilise HTML/CSS/SVG natifs. DejaVu Math TeX Gyre est fournie localement avec sa licence dans `assets/fonts/`. Le terminal conserve ses caractères à chasse fixe.

Le logo PNG nettoyé (`assets/logo-net.png`) est un **candidat graphique** recalculé à partir de l'original fourni. L'original est sauvegardé dans `assets/logo-kenta-original.png`. Vérifier visuellement les détails avant publication.

Le contenu de l'histoire est éditorialisé à partir de `KENTA_Pitch_Architecture_Site_V2_2(3).md` et `Le Jardin Secret et ses Gardiens` fourni ; interprétations symboliques distinctes de preuves techniques. Toutes les capacités évoquées ne sont pas considérées opérationnelles sans preuve actuelle.

## Prévisualisation

Depuis le répertoire du site :

```bash
python3 -m http.server 8092 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8092/`. Ne pas ouvrir le terminal privé de KENTA depuis ce site public.

## Publication

Ne pas publier avant revue de sécurité, droit sur les ressources, mentions légales, validation des statuts et revue de l'identité graphique. Aucune modification de `/KENTA` ni de la version active de HAL n'a été effectuée par la production de cette archive.
