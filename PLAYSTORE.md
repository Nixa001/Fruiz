# Publication Play Store — Fruiz

Guide complet pour publier Fruiz sur Google Play Store.

## Prérequis

- Compte Google Play Console créé et validé
- AAB signé : `android/app/build/outputs/bundle/release/app-release.aab`
- Keystore upload sauvegardé : `~/Android/fruiz-upload.keystore` + mot de passe dans `~/Android/fruiz-keystore-backup.txt`
  (copies dans `~/Documents/fruiz-playstore/` — **ne jamais perdre ces fichiers**)

## 1. Créer l'application

1. Aller sur [play.google.com/console](https://play.google.com/console)
2. **Créer une application**
3. Nom : `Fruiz`
4. Langue par défaut : Français
5. App ou jeu : Jeu
6. Gratuit
7. Accepter les déclarations

## 2. Vérifications obligatoires

Panneau de gauche **Tableau de bord** :

- Vérifier l'identité (carte d'identité)
- Payer les frais d'inscription (25 $)
- Le tableau de bord liste les tâches restantes avec coches vertes

## 3. Fiche Play Store

Menu **Croissance** → **Fiche Play Store** :

- Nom, description courte et complète
- Icône : `~/Downloads/fruiz_asset/playstore/icon_512.png`
- Feature graphic : `~/Downloads/fruiz_asset/playstore/feature_1024x500.png`
- Captures d'écran : 2 minimum, format portrait 1080×1920
- Catégorie : Casual, Puzzle

## 4. Configuration de l'application

Menu **Configuration de l'app** :

- **Accès à l'application** : « Toutes les fonctionnalités sont disponibles » (pas de connexion requise)
- **Annonces** : « Ne contient pas d'annonces »
- **Classification du contenu** : questionnaire (tout public)
- **Public cible** : 13+ (évite la politique Families) ou enfants (règles Families, le jeu est conforme : pas de pubs, pas de trackers)
- **Data safety** : « Aucune donnée collectée ni partagée » (vrai : le jeu est 100 % hors ligne, localStorage uniquement)
- **Politique de confidentialité** : URL `https://<projet>.vercel.app/privacy.html`
  (remplacer l'e-mail placeholder dans `public/privacy.html` avant)

## 5. Uploader le AAB

Menu **Tests** → **Tests internes** :

1. Créer une version
2. **Importer l'App Bundle** → `android/app/build/outputs/bundle/release/app-release.aab`
3. Laisser **Play App Signing activé** (Google garde la clé de publication ; la clé upload ne sert qu'aux uploads)
4. Nom de version : `1.0 (1)`
5. Publier → lien de test reçu par e-mail

## 6. Parcours de tests

Dans l'ordre :

1. **Tests internes** : toi + amis, installation immédiate via lien
2. **Tests fermés** : ~12 testeurs minimum, 14 jours continus (exigence Google pour les comptes personnels)
3. **Production** : accessible une fois le quota validé

## 7. Release production

Menu **Production** :

1. Créer une version
2. Importer le même AAB
3. Remplir les notes de version
4. Lancer la publication

## Build d'une nouvelle version

```bash
npm run build
npx cap sync
cd android && ANDROID_HOME=~/Android/sdk ./gradlew bundleRelease
```

Penser à incrémenter `versionCode` et `versionName` dans `android/app/build.gradle` à chaque mise à jour.

## Notes techniques

- **Package id** : `com.fruiz.game` (immutable une fois publié)
- **Jeu 100 % hors ligne** : fruits procéduraux, musique et police embarquées, aucune requête réseau
- **Orientation** : portrait verrouillé (AndroidManifest)
- **Icônes launcher** : générées depuis `logo_sur_play_store.png` (mipmap-*)
