# Publier Banque Tycoon sur itch.io et Newgrounds

Ces deux sites publient les jeux **sans sélection à l'entrée** : le jeu est en ligne dès que tu l'envoies.
C'est idéal pour avoir de vrais joueurs et leurs avis avant de retenter CrazyGames.

Les fichiers de ce dossier `itch/` :

| Fichier | À quoi il sert |
|---|---|
| `banque-tycoon-itch.zip` | Le jeu à envoyer (sans le kit CrazyGames) |
| `cover-itch-630x500.png` | L'image de couverture pour itch.io |
| `screenshot-960x540.png` | Une capture d'écran pour la page du jeu |
| `icon-newgrounds-140x140.png` | L'icône pour Newgrounds |

Les vidéos du dossier `crazygames/` peuvent aussi servir (itch.io accepte une vidéo YouTube, pas un fichier).

Pour refaire les zips après une modification du jeu : `python tools/build_crazygames.py`

---

## itch.io

1. Crée un compte gratuit sur **https://itch.io** (bouton « Register »).
2. En haut à droite, ouvre le menu et clique **« Upload new project »**.
3. Remplis :
   - **Title** : `Banque Tycoon`
   - **Project URL** : `banque-tycoon`
   - **Short description or tagline** : `Build your own bank, from a tiny branch to an interplanetary empire!`
   - **Classification** : `Games`
   - **Kind of project** : **`HTML`** (important : c'est ce qui le rend jouable dans le navigateur)
   - **Release status** : `In development` (on améliore encore le jeu)
   - **Pricing** : `No payments` (ou `$0 or donate` si tu veux accepter des dons)
4. **Uploads** : envoie `banque-tycoon-itch.zip`, puis coche **« This file will be played in the browser »**.
5. **Embed options** :
   - Viewport dimensions : **1280 × 720**
   - Coche **« Mobile friendly »** et **« Fullscreen button »**
   - Laisse « Automatically start on page load » décoché
6. **Description** : colle le texte anglais plus bas.
7. **Genre** : `Simulation`. **Tags** : `tycoon, management, idle, economy, business, simulation, strategy, casual`.
8. **Cover image** : `cover-itch-630x500.png`. **Screenshots** : `screenshot-960x540.png` (et des captures de ton choix).
9. **Visibility & access** : d'abord **Draft** pour tester la page, puis **Public** quand tout est bon. Clique **Save & view page**.

## Newgrounds

1. Crée un compte gratuit sur **https://www.newgrounds.com**.
2. Va sur **https://www.newgrounds.com/projects/games** puis **« Create a new project »** (type Game).
3. Envoie `banque-tycoon-itch.zip` comme fichier **HTML5**, avec la taille **1280 × 720**.
4. Icône : `icon-newgrounds-140x140.png`.
5. Titre, description et tags : les mêmes que pour itch.io (texte plus bas).
6. Classement d'âge : **E (Everyone)** ou **T (Teen)** si on te demande (il y a des blagues sur la mafia et des braqueurs, sans violence).
7. Soumets. Le jeu passe d'abord dans le « Game Portal » où les joueurs le notent.

---

## Le texte à coller (en anglais)

**Short description**
```
Build your own bank, from a tiny branch to an interplanetary empire!
```

**Description**
```
Pick your country and your city — France, Canada, Japan, Morocco, the USA and more — and open your first bank branch. Customers walk in right away: tap the coins they leave behind, upgrade your teller desks and hire your team.

Then grow: loan offices, ATMs, a vault room, a business lounge and a VIP lounge. Sign big loans as the CEO and handle tricky cases: scammers, angry customers, lottery winners and bank runs. Keep your capital ratio healthy, complete the chapters and expand across the world… then open a bank on the Moon and on Mars!

Features:
- 12 starting countries and over 120 cities, each with local names and projects
- A living branch where every customer walks in and gets served
- Coins to collect, desks and rooms to upgrade
- Loans, savings, cards and life insurance to manage
- Random events, rivals, rate wars and economic crises
- Chapters, challenges and achievements
- Autosave, English and French

Controls: mouse or touch. Space pauses, Esc opens the menu.
```

## Après la publication

Lis les commentaires des joueurs, et envoie-moi ceux qui reviennent souvent : on corrigera en priorité ce qui gêne vraiment.
