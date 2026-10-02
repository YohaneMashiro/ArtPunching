"""Real-browser seven-day settings persistence and safe storage fallback."""
import json
import os
from pathlib import Path
import time

from playwright.sync_api import sync_playwright

BASE = os.environ.get('PUNCH_TEST_URL', 'http://localhost:4173/')
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'artifacts' / 'state'
OUT.mkdir(parents=True, exist_ok=True)
KEY = 'alive-punch-state-v1'
DAY = 24 * 60 * 60 * 1000
results = []


def record(name, detail='passed'):
    results.append({'check': name, 'result': detail})
    print(name, detail, flush=True)


def ready(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
    page.wait_for_function("!document.getElementById('export-top').disabled")


def setup(context):
    context.add_init_script("window.__stateTools=[];Object.defineProperty(document,'modelContext',{value:{registerTool(t){window.__stateTools.push(t)}}});")


def read(page):
    return page.evaluate("window.__stateTools.find(t=>t.name==='read_punch_art').execute({})")


def saved(page, expected=None):
    page.wait_for_function('''([key,expected])=>{
      const raw=localStorage.getItem(key);if(!raw)return false;const s=JSON.parse(raw);
      return !expected||Object.entries(expected).every(([k,v])=>JSON.stringify(s[k])===JSON.stringify(v));
    }''', arg=[KEY, expected])
    return page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)


