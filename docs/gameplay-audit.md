# FRUIZ — audit gameplay et deux améliorations

Projet examiné : `/Users/nixa001/Downloads/Projects/Fruiz`. Le chemin historique du Bureau ne contient plus les sources. Audit de la version présente, sans supposer que les anciens échanges décrivent son état.

## Constats avant modification

**Bugs ou lacunes établis par le code**

- Aucun système de joker, bouton de bonus ou état de bonus dans cette copie. Il s'agit d'une fonctionnalité attendue mais absente, pas d'un réglage d'un joker déjà opérationnel.
- `MergeManager.proximityScan` assimilait les silhouettes à leur cercle englobant. Des raisins séparés pouvaient fusionner. Une paire en attente n'était pas contrôlée à nouveau avant sa fusion. Les contacts de corps composés ne remontaient pas systématiquement au fruit parent.
- `GameScene.update` détruisait immédiatement les fruits retirés de Matter, pendant leur animation de compression. `spawnPop` animait leur position en concurrence avec Matter. L'impulsion appliquée directement à `body.velocity` ne suivait pas l'API de vitesse Verlet.
- Le délai de disparition d'un ancien `ComboPopup` pouvait détruire le popup suivant. La pause ne figeait ni les timers de fusion ni la fenêtre de combo basée sur l'horloge réelle.
- Une sauvegarde pendant une fusion pouvait omettre les deux parents avant la naissance du résultat. En chute, le fruit en main n'était avancé qu'à mi-parcours : une reprise pouvait donc en donner un exemplaire supplémentaire. Angles et vitesses étaient absents.
- Les gestes de lancer étaient armés sur toute la scène, sans exclusion des éléments d'interface ni identification du doigt.
- Les décors du Menu, de Game et l'aide révélaient des fruits jamais obtenus. Le chargement montrait une pastèque. La collection persistante n'était mise à jour qu'en fin de partie. La barre d'évolution n'était masquée qu'à son premier update.
- Les émetteurs de `ParticleManager` restent conservés jusqu'à la fermeture de Game : leur nombre augmente avec les effets d'une longue partie. Cela indique un coût potentiel croissant ; un ralentissement sur téléphone n'a pas été mesuré.

**Équilibrage observé, sans présumer d'un défaut**

- Tirage constant : tiers 1–4, poids 30/26/20/6, soit environ 36,6 % / 31,7 % / 24,4 % / 7,3 %. Les petits fruits restent disponibles toute la partie. Aucun palier caché n'aggrave le hasard.
- Rayons : 25, 29, 34, 40, 43, 48, 55, 61, 67, 74, 76, 82. À 720×1280, largeur de calebasse ≈515 et profondeur ≈257. Le diamètre de la pastèque vaut environ 32 % de la largeur, avant les différences de silhouette.
- La difficulté vient donc principalement de l'occupation, de la forme des fruits et des possibilités d'accès aux paires. Agrandir le bol ou modifier les poids sans observer de vraies parties pourrait supprimer le défi.
- Défaite : centre d'un fruit hors de l'ellipse sous le rebord, après 400 ms de grâce à la naissance. Le caractère trop sévère lors d'un rebond reste une hypothèse à tester.
- Musique MP3 déjà chargée via une instance globale réutilisée. Pas de duplication constatée pendant les transitions Chrome testées ; le comportement Android réel et la qualité audio ne sont pas prouvés par ce contrôle.

## Cinq propositions classées

