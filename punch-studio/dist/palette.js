import {parseHex, parseRgb, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb} from './color.js';
import {t} from './i18n.js';

const clamp = value => Math.min(1, Math.max(0, value));

// One modal palette serves both paper and image holes. Draft edits preview live;
// cancellation delegates restoration of color and automatic-color flags to app.js.
export class ColorPalette {
  constructor(callbacks) {
    this.callbacks = callbacks;
    const element = id => document.getElementById(`palette-${id}`);
    this.dialog = element('dialog');
    this.title = element('title');
    this.sv = element('sv');
    this.cursor = element('cursor');
    this.hue = element('hue');
    this.hexInput = element('hex');
    this.rgbInputs = ['r', 'g', 'b'].map(element);
    this.preview = element('preview');
    this.value = element('value');
    this.errorOutput = element('error');
    this.applyButton = element('apply');
    this.cancelButton = element('cancel');
    this.closeButton = element('close');
    this.target = null;
    this.pointerId = null;
    this.error = null;
    this.hsv = {h: 0, s: 0, v: 0};

    this.hexInput.addEventListener('input', () => this.editHex());
    this.hexInput.addEventListener('change', () => this.normalizeHex());
    this.hexInput.addEventListener('blur', () => this.normalizeHex());
    for (const input of this.rgbInputs) {
      input.addEventListener('input', () => this.editRgb());
      input.addEventListener('change', () => this.normalizeRgb());
      input.addEventListener('blur', () => this.normalizeRgb());
    }
    this.hue.addEventListener('input', () => {
      if (!this.target) return;
      this.hsv.h = Number(this.hue.value);
      this.editHsv();
    });
    this.sv.addEventListener('pointerdown', event => {
      if (!this.target || event.button !== 0 || event.isPrimary === false || this.pointerId !== null) return;
      event.preventDefault();
      this.sv.focus({preventScroll: true});
      this.pointerId = event.pointerId;
      this.sv.setPointerCapture(event.pointerId);
      this.movePointer(event);
    });
    this.sv.addEventListener('pointermove', event => {
      if (event.pointerId === this.pointerId) this.movePointer(event);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.sv.addEventListener(name, event => {
        if (event.pointerId !== this.pointerId) return;
        if (name === 'pointerup') this.movePointer(event);
        this.pointerId = null;
      });
    }
    this.sv.addEventListener('keydown', event => this.moveKeyboard(event));
    this.applyButton.addEventListener('click', () => this.commit());
    this.cancelButton.addEventListener('click', () => this.cancel());
    this.closeButton.addEventListener('click', () => this.cancel());
    this.dialog.addEventListener('cancel', event => {
      event.preventDefault();
      this.cancel();
    });
    this.dialog.addEventListener('close', () => {
      if (this.target && !this.dialog.open) this.cancel();
    });
    this.dialog.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing || event.target.closest('button')) return;
      event.preventDefault();
      this.commit();
    });
    this.dialog.addEventListener('pointerdown', event => {
      this.backdropPointer = event.target === this.dialog && this.outside(event) ? event.pointerId : null;
    });
    this.dialog.addEventListener('pointerup', event => {
      const cancel = this.backdropPointer === event.pointerId && event.target === this.dialog && this.outside(event);
      this.backdropPointer = null;
      if (cancel) this.cancel();
    });
    this.dialog.addEventListener('pointercancel', () => { this.backdropPointer = null; });
    this.refreshLanguage();
  }

  open(target, opener) {
    if (this.target) this.cancel();
    const color = parseHex(this.callbacks.getColor(target));
    if (!color) return;
    this.target = target;
    this.opener = opener || document.activeElement;
    this.snapshot = this.callbacks.onBegin(target);
    this.color = color;
    this.hsv = rgbToHsv(hexToRgb(color));
    this.error = null;
    this.pointerId = null;
    this.backdropPointer = null;
    this.update();
    this.refreshLanguage();
    this.dialog.showModal();
  }

  outside(event) {
    const rect = this.dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }

  setColor(color, source) {
    const converted = rgbToHsv(hexToRgb(color));
    // Hue remains editable for white, gray and black. At black, saturation also
    // remains useful so increasing value can reveal the selected hue immediately.
    if (!converted.s || !converted.v) converted.h = this.hsv.h;
    if (!converted.v) converted.s = this.hsv.s;
    this.hsv = converted;
    this.color = color;
    this.error = null;
    this.update({hex: source !== 'hex', rgb: source !== 'rgb'});
    this.callbacks.onPreview(this.target, color);
  }

  editHex() {
    if (!this.target) return;
    const color = parseHex(this.hexInput.value);
    if (!color) return this.invalidate('palette.hexError');
    this.setColor(color, 'hex');
  }

  editRgb() {
    if (!this.target) return;
    const rgb = parseRgb(this.rgbInputs.map(input => input.value));
    if (!rgb) return this.invalidate('palette.rgbError');
    this.setColor(rgbToHex(rgb), 'rgb');
  }

  normalizeHex() {
    if (!this.target) return;
    const color = parseHex(this.hexInput.value);
    if (color && this.error !== 'palette.rgbError') this.hexInput.value = color;
  }

  normalizeRgb() {
    if (!this.target) return;
    const rgb = parseRgb(this.rgbInputs.map(input => input.value));
    if (rgb && this.error !== 'palette.hexError') this.rgbInputs.forEach((input, i) => { input.value = [rgb.r, rgb.g, rgb.b][i]; });
  }

  invalidate(error) {
    this.error = error;
    this.updateValidation();
  }

  editHsv() {
    this.color = rgbToHex(hsvToRgb(this.hsv));
    this.error = null;
    this.update();
    this.callbacks.onPreview(this.target, this.color);
  }

  movePointer(event) {
    if (!this.target) return;
    const rect = this.sv.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.hsv.s = clamp((event.clientX - rect.left) / rect.width);
    this.hsv.v = clamp(1 - (event.clientY - rect.top) / rect.height);
    this.editHsv();
  }

  moveKeyboard(event) {
    if (!this.target) return;
    const step = event.shiftKey ? 0.1 : 0.01;
    switch (event.key) {
      case 'ArrowLeft': this.hsv.s = clamp(this.hsv.s - step); break;
      case 'ArrowRight': this.hsv.s = clamp(this.hsv.s + step); break;
      case 'ArrowUp': this.hsv.v = clamp(this.hsv.v + step); break;
      case 'ArrowDown': this.hsv.v = clamp(this.hsv.v - step); break;
      case 'Home': this.hsv.s = 0; break;
      case 'End': this.hsv.s = 1; break;
      case 'PageUp': this.hsv.v = clamp(this.hsv.v + 0.1); break;
      case 'PageDown': this.hsv.v = clamp(this.hsv.v - 0.1); break;
      case ' ': event.preventDefault(); return;
      default: return;
    }
    event.preventDefault();
    this.editHsv();
  }

  update({hex = true, rgb = true} = {}) {
    if (!this.color) return;
    const colorRgb = hexToRgb(this.color);
    if (hex) this.hexInput.value = this.color;
    if (rgb) this.rgbInputs.forEach((input, i) => { input.value = [colorRgb.r, colorRgb.g, colorRgb.b][i]; });
    this.hue.value = this.hsv.h;
    this.sv.style.setProperty('--palette-hue-color', rgbToHex(hsvToRgb(this.hsv.h, 1, 1)));
    this.cursor.style.left = `${this.hsv.s * 100}%`;
    this.cursor.style.top = `${(1 - this.hsv.v) * 100}%`;
    this.preview.style.backgroundColor = this.color;
    this.value.textContent = this.color;
    const hueValue = document.getElementById('palette-hue-value');
    if (hueValue) hueValue.textContent = `${Math.round(this.hsv.h)}°`;
    this.updateAccessibility();
    this.updateValidation();
  }

  updateAccessibility() {
    if (!this.color) return;
    this.sv.setAttribute('aria-valuenow', Math.round(this.hsv.s * 100));
    this.sv.setAttribute('aria-valuetext', t('palette.svValue', {saturation: Math.round(this.hsv.s * 100), value: Math.round(this.hsv.v * 100)}));
    this.preview.setAttribute('aria-label', t('palette.colorValue', {hex: this.color, ...hexToRgb(this.color)}));
  }

  updateValidation() {
    this.errorOutput.textContent = this.error ? t(this.error) : '';
    this.errorOutput.hidden = !this.error;
    this.applyButton.disabled = !!this.error;
    this.hexInput.setAttribute('aria-invalid', String(this.error === 'palette.hexError'));
    for (const input of this.rgbInputs) input.setAttribute('aria-invalid', String(this.error === 'palette.rgbError'));
  }

  refreshLanguage() {
    this.title.textContent = t(this.target === 'image' ? 'palette.imageTitle' : 'palette.paperTitle');
    this.closeButton.setAttribute('aria-label', t('palette.close'));
    this.sv.setAttribute('aria-label', t('palette.svLabel'));
    this.hue.setAttribute('aria-label', t('palette.hue'));
    this.hexInput.setAttribute('aria-label', t('palette.hex'));
    this.applyButton.textContent = t('palette.apply');
    this.cancelButton.textContent = t('palette.cancel');
    this.updateAccessibility();
    this.updateValidation();
  }

  finish(cancelled) {
    if (!this.target || (!cancelled && this.error)) return;
    const target = this.target, snapshot = this.snapshot, color = this.color;
    this.target = null;
    if (this.pointerId !== null && this.sv.hasPointerCapture(this.pointerId)) this.sv.releasePointerCapture(this.pointerId);
    this.pointerId = null;
    this.backdropPointer = null;
    if (cancelled) this.callbacks.onCancel(target, snapshot);
    else this.callbacks.onCommit(target, color);
    if (this.dialog.open) this.dialog.close();
    if (this.opener?.isConnected && !this.opener.disabled) this.opener.focus({preventScroll: true});
  }

  cancel() { this.finish(true); }
  commit() { this.finish(false); }
}
