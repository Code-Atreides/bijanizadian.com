"""Make web copies of the homepage photos.

Reads the originals in specifics/ (kept out of Git and Hosting) and writes
assets/photos/<name>.webp (1000px, shown on the page) and
assets/photos/<name>-full.webp (2400px, opened on click). Metadata is
dropped and EXIF rotation is applied. Prints the shuffled <img> list to paste
into the photos block in home.html.

    python -I scripts/build-photos.py
"""
import os
import random
import re
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'specifics')
OUT = os.path.join(ROOT, 'assets', 'photos')
SIZES = {'': 1000, '-full': 2400}

os.makedirs(OUT, exist_ok=True)
files = sorted(f for f in os.listdir(SRC) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')))
names = []
for f in files:
    name = re.sub(r'[^a-z0-9]+', '-', os.path.splitext(f)[0].lower()).strip('-')
    with Image.open(os.path.join(SRC, f)) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        for suffix, edge in SIZES.items():
            copy = im.copy()
            copy.thumbnail((edge, edge), Image.LANCZOS)
            copy.save(os.path.join(OUT, name + suffix + '.webp'), 'WEBP', quality=82, method=6)
        names.append((name, im.size))

order = names[:]
while len(order) > 1 and order == names:
    random.shuffle(order)
for name, (w, h) in order:
    # width/height are the 1000px copy's, so the page reserves the right space before load
    s = 1000 / max(w, h)
    sys.stdout.write('        <a href="/assets/photos/%s-full.webp" target="_blank" rel="noopener"><img src="/assets/photos/%s.webp" width="%d" height="%d" alt="" loading="lazy" decoding="async"></a>\n'
                     % (name, name, round(w * s), round(h * s)))