| Priorité / nature | Problème et modification | Exemple / intérêt stratégique | Risque et coût estimé | Vérification |
|---|---|---|---|---|
| 1 — bugs + réglage, **implémentée** | Fiabiliser les contacts et conserver les animations ; séparer les fusions, prolonger le dernier combo, figer le jeu pendant la pause. | Deux raisins séparés attendent un vrai contact ; chaque résultat apparaît avant la fusion suivante. Le joueur comprend et anticipe ses chaînes. | Contact plus strict que l'ancien cercle indulgent ; coût modéré dans les managers existants. | Vrais lancers, silhouettes séparées, contacts composés, paire qui s'écarte, pause au milieu d'une fusion, stabilité du popup. Observer ensuite si des contacts semblent ratés aux joueurs. |
| 2 — fonctionnalité absente, **implémentée** | Joker manuel « ÉCHANGER » : permuter en main/suivant, une réserve maximum, une charge au départ, recharge après 8 fusions. Sauvegarder la charge et l'avancement. | Le joueur garde un citron pour plus tard et joue le jujube annoncé pour libérer une paire près du bord. Choix lisible, sans tirage supplémentaire ni fruit artificiellement puissant. | Peut rendre le début trop facile ; coût modéré, bouton + petit état dédié + sauvegarde. Aucun coût payé, aucune monnaie. | Aucun lancer via bouton ou multitouch, échange réciproque, refus sans consommation si mêmes tiers, recharge exactement au seuil, pause/menu/reprise. En partie, noter les échanges utiles et ceux regrettés. |
| 3 — hypothèse | Tester une très courte tolérance à l'éjection, avec avertissement local avant défaite. | Un bref débordement dû à une fusion ne termine pas forcément une bonne partie. Favorise une prise de risque compréhensible au rebord. | Peut sauver des piles réellement perdues ; coût faible à modéré. | Rejouer les mêmes situations proches du rebord ; comparer fausses défaites et durées. Ne pas modifier les collisions et la tolérance simultanément. |
| 4 — nouveauté possible | Un objectif de maîtrise facultatif par partie, fondé sur le niveau réel : petit combo, meilleur score personnel, palier de collection masqué. | Une tentative ratée au score peut réussir un objectif précis. Le joueur choisit entre sécurité et chaîne. | Risque de surcharger le HUD ; coût modéré. Aucun calendrier, série quotidienne ni punition. | Les joueurs peuvent-ils expliquer l'objectif et choisir de l'ignorer ? Mesurer réussite et envie déclarée de retenter. |
| 5 — performance | Libérer ou réutiliser les émetteurs de particules terminés ; mesurer les longues parties sur Android. | Les célébrations restent fluides après beaucoup de fusions. La stratégie reste jouable quand le bol est chargé. | Un nettoyage trop tôt peut couper un effet ; coût faible à modéré. | Compter les émetteurs et mesurer les durées de frame après une longue session, sur un appareil modeste. |

Choix : 1 et 2 donnent un bénéfice immédiat et vérifiable sans changer les règles de score, les rayons, les poids de tirage ou l'architecture. Les corrections de sauvegarde, d'input et de fruits masqués sont nécessaires à leur fonctionnement fiable et aux contraintes du jeu.

## Règles livrées

- Le bouton sous l'évolution échange uniquement le fruit en main et le suivant. Le joueur doit ensuite viser et relâcher normalement.
- Une charge au début d'une nouvelle partie. Après utilisation, huit fusions rechargent une seule charge. Les fusions comptent une par une, sans multiplication par le combo. Aucun stockage supplémentaire quand la réserve est pleine.
- Si les deux fruits sont identiques, la charge reste disponible. Pendant une chute, une pause, une naissance de fruit fusionné ou la fin de partie, l'activation est bloquée.
- Sauvegardes anciennes acceptées : le joker manquant reçoit son état initial ; angles/vitesses manquants valent zéro. Les nouveaux champs sont facultatifs, les clés existantes ne changent pas.
- Sauvegarde juste avant et après la naissance de fusion, pas pendant l'intervalle sans parents ni résultat. Un arrêt dans cet intervalle reprend les deux parents, avec le score d'avant la fusion.
- La file en main/suivant avance dès le lancer ; son affichage conserve la révélation à mi-chute. Angles et vitesses normalisées sont sauvegardés.
- La sortie d'application met la partie en pause et sauvegarde. Le retour nécessite « REPRENDRE ». La fenêtre de combo et les timers de fusion sont gelés par la pause.
- Les déblocages de collection sont persistés à la naissance réelle du fruit. Les décors et l'aide emploient des textures connues. Le chargement utilise un emblème wax neutre.

