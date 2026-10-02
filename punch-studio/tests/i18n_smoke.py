"""Real-browser Chinese/English UI and demo attribution regression."""
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET

from playwright.sync_api import sync_playwright

BASE = os.environ.get('PUNCH_TEST_URL', 'http://localhost:4173/')
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'artifacts' / 'i18n'
OUT.mkdir(parents=True, exist_ok=True)
AUTHOR = '十二時'
AUTHOR_URL = 'https://xhslink.cn/o/75GwJDczjxb'
CJK = re.compile(r'[\u3400-\u9fff]')
results = []


def record(name, detail='passed'):
    results.append({'check': name, 'result': detail})
    print(name, detail, flush=True)


def settle(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')


def ready(page):
    settle(page)
    page.wait_for_function("!document.getElementById('export-top').disabled")


def read(page):
    return page.evaluate("window.__i18nTools.find(t=>t.name==='read_punch_art').execute({})")


def digest(page):
    return hashlib.sha256(page.locator('#artwork').evaluate('(c)=>c.toDataURL()').encode()).hexdigest()


def language(page, value, valid=True):
    page.locator('#language-select').select_option(value)
    ready(page) if valid else settle(page)
    assert page.locator('html').get_attribute('lang').startswith(value)


def open_details(page, selector):
    if not page.locator(selector).evaluate('d=>d.open'):
        page.locator(selector + ' > summary').click()


def no_cjk(text, label):
    assert not CJK.search(text.replace(AUTHOR, '')), (label, text)


def english_ui(page):
    assert page.locator('html').get_attribute('lang').startswith('en')
    no_cjk(page.title(), 'document title')
    assert 'alive' in page.title().lower()
    no_cjk(page.locator('meta[name=description]').get_attribute('content'), 'meta description')
    leftovers = page.evaluate('''()=>{
      const leftovers=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      let node;
      while(node=walker.nextNode()){
        const p=node.parentElement;
        if(!p||p.closest('script,style,textarea,#image-name,#sample-credit,#language-select'))continue;
        if(!p.checkVisibility())continue;
        if(/[\\u3400-\\u9fff]/.test(node.textContent))leftovers.push(node.textContent.trim());
      }
      return leftovers;
    }''')
    assert not leftovers, 'untranslated visible UI: ' + repr(leftovers)
    attrs = page.evaluate('''()=>Array.from(document.querySelectorAll('[aria-label],[title],[placeholder],img[alt]')).flatMap(e=>
      ['aria-label','title','placeholder','alt'].filter(a=>e.hasAttribute(a)).map(a=>({element:e.id||e.tagName,attribute:a,value:e.getAttribute(a)}))
    )''')
    image_name = page.locator('#image-name').inner_text()
    for attr in attrs:
        no_cjk(attr['value'].replace(image_name, ''), attr['element'] + ' ' + attr['attribute'])
    assert page.locator('#letters').get_attribute('placeholder')
    no_cjk(page.locator('#sample-credit').inner_text(), 'credit label')
    for selector in ['#font-state', '#hole-count', '#line-count', '#size-hint', '#composition-hint', '#color-description']:
        no_cjk(page.locator(selector).inner_text(), selector)


def fill(page, selector, value, valid=True):
    page.locator(selector).fill(str(value))
    ready(page) if valid else settle(page)


def expect_english_error(page):
    page.wait_for_function("document.getElementById('export-top').disabled && document.getElementById('status').classList.contains('error') && document.getElementById('status').textContent.length>0")
    message = page.locator('#status').inner_text()
    no_cjk(message, 'error message')
    assert len(message) > 8
    no_cjk(page.locator('#loading').inner_text(), 'stale preview overlay')
    return message


def assert_single_png_arrow(page):
    page.locator('#export-top').click()
    assert page.locator('#download-png').inner_text().count('↓') == 1
    page.locator('.dialog-close').click()
    assert not page.locator('#export-dialog').evaluate('d=>d.open')


def download(page, kind, name, scale='1'):
    page.locator('#export-top').click()
    assert page.locator('#download-png').inner_text().count('↓') == 1
    page.locator('#export-scale').select_option(scale)
    english_ui(page)
    no_cjk(page.locator('#export-dimensions').inner_text(), 'export dimensions')
    with page.expect_download() as pending:
        page.locator('#download-' + kind).click()
    path = OUT / name
    pending.value.save_as(path)
    page.wait_for_function("!document.getElementById('export-dialog').open")
    no_cjk(page.locator('#status').inner_text(), kind + ' export status')
    assert kind.upper() in page.locator('#status').inner_text()
    return path


with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(locale='en-US', viewport={'width': 1440, 'height': 1000})
    context.add_init_script("window.__i18nTools=[];Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.__i18nTools.push(t)}}});")
    page = context.new_page()
    page.set_default_timeout(15000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    ready(page)
    assert page.locator('#language-select').input_value() == 'zh'
    assert page.locator('html').get_attribute('lang').startswith('zh')
    assert CJK.search(page.locator('#export-top').inner_text())
    assert page.locator('#sample-credit').is_visible()
    assert AUTHOR in page.locator('#sample-credit a').inner_text()
    assert page.locator('#sample-credit a').get_attribute('href') == AUTHOR_URL
    assert page.locator('#export-bottom').count() == 0
    assert page.locator('.export-trigger').count() == 1
    assert_single_png_arrow(page)
    record('Chinese default in English browser / real demo author link')

    page.locator('[data-mode=transfer]').click()
    page.locator('[data-split=horizontal]').click()
    ready(page)
    for selector in ['#text-settings', '#image-settings', '#paper-settings', '#sensitivity-settings']:
        open_details(page, selector)
    fill(page, '#letters', '绿野 ART\nCafé')
    fill(page, '#paper-color', '#d8eff0')
    fill(page, '#image-color', '#eeeecc')
    fill(page, '#image-density', '6')
    fill(page, '#position-x', '25')
    fill(page, '#position', '65')
    fill(page, '#zoom', '170')
    fill(page, '#zoom-sensitivity', '1.8')
    before = {'pixels': digest(page), 'state': read(page), 'text': page.locator('#letters').input_value(), 'zoom': page.locator('#zoom').input_value(), 'sensitivity': page.locator('#zoom-sensitivity').input_value()}
    language(page, 'en')
    english_ui(page)
    assert read(page)['settings'] == before['state']['settings']
    assert digest(page) == before['pixels']
    assert page.locator('#letters').input_value() == before['text']
    assert page.locator('#zoom').input_value() == before['zoom']
    assert page.locator('#zoom-sensitivity').input_value() == before['sensitivity']
    assert page.locator('#sample-credit').is_visible()
    assert_single_png_arrow(page)
    page.screenshot(path=OUT / 'english-desktop.png')
    record('English static, dynamic, accessibility, placeholders and tooltips / editor state preserved')

    # An uploaded user filename remains untouched in both languages.
    custom_name = '我的原画.png'
    page.locator('#image-file').set_input_files({'name': custom_name, 'mimeType': 'image/png', 'buffer': (ROOT / 'dist' / 'assets' / 'sample.png').read_bytes()})
    page.wait_for_function("n=>document.getElementById('image-name').textContent===n", arg=custom_name)
    ready(page)
    assert page.locator('#sample-credit').is_hidden()
    uploaded = digest(page)
    language(page, 'zh')
    assert page.locator('#image-name').inner_text() == custom_name
    assert page.locator('#sample-credit').is_hidden()
    assert digest(page) == uploaded
    language(page, 'en')
    assert page.locator('#image-name').inner_text() == custom_name
    assert page.locator('#sample-credit').is_hidden()
    english_ui(page)
    page.locator('#use-demo').click()
    ready(page)
    assert page.locator('#sample-credit').is_visible()
    assert page.locator('#sample-credit a').get_attribute('href') == AUTHOR_URL
    no_cjk(page.locator('#image-name').inner_text(), 'translated demo filename')
    record('user filename preserved / author credit hides on upload and returns with demo')

    # Dynamic source modes, counts, hints and both layout labels stay English.
    for mode in ['punch', 'transfer']:
        page.locator(f'[data-mode={mode}]').click()
        ready(page)
        english_ui(page)
    for split in ['auto', 'vertical', 'horizontal']:
        page.locator(f'[data-split={split}]').click()
        ready(page)
        no_cjk(page.locator('#split-hint').inner_text(), 'split hint ' + split)
    fill(page, '#letters', ' ')
    assert '0' in page.locator('#hole-count').inner_text()
    english_ui(page)
    fill(page, '#letters', 'ALIVE ART')
    fill(page, '#hole-size', '12')
    english_ui(page)
    page.locator('#auto-size').click()
    ready(page)
    english_ui(page)
    record('all mode/layout hints, blank counts, automatic/manual size descriptions in English')

    # Keep decoding pending so the language change cannot hide behind a fast upload.
    language(page, 'zh')
    previous_pixels = digest(page)
    assert read(page)['valid']
    page.evaluate('''()=>{
      window.__originalImageBitmap=window.createImageBitmap;
      window.__decodeGate=new Promise(resolve=>window.__releaseDecode=resolve);
      window.__decodeReached=false;
      window.createImageBitmap=async(...args)=>{
        window.__decodeReached=true;
        await window.__decodeGate;
        return window.__originalImageBitmap.apply(window,args);
      };
    }''')
    held_name = '切换中的原画.png'
    page.locator('#image-file').set_input_files({'name': held_name, 'mimeType': 'image/png', 'buffer': (ROOT / 'dist' / 'assets' / 'sample.png').read_bytes()})
    page.wait_for_function('window.__decodeReached')
    assert page.locator('#export-top').is_disabled()
    language(page, 'en', valid=False)
    assert page.locator('#loading').is_visible()
    english_ui(page)
    for selector, label in [('#hole-count', 'holes'), ('#text-count', 'tiles'), ('#line-count', 'text lines')]:
        text = page.locator(selector).inner_text()
        no_cjk(text, 'pending decode ' + selector)
        assert label in text and re.search(r'\d', text), (selector, text)
    assert digest(page) == previous_pixels
    assert not read(page)['valid']
    page.evaluate('''()=>{
      window.__releaseDecode();
      window.createImageBitmap=window.__originalImageBitmap;
    }''')
    page.wait_for_function("n=>document.getElementById('image-name').textContent===n", arg=held_name)
    ready(page)
    assert page.locator('#image-name').inner_text() == held_name
    assert page.locator('#sample-credit').is_hidden()
    assert page.locator('#language-select').input_value() == 'en'
    english_ui(page)
    record('language switch during held image decode immediately translates old-plan counts and loading, then retains upload filename')

    fill(page, '#letters', 'ART 🧪', valid=False)
    glyph_error = expect_english_error(page)
    language(page, 'zh', valid=False)
    assert CJK.search(page.locator('#status').inner_text())
    assert page.locator('#export-top').is_disabled()
    assert page.locator('#letters').input_value() == 'ART 🧪'
    language(page, 'en', valid=False)
    expect_english_error(page)
    fill(page, '#letters', 'A' * 121, valid=False)
    length_error = expect_english_error(page)
    assert '120' in length_error
    fill(page, '#letters', 'ALIVE ART')
    page.locator('[data-mode=punch]').click()
    ready(page)
    fill(page, '#letters', 'ART ' * 25)
    fill(page, '#hole-size', '60', valid=False)
    overflow_error = expect_english_error(page)
    page.locator('#reset').click()
    ready(page)
    fill(page, '#letters', 'ALIVE ART')
    record('unsupported glyph, length, overflow errors and invalid state translate on language switch', {'glyph': glyph_error, 'length': length_error, 'overflow': overflow_error})

    # Upload rejection and decode failure translate without replacing the valid source.
    preserved = digest(page)
    page.locator('#image-file').set_input_files({'name': 'bad.txt', 'mimeType': 'text/plain', 'buffer': b'not an image'})
    settle(page)
    no_cjk(page.locator('#status').inner_text(), 'wrong-type upload')
    assert page.locator('#status').inner_text() and page.locator('#status').get_attribute('class').find('error') >= 0
    assert digest(page) == preserved
    page.locator('#image-file').set_input_files({'name': 'bad.png', 'mimeType': 'image/png', 'buffer': b'not an image'})
    page.wait_for_function("document.getElementById('status').classList.contains('error') && !document.getElementById('export-top').disabled")
    settle(page)
    no_cjk(page.locator('#status').inner_text(), 'decode failure')
    assert digest(page) == preserved
    record('upload validation/decode errors in English preserve the previous artwork')

    dimensions = read(page)
    png = download(page, 'png', 'english-2x.png', '2')
    assert png.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', png.read_bytes()[16:24]) == (round(dimensions['width'] * 2), round(dimensions['height'] * 2))
    svg = download(page, 'svg', 'english.svg')
    root = ET.fromstring(svg.read_text())
    assert float(root.attrib['width']) == dimensions['width']
    assert float(root.attrib['height']) == dimensions['height']
    record('English export dialog, dimensions, actions, completion messages and valid PNG/SVG downloads')

    page.reload()
    ready(page)
    assert page.locator('#language-select').input_value() == 'zh'
    assert page.locator('html').get_attribute('lang').startswith('zh')
    assert page.locator('#sample-credit').is_visible()
    record('new load always starts in Chinese')

    for width, height in [(390, 844), (320, 640)]:
        mobile = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, locale='en-US')
        mobile.on('pageerror', lambda error: errors.append(str(error)))
        mobile.goto(BASE)
        ready(mobile)
        assert mobile.locator('#language-select').input_value() == 'zh'
        language(mobile, 'en')
        mobile.locator('[data-mode=transfer]').click()
        mobile.locator('[data-split=horizontal]').click()
        ready(mobile)
        for selector in ['#image-settings', '#paper-settings', '#sensitivity-settings']:
            open_details(mobile, selector)
        english_ui(mobile)
        assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
        mobile.screenshot(path=OUT / f'english-mobile-{width}.png', full_page=True)
        mobile.close()
    assert not errors, errors
    record('English mobile layouts at 390/320px / no horizontal overflow / no browser exceptions')
    browser.close()

(OUT / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
