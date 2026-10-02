"""Real Chromium checks. Start the static server first; Playwright is QA-only."""
import json
import os
from pathlib import Path
import struct

from playwright.sync_api import sync_playwright

BASE = os.environ.get('PUNCH_TEST_URL', 'http://localhost:4173/')
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'artifacts'
OUT.mkdir(exist_ok=True)
results = []


def record(name, detail='passed'):
    results.append({'check': name, 'result': detail})
    print(name, detail, flush=True)


def ready(page):
    page.wait_for_function("!document.getElementById('export-top').disabled")


def settle(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')


def download(page, kind, filename, scale='1'):
    page.locator('#export-top').click()
    page.locator('#export-scale').select_option(scale)
    with page.expect_download() as pending:
        page.locator('#download-' + kind).click()
    pending.value.save_as(OUT / filename)
    return OUT / filename


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.set_default_timeout(12000)
    errors = []
    requests = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    page.goto(BASE)
    ready(page)
    assert page.locator('#font-state').inner_text() == '离线点阵字库'
    assert page.locator('[data-mode=punch]').get_attribute('aria-pressed') == 'true'
    assert page.locator('#line-count').inner_text() == '1 行文字'
    assert page.locator('#export-bottom').count() == 0
    assert page.locator('.export-trigger').count() == 1
    page.screenshot(path=OUT / 'studio-desktop.png')
    record('initial local editor / real font loading')

    png = download(page, 'png', 'punch.png')
    data = png.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', data[16:24]) == (1280, 960)
    record('native PNG download', '1280 × 960')
    double_png = download(page, 'png', 'punch-2x.png', '2')
    assert struct.unpack('>II', double_png.read_bytes()[16:24]) == (2560, 1920)
    record('2x PNG download', '2560 × 1920')
    svg = download(page, 'svg', 'punch.svg')
    assert 'data:image/png;base64,' in svg.read_text()
    record('self-contained SVG download')

    page.locator('#letters').fill('你好　世界\nCafé')
    settle(page)
    ready(page)
    assert page.locator('#line-count').inner_text() == '2 行文字'
    assert int(page.locator('#hole-count').inner_text().split()[0]) > 150
    page.locator('#letters').fill('Cafe\u0301')
    settle(page)
    ready(page)
    record('Chinese / ideographic space / composed accents')

    page.locator('#letters').fill('ART 🧪')
    settle(page)
    assert page.locator('#export-top').is_disabled()
    assert '暂不支持' in page.locator('#status').inner_text()
    assert page.locator('#loading').is_visible()
    page.locator('#letters').fill('A' * 121)
    settle(page)
    assert page.locator('#export-top').is_disabled()
    assert '120' in page.locator('#status').inner_text()
    record('unsupported glyph / length / stale preview protection')

    page.locator('#letters').fill('ALIVE ART')
    page.locator('#hole-size').fill('10')
    settle(page)
    ready(page)
    before = int(page.locator('#line-count').inner_text().split()[0])
    page.locator('#hole-size').fill('24')
    settle(page)
    ready(page)
    after = int(page.locator('#line-count').inner_text().split()[0])
    assert after > before
    record('manual diameter actually wraps', f'{before} → {after} lines')

    page.locator('#letters').fill('ART ' * 25)
    page.locator('#hole-size').fill('45')
    settle(page)
    assert page.locator('#export-top').is_disabled()
    assert '不足' in page.locator('#status').inner_text()
    record('manual overflow is visible and export is blocked')

    page.locator('#letters').fill('ALIVE ART')
    page.locator('#reset').click()
    page.locator('[data-mode=transfer]').click()
    settle(page)
    ready(page)
    assert int(page.locator('#dimensions').inner_text().split()[2]) > 960
    assert not page.locator('#position').is_disabled()
    assert not page.locator('#position-x').is_disabled()
    download(page, 'png', 'transfer.png')
    download(page, 'svg', 'transfer.svg')
    page.screenshot(path=OUT / 'studio-transfer.png')
    record('transfer composition / PNG and SVG downloads')

    page.locator('#view-original').click()
    settle(page)
    assert page.locator('#artwork').evaluate('(c)=>c.width/c.height') == 1280 / 960
    download(page, 'png', 'from-original-view.png')
    assert struct.unpack('>II', (OUT/'from-original-view.png').read_bytes()[16:24])[1] > 960
    record('original-view toggle does not alter exported artwork')

    page.locator('#view-result').click()
    page.locator('[data-shape=circle]').click()
    page.locator('#paper-settings > summary').click()
    page.locator('#paper-color').fill('#efe1d0')
    settle(page)
    ready(page)
    assert page.locator('#auto-color').get_attribute('aria-pressed') == 'false'
    assert page.locator('[data-shape=circle]').get_attribute('aria-pressed') == 'true'
    record('custom paper / circular holes')

    page.locator('#letters').fill('  \n')
    settle(page)
    ready(page)
    assert page.locator('#hole-count').inner_text() == '0 个孔'
    assert page.locator('#dimensions').inner_text() == '1280 × 960 px'
    record('blank letters retain unpunched image')

    # Canvas verification uses an opaque image with a smooth, unique RGB field.
    fidelity = page.evaluate('''async () => {
      const {PixelLibrary}=await import('./font.js');
      const {createPlan,renderArt,exportSvg}=await import('./core.js');
      const lib=new PixelLibrary();await lib.load();
      const src=document.createElement('canvas');src.width=256;src.height=192;
      const ctx=src.getContext('2d');const im=ctx.createImageData(256,192);
      for(let y=0;y<192;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;im.data[i]=x;im.data[i+1]=y;im.data[i+2]=Math.floor((x+y)/2);im.data[i+3]=255;}ctx.putImageData(im,0,0);
      const base={mode:'punch',autoSize:false,holeSize:12,spacing:32,position:82,areaWidth:84,shape:'square',paperColor:'#e8f2e9',depth:false};
      const g=lib.text('ART','classic');const pl=createPlan(256,192,g,base);
      const output=document.createElement('canvas');renderArt(output,src,pl,base);
      const out=output.getContext('2d').getImageData(0,0,256,192).data;
      let checked=0,mismatches=0;
      for(let y=0;y<192;y++)for(let x=0;x<256;x++){
        if(pl.points.some(p=>x>=Math.floor(p.x)-1&&x<=Math.ceil(p.x+pl.diameter)+1&&y>=Math.floor(p.y)-1&&y<=Math.ceil(p.y+pl.diameter)+1))continue;
        const i=(y*256+x)*4;checked++;for(let k=0;k<4;k++)if(out[i+k]!==im.data[i+k]){mismatches++;break;}
      }
      const opt={...base,mode:'transfer'};const transfer=createPlan(256,192,g,opt);renderArt(output,src,transfer,opt);
      const pixels=output.getContext('2d').getImageData(0,0,256,transfer.height).data;
      let patchErrors=0;
      transfer.points.forEach((p,i)=>{
        const x=Math.floor(p.x+transfer.diameter/2),y=Math.floor(p.y+transfer.diameter/2);const q=transfer.donors[i];
        const sx=x-p.x+q.x,sy=y-p.y+q.y;const at=(y*256+x)*4;
        if(Math.abs(pixels[at]-sx)>2||Math.abs(pixels[at+1]-sy)>2)patchErrors++;
      });
      // Verify exported vector rendering matches interior source mappings too.
      const svg=exportSvg(src.toDataURL(),transfer,opt);const blob=new Blob([svg],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);
      const image=new Image();image.src=url;await image.decode();const v=document.createElement('canvas');v.width=256;v.height=transfer.height;v.getContext('2d').drawImage(image,0,0);URL.revokeObjectURL(url);
      const vd=v.getContext('2d').getImageData(0,0,256,transfer.height).data;let svgPatchErrors=0;
      transfer.points.forEach(p=>{const x=Math.floor(p.x+transfer.diameter/2),y=Math.floor(p.y+transfer.diameter/2),at=(y*256+x)*4;for(let k=0;k<3;k++)if(Math.abs(vd[at+k]-pixels[at+k])>2){svgPatchErrors++;break;}});
      return {checked,mismatches,patchErrors,svgPatchErrors,holes:transfer.points.length,donors:transfer.donors.length};
    }''')
    print('fidelity measurements', fidelity, flush=True)
    assert fidelity['checked'] > 40000 and fidelity['mismatches'] == 0
    assert fidelity['patchErrors'] == fidelity['svgPatchErrors'] == 0
    assert fidelity['holes'] == fidelity['donors']
    record('source pixel preservation / patch identity / SVG parity', fidelity)

    page.locator('#image-file').set_input_files(ROOT / 'dist' / 'assets' / 'sample.png')
    page.wait_for_function("document.getElementById('image-name').textContent === 'sample.png'")
    settle(page)
    ready(page)
    assert all(url.startswith(BASE) or url.startswith('blob:') or url.startswith('data:') for url in requests)
    assert errors == []
    record('file input / local-only network / no browser exceptions')

    mobile = browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    mobile.goto(BASE)
    ready(mobile)
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile.locator('#letters').fill('绿野艺术')
    settle(mobile)
    ready(mobile)
    mobile.screenshot(path=OUT/'studio-mobile.png',full_page=True)
    record('mobile layout / Chinese rendering / no horizontal page overflow')

    race = browser.new_page()
    race.add_init_script('''const original=FontFace.prototype.load;FontFace.prototype.load=function(){return new Promise((resolve,reject)=>setTimeout(()=>original.call(this).then(resolve,reject),700));};''')
    race.goto(BASE,wait_until='domcontentloaded')
    race.locator('#image-file').set_input_files(ROOT/'dist'/'assets'/'sample.png')
    race.wait_for_function("document.getElementById('font-state').textContent === '离线点阵字库'")
    settle(race)
    assert race.locator('#image-name').inner_text() == 'sample.png'
    record('upload during font initialization is not overwritten by demo')

    tools_page = browser.new_page()
    tools_page.add_init_script("window.__punchTools=[];Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.__punchTools.push(t)}}});")
    tools_page.goto(BASE)
    ready(tools_page)
    tool_result = tools_page.evaluate('''() => {
      const read=window.__punchTools.find(t=>t.name==='read_punch_art');
      const configure=window.__punchTools.find(t=>t.name==='configure_punch_art');
      const valid=configure.execute({letters:'绿野',mode:'transfer',shape:'circle',paperColor:'#ddeeff'});
      const after=read.execute({});let rejected=false;
      try{configure.execute({letters:'changed',mode:'invalid'});}catch{rejected=true;}
      return {valid,after,rejected,unchanged:read.execute({}).letters==='绿野',names:window.__punchTools.map(t=>t.name)};
    }''')
    assert tool_result['valid']['valid'] and tool_result['rejected'] and tool_result['unchanged']
    assert tool_result['after']['settings']['mode'] == 'transfer'
    assert len(tool_result['names']) == 2
    record('optional structured actions: valid updates and atomic invalid rejection (shim)')
    browser.close()

(OUT/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
