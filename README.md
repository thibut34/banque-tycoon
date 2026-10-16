# Banque Tycoon

Un simulateur de banque jouable dans le navigateur (ordinateur et mobile).

**▶ Jouer : https://thibut34.github.io/banque-tycoon/**

## Le principe

Tout le monde commence au même endroit : une agence **vide** à Montpellier avec 1 M€ de capital. Le jeu se joue **jour par jour** : tu cliques sur « Jour suivant » quand ta journée est finie.

- **Aujourd’hui** : chaque jour, 6 à 10 clients (puis davantage) se présentent. Chacun est une carte à traiter : ouvrir un compte, enregistrer un dépôt, placer un livret, vendre une carte, calmer une réclamation, démasquer un faux client, étudier une demande de prêt… Plus un objectif du jour, la réunion du lundi et des tâches de bureau. Ce que tu ne traites pas, ton équipe s’en charge (moins bien que toi).
- **Ordre réaliste** : d’abord le guichet et les comptes, puis les prêts se débloquent quand tu as assez d’argent des clients.
- **Prêts réalistes** : revenus, taux d’endettement (35 % maximum), apport, garanties, taux d’usure, vraies durées.
- **Ma banque** : plan 3D animé de chaque agence, personnalisable ; employés avec portrait, niveau, formation et promotion.
- **Produits** : compte courant, livret, assurance-vie, carte bancaire.
- **Monde**, **concurrents** qui agissent (et qu’on peut racheter), **fraudes**, **événements**, **Grande Crise**, **9 chapitres**.
- **Accessibilité** : taille du texte, animations réduites, contraste élevé, mode daltonien, mode détente, lexique « ? ».

**Entrée** ou **Espace** = jour suivant · **Échap** = menu.

Fait en HTML/CSS/JavaScript, sans aucune dépendance.

## Fichiers

- `index.html`, `style.css`
- `js/util.js` : outils, sons, icônes
- `js/data.js` : villes, chapitres, concurrents, succès…
- `js/state.js` : état de la partie et calculs financiers
- `js/sim.js` : simulation (jours, mois, concurrents, missions, défis)
- `js/events.js` : événements aléatoires
- `js/floor.js` : plan animé de l'agence
- `js/views1.js`, `js/views2.js` : écrans
- `js/main.js` : actions, tutoriel et démarrage
