# MERGE FRUITS SÉNÉGAL 🍉

Jeu mobile casual de fusion de fruits (style Watermelon Game), avec des fruits-personnages
expressifs inspirés de l'esprit de Ball Guys, et une identité sénégalaise :

**Gigibier → Soump → Ditakh → Goyave → Tol → Bouye → Kola → Coco → New → Karité → Pastèque**

Les fruits tombent dans une **calebasse** : col resserré, ventre large, rebord épais.
Un fruit qui **déborde au-dessus du rebord** plus d'une seconde → game over.
(La ligne clignotante sur le rebord prévient : orange = danger, rouge = critique.)

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir `http://localhost:5175` (port configuré dans `vite.config.ts`).

## Compiler

```bash
npm run build
```

Le build vérifie TypeScript en strict (`tsc --noEmit`) puis produit `dist/`.

## Tests

```bash
# serveur dev lancé, puis :
node scripts/smoke.mjs
```

Test de fumée headless (Chrome) : démarrage, navigation, physique, fusions en chaîne,
combo, score, danger line, game over, persistance localStorage et panneaux du menu.
Nécessite Google Chrome installé dans `/Applications`.

## Export mobile (Capacitor)

```bash
npm run build
npm install @capacitor/core @capacitor/cli
npx cap init "Merge Fruits Sénégal" sn.merge.fruits --web-dir=dist
npx cap add android
npx cap add ios
npx cap open android
```

Le jeu est prêt pour mobile : portrait, `base: './'`, safe areas, zéro asset externe,
zéro scroll, audio WebAudio débloqué au premier geste.

## Architecture

```
src/
├── main.ts               — configuration Phaser (Matter, RESIZE, 60 FPS)
├── scenes/               — Boot, Preload (textures procédurales), Menu, Game, GameOver
├── entities/
│   ├── Fruit.ts          — personnage : corps Matter + visage (sync affichage/physique)
│   ├── FruitRenderer.ts  — rendu procédural des 12 fruits (remplaçable par des sprites)
│   └── FaceController.ts — expressions, yeux, bouche, clignements, regard
├── systems/              — MergeManager (fusions + chaînes), ScoreManager,
│                           ComboManager (fenêtre 0,8 s, ×8), DangerManager (3 états)
├── managers/             — AudioManager (synthèse WebAudio), SaveManager (localStorage),
│                           ParticleManager (emitters poolés)
├── effects/              — FruitEffects (squash & stretch), ScreenEffects (shake, flash)
├── ui/                   — ScoreUI, NextFruitUI, ComboPopup, DangerLine, UIHelpers
├── data/                 — FruitData (12 fruits, fusion générique : ajouter un fruit = 1 ligne)
└── types/                — GameTypes (FruitDefinition, FruitExpression, ...)
```

### Ajouter un fruit

1. Ajouter une ligne dans `src/data/FruitData.ts` (id, nom, rayon, couleurs, score, forme, poids).
2. Le rendu, la fusion, le score et le menu FRUITS s'adaptent automatiquement.

### Remplacer les graphiques procéduraux par de vrais sprites

Charger dans `PreloadScene` une texture nommée `fruit_<id>` (PNG/WebP) : `FruitRenderer`
saute automatiquement la génération procédurale de ce fruit. Aucune logique de gameplay à modifier.
