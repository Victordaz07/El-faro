# Fase 2: hornea isla, faro, torretas, red, arpón, jefes y retratos de jefes desde los .glb.
# Uso (desde la raíz del repo):
#   npx esbuild tools/glb-sprite/fase2.js --bundle --format=iife --outfile=tools/glb-sprite/fase2.bundle.js
#   python3 tools/glb-sprite/bake-fase2.py
# Escala del juego: 1 unidad del modelo de la isla = 40 px del juego; torretas a 0.34.
import asyncio, base64, io, json, os, shutil
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TOOL = os.path.join(ROOT, 'tools', 'glb-sprite')
MODELS = os.path.join(ROOT, 'assets', 'models')
OUT = os.path.join(ROOT, 'assets', 'art', 'fase2')
TMP = os.path.join(TOOL, 'tmp')
PPU = 160            # px por unidad de la isla (40 px del juego × 4)
TURRET = 0.34        # escala de las torretas sobre la isla
BOSS_PX = int(os.environ.get('BOSS_PX', '192'))
BOSSES = {'bahia': 'jefe-kraken', 'arrecife': 'jefe-rey-cangrejo', 'helado': 'jefe-serpiente-hielo',
          'volcan': 'jefe-titan-magma', 'abismo': 'jefe-leviatan'}
TURRETS = {'tA': 'torreta-arponero', 'tR': 'torreta-lanzarredes', 'tN': 'torreta-ancla'}
PADS = {'tA': [-0.6, 0.22, 0.25], 'tR': [0.6, 0.22, 0.25], 'tN': [0, 0.22, 0.6]}

def decode(url): return Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA')

def crop(img, pts, pad=2):
    """Recorta lo transparente y desplaza los puntos de anclaje."""
    x0, y0, x1, y1 = img.getbbox()
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1)), {k: [v[0] - x0, v[1] - y0] for k, v in pts.items()}

def save(img, name, q=88):
    img.save(os.path.join(OUT, name), 'WEBP', quality=q, method=6)
    return os.path.getsize(os.path.join(OUT, name))

