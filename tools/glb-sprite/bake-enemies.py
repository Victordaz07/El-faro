# Genera las hojas de sprites de todos los enemigos (necesita Chrome y Playwright).
# Uso: python3 tools/glb-sprite/bake-enemies.py   (desde la raíz del repo)
import asyncio, base64, json, os, shutil, sys
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TOOL = os.path.join(ROOT, 'tools', 'glb-sprite')
KINDS = ['cangrejo', 'medusa', 'anguila', 'pez-globo', 'tortuga', 'ermitano', 'sardina']
PX = int(os.environ.get('PX', '96'))
async def main():
    os.makedirs(os.path.join(TOOL, 'tmp'), exist_ok=True)
    for k in KINDS:
        shutil.copy(os.path.join(ROOT, 'assets', 'models', f'enemigo-{k}.glb'), os.path.join(TOOL, 'tmp', f'{k}.glb'))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'),
            args=['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page()
        await pg.goto('file://' + os.path.join(TOOL, 'sheet.html'))
        out = {}
        for k in KINDS:
            res = await pg.evaluate('([k,px])=>window.makeSheet(`tmp/${k}.glb`,k,px)', [k, PX])
            path = os.path.join(TOOL, 'tmp', f'{k}.png')
            open(path, 'wb').write(base64.b64decode(res['png'].split(',')[1]))
            out[k] = res['meta']
            print(k, res['meta'])
        json.dump(out, open(os.path.join(TOOL, 'tmp', 'meta.json'), 'w'), indent=1)
        await b.close()
asyncio.run(main())
