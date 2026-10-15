# Banque Tycoon

Un simulateur de banque jouable dans le navigateur (ordinateur et mobile).

**▶ Jouer : https://thibut34.github.io/banque-tycoon/**

## Le principe

Tout le monde commence au même endroit : une petite agence à **Montpellier** avec 1 M€ de fonds propres. Une campagne en **8 chapitres** vous emmène de la banque de quartier jusqu'à la première banque interplanétaire (comptez plusieurs heures de jeu).

- **Ma banque** : le plan animé de chaque agence, vu de dessus. Construisez des guichets, embauchez des guichetiers et des conseillers, installez des distributeurs, des vigiles et de la décoration. Les clients entrent, font la queue et repartent contents… ou fâchés.
- **Monde** : 50 villes sur une carte, de Nîmes à Tokyo, puis la Lune et Mars. Chaque chapitre terminé ouvre une nouvelle région.
- **Missions** : objectifs de campagne et défis chronométrés avec récompenses.
- **Classement** : dépassez Goldman Sachets, Deutsche Bankrott et JP Morgane.
- **Prêts** : particuliers, entreprises, start-up… et des États notés de AAA à CCC. Un pilote automatique se débloque au chapitre 3.
- **Dépôts**, **marchés**, **banque centrale**, **régulateur** (ratio de solvabilité), **cycles économiques**, **événements** à choix, **améliorations**, boutique de luxe et succès.
- Tutoriel guidé, sons synthétisés (coupables avec le bouton haut-parleur), sauvegarde automatique.

Le temps avance à vitesse fixe (1 seconde = 1 jour). **Échap** ou le bouton pause ouvre le menu et arrête le temps.

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
