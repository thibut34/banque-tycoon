# Publier Banque Tycoon sur CrazyGames

Tout ce qu'il faut est dans ce dossier `crazygames/` :

| Fichier | À quoi il sert |
|---|---|
| `banque-tycoon-crazygames.zip` | Le jeu à envoyer (index.html à la racine) |
| `cover-landscape-1920x1080.png` | Image de couverture paysage (16:9) |
| `cover-portrait-800x1200.png` | Image de couverture portrait (2:3) |
| `cover-square-800x800.png` | Image de couverture carrée (1:1) |
| `video-landscape-1920x1080.mp4` | Vidéo de présentation paysage (16:9, 18 s, sans son) |
| `video-portrait-1080x1620.mp4` | Vidéo de présentation portrait (2:3, 18 s, sans son) |

Pour refaire le zip après une modification du jeu : `python tools/build_crazygames.py`

## Les étapes

1. Va sur **https://developer.crazygames.com** et crée un compte développeur (gratuit).
2. Clique sur **« Submit a game »** (ou « Add game »), puis choisis **HTML5**.
3. Envoie le fichier **`banque-tycoon-crazygames.zip`**.
4. Coche **« Progress Save »** : la partie du joueur est alors sauvegardée sur son compte CrazyGames (le jeu utilise déjà le module Data du SDK).
5. Orientation : **Paysage** (Landscape). Tu peux aussi cocher mobile : le jeu marche au doigt.
6. Ajoute les **3 images de couverture** et les **2 vidéos** de ce dossier.
7. Colle les textes de la section suivante (en anglais : c'est la langue principale exigée).
8. Envoie. CrazyGames teste le jeu, puis le met en ligne en **« Basic Launch »** (sans publicité).

## Les textes à coller (en anglais)

**Title**
Banque Tycoon

**Short description**
Build your own bank, from a tiny branch to an interplanetary empire!

**Description**
Pick your country and your city — France, Canada, Japan, Morocco, the USA and more — then open a small bank branch and watch your customers walk in, queue and get served in real time. Build teller desks, loan offices, ATMs, a vault room, a business lounge and a VIP lounge, then upgrade them to serve faster and earn more. Hire and train your team, sign big loans as the CEO, and handle tricky cases: scammers, angry customers, lottery winners and bank runs. Complete the chapters to expand across France, Europe, the Americas and Asia… and one day, open a bank on the Moon and on Mars!

**Controls**
- Mouse / touch: click a desk or room to build, hire and upgrade it
- Space: pause / resume time
- Keys 1 to 5: answer the open file
- Esc: menu

**Catégories et mots-clés conseillés**
Category: Simulation (or Management / Idle). Tags: tycoon, idle, management, bank, money, business, simulation, strategy, casual.

## La langue

Le jeu est en **anglais par défaut** et passe en **français** tout seul pour les joueurs francophones (selon leur navigateur). On peut aussi changer dans **Menu → Options → Langue · Language**.

## Après la sélection (« Full Launch »)

Si CrazyGames sélectionne le jeu pour le **Full Launch** (ils préviennent par e-mail), les publicités deviennent autorisées. Pour les activer :

1. Ouvre `js/cg.js` et remplace `const ADS_ENABLED = false;` par `const ADS_ENABLED = true;`
2. Refais le zip : `python tools/build_crazygames.py`
3. Envoie la nouvelle version sur le portail.

Les publicités prévues sont respectueuses du joueur :
- **Publicité récompensée** (le joueur choisit) : « Coup de pouce gratuit » dans *Développer ma banque*, et « Doubler le bonus de connexion ».
- **Publicité entre deux mois**, pendant le bilan mensuel, au plus une toutes les 3 minutes (règle de CrazyGames).
- Le jeu se met en pause et coupe le son pendant chaque publicité, et continue normalement si la pub ne se charge pas ou si le joueur a un bloqueur.

## Les vidéos de présentation

Les deux vidéos sont prêtes, au format demandé par CrazyGames : **18 secondes, sans son, en 1080p**. Elles commencent par l'image de couverture, puis montrent l'agence pleine de clients, un poste qui monte de niveau et un client VIP. Elles n'ont pas de texte « Play now » ni de curseur.

- `video-landscape-1920x1080.mp4` : la version paysage (16:9)
- `video-portrait-1080x1620.mp4` : la version portrait (2:3)

## Ce qui est déjà en place pour respecter leurs règles

- SDK CrazyGames v3 intégré : chargement, début et pause de partie, moments forts (fin de chapitre), réglage « son coupé » du site.
- Sauvegarde dans le module Data (liée au compte CrazyGames du joueur).
- Le joueur arrive directement dans la partie (pas de menu bloquant).
- Anglais par défaut, français en traduction.
- Pas de lien externe, pas de bouton plein écran maison, pas de publicité externe.
- Lisible en 16:9 (y compris 800×450), jouable à la souris, au clavier et au doigt.
- Pas de sélection de texte ni de loupe sur mobile, son relancé sur iPhone au premier toucher.
- 30 fichiers, 232 Ko : chargement quasi instantané.