async def main():
    os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
    for f in os.listdir(MODELS):
        if f.endswith('.glb'): shutil.copy(os.path.join(MODELS, f), os.path.join(TMP, f))
    meta = {'ppu': PPU / 40}  # px de imagen por px del juego (isla y faro)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'),
            args=['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page()
        pg.on('console', lambda m: print('  [chrome]', m.text) if m.type == 'error' else None)
        open(os.path.join(TOOL, 'fase2.html'), 'w').write('<html><body><script src="fase2.bundle.js"></script></body></html>')
        await pg.goto('file://' + os.path.join(TOOL, 'fase2.html'))
        ev = lambda fn, a: pg.evaluate(f'(a)=>window.{fn}(a)', a)

        # Isla: recortada a nivel del agua; las plataformas quedan visibles (ahí van las torretas)
        pts = {'o': [0, 0, 0], **{k: v for k, v in PADS.items()}}
        r = await ev('bakeStatic', {'parts': [{'url': 'tmp/isla-base.glb'}], 'ppu': PPU, 'w': 2.3, 'h': 2.0, 'lookY': 0.1, 'cut': -0.005, 'points': pts})
        img, q = crop(decode(r['png']), r['pts'])
        print('isla', img.size, save(img, 'isla.webp'))
        meta['isla'] = {'w': img.width, 'h': img.height, **q}

        # Faro (sin roca) sobre el claro de la isla
        r = await ev('bakeStatic', {'parts': [{'url': 'tmp/faro-solo.glb', 'pos': [0, 0.22, 0]}], 'ppu': PPU, 'w': 1.0, 'h': 2.4, 'lookY': 0.9, 'points': {'o': [0, 0, 0]}})
        img, q = crop(decode(r['png']), r['pts'])
        print('faro', img.size, save(img, 'faro.webp'), q)
        meta['faro'] = {'w': img.width, 'h': img.height, **q}

        # Torretas: base fija + cabeza en 16 direcciones × 4 cuadros (reposo y disparo)
        TPX = 96
        for k, name in TURRETS.items():
            r = await ev('bakeStatic', {'parts': [{'url': f'tmp/{name}.glb'}], 'hide': ['Head'], 'ppu': TPX / 1.5, 'w': 1.5, 'h': 1.5, 'lookY': 0.4, 'points': {'o': [0, 0, 0]}})
            img = decode(r['png']); print(name, 'base', save(img, f'{name}-base.webp'))
            s = await ev('bakeSheet', {'url': f'tmp/{name}.glb', 'kind': name, 'px': TPX, 'half': 0.75, 'lookY': 0.4, 'only': ['Head']})
            sh = decode(s['png']); print(name, 'cabeza', sh.size, save(sh, f'{name}.webp'))
            meta[k] = {**s['meta'], 'scale': TURRET}

        # Red (vista casi cenital) y arpón (visto desde arriba, apuntando a +x)
        r = await ev('bakeStatic', {'parts': [{'url': 'tmp/red.glb'}], 'ppu': 128, 'w': 1.1, 'h': 1.1, 'elev': 62, 'points': {'o': [0, 0.03, 0]}})
        img, q = crop(decode(r['png']), r['pts'])
        print('red', img.size, save(img, 'red.webp')); meta['red'] = {'w': img.width, 'h': img.height, 'ppu': 128, **q}
        r = await ev('bakeStatic', {'parts': [{'url': 'tmp/arpon.glb', 'rot': [0, 1.5708, 0]}], 'ppu': 96, 'w': 1.1, 'h': 0.4, 'elev': 89.5, 'points': {'o': [0, 0, 0]}})
        img, q = crop(decode(r['png']), r['pts'])
        print('arpon', img.size, save(img, 'arpon.webp')); meta['arpon'] = {'w': img.width, 'h': img.height, 'ppu': 96, **q}

        # Jefes: hojas como las de los enemigos
        meta['jefes'] = {}
        for zone, name in BOSSES.items():
            s = await ev('bakeSheet', {'url': f'tmp/{name}.glb', 'kind': name, 'px': BOSS_PX})
            sh = decode(s['png']); print(name, sh.size, save(sh, f'{name}.webp', 82))
            meta['jefes'][zone] = {**s['meta'], 'file': name}

        # Retratos provisionales solo para jefes sin ilustración pintada en assets/art/originales/
        LOOK = {'helado': ((150, 215, 255), (8, 22, 44)), 'volcan': ((255, 120, 50), (30, 8, 6)), 'abismo': ((150, 110, 255), (6, 6, 22))}
        for zone, (glow, dark) in LOOK.items():
            name = BOSSES[zone]
            if os.path.exists(os.path.join(ROOT, 'assets', 'art', 'originales', f'{name}.png')):
                continue  # ya hay retrato pintado: no se reemplaza
            r = await ev('bakeStatic', {'parts': [{'url': f'tmp/{name}.glb', 'rot': [0, -0.35, 0]}], 'ppu': 1100, 'w': 0.93, 'h': 0.93,
                'elev': 14, 'lookY': 0.36, 'light': {'hemi': 0.9, 'key': 2.4, 'rim': 2.2}})
            fig = decode(r['png'])
            W = 1024; bg = Image.new('RGBA', (W, W), dark + (255,))
            d = ImageDraw.Draw(bg)
            for i in range(40, 0, -1):  # halo del color de la zona detrás del jefe
                t = i / 40; c = tuple(int(dark[j] + (glow[j] - dark[j]) * (1 - t) * 0.55) for j in range(3))
                rr = int(W * 0.62 * t); d.ellipse((W // 2 - rr, int(W * 0.46) - rr, W // 2 + rr, int(W * 0.46) + rr), fill=c + (255,))
            bg = bg.filter(ImageFilter.GaussianBlur(28))
            sh = Image.new('RGBA', (W, W)); sd = ImageDraw.Draw(sh)
            sd.ellipse((W * 0.18, W * 0.74, W * 0.82, W * 0.9), fill=(0, 0, 0, 150)); sh = sh.filter(ImageFilter.GaussianBlur(24))
            bg.alpha_composite(sh)
            fig = fig.resize((W, W), Image.LANCZOS)
            bg.alpha_composite(fig, (0, int(W * 0.04)))
            import random; rnd = random.Random(zone)
            pt = Image.new('RGBA', (W, W)); pd = ImageDraw.Draw(pt)
            for _ in range(140):  # nieve, ceniza o burbujas
                x, y, rr = rnd.random() * W, rnd.random() * W, 1.5 + rnd.random() * 4
                a = int(60 + rnd.random() * 150)
                col = (235, 248, 255, a) if zone == 'helado' else (255, 150 + rnd.randint(0, 80), 60, a) if zone == 'volcan' else (170, 150, 255, a // 2)
                if zone == 'abismo': pd.ellipse((x - rr * 1.6, y - rr * 1.6, x + rr * 1.6, y + rr * 1.6), outline=col, width=2)
                else: pd.ellipse((x - rr, y - rr, x + rr, y + rr), fill=col)
            bg.alpha_composite(pt.filter(ImageFilter.GaussianBlur(1.2)))
            vg = Image.new('L', (W, W), 0); ImageDraw.Draw(vg).ellipse((-W * 0.1, -W * 0.1, W * 1.1, W * 1.1), fill=255)
            vg = vg.filter(ImageFilter.GaussianBlur(90))
            out = Image.composite(bg, Image.new('RGBA', (W, W), (0, 0, 0, 255)), vg).convert('RGB').resize((512, 512), Image.LANCZOS)
            out.save(os.path.join(ROOT, 'assets', 'art', f'{name}.webp'), 'WEBP', quality=86, method=6)
            out.save(os.path.join(TMP, f'retrato-{zone}.png'))
            print('retrato', zone)
        await b.close()
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)

asyncio.run(main())