def edit(page, selector, value):
    page.locator(selector).fill(str(value))
    ready(page)


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    setup(context)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE)
    ready(page)
    defaults = read(page)['settings'].copy()
    assert page.locator('#language-select').input_value() == 'zh'
    page.locator('#language-select').select_option('en')
    page.locator('[data-mode=transfer]').click()
    page.locator('[data-split=horizontal]').click()
    ready(page)
    page.locator('#letters').fill('REMEMBER ME\n记得我')
    ready(page)
    for selector, value in [('#position-x', '23'), ('#position', '61'), ('#density', '41'), ('#area-width', '73'), ('#zoom', '185')]:
        edit(page, selector, value)
    page.locator('#sensitivity-settings>summary').click()
    edit(page, '#zoom-sensitivity', '1.7')
    page.locator('#paper-settings>summary').click()
    edit(page, '#paper-color', '#abcdef')
    page.locator('#image-settings>summary').click()
    edit(page, '#image-color', '#123456')
    edit(page, '#image-density', '6')
    edit(page, '#image-hole-size', '37')
    page.locator('[data-image-shape=circle]').click()
    page.locator('#view-original').click()
    ready(page)
    page.locator('#export-top').click()
    page.locator('#export-scale').select_option('2')
    page.locator('.dialog-close').click()
    expected = {'language': 'en', 'letters': page.locator('#letters').input_value(), 'settings': read(page)['settings']}
    state = saved(page, expected)
    assert state['version'] == 1 and isinstance(state['savedAt'], (int, float))
    assert state['view'] == {'zoom': 1.85, 'sensitivity': 1.7, 'original': True, 'exportScale': 2}
    page.reload()
    ready(page)
    assert read(page)['settings'] == expected['settings']
    assert page.locator('#letters').input_value() == expected['letters']
    assert page.locator('#language-select').input_value() == 'en'
    assert page.locator('#zoom').input_value() == '185'
    assert page.locator('#zoom-sensitivity').input_value() == '1.7'
    assert page.locator('#view-original').get_attribute('aria-pressed') == 'true'
    assert page.locator('#export-scale').input_value() == '2'
    second = context.new_page()
    second.goto(BASE)
    ready(second)
    assert read(second)['settings'] == expected['settings']
    assert second.locator('#letters').input_value() == expected['letters']
    assert second.locator('#language-select').input_value() == 'en'
    second.close()
    record('reload and another page restore language, letters, every artwork setting and preview/export preferences')

    page.locator('#image-file').set_input_files({'name': '用户原画.png', 'mimeType': 'image/png', 'buffer': (ROOT / 'dist' / 'assets' / 'sample.png').read_bytes()})
    page.wait_for_function("document.getElementById('image-name').textContent==='用户原画.png'")
    ready(page)
    assert page.locator('#sample-credit').is_hidden()
    raw = page.evaluate('key=>localStorage.getItem(key)', KEY)
    assert 'data:image' not in raw and 'blob:' not in raw
    page.reload()
    ready(page)
    assert page.locator('#sample-credit').is_visible()
    assert page.locator('#image-name').inner_text() != '用户原画.png'
    assert read(page)['settings'] == expected['settings']
    record('uploaded image is not stored; reload restores settings with the attributed demo source')

    # Valid state six days old survives, then interaction advances the expiry clock.
    old = state.copy()
    old['savedAt'] = int(time.time() * 1000) - 6 * DAY
    page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))', [KEY, old])
    page.reload()
    ready(page)
    assert page.locator('#language-select').input_value() == 'en'
    edit(page, '#position-x', '24')
    fresh = saved(page, {'settings': read(page)['settings']})
    assert fresh['savedAt'] >= int(time.time() * 1000) - 10_000
    expired = {**fresh, 'savedAt': int(time.time() * 1000) - 8 * DAY}
    page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))', [KEY, expired])
    page.reload()
    ready(page)
    assert page.locator('#language-select').input_value() == 'zh'
    assert read(page)['settings'] == defaults
    assert page.locator('#letters').input_value() == 'ALIVE ART'
    record('seven-day sliding expiry: six-day record restores, interaction refreshes timestamp, eight-day record resets')

    for bad in ['{broken', json.dumps({'version': 99}), json.dumps({**state, 'savedAt': int(time.time() * 1000) + 120_000})]:
        page.evaluate('([key,s])=>localStorage.setItem(key,s)', [KEY, bad])
        page.reload()
        ready(page)
        assert page.locator('#language-select').input_value() == 'zh'
        assert read(page)['settings'] == defaults
    mixed = {**state, 'savedAt': int(time.time() * 1000), 'language': 'en', 'letters': {'invalid': True}, 'unknown': 'ignored',
             'settings': {**defaults, 'mode': 'invalid', 'split': 'diagonal', 'shape': 'triangle', 'paperColor': '#ABCDEF', 'autoColor': False, 'holeSize': -1, 'autoSize': 'yes', 'positionX': 999, 'positionY': -2, 'spacing': 999, 'areaWidth': 0, 'imageDensity': 999, 'imageHoleSize': 999, 'imageShape': 'triangle', 'imageHoleColor': 'invalid', 'fontStyle': 'invalid', 'depth': 'yes'},
             'view': {'zoom': 99, 'sensitivity': -1, 'original': 'yes', 'exportScale': 99}}
    page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))', [KEY, mixed])
    page.reload()
    ready(page)
    normalized = read(page)['settings']
    assert page.locator('#language-select').input_value() == 'en'
    assert normalized['paperColor'] == '#abcdef'
    for key in ['mode', 'split', 'shape', 'holeSize', 'autoSize', 'positionX', 'positionY', 'spacing', 'areaWidth', 'imageDensity', 'imageHoleSize', 'imageShape', 'imageHoleColor', 'fontStyle', 'depth']:
        assert normalized[key] == defaults[key], (key, normalized[key], defaults[key])
    assert page.locator('#zoom').input_value() == '100'
    assert page.locator('#zoom-sensitivity').input_value() == '1'
    assert page.locator('#view-result').get_attribute('aria-pressed') == 'true'
    record('corrupt/version/future records safely reset; mixed invalid fields default individually and valid uppercase HEX normalizes')

    if not page.locator('#paper-settings').evaluate('d=>d.open'):
        page.locator('#paper-settings>summary').click()
    page.locator('#auto-color').click()
    ready(page)
    before = saved(page, {'settings': read(page)['settings']})
    page.locator('#paper-palette').click()
    edit(page, '#palette-hex', '#ff0000')
    assert read(page)['settings']['paperColor'] == '#ff0000'
    page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide'))")
    assert saved(page)['settings'] == before['settings']
    page.locator('#palette-cancel').click()
    ready(page)
    assert saved(page, {'settings': before['settings']})['settings']['autoColor']
    page.reload()
    ready(page)
    assert read(page)['settings'] == before['settings']
    page.locator('#paper-settings>summary').click()
    page.locator('#paper-palette').click()
    edit(page, '#palette-hex', '#334455')
    page.locator('#palette-apply').click()
    ready(page)
    applied = saved(page, {'settings': read(page)['settings']})
    assert applied['settings']['paperColor'] == '#334455' and not applied['settings']['autoColor']
    page.reload()
    ready(page)
    assert read(page)['settings']['paperColor'] == '#334455'
    record('palette live preview does not persist; Cancel preserves auto state; Done persists committed custom color')

    for blocked in ['quota', 'private']:
        isolated = browser.new_context()
        setup(isolated)
        if blocked == 'quota':
            isolated.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('Storage full','QuotaExceededError')}")
        else:
            isolated.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage unavailable','SecurityError')}})")
        fallback = isolated.new_page()
        fallback.on('pageerror', lambda e: errors.append(str(e)))
        fallback.goto(BASE)
        ready(fallback)
        fallback.locator('#language-select').select_option('en')
        edit(fallback, '#letters', 'STILL WORKS')
        edit(fallback, '#position-x', '12')
        assert read(fallback)['valid'] and read(fallback)['settings']['positionX'] == 12
        fallback.reload()
        ready(fallback)
        assert fallback.locator('#language-select').input_value() == 'zh'
        isolated.close()
    assert not errors, errors
    record('quota exhaustion and blocked/private storage keep the editor usable without browser exceptions')
    browser.close()

(OUT / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
