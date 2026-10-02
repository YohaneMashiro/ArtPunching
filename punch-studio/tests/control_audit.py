"""Browser regression: every editor control, actual pixels, and export geometry.

Run against the local static server with a working Playwright Chromium runtime.
This suite intentionally checks rendered pixels rather than button labels alone.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import struct
import xml.etree.ElementTree as ET

from playwright.sync_api import sync_playwright

BASE = os.environ.get('PUNCH_TEST_URL', 'http://localhost:4173/')
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'artifacts' / 'control-audit'
OUT.mkdir(parents=True, exist_ok=True)
results = []
covered = set()
NS = {'s': 'http://www.w3.org/2000/svg'}


def record(name, detail='passed'):
    results.append({'check': name, 'result': detail})
    print(name, detail, flush=True)


def ready(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
    page.wait_for_function("!document.getElementById('export-top').disabled")


def read(page):
    return page.evaluate("window.__auditTools.find(t=>t.name==='read_punch_art').execute({})")


def click(page, selector, key=None, render=True):
    page.locator(selector).click()
    covered.add(key or selector.lstrip('#'))
    if render:
        ready(page)


def fill(page, selector, value, key=None):
    page.locator(selector).fill(str(value))
    covered.add(key or selector.lstrip('#'))
    ready(page)


def pixels(page, region=None):
    return page.locator('#artwork').evaluate('''(c, region) => {
      if(!region)return c.toDataURL();
      const copy=document.createElement('canvas');
      copy.width=region.width;copy.height=region.height;
      copy.getContext('2d').drawImage(c,region.x,region.y,region.width,region.height,0,0,region.width,region.height);
      return copy.toDataURL();
    }''', region)


def digest(page, region=None):
    return hashlib.sha256(pixels(page, region).encode()).hexdigest()


def fixture(page, name, width=800, height=600):
    data = page.evaluate('''([w,h])=>{
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const cx=c.getContext('2d'),im=cx.createImageData(w,h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const at=(y*w+x)*4;im.data[at]=40+Math.floor(140*x/w);
        im.data[at+1]=60+Math.floor(130*y/h);im.data[at+2]=80+Math.floor(120*(x+y)/(w+h));im.data[at+3]=255;
      }
      cx.putImageData(im,0,0);return c.toDataURL().split(',')[1];
    }''', [width, height])
    path = OUT / name
    path.write_bytes(base64.b64decode(data))
    return path


def upload(page, path):
    page.locator('#image-file').set_input_files(path)
    page.wait_for_function("name=>document.getElementById('image-name').textContent===name", arg=path.name)
    covered.add('image-file')
    ready(page)


def geometry(page, width=800, height=600):
    return page.evaluate('''async ([w,h])=>{
      const {PixelLibrary}=await import('./font.js');const {createPlan}=await import('./core.js');
      if(!window.__auditLibrary){window.__auditLibrary=new PixelLibrary();await window.__auditLibrary.load();}
      const state=window.__auditTools.find(t=>t.name==='read_punch_art').execute({});
      const p=createPlan(w,h,window.__auditLibrary.text(state.letters,state.settings.fontStyle),state.settings);
      return {width:p.width,height:p.height,diameter:p.diameter,captionRect:p.captionRect,points:p.points,lines:p.lines.map(l=>l.text),sourceHoles:p.imageHoles.length,split:p.split};
    }''', [width, height])


def region_hashes(page):
    plan = geometry(page)
    scale = page.locator('#artwork').evaluate('(c)=>c.width') / plan['width']
    source = {'x': 0, 'y': 0, 'width': round(800 * scale), 'height': round(600 * scale)}
    r = plan['captionRect']
    caption = {k: round(r[k] * scale) for k in ['x', 'y', 'width', 'height']}
    return {'source': digest(page, source), 'caption': digest(page, caption)}


def pixel_bounds(page, mode):
    plan = geometry(page)
    region = plan['captionRect'] if mode == 'transfer' else {'x': 0, 'y': 0, 'width': 800, 'height': 600}
    return page.locator('#artwork').evaluate('''(c,arg)=>{
      const scale=c.width/arg.width,r=arg.region;
      const x0=Math.round(r.x*scale),y0=Math.round(r.y*scale),w=Math.round(r.width*scale),h=Math.round(r.height*scale);
      const data=c.getContext('2d').getImageData(x0,y0,w,h).data;
      let minx=w,miny=h,maxx=-1,maxy=-1,count=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const at=(y*w+x)*4;
        const magenta=data[at]===255&&data[at+1]===0&&data[at+2]===255;
        if(arg.mode==='punch'?magenta:!magenta){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);count++;}
      }
      return {minx:minx+x0,maxx:maxx+x0,miny:miny+y0,maxy:maxy+y0,count};
    }''', {'width': plan['width'], 'region': region, 'mode': mode})


def download(page, kind, name, scale='1'):
    click(page, '#export-top', render=False)
    page.locator('#export-scale').select_option(scale)
    covered.add('export-scale')
    with page.expect_download() as pending:
        click(page, '#download-' + kind, render=False)
    path = OUT / name
    pending.value.save_as(path)
    page.wait_for_function("!document.getElementById('export-dialog').open")
    return path


def svg_bounds(path, mode):
    root = ET.fromstring(path.read_text())
    if mode == 'transfer':
        shapes = [child for node in root.findall('.//s:clipPath', NS) for child in node]
    else:
        shapes = [node for node in root if node.tag.endswith('circle') or (node.tag.endswith('rect') and 'x' in node.attrib)]
    points = []
    for node in shapes:
        if node.tag.endswith('circle'):
            r = float(node.attrib['r'])
            points.append((float(node.attrib['cx']) - r, float(node.attrib['cy']) - r))
        else:
            points.append((float(node.attrib['x']), float(node.attrib['y'])))
    assert points, 'export contains no text hole geometry'
    return {'minx': min(p[0] for p in points), 'miny': min(p[1] for p in points)}


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.set_default_timeout(15000)
    page.add_init_script("window.__auditTools=[];Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.__auditTools.push(t)}}});")
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    ready(page)
    demo_name = page.locator('#image-name').inner_text()
    before_language = {'art': digest(page), 'settings': read(page)['settings'], 'zoom': page.locator('#zoom').input_value()}
    page.locator('#language-select').select_option('en')
    covered.add('language-select')
    ready(page)
    assert page.locator('html').get_attribute('lang').startswith('en')
    assert digest(page) == before_language['art']
    assert read(page)['settings'] == before_language['settings']
    assert page.locator('#zoom').input_value() == before_language['zoom']
    page.locator('#language-select').select_option('zh')
    ready(page)
    assert page.locator('html').get_attribute('lang').startswith('zh')
    record('Chinese/English selector preserves artwork, settings, and zoom')
    landscape = fixture(page, 'audit-landscape.png')
    portrait = fixture(page, 'audit-portrait.png', 600, 800)
    upload(page, landscape)
    baseline = digest(page)
    click(page, '#use-demo')
    assert digest(page) != baseline
    upload(page, landscape)
    dropped = page.evaluate('''async data=>{
      const raw=atob(data),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
      const dt=new DataTransfer();dt.items.add(new File([bytes],'audit-dropped.png',{type:'image/png'}));
      document.getElementById('dropzone').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));
    }''', base64.b64encode(landscape.read_bytes()).decode())
    page.wait_for_function("document.getElementById('image-name').textContent==='audit-dropped.png'")
    ready(page)
    covered.add('dropzone')
    upload(page, landscape)
    record('image picker, drag/drop, and demo replace the actual source')

    # Disclosure controls change visibility; they do not change the artwork.
    for summary in page.locator('details > summary').all():
        if not summary.is_visible():
            continue
        name = summary.evaluate("s=>'summary-'+(s.parentElement.id||s.parentElement.className)")
        was = summary.evaluate('s=>s.parentElement.open')
        summary.click()
        assert summary.evaluate('s=>s.parentElement.open') != was
        summary.click()
        covered.add(name)
        if not summary.evaluate('s=>s.parentElement.open'):
            summary.click()

    fill(page, '#letters', 'ART')
    assert digest(page) != baseline
    before = digest(page)
    fill(page, '#paper-color', '#ff00ff')
    assert digest(page) != before
    before = digest(page)
    click(page, '#auto-color')
    assert digest(page) != before
    for i in range(page.locator('#swatches button').count()):
        fill(page, '#paper-color', '#ff00ff')
        before = digest(page)
        click(page, f'#swatches button:nth-child({i+1})', f'swatch-{i}')
        assert digest(page) != before
    fill(page, '#paper-color', '#ff00ff')
    fill(page, '#hole-size', '10')
    before = digest(page)
    click(page, '#auto-size')
    assert digest(page) != before
    fill(page, '#hole-size', '10')
    for value in ['circle', 'square']:
        before = digest(page)
        click(page, f'[data-shape={value}]', 'shape-' + value)
        assert digest(page) != before
    before = digest(page)
    fill(page, '#density', '50')
    assert digest(page) != before
    page.locator('#depth').uncheck()
    covered.add('depth')
    ready(page)
    before = digest(page)
    page.locator('#depth').check()
    ready(page)
    assert digest(page) != before
    page.locator('#depth').uncheck()
    ready(page)
    page.locator('#font-style').select_option('fusion')
    covered.add('font-style')
    ready(page)
    fusion = digest(page)
    page.locator('#font-style').select_option('classic')
    ready(page)
    assert digest(page) != fusion
    fill(page, '#letters', 'ALIVE ART ALIVE ART')
    fill(page, '#hole-size', '10')
    fill(page, '#density', '32')
    wide = geometry(page)['lines']
    fill(page, '#area-width', '35')
    narrow = geometry(page)['lines']
    assert len(narrow) > len(wide), (wide, narrow)
    record('text, colors, all swatches, size/auto, shapes, spacing, font, depth, and width affect rendering')

    # Both position controls must move real pixels AND the actual downloaded SVG.
    fill(page, '#letters', 'ART')
    fill(page, '#hole-size', '10')
    fill(page, '#area-width', '84')
    fill(page, '#paper-color', '#ff00ff')
    for mode, split in [('punch', None), ('transfer', 'vertical'), ('transfer', 'horizontal')]:
        click(page, f'[data-mode={mode}]', 'mode-' + mode)
        if split:
            click(page, f'[data-split={split}]', 'split-' + split)
        assert page.locator('#position').is_enabled() and page.locator('#position-x').is_enabled()
        for selector, axis in [('#position-x', 'minx'), ('#position', 'miny')]:
            fill(page, selector, 0)
            lower = pixel_bounds(page, mode)
            lower_svg = svg_bounds(download(page, 'svg', f'{mode}-{split or "image"}-{axis}-0.svg'), mode)
            fill(page, selector, 100)
            upper = pixel_bounds(page, mode)
            upper_svg = svg_bounds(download(page, 'svg', f'{mode}-{split or "image"}-{axis}-100.svg'), mode)
            assert lower['count'] > 0 and upper['count'] > 0
            assert upper[axis] - lower[axis] > 10, (mode, split, axis, lower, upper)
            assert upper_svg[axis] - lower_svg[axis] > 10, (mode, split, axis, lower_svg, upper_svg)
            record(f'{mode} / {split or "image"} / {selector[1:]} moves pixels and exported geometry', {'pixels': round(upper[axis]-lower[axis], 2), 'svg': round(upper_svg[axis]-lower_svg[axis], 2)})
            fill(page, selector, 50)

    # Every original-image setting changes only that region, leaving caption pixels exact.
    click(page, '[data-split=vertical]', 'split-vertical')
    if not page.locator('#image-settings').evaluate('d=>d.open'):
        click(page, '#image-settings > summary', 'summary-image-settings', render=False)
    else:
        click(page, '#image-settings > summary', 'summary-image-settings', render=False)
        click(page, '#image-settings > summary', 'summary-image-settings', render=False)
    changes = [('#image-density', '8'), ('#image-hole-size', '40'), ('#image-color', '#00ffff')]
    for selector, value in changes:
        before = region_hashes(page)
        fill(page, selector, value)
        after = region_hashes(page)
        assert before['source'] != after['source'], selector
        assert before['caption'] == after['caption'], selector
        record(selector[1:] + ' independently changes only original pixels')
    for value in ['circle', 'square']:
        before = region_hashes(page)
        click(page, f'[data-image-shape={value}]', 'image-shape-' + value)
        after = region_hashes(page)
        assert before['source'] != after['source']
        assert before['caption'] == after['caption']
    before = region_hashes(page)
    click(page, '#link-image-color')
    after = region_hashes(page)
    assert before['source'] != after['source'] and before['caption'] == after['caption']
    fill(page, '#image-density', '0')
    assert geometry(page)['sourceHoles'] == 0
    record('source shape and linked color are independent; zero density removes original holes')

    click(page, '[data-split=horizontal]', 'split-horizontal')
    horizontal = read(page)
    assert horizontal['width'] > 800 and horizontal['height'] >= 600
    page.screenshot(path=OUT / 'horizontal.png', full_page=True)
    click(page, '[data-split=vertical]', 'split-vertical')
    vertical = read(page)
    assert vertical['width'] == 800 and vertical['height'] > 600
    page.screenshot(path=OUT / 'vertical.png', full_page=True)
    click(page, '[data-split=auto]', 'split-auto')
    assert geometry(page)['split'] == 'vertical'
    upload(page, portrait)
    assert geometry(page, 600, 800)['split'] == 'horizontal'
    upload(page, landscape)
    record('vertical, horizontal, and aspect-ratio auto composition have correct dimensions')

    before = digest(page)
    click(page, '#reset')
    assert digest(page) != before
    state = read(page)['settings']
    assert state['autoSize'] and state['autoColor'] and state['imageHoleColor'] is None
    record('reset restores defaults and generates a new preview')

    result = digest(page)
    click(page, '#view-original')
    assert digest(page) != result
    # Export always uses the result even when original preview is selected.
    assert page.locator('#export-bottom').count() == 0
    assert page.locator('.export-trigger').count() == 1
    png = download(page, 'png', 'export-from-original.png')
    dimensions = read(page)
    assert struct.unpack('>II', png.read_bytes()[16:24]) == (round(dimensions['width']), round(dimensions['height']))
    click(page, '#view-result')
    assert digest(page) == result
    width_before = page.locator('#artwork').evaluate('c=>parseFloat(c.style.width)')
    fill(page, '#zoom', '150')
    width_after = page.locator('#artwork').evaluate('c=>parseFloat(c.style.width)')
    assert width_after > width_before and digest(page) == result
    click(page, '#export-top', render=False)
    assert page.locator('#export-dialog').evaluate('d=>d.open')
    click(page, '.dialog-close', 'dialog-close', render=False)
    assert not page.locator('#export-dialog').evaluate('d=>d.open')
    png2 = download(page, 'png', 'export-2x.png', scale='2')
    assert struct.unpack('>II', png2.read_bytes()[16:24]) == (round(dimensions['width']*2), round(dimensions['height']*2))
    download(page, 'svg', 'export.svg')
    record('original/result, zoom, sole top export entry, close, scales, PNG, and SVG work')

    # Ctrl+wheel controls only the artwork view, with a real sensitivity effect.
    before_wheel = download(page, 'svg', 'before-wheel.svg').read_bytes()
    fill(page, '#zoom', '100')
    fill(page, '#zoom-sensitivity', '0.2')
    page.locator('#stage').hover()
    page.keyboard.down('Control')
    page.mouse.wheel(0, -120)
    page.keyboard.up('Control')
    ready(page)
    low = float(page.locator('#zoom').input_value())
    fill(page, '#zoom', '100')
    fill(page, '#zoom-sensitivity', '2.5')
    page.locator('#stage').hover()
    page.keyboard.down('Control')
    page.mouse.wheel(0, -120)
    page.keyboard.up('Control')
    ready(page)
    high = float(page.locator('#zoom').input_value())
    assert low > 100 and high - low > 25, (low, high)
    assert page.evaluate('visualViewport.scale') == 1
    before_regular = page.locator('#zoom').input_value()
    page.locator('#stage').hover()
    page.mouse.wheel(0, 120)
    ready(page)
    assert page.locator('#zoom').input_value() == before_regular
    assert digest(page) == result
    after_wheel = download(page, 'svg', 'after-wheel.svg').read_bytes()
    assert before_wheel == after_wheel
    fill(page, '#zoom', '25')
    smallest = page.locator('#artwork').evaluate('c=>parseFloat(c.style.width)')
    fill(page, '#zoom', '300')
    largest = page.locator('#artwork').evaluate('c=>parseFloat(c.style.width)')
    assert abs(largest / smallest - 12) < .01
    record('Ctrl+wheel sensitivity, ordinary wheel, 25–300% range, and unchanged export', {'lowSensitivityZoom': low, 'highSensitivityZoom': high})

    # The brand link is actionable navigation and correctly reloads the editor.
    click(page, '.brand', 'brand', render=False)
    ready(page)
    assert page.locator('#image-name').inner_text() == demo_name
    record('brand returns to fresh editor')
    inventory = page.evaluate('''()=>Array.from(document.querySelectorAll('button,input,select,textarea,details>summary,a.brand')).map(e=>{
      if(e.id)return e.id;
      if(e.dataset.mode)return 'mode-'+e.dataset.mode;
      if(e.dataset.shape)return 'shape-'+e.dataset.shape;
      if(e.dataset.split)return 'split-'+e.dataset.split;
      if(e.dataset.imageShape)return 'image-shape-'+e.dataset.imageShape;
      if(e.matches('#swatches button'))return 'swatch-'+Array.from(e.parentElement.children).indexOf(e);
      if(e.tagName==='SUMMARY')return 'summary-'+(e.parentElement.id||e.parentElement.className);
      if(e.classList.contains('dialog-close'))return 'dialog-close';
      if(e.classList.contains('brand'))return 'brand';
      return e.outerHTML.slice(0,160);
    })''')
    missing = sorted(set(inventory) - covered)
    assert not missing, 'controls never exercised: ' + repr(missing)
    assert not errors, errors
    record('complete actionable-control coverage / no browser exceptions', {'controls': len(set(inventory)), 'covered': sorted(covered)})
    browser.close()

(OUT / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
