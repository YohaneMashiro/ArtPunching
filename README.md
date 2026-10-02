# ArtPunching

A browser-based punch art editor. Add an image and some text to arrange holes into lettering, or build lettering from pieces of the image.

[Open the editor](https://yohanemashiro.github.io/ArtPunching/) · [Chinese README](README.zh-CN.md) · [Documentation](docs/README.md)

## Features

- **Text on image:** preserve the image and place text-shaped holes over it.
- **Image tile lettering:** combine independently adjustable image holes with lettering made from sampled image tiles. Choose automatic, top/bottom or left/right layout.
- **Pixel typography:** bundled English and Chinese pixel fonts, automatic dot sizing, wrapping and horizontal/vertical text positioning.
- **Unified color palette:** HEX and RGB inputs, hue control, a saturation/brightness field, touch dragging and keyboard adjustment. Paper and image holes use the same web controls across devices.
- **Local preview:** Ctrl + wheel zoom, a zoom slider and adjustable wheel sensitivity.
- **Export:** PNG at original or 2x size, and SVG with the image embedded.
- **Chinese and English interface:** Chinese on first use; subsequent visits restore the selected language.
- **Remembered settings:** text, artwork settings and view settings remain in the current browser for seven days after the last change.

## Privacy and saved settings

Image decoding, typography, color analysis, rendering and exports run in the browser. The editor has no backend, upload API, analytics scripts or remote font requests.

Settings use browser-local storage. Image files are not stored: reopening the page loads the sample artwork with the saved text and settings, and a custom image must be selected again. Expired settings return to the defaults. If storage is unavailable, editing and export continue without saved settings.

The sample artwork is credited to [ShiErShi](https://xhslink.cn/o/75GwJDczjxb). Font and artwork notices are listed in [Asset licenses](docs/licenses.md).

## Run locally

Clone the repository and serve the static editor with Python 3:

```bash
git clone https://github.com/YohaneMashiro/ArtPunching.git
cd ArtPunching
python3 -m http.server 4173 --bind 127.0.0.1 --directory punch-studio/dist
```

Open [localhost:4173](http://localhost:4173/). Use `python` instead of `python3` if that is the command provided by your Python installation. A local HTTP server is required; opening `index.html` through `file://` does not support the editor's modules and local asset loading.

No dependency installation or build step is required. The runtime consists of the files in `punch-studio/dist/`.

Use a current Chrome, Edge, Firefox or Safari release. Images may be PNG, JPEG or WebP, up to 30 MB. Text supports up to 120 characters within the bundled font coverage.

## Technology stack

- **Application:** HTML, responsive CSS, JavaScript ES modules and browser APIs. Canvas 2D processes pixels and renders PNG output; SVG exports reuse the same geometry. Bundled WOFF2 fonts supply pixel glyphs, and local storage saves editor settings.
- **Algorithms:** bitmap typography, word/character wrapping, binary-search dot sizing, stratified image sampling, RGB/HSV conversion and OKLab/OKLCH paper colors.
- **Development and delivery:** Node.js unit tests, Python with Playwright for browser checks, a Python HTTP server for local previews, and GitHub Actions with GitHub Pages for static hosting.

The [learning guide](docs/learning.md) maps these technologies to source files and provides exercises for rebuilding the editor independently.

## Development

The static files are maintained directly:

| File | Responsibility |
| --- | --- |
| `punch-studio/dist/index.html`, `style.css` | Editor interface and responsive layout |
| `punch-studio/dist/app.js` | Image loading, controls, preview and exports |
| `punch-studio/dist/core.js` | Layout, image sampling, color analysis and rendering |
| `punch-studio/dist/font.js` | Pixel glyph extraction and bundled font coverage |
| `punch-studio/dist/color.js`, `palette.js` | Color conversion, validation and palette interaction |
| `punch-studio/dist/state.js`, `i18n.js` | Saved settings and interface translations |
| `punch-studio/tests/` | Geometry, color, state and browser checks |

Run the dependency-free unit tests with Node.js 22 or later:

```bash
node --test punch-studio/tests/*.test.js
```

The GitHub Pages workflow runs these tests and publishes `punch-studio/dist/` on pushes to `main`. See [Deployment](docs/deployment.md) for hosting configuration and [Testing](docs/testing.md) for browser checks.

## Documentation

- [Usage and controls](docs/usage.md)
- [Rendering and layout algorithms](docs/algorithm.md)
- [Technology stack and learning guide](docs/learning.md)
- [Testing](docs/testing.md)
- [Deployment](docs/deployment.md)
- [Asset licenses](docs/licenses.md)

## License

The original application code and project documentation are released under the [MIT License](LICENSE). Retain the copyright and permission notices when redistributing the software. Bundled fonts and sample artwork have separate terms; see [Licenses and attribution](docs/licenses.md).
