import test from 'node:test';
import assert from 'node:assert/strict';
import {STATE_KEY, STATE_TTL, browserStorage, readState, writeState} from '../dist/state.js';

const now = 1_800_000_000_000;
const defaults = Object.freeze({
  mode: 'punch', shape: 'square', autoSize: true, holeSize: 16, autoColor: true,
  paperColor: '#e8f2e9', spacing: 32, position: 82, positionY: 82, positionX: 50,
  areaWidth: 84, fontStyle: 'classic', depth: true, split: 'auto', imageDensity: 3.5,
  imageShape: 'square', imageHoleSize: 28, imageHoleColor: null,
});
const record = (overrides = {}) => ({version: 1, savedAt: now, language: 'zh', letters: 'ALIVE ART', ...overrides});

function memoryStorage(value = null) {
  let raw = value === null ? null : typeof value === 'string' ? value : JSON.stringify(value);
  const removed = [], written = [];
  return {
    removed, written,
    getItem: key => key === STATE_KEY ? raw : null,
    setItem(key, value) { assert.equal(key, STATE_KEY); raw = value; written.push(value); },
    removeItem(key) { assert.equal(key, STATE_KEY); raw = null; removed.push(key); },
  };
}

test('a recent browser session restores artwork settings, text and view without mutating defaults', () => {
  const settings = {
    mode: 'transfer', shape: 'circle', autoSize: false, holeSize: 22.5, autoColor: false,
    paperColor: '#AAbbCC', spacing: 45, positionY: 20, positionX: 70, areaWidth: 60,
    fontStyle: 'fusion', depth: false, split: 'horizontal', imageDensity: 7.5,
    imageShape: 'circle', imageHoleSize: 44, imageHoleColor: '#0033AA',
  };
  const view = {zoom: 1.8, sensitivity: 1.4, original: true, exportScale: 2};
  const storage = memoryStorage(record({language: 'en', letters: '慢慢来\nALIVE', settings, view}));
  assert.deepEqual(readState(storage, defaults, now + 1000), {
    language: 'en', letters: '慢慢来\nALIVE',
    settings: {...defaults, ...settings, paperColor: '#aabbcc', imageHoleColor: '#0033aa', position: 20},
    view,
  });
  assert.equal(defaults.positionY, 82);
  assert.equal(defaults.paperColor, '#e8f2e9');
  assert.deepEqual(storage.removed, []);
});

test('state survives until the seven-day boundary and expired records are removed', () => {
  assert.equal(STATE_TTL, 7 * 24 * 60 * 60 * 1000);
  const fresh = memoryStorage(record({savedAt: now - STATE_TTL + 1}));
  assert.ok(readState(fresh, defaults, now));
  assert.deepEqual(fresh.removed, []);
  for (const savedAt of [now - STATE_TTL, now - STATE_TTL - 1]) {
    const expired = memoryStorage(record({savedAt}));
    assert.equal(readState(expired, defaults, now), null);
    assert.deepEqual(expired.removed, [STATE_KEY]);
    assert.equal(expired.getItem(STATE_KEY), null);
  }
});

test('timestamp validation tolerates one minute of clock skew and rejects invalid or distant future records', () => {
  for (const savedAt of [now + 1, now + 60_000]) {
    const storage = memoryStorage(record({savedAt}));
    assert.ok(readState(storage, defaults, now));
    assert.deepEqual(storage.removed, []);
  }
  for (const savedAt of [now + 60_001, -1, '1800000000000', null, false, {}, undefined]) {
    const storage = memoryStorage(record({savedAt}));
    assert.equal(readState(storage, defaults, now), null);
    assert.deepEqual(storage.removed, [STATE_KEY]);
  }
});

test('unsupported versions and malformed stored data are discarded safely', () => {
  for (const raw of ['{broken', 'null', 'false', '42', '[]', '{}', ...[0, 2, '1', null, undefined].map(version => JSON.stringify(record({version})))]) {
    const storage = memoryStorage(raw);
    assert.equal(readState(storage, defaults, now), null, raw);
    assert.deepEqual(storage.removed, [STATE_KEY]);
  }
  const empty = memoryStorage();
  assert.equal(readState(empty, defaults, now), null);
  assert.deepEqual(empty.removed, []);
});

test('only known settings with valid enums, strict booleans and full colors are restored', () => {
  const saved = {
    mode: 'unknown', shape: 'triangle', fontStyle: 'system', split: 'diagonal', imageShape: 'diamond',
    autoSize: 'false', autoColor: 0, depth: null, paperColor: '#abc', imageHoleColor: '#aabbccdd',
    position: 0, extraSetting: 123,
  };
  const settings = readState(memoryStorage(record({settings: saved})), defaults, now).settings;
  assert.deepEqual(settings, defaults);
  assert.equal(Object.hasOwn(settings, 'extraSetting'), false);
  const polluted = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"polluted":true},"paperColor":"#000000"}');
  const clean = readState(memoryStorage(record({settings: polluted})), defaults, now).settings;
  assert.equal(clean.paperColor, '#000000');
  assert.equal(Object.hasOwn(clean, '__proto__'), false);
  assert.equal(Object.hasOwn(clean, 'constructor'), false);
  assert.equal(clean.polluted, undefined);
  assert.equal({}.polluted, undefined);
  const follow = readState(memoryStorage(record({settings: {imageHoleColor: null}})), {...defaults, imageHoleColor: '#123456'}, now);
  assert.equal(follow.settings.imageHoleColor, null);
});

