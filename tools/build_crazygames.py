"""Fabrique les fichiers à envoyer sur les sites de jeux :
- crazygames/banque-tycoon-crazygames.zip : pour CrazyGames (avec leur SDK)
- itch/banque-tycoon-itch.zip : pour itch.io et Newgrounds (sans le SDK CrazyGames)
- gamedistribution/banque-tycoon-gamedistribution.zip : pour GameDistribution, avec leurs pubs
  (il faut d'abord mettre le « Game ID » donné par GameDistribution dans tools/gamedistribution-id.txt)
Chaque zip contient seulement ce dont le jeu a besoin (index.html à la racine, style.css, js/).
Usage : python tools/build_crazygames.py"""
import os, re, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ['index.html', 'style.css'] + ['js/' + f for f in sorted(os.listdir(os.path.join(ROOT, 'js'))) if f.endswith('.js')]

def build(out, strip_sdk, gd_id=None):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            if f == 'index.html' and strip_sdk:
                html = open(os.path.join(ROOT, f), encoding='utf-8').read()
                html = re.sub(r'\s*<script src="https://sdk\.crazygames\.com/[^"]+"></script>', '', html)
                if gd_id: html = html.replace('<script src="js/gd.js', f'<script>window.GD_GAME_ID = {gd_id!r};</script>\n<script src="js/gd.js', 1)
                z.writestr(f, html)
            else:
                z.write(os.path.join(ROOT, f), f)
    print(f'{out}\n  {len(FILES)} fichiers, {os.path.getsize(out) / 1024:.0f} Ko')

build(os.path.join(ROOT, 'crazygames', 'banque-tycoon-crazygames.zip'), False)
build(os.path.join(ROOT, 'itch', 'banque-tycoon-itch.zip'), True)

gd_file = os.path.join(ROOT, 'tools', 'gamedistribution-id.txt')
gd_id = open(gd_file, encoding='utf-8').read().strip() if os.path.exists(gd_file) else ''
if re.fullmatch(r'[0-9a-f]{32}', gd_id):
    build(os.path.join(ROOT, 'gamedistribution', 'banque-tycoon-gamedistribution.zip'), True, gd_id)
else:
    print('GameDistribution : pas encore de Game ID valide dans tools/gamedistribution-id.txt (32 caractères 0-9 et a-f), zip non fabriqué')
