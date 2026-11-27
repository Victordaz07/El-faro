# Genera las hojas de sprites de decoración de la Bahía (necesita Chrome y Playwright).
# Uso (desde la raíz del repo):
#   npx esbuild tools/glb-sprite/sheet.js --bundle --format=iife --outfile=tools/glb-sprite/sheet.bundle.js
#   python3 tools/glb-sprite/bake-deco.py
# Escribe assets/art/deco/*.webp + meta.json
import asyncio, base64, io, json, os, shutil
from PIL import Image
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TOOL = os.path.join(ROOT, 'tools', 'glb-sprite')
OUT = os.path.join(ROOT, 'assets', 'art', 'deco')
# nombre: (px por cuadro, direcciones, cuadros, semilado de la cámara)
KINDS = {
    'deco-boya': (96, 8, 4, 0.8), 'deco-rocas': (96, 8, 1, 0.75), 'deco-red': (96, 8, 4, 0.75),
    'deco-muelle': (128, 8, 1, 0.75), 'deco-nasa': (96, 8, 1, 0.75), 'deco-bote-hundido': (96, 8, 2, 0.75),
}
async def main():
    os.makedirs(os.path.join(TOOL, 'tmp'), exist_ok=True); os.makedirs(OUT, exist_ok=True)
    for k in KINDS: shutil.copy(os.path.join(ROOT, 'assets', 'models', f'{k}.glb'), os.path.join(TOOL, 'tmp', f'{k}.glb'))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'),
            args=['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page()
        await pg.goto('file://' + os.path.join(TOOL, 'sheet.html'))
        meta = {}
        for k, (px, dirs, frames, half) in KINDS.items():
            res = await pg.evaluate('([k,px,d,f,h])=>window.makeSheet(`tmp/${k}.glb`,k,px,d,f,32,h)', [k, px, dirs, frames, half])
            im = Image.open(io.BytesIO(base64.b64decode(res['png'].split(',')[1]))).convert('RGBA')
            im.save(os.path.join(OUT, f'{k}.webp'), 'WEBP', quality=88, method=6)
            meta[k] = res['meta']; print(k, im.size, os.path.getsize(os.path.join(OUT, f'{k}.webp')) // 1024, 'KB')
        json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
        await b.close()
asyncio.run(main())
