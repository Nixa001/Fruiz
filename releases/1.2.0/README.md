# Fruiz 1.2.0 — Joker et fusions améliorées

Nom de la release à saisir : **1.2.0 — Joker et fusions améliorées**

- Application : `com.fruiz.game`
- Version visible : `1.2.0`
- Code Android : `4` (succède au code `3` présent dans le projet)
- Android minimum : API 24 ; cible : API 36
- Google Play : `fruiz-1.2.0-4.aab`
- Installation manuelle de test : `fruiz-1.2.0-4.apk`
- Notes prêtes à coller : `notes-fr-FR.txt`

## Description de cette mise à jour

Cette version ajoute le joker ÉCHANGER : le joueur choisit de permuter le fruit en main et le suivant. Une charge est disponible au départ et se recharge après huit fusions. Les fusions, combos, commandes tactiles et reprises de partie ont été améliorés. L'écran de fin est simplifié : Classement et Partager occupent deux colonnes et Menu principal reste l'unique retour au menu. Les animations des icônes respectent leur taille.

Les boutons Classement et Partager conservent leur message de disponibilité future ; aucun classement en ligne ni partage natif n'est annoncé dans les notes publiques.

## Dépôt dans Google Play Console

1. Créer une release dans la piste de test ou de production souhaitée.
2. Importer l'AAB, puis renseigner le nom de release ci-dessus.
3. Coller le contenu de `notes-fr-FR.txt` dans les notes de version françaises.
4. Vérifier les résultats du traitement Google Play et tester la mise à jour depuis la version précédente avant diffusion.

Le code 4 est choisi d'après le projet local ; les codes déjà utilisés sur Google Play ne sont pas consultables depuis cette compilation. La signature réutilise la clé de téléversement existante. Aucun fichier n'est envoyé à Google Play par cette préparation.

## Vérifications effectuées

- Build TypeScript/Vite et synchronisation Capacitor réussis.
- `assembleRelease`, `bundleRelease` et contrôle Android `lintVitalRelease` réussis.
- Signature APK vérifiée ; signature AAB vérifiée, même certificat de téléversement.
- Structure AAB validée par bundletool ; les deux manifestes confirment `com.fruiz.game`, version `1.2.0`, code `4`, sans mode debug.
- Les 35 fichiers web embarqués dans chacun des deux livrables correspondent exactement au build courant.
- Empreintes des fichiers dans `SHA256SUMS.txt` ; informations de compilation dans `build-info.json`.

Les avertissements Vite sur la taille de Phaser et Gradle sur des API dépréciées n'ont pas bloqué la compilation. L'outil Java signale le certificat auto-signé, l'absence d'horodatage et des avertissements de lecture séquentielle du ZIP ; la vérification de signature JAR et la validation bundletool réussissent. Cette compilation n'inclut pas un essai natif sur téléphone ni l'acceptation par Google Play.
