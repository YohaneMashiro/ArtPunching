import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHex, parseRgb, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb} from '../dist/color.js';

test('HEX accepts short and full notation and canonicalizes case and whitespace', () => {
  for (const value of ['#AbC', ' abc ', 'AABBcc', ' #aabbCC ']) assert.equal(parseHex(value), '#aabbcc');
  for (const value of ['', '#', '#12', '#1234', '#12345', '#1234567', '#12345678', '##abc', '#xyz', '#12 3456', null, 123]) assert.equal(parseHex(value), null);
});

test('RGB strictly validates three whole channels without coercing partial or invalid drafts', () => {
  assert.deepEqual(parseRgb('0', '128', '255'), {r: 0, g: 128, b: 255});
  assert.deepEqual(parseRgb([' 005 ', '128', '255']), {r: 5, g: 128, b: 255});
  assert.deepEqual(parseRgb({r: 255, g: 0, b: 12}), {r: 255, g: 0, b: 12});
  for (const value of ['', ' ', '-1', '256', '1.5', '1.0', '+1', '1e2', '0xff', '20x', null, undefined, NaN, Infinity, 0.1, -1, 256]) assert.equal(parseRgb(value, 0, 0), null);
  assert.equal(parseRgb([1, 2]), null);
  assert.equal(parseRgb([1, 2, 3, 4]), null);
  assert.equal(parseRgb(new Array(3)), null);
});

test('RGB and HEX conversion round, clamp, and preserve complete valid channel values', () => {
  assert.equal(rgbToHex(-1, 128.6, 300), '#0081ff');
  assert.deepEqual(hexToRgb('#abc'), {r: 170, g: 187, b: 204});
  assert.equal(hexToRgb('invalid'), null);
  for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
    assert.deepEqual(hexToRgb(rgbToHex(r, g, b)), {r, g, b});
  }
});

test('HSV conversion handles pure hues, achromatic colors, wrapping and bounds', () => {
  for (const [h, rgb] of [[0, [255, 0, 0]], [60, [255, 255, 0]], [120, [0, 255, 0]], [180, [0, 255, 255]], [240, [0, 0, 255]], [300, [255, 0, 255]]]) {
    assert.deepEqual(hsvToRgb(h, 1, 1), {r: rgb[0], g: rgb[1], b: rgb[2]});
    assert.deepEqual(rgbToHsv(rgb), {h, s: 1, v: 1});
  }
  assert.deepEqual(rgbToHsv(0, 0, 0), {h: 0, s: 0, v: 0});
  assert.deepEqual(rgbToHsv(255, 255, 255), {h: 0, s: 0, v: 1});
  assert.deepEqual(rgbToHsv(128, 128, 128), {h: 0, s: 0, v: 128 / 255});
  assert.deepEqual(hsvToRgb(360, 1, 1), hsvToRgb(0, 1, 1));
  assert.deepEqual(hsvToRgb(-60, 1, 1), hsvToRgb(300, 1, 1));
  assert.deepEqual(hsvToRgb(720, 3, 2), {r: 255, g: 0, b: 0});
  assert.deepEqual(hsvToRgb(150, -1, -1), {r: 0, g: 0, b: 0});
});

test('HSV round trips are exact after channel rounding throughout the RGB cube', () => {
  for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
    assert.deepEqual(hsvToRgb(rgbToHsv(r, g, b)), {r, g, b});
  }
  for (const rgb of [[1, 2, 3], [254, 255, 0], [17, 16, 15], [128, 127, 129]]) assert.deepEqual(hsvToRgb(rgbToHsv(rgb)), {r: rgb[0], g: rgb[1], b: rgb[2]});
});
