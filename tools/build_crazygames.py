"""Fabrique les fichiers à envoyer sur les sites de jeux :
- crazygames/banque-tycoon-crazygames.zip : pour CrazyGames (avec leur SDK)
- itch/banque-tycoon-itch.zip : pour itch.io et Newgrounds (sans le SDK CrazyGames)
Chaque zip contient seulement ce dont le jeu a besoin (index.html à la racine, style.css, js/).
Usage : python tools/build_crazygames.py"""
import os, re, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ['index.html', 'style.css'] + ['js/' + f for f in sorted(os.listdir(os.path.join(ROOT, 'js'))) if f.endswith('.js')]

def build(out, strip_sdk):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            if f == 'index.html' and strip_sdk:
                html = open(os.path.join(ROOT, f), encoding='utf-8').read()
                html = re.sub(r'\s*<script src="https://sdk\.crazygames\.com/[^"]+"></script>', '', html)
                z.writestr(f, html)
            else:
                z.write(os.path.join(ROOT, f), f)
    print(f'{out}\n  {len(FILES)} fichiers, {os.path.getsize(out) / 1024:.0f} Ko')

build(os.path.join(ROOT, 'crazygames', 'banque-tycoon-crazygames.zip'), False)
build(os.path.join(ROOT, 'itch', 'banque-tycoon-itch.zip'), True)
