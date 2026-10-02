"""Browser palette regression: pixels, exports, rollback, keyboard and touch."""
import base64
import colorsys
import hashlib
import json
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from playwright.sync_api import sync_playwright

BASE = os.environ.get('PUNCH_TEST_URL', 'http://localhost:4173/')
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'artifacts' / 'palette'
OUT.mkdir(parents=True, exist_ok=True)
results = []


def record(name, detail='passed'):
    results.append({'check': name, 'result': detail})
    print(name, detail, flush=True)


def ready(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
    page.wait_for_function("!document.getElementById('export-top').disabled")


def read(page):
    return page.evaluate("window.__paletteTools.find(t=>t.name==='read_punch_art').execute({})")


def digest(page, rect=None):
    data = page.locator('#artwork').evaluate('''(c,r)=>{
      if(!r)return c.toDataURL();const out=document.createElement('canvas');out.width=r.width;out.height=r.height;
      out.getContext('2d').drawImage(c,r.x,r.y,r.width,r.height,0,0,r.width,r.height);return out.toDataURL();
    }''', rect)
    return hashlib.sha256(data.encode()).hexdigest()


def fill(page, selector, value):
    page.locator(selector).fill(str(value))
    ready(page)


def reveal(page, selector):
    if not page.locator(selector).evaluate('d=>d.open'):
        page.locator(selector + '>summary').click()


def open_palette(page, target='paper'):
    reveal(page, '#paper-settings' if target == 'paper' else '#image-settings')
    page.locator('#' + target + '-palette').click()
    assert page.locator('#palette-dialog').evaluate('d=>d.open')


def close_palette(page, action):
    if action == 'escape':
        page.keyboard.press('Escape')
    elif action == 'outside':
        page.mouse.click(5, 5)
    else:
        page.locator('#palette-' + action).click()
    page.wait_for_function("!document.getElementById('palette-dialog').open")
    ready(page)


def rgb(page):
    return [int(page.locator('#palette-' + c).input_value()) for c in 'rgb']


def count_color(page, color):
    return page.locator('#artwork').evaluate('''(c,color)=>{
      const values=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;
      for(let i=0;i<d.length;i+=4)if(values.every((v,j)=>d[i+j]===v)&&d[i+3]===255)n++;return n;
    }''', color)


def fixture(page):
    data = page.evaluate('''()=>{
      const c=document.createElement('canvas');c.width=800;c.height=600;const cx=c.getContext('2d'),im=cx.createImageData(800,600);
      for(let y=0;y<600;y++)for(let x=0;x<800;x++){const i=(y*800+x)*4;im.data[i]=30+x%180;im.data[i+1]=40+y%180;im.data[i+2]=100;im.data[i+3]=255;}
      cx.putImageData(im,0,0);return c.toDataURL().split(',')[1];
    }''')
    page.locator('#image-file').set_input_files({'name': 'palette-source.png', 'mimeType': 'image/png', 'buffer': base64.b64decode(data)})
    page.wait_for_function("document.getElementById('image-name').textContent==='palette-source.png'")
    ready(page)


with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    context.add_init_script("window.__paletteTools=[];Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.__paletteTools.push(t)}}});")
    page = context.new_page()
    page.set_default_timeout(15000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE)
    ready(page)
    assert page.locator('input[type=color]').count() == 0
    assert page.locator('#paper-color').get_attribute('type') == 'text'
    assert page.locator('#image-color').get_attribute('type') == 'text'
    fixture(page)
    reveal(page, '#paper-settings')
    for text, canonical in [('abc', '#aabbcc'), ('1A2B3C', '#1a2b3c'), ('#ef9', '#eeff99')]:
        fill(page, '#paper-color', text)
        assert read(page)['settings']['paperColor'] == canonical
        assert count_color(page, canonical) > 100
    valid_pixels = digest(page)
    fill(page, '#paper-color', 'oops')
    assert page.locator('#paper-color').input_value() == 'oops'
    assert read(page)['settings']['paperColor'] == '#eeff99'
    assert digest(page) == valid_pixels
    fill(page, '#paper-color', '#eeff99')
    record('no native color picker / inline short and full HEX / invalid draft retains pixels')

    # All dismissal paths roll back both color and automatic color selection.
    page.locator('#auto-color').click()
    ready(page)
    for action in ['cancel', 'close', 'escape', 'outside']:
        before = read(page)['settings'].copy()
        pixels_before = digest(page)
        open_palette(page)
        fill(page, '#palette-hex', '#ff0000')
        assert read(page)['settings']['paperColor'] == '#ff0000'
        assert not read(page)['settings']['autoColor']
        assert digest(page) != pixels_before
        close_palette(page, action)
        assert read(page)['settings'] == before
        assert digest(page) == pixels_before
    record('live paper preview / Cancel, X, Escape and outside restore automatic state and pixels')

    open_palette(page)
    fill(page, '#palette-hex', '#ff0000')
    assert rgb(page) == [255, 0, 0]
    assert abs(float(page.locator('#palette-hue').input_value())) < 1
    red_pixels = digest(page)
    for text in ['zzzzzz', '#12345', '']:
        fill(page, '#palette-hex', text)
        assert page.locator('#palette-hex').input_value() == text
        assert page.locator('#palette-apply').is_disabled()
        assert page.locator('#palette-error').inner_text()
        assert digest(page) == red_pixels
    fill(page, '#palette-hex', '#ff0000')
    for value in ['-1', '256', '0.5', '']:
        fill(page, '#palette-r', value)
        assert page.locator('#palette-r').input_value() == value
        assert page.locator('#palette-apply').is_disabled()
        assert digest(page) == red_pixels
        fill(page, '#palette-hex', '#ff0000')
    for channel, value in [('r', 12), ('g', 34), ('b', 56)]:
        fill(page, '#palette-' + channel, value)
    assert rgb(page) == [12, 34, 56]
    assert read(page)['settings']['paperColor'] == '#0c2238'
    assert not page.locator('#palette-apply').is_disabled()
    record('HEX/RGB synchronization / malformed HEX and noninteger/out-of-range RGB block apply without clearing drafts')

    fill(page, '#palette-hex', '#ff0000')
    fill(page, '#palette-hue', 240)
    assert rgb(page) == [0, 0, 255]
    surface = page.locator('#palette-sv')
    assert surface.get_attribute('role') == 'slider'
    assert surface.get_attribute('tabindex') == '0'
    box = surface.bounding_box()
    page.mouse.click(box['x'] + box['width'] * .25, box['y'] + box['height'] * .75)
    ready(page)
    expected = [round(v * 255) for v in colorsys.hsv_to_rgb(240 / 360, .25, .25)]
    assert all(abs(a-b) <= 2 for a, b in zip(rgb(page), expected)), (rgb(page), expected)
    fill(page, '#palette-hex', '#ff0000')
    surface.focus()
    page.keyboard.press('ArrowLeft')
    ready(page)
    first = rgb(page)
    page.keyboard.press('Shift+ArrowLeft')
    ready(page)
    second = rgb(page)
    assert second[1] - first[1] > 20 and first[0] == second[0] == 255
    page.keyboard.press('ArrowDown')
    ready(page)
    assert rgb(page)[0] < second[0]
    assert page.locator('#palette-sv').get_attribute('aria-valuetext')
    page.evaluate("window.__paletteCaptured=false;document.getElementById('palette-sv').addEventListener('gotpointercapture',()=>window.__paletteCaptured=true)")
    box = surface.bounding_box()
    page.mouse.move(box['x'] + box['width'] * .1, box['y'] + box['height'] * .4)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] + 40, box['y'] + box['height'] * .4)
    page.mouse.up()
    ready(page)
    assert page.evaluate('window.__paletteCaptured')
    assert rgb(page)[1:] == [0, 0]
    close_palette(page, 'apply')
    committed = read(page)['settings']['paperColor']
    assert not read(page)['settings']['autoColor'] and count_color(page, committed) > 100
    record('HSV surface coordinates, keyboard fine/Shift steps, pointer capture outside surface and Done commit')

    # Source color lives in the image region; the caption pixels remain unchanged.
    page.locator('[data-mode=transfer]').click()
    page.locator('[data-split=vertical]').click()
    ready(page)
    reveal(page, '#image-settings')
    if page.locator('#link-image-color').get_attribute('aria-pressed') != 'true':
        page.locator('#link-image-color').click()
        ready(page)
    image_before = read(page)['settings'].copy()
    source_rect = {'x': 0, 'y': 0, 'width': 800, 'height': 600}
    canvas_height = page.locator('#artwork').evaluate('c=>c.height')
    caption_rect = {'x': 0, 'y': 600, 'width': 800, 'height': canvas_height - 600}
    source_before, caption_before = digest(page, source_rect), digest(page, caption_rect)
    open_palette(page, 'image')
    fill(page, '#palette-hex', '0ff')
    assert read(page)['settings']['imageHoleColor'] == '#00ffff'
    assert digest(page, source_rect) != source_before
    assert digest(page, caption_rect) == caption_before
    close_palette(page, 'cancel')
    assert read(page)['settings'] == image_before
    assert page.locator('#link-image-color').get_attribute('aria-pressed') == 'true'
    open_palette(page, 'image')
    fill(page, '#palette-hex', '#00ffff')
    close_palette(page, 'apply')
    assert read(page)['settings']['imageHoleColor'] == '#00ffff'
    assert digest(page, caption_rect) == caption_before
    assert count_color(page, '#00ffff') > 100
    record('image target independent of caption / Cancel restores follow-paper / Done commits custom source color')

    # Export color is the same color that the browser canvas renders.
    page.locator('#export-top').click()
    with page.expect_download() as pending:
        page.locator('#download-svg').click()
    svg = OUT / 'palette.svg'
    pending.value.save_as(svg)
    fills = {node.attrib.get('fill') for node in ET.fromstring(svg.read_text()).iter()}
    assert '#00ffff' in fills and committed in fills
    page.locator('#export-top').click()
    with page.expect_download() as pending:
        page.locator('#download-png').click()
    png = OUT / 'palette.png'
    pending.value.save_as(png)
    count = page.evaluate('''async data=>{
      const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;
      c.getContext('2d').drawImage(i,0,0);const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;
      for(let at=0;at<d.length;at+=4)if(d[at]===0&&d[at+1]===255&&d[at+2]===255)n++;return n;
    }''', base64.b64encode(png.read_bytes()).decode())
    assert count > 100
    record('canvas color agrees with downloaded PNG and SVG color geometry')

    page.locator('#language-select').select_option('en')
    ready(page)
    open_palette(page)
    english = page.locator('#palette-dialog').inner_text()
    assert not re.search(r'[\u3400-\u9fff]', english), english
    fill(page, '#palette-hex', 'oops')
    assert page.locator('#palette-error').inner_text()
    assert not re.search(r'[\u3400-\u9fff]', page.locator('#palette-error').inner_text())
    for attr in ['aria-label', 'aria-valuetext']:
        assert not re.search(r'[\u3400-\u9fff]', surface.get_attribute(attr) or '')
    close_palette(page, 'cancel')
    record('English palette labels, accessibility and invalid draft message')

    mobile = browser.new_page(viewport={'width': 360, 'height': 800}, is_mobile=True, has_touch=True)
    mobile.on('pageerror', lambda e: errors.append(str(e)))
    mobile.goto(BASE)
    ready(mobile)
    reveal(mobile, '#paper-settings')
    open_palette(mobile)
    fill(mobile, '#palette-hex', '#ff0000')
    fill(mobile, '#palette-hue', 120)
    mobile.evaluate("window.__palettePointerType='';document.getElementById('palette-sv').addEventListener('pointerdown',e=>window.__palettePointerType=e.pointerType)")
    box = mobile.locator('#palette-sv').bounding_box()
    mobile.touchscreen.tap(box['x'] + box['width'] * .75, box['y'] + box['height'] * .25)
    ready(mobile)
    expected = [round(v * 255) for v in colorsys.hsv_to_rgb(120 / 360, .75, .75)]
    assert all(abs(a-b) <= 2 for a, b in zip(rgb(mobile), expected)), (rgb(mobile), expected)
    assert mobile.evaluate('window.__palettePointerType') == 'touch'
    dialog_box = mobile.locator('#palette-dialog').bounding_box()
    assert dialog_box['x'] >= 0 and dialog_box['x'] + dialog_box['width'] <= 360
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    touch_color = read(mobile)['settings']['paperColor'] if mobile.evaluate('window.__paletteTools!==undefined') else mobile.locator('#paper-color').input_value()
    assert count_color(mobile, touch_color.lower()) > 100
    mobile.screenshot(path=OUT / 'touch-palette.png', full_page=True)
    close_palette(mobile, 'apply')
    assert not errors, errors
    record('Android-sized touch HSV interaction, actual artwork color and responsive palette / no exceptions')
    browser.close()

(OUT / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
