import asyncio, base64, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--allow-file-access-from-files','--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page()
        await pg.goto('file:///home/claude/glbtool/sprite.html')
        res=await pg.evaluate("()=>window.makeSprite('faro-corregido.glb',32,25,640)")
        open('faro-sprite.png','wb').write(base64.b64decode(res['png'].split(',')[1]))
        meta={'origin':res['origin'],'lamp':res['lamp'],'size':640}
        open('faro-sprite.json','w').write(json.dumps(meta)); print(meta)
        await b.close()
asyncio.run(main())
