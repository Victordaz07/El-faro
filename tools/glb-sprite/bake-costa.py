# Hornea el Modo Costa (muralla, hueco, antorcha y armas) desde assets/models/costa-*.glb y arma-*.glb.
# Uso (desde la raíz del repo):
#   npx esbuild tools/glb-sprite/fase2.js --bundle --format=iife --outfile=tools/glb-sprite/fase2.bundle.js
#   python3 tools/glb-sprite/bake-costa.py
# Escribe assets/art/costa/*.webp + meta.json. Las armas se hornean mirando al mar (+Z del modelo = hacia arriba en pantalla),
# vistas desde el lado de tierra, igual que el juego.
import asyncio, base64, io, json, os, shutil
from playwright.async_api import async_playwright
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TOOL = os.path.join(ROOT, 'tools', 'glb-sprite')
MODELS = os.path.join(ROOT, 'assets', 'models')
OUT = os.path.join(ROOT, 'assets', 'art', 'costa')
TMP = os.path.join(TOOL, 'tmp')
PX = 96
# arma: (nodos fijos a ocultar para la cabeza, nodos de la cabeza, semilado de cámara, altura de mirada)
WEAPONS = {
    'arma-canon': (['Head'], ['Head'], 0.8, 0.3),
    'arma-ballesta': (['Head'], ['Head'], 0.8, 0.3),
    'arma-mortero': (['Head'], ['Head'], 0.8, 0.4),
    'arma-luz': (['Lamp', 'Roof'], ['Lamp', 'Roof'], 0.8, 0.45),
}

def decode(url): return Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA')
def crop(img, pts, pad=2):
    x0, y0, x1, y1 = img.getbbox()
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1)), {k: [v[0] - x0, v[1] - y0] for k, v in pts.items()}
def save(img, name, q=88):
    img.save(os.path.join(OUT, name), 'WEBP', quality=q, method=6)
    return os.path.getsize(os.path.join(OUT, name)) // 1024

async def main():
    os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
    for f in os.listdir(MODELS):
        if f.endswith('.glb'): shutil.copy(os.path.join(MODELS, f), os.path.join(TMP, f))
    meta = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'),
            args=['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page()
        await pg.goto('file://' + os.path.join(TOOL, 'fase2.html'))
        ev = lambda fn, arg: pg.evaluate(f'(a)=>window.{fn}(a)', arg)
        # Piezas fijas: se ven desde tierra (modelo girado 180° para que su frente mire al mar)
        for name, ppu, w, h, look in [('costa-muralla', 160, 1.15, 0.95, 0.2), ('costa-hueco', 160, 1.15, 0.8, 0.1), ('costa-antorcha', 192, 0.6, 1.1, 0.5)]:
            r = await ev('bakeStatic', {'parts': [{'url': f'tmp/{name}.glb', 'rot': [0, 3.14159265, 0]}], 'ppu': ppu, 'w': w, 'h': h, 'lookY': look, 'points': {'o': [0, 0, 0]}, 'light': {'hemi': 0.8, 'key': 1.05, 'rim': 0.45}})
            img, q = crop(decode(r['png']), r['pts'])
            print(name, img.size, save(img, f'{name}.webp')); meta[name] = {'w': img.width, 'h': img.height, 'ppu': ppu, 'o': q['o']}
        # Armas: base fija + cabeza en 16 direcciones × 4 cuadros
        for name, (hide, only, half, look) in WEAPONS.items():
            r = await ev('bakeStatic', {'parts': [{'url': f'tmp/{name}.glb', 'rot': [0, 3.14159265, 0]}], 'hide': hide, 'ppu': PX / (2 * half), 'w': 2 * half, 'h': 2 * half, 'lookY': look, 'points': {'o': [0, 0, 0]}})
            img = decode(r['png']); print(name, 'base', save(img, f'{name}-base.webp'))
            s = await ev('bakeSheet', {'url': f'tmp/{name}.glb', 'kind': name, 'px': PX, 'half': half, 'lookY': look, 'only': only})
            sh = decode(s['png']); print(name, 'cabeza', sh.size, save(sh, f'{name}.webp'))
            meta[name] = s['meta']
        await b.close()
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
asyncio.run(main())
