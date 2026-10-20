# Publier Banque Tycoon sur GameDistribution

GameDistribution diffuse ton jeu sur des centaines de sites de jeux et te reverse une part de l'argent des publicités.
Le jeu est prêt : les pubs GameDistribution sont déjà branchées (une pub au lancement, une entre deux mois au plus toutes les 3 minutes, et une pub « récompense » que le joueur choisit pour un coup de pouce). Pendant une pub, le jeu se met en pause et coupe le son.

Il ne manque qu'une chose : **le « Game ID » que GameDistribution te donne quand tu crées le jeu sur leur site.** Il est propre à ton jeu et sert à te payer.

## Étape 1 : créer le jeu et récupérer le Game ID

1. Va sur **https://developer.gamedistribution.com** et crée un compte développeur (gratuit).
   Si tu as moins de 18 ans, fais-le avec un parent : il faudra plus tard un compte de paiement (PayPal ou virement) à un nom d'adulte.
2. Clique **« Upload new game »** (ou « Add game »).
3. Donne le titre `Banque Tycoon`. GameDistribution affiche alors le **Game ID** : une suite de 32 lettres et chiffres (par exemple `a1b2c3d4…`).
4. **Envoie-moi ce Game ID.** Je fabrique le zip avec ton identifiant.
   (Ou fais-le toi-même : colle le Game ID seul dans le fichier `tools/gamedistribution-id.txt`, puis lance `python tools/build_crazygames.py`. Le zip apparaît dans ce dossier : `banque-tycoon-gamedistribution.zip`.)

## Étape 2 : envoyer le jeu

1. Sur la page du jeu, envoie **`banque-tycoon-gamedistribution.zip`** (type HTML5).
2. Taille : **1280 × 720**, orientation **paysage**. Coche **mobile** (le jeu marche au doigt).
3. Images (dans ce dossier) : `thumb-512x512.png`, `thumb-512x384.png`, `thumb-200x120.png`. Prends celles qu'on te demande.
4. Catégorie : **Simulation** (ou Management). Tags : `tycoon, idle, management, bank, money, business, simulation, strategy, casual, economy`.
5. Langues : anglais et français.
6. Colle la description et les commandes ci-dessous.
7. Utilise leur outil de test (« Preview » ou « QA ») : vérifie qu'une pub s'affiche quand tu cliques **Ouvrir ma banque**, que le jeu est en pause pendant la pub, puis qu'il reprend.
8. Envoie pour validation. Ils vérifient le jeu et les pubs, puis le diffusent.

## Les textes à coller (en anglais)

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
```

**Instructions / Controls**
```
Mouse / touch: tap coins to collect them, click a desk or room to build, hire and upgrade it
Space: pause / resume time
Keys 1 to 5: answer the open file
Esc: menu
```

## L'argent

- GameDistribution paie une part des revenus publicitaires, chaque mois, à partir d'un montant minimum (indiqué dans ton espace développeur).
- Un jeu web gagne en général quelques euros pour mille parties : plus il y a de joueurs, plus ça rapporte.
- Le tableau de bord GameDistribution montre le nombre de parties et les revenus jour par jour.