## Paramètres après quelques parties

Dans `src/data/GameplayBalance.ts` :

- `joker.startingCharges = 1` : une occasion d'apprendre l'échange dès le départ.
- `joker.mergesToRecharge = 8` : essayer 10–12 si l'échange sauve presque toujours la partie ; 6 si les joueurs ne rechargent presque jamais. Hypothèses à comparer, pas des résultats mesurés.
- `merge.squashMs = 150`, `revealMs = 360`, `chainRevealMs = 480` : compression puis temps donné au résultat, plus long en chaîne.
- `combo.windowMs = 1100`, `max = 8`, `popupHoldMs = 2400` : la fenêtre doit dépasser compression + révélation d'une chaîne, avec une marge pour les collisions.
- `drop.cooldownMs = 220` : la mi-chute impose aussi un verrou de lancer.

Ne changer qu'une famille de réglages à la fois. Sur quelques parties débutantes puis avancées, noter durée, meilleur tier, échanges utilisés/rechargés, cause de défaite et moments où un joueur ne comprend pas ce qui s'est passé. L'équilibrage et le plaisir nécessitent ces observations humaines.

## Vérifications reproductibles

Typecheck : `./node_modules/.bin/tsc --noEmit`.

Avec les dépendances déjà installées :

```
npm run dev -- --host 127.0.0.1 --port 5177
```

Puis, dans un autre terminal :

```
URL=http://127.0.0.1:5177 node scripts/gameplay-smoke.mjs
```

Le script utilise `puppeteer-core`, déjà présent dans le projet, et Chrome (`CHROME` permet d'en préciser le chemin). Il effectue des clics réels, deux lancers réels pour les jujubes et les raisins, puis des mises en place déterministes dans le vrai moteur Matter pour isoler les cas difficiles. Les fixtures ne sont pas accessibles dans le jeu livré. Les captures sont écrites sous `/tmp/fruiz-gameplay-checks` par défaut.

Les contrôles Chrome ne remplacent ni un APK sur téléphone, ni une mesure de fluidité sur Android, ni un test humain de rejouabilité. Aucun APK/AAB généré, aucune publication. Aucun changement de dépendances.


## Résultat de cette intervention

Typecheck réussi. Suite Chrome : 42 contrôles réussis, aucune erreur JavaScript. Écrans inspectés à 320×640, 360×800, 390×844 et 720×1280 ; le bouton est aussi repositionné en cas de changement de taille. Les passages en arrière-plan sont simulés par les événements navigateur : la suspension native de Capacitor reste à essayer sur téléphone. Le script historique `scripts/smoke.mjs` contient des coordonnées et des attentes de score anciennes ; la suite ciblée ajoutée ici ne repose pas sur celles-ci.

Limites restant à suivre : collecte de ressenti humain et mesures Android, croissance des émetteurs de particules ; le redimensionnement complet de tous les anciens composants du HUD et des corps physiques n'a pas été réécrit.

Fichiers modifiés ou ajoutés : `src/data/GameplayBalance.ts`, `src/systems/JokerManager.ts`, `src/ui/JokerButton.ts`, `src/scenes/GameScene.ts`, `src/systems/MergeManager.ts`, `src/systems/ComboManager.ts`, `src/ui/ComboPopup.ts`, `src/entities/Fruit.ts`, `src/effects/FruitEffects.ts`, `src/managers/SaveManager.ts`, `src/ui/NextFruitUI.ts`, `src/ui/EvolutionBar.ts`, `src/scenes/MenuScene.ts`, `src/scenes/PreloadScene.ts`, `scripts/gameplay-smoke.mjs` et ce document.
