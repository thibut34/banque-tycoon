"""Fabrique le fichier à envoyer sur CrazyGames : crazygames/banque-tycoon-crazygames.zip
Il contient seulement ce dont le jeu a besoin (index.html à la racine, style.css, js/).
Usage : python tools/build_crazygames.py"""
import os, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'crazygames', 'banque-tycoon-crazygames.zip')
FILES = ['index.html', 'style.css'] + ['js/' + f for f in sorted(os.listdir(os.path.join(ROOT, 'js'))) if f.endswith('.js')]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in FILES:
        z.write(os.path.join(ROOT, f), f)
size = os.path.getsize(OUT)
print(f'{OUT}\n{len(FILES)} fichiers, {size / 1024:.0f} Ko (limite CrazyGames : 250 Mo, 1 500 fichiers)')