test('restored numeric settings accept endpoints and reject out-of-range or coerced values', () => {
  const bounds = {
    holeSize: [3, 60], spacing: [15, 55], positionY: [0, 100], positionX: [0, 100],
    areaWidth: [35, 94], imageDensity: [0, 12], imageHoleSize: [6, 60],
  };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    for (const value of [min, max, (min + max) / 2]) {
      const state = readState(memoryStorage(record({settings: {[key]: value}})), defaults, now);
      assert.equal(state.settings[key], value, `${key}: ${value}`);
    }
    for (const value of [min - 0.01, max + 0.01, String(min), null, false]) {
      const state = readState(memoryStorage(record({settings: {[key]: value}})), defaults, now);
      assert.equal(state.settings[key], defaults[key], `${key}: ${String(value)}`);
    }
  }
});

test('language, text and view settings recover independently and respect their limits', () => {
  const invalid = readState(memoryStorage(record({language: 'ja', letters: 'a'.repeat(241), view: {zoom: '2', sensitivity: 3, original: 'true', exportScale: '2'}})), defaults, now);
  assert.deepEqual({language: invalid.language, letters: invalid.letters, view: invalid.view}, {
    language: 'zh', letters: 'ALIVE ART', view: {zoom: 1, sensitivity: 1, original: false, exportScale: 1},
  });
  for (const letters of ['', 'a'.repeat(240), '🌿'.repeat(120), 'hello\n你好']) {
    const state = readState(memoryStorage(record({letters})), defaults, now);
    assert.equal(state.letters, letters);
  }
  for (const letters of [null, [], 123]) assert.equal(readState(memoryStorage(record({letters})), defaults, now).letters, 'ALIVE ART');
  for (const [zoom, sensitivity] of [[.25, .2], [3, 2.5]]) {
    assert.deepEqual(readState(memoryStorage(record({view: {zoom, sensitivity, original: true, exportScale: 2}})), defaults, now).view, {zoom, sensitivity, original: true, exportScale: 2});
  }
  for (const view of [null, 'bad', [], {zoom: .249, sensitivity: .199, original: null, exportScale: 0}, {zoom: 3.001, sensitivity: 2.501, exportScale: 3}]) {
    assert.deepEqual(readState(memoryStorage(record({view})), defaults, now).view, {zoom: 1, sensitivity: 1, original: false, exportScale: 1});
  }
});

test('saving records current version and timestamp without changing the source state', () => {
  const storage = memoryStorage();
  const state = {language: 'en', letters: 'HELLO', settings: {shape: 'circle'}, view: {zoom: 2}, version: 99, savedAt: 123};
  assert.equal(writeState(storage, state, now), true);
  assert.deepEqual(JSON.parse(storage.getItem(STATE_KEY)), {...state, version: 1, savedAt: now});
  assert.equal(state.version, 99);
  assert.equal(state.savedAt, 123);
  assert.equal(readState(storage, defaults, now).settings.shape, 'circle');
  assert.equal(storage.written.length, 1);
});

test('unavailable, blocked and full storage never prevent the editor from continuing', () => {
  assert.equal(readState(null, defaults, now), null);
  assert.equal(writeState(null, record(), now), false);
  const blocked = {getItem() { throw new Error('Storage blocked'); }, removeItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Quota exceeded'); }};
  assert.equal(readState(blocked, defaults, now), null);
  assert.equal(writeState(blocked, record(), now), false);
  const circular = {}; circular.self = circular;
  const storage = memoryStorage();
  assert.equal(writeState(storage, circular, now), false);
  assert.deepEqual(storage.written, []);
  const expiredRemovalBlocked = {getItem: () => JSON.stringify(record({savedAt: now - STATE_TTL})), removeItem() { throw new Error('Removal blocked'); }};
  assert.equal(readState(expiredRemovalBlocked, defaults, now), null);
});

test('browserStorage catches access denial and returns available local storage', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    delete globalThis.window;
    assert.equal(browserStorage(), null);
    const storage = memoryStorage();
    Object.defineProperty(globalThis, 'window', {value: {localStorage: storage}, configurable: true});
    assert.equal(browserStorage(), storage);
    Object.defineProperty(globalThis, 'window', {value: {get localStorage() { throw new Error('SecurityError'); }}, configurable: true});
    assert.equal(browserStorage(), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
});
