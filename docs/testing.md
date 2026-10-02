# Testing

The test suites cover layout geometry, color conversion, saved settings and browser interactions. Browser tests verify rendered pixels and downloaded files as well as control values.

## Unit tests

Use Node.js 22 or later; no application dependencies are required.

```bash
cd punch-studio
node --test tests/*.test.js
```

Tests cover wrapping, positioning, sampling bounds, PNG/SVG geometry, HEX/RGB validation, HSV round trips, setting validation, expiration and storage failures. The publishing workflow runs these tests before deployment.

## Browser tests

Start a server from the repository root:

```bash
python3 -m http.server 4173 --directory punch-studio/dist
```

In another terminal, prepare Playwright and Chromium:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install playwright==1.63.0
python -m playwright install --with-deps chromium
python punch-studio/tests/browser_smoke.py
python punch-studio/tests/control_audit.py
python punch-studio/tests/i18n_smoke.py
python punch-studio/tests/palette_smoke.py
python punch-studio/tests/state_smoke.py
```

On Windows, activate with `.venv/Scripts/activate` in a compatible shell or use the environment's activation script for your shell. Linux browser dependencies may need administrator privileges. Python and Playwright are test tools; the application runs as static files.

Suites check image upload, fonts, text placement, both compositions, independent decorative holes, zoom, palette input and cancellation, touch interactions, languages, setting restoration and export. The control audit compares its coverage list with the page's interactive-element inventory.

Set `PUNCH_TEST_URL` to test another local or deployed instance. Suites use isolated browser contexts. Generated screenshots, results and downloads are stored in `punch-studio/tests/artifacts/`, which is excluded from version control.

## Fidelity checks

The browser smoke test uses an opaque synthetic gradient, disables edge shading and renders at native size. Pixels outside hole edges must match the decoded source. It also compares tile centers with source samples and decodes PNG/SVG output to verify dimensions and colors.

Palette tests verify that HEX, RGB and HSV produce matching rendered and exported colors. State tests check that temporary palette previews are not saved, including when navigation flushes pending settings.

## Coverage limits

Automation currently uses Chromium with mobile viewport and touch emulation. Physical Android/iOS devices and Firefox/Safari require separate testing. Color management and anti-aliasing can vary; wide-gamut images, memory pressure and physical paper cutting are outside automated coverage.
