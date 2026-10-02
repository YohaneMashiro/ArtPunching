# Learning to build ArtPunching

ArtPunching is a useful project for learning browser programming, image rendering and geometry. The application is plain HTML, CSS and JavaScript. Its image processing combines browser APIs with custom algorithms.

Work through the stages below in a separate practice folder. Build a small working result at each stage, then read the corresponding project module. Use API documentation freely; the goal is to explain, implement and debug the behavior without generated code or copied project functions.

## The actual stack

| Layer | Technologies used | Purpose |
| --- | --- | --- |
| Page and controls | HTML forms, buttons, `details`, `dialog`, accessibility attributes | Input, advanced controls, palette and export dialogs |
| Layout and appearance | CSS Grid, Flexbox, media queries, custom properties, gradients | Responsive editor and shared color picker |
| Application logic | Modern JavaScript and native ES modules | State, events, validation, async loading and orchestration |
| Images and drawing | File/Blob, `createImageBitmap`, Canvas 2D, `ImageData` | Decode, preserve, sample, render and export images |
| Fonts | Original 5-by-7 bitmaps, local WOFF2 Fusion Pixel font, `FontFace` | Convert supported text into active dot coordinates |
| Color | sRGB, RGB/HEX/HSV, OKLab/OKLCH | Editable colors and image-derived paper suggestions |
| Browser state | `localStorage`, JSON, timestamps | Validate and restore settings for seven days |
| Output | Canvas PNG, SVG/XML, object URLs | Download self-contained artwork |
| Unit tests | Node.js 22+, built-in `node:test` and assertions | Check pure geometry, colors and saved state |
| Browser tests | Python, Playwright, Chromium | Exercise controls, pixels, persistence and downloads |
| Local hosting | Python's HTTP server | Serve modules and assets during development |
| Publishing | Git, GitHub Actions, GitHub Pages | Test and deploy static files from `main` |

The deployment consists of static files, which run directly without a build step or application server. Node and Python support development and testing. An optional, capability-checked WebMCP registration in `app.js` exposes two local editor actions; it is not required to render artwork.

## Read the project in this order

All source paths below are relative to `punch-studio/dist/`.

| Source | What to understand |
| --- | --- |
| `index.html`, `style.css` | Semantic controls, responsive layout and modal structure |
| `font.js` | Bitmap representation, font loading, coverage checks and glyph caching |
| `core.js`: `wrapGlyphs`, `createPlan` | Pure geometry and a renderer-independent layout plan |
| `core.js`: `donorGrid`, `renderArt`, `exportSvg` | Sampling, clipping, source preservation and export parity |
| `core.js`: `analyzeColors`; `color.js` | Perceptual paper selection and input color conversions |
| `palette.js` | Pointer/keyboard interaction and preview/commit/cancel behavior |
| `state.js`, `i18n.js` | Validated persistence and translation keys |
| `app.js` | Connect controls, image loading, plans, preview, export and lifecycle events |
| `../tests/`, `../../.github/workflows/pages.yml` | Verification and deployment |

The central data flow is `image + text + settings -> glyphs -> layout plan -> renderer`. The same plan drives the preview and exports. Keep geometry independent of the DOM so it can be checked without opening a browser.

## Stage 1: HTML and CSS

Learn document structure, forms, labels, the box model, selectors, Grid, Flexbox and responsive rules. Learn focus styling and why a button must remain usable with a keyboard.

**Exercise:** build an editor shell with an upload control, textarea, two mode buttons, sliders, preview panel and a modal. Use placeholder artwork initially.

**Pass:** at 360-pixel and 1,440-pixel viewport widths, controls remain reachable, the page has no accidental horizontal overflow, every input has a label, and Tab reaches the controls in a useful order.

## Stage 2: JavaScript and DOM events

Learn values, arrays, objects, functions, closures, modules, exceptions, promises and `async`/`await`. Then learn DOM queries, event handlers and input validation. Use browser developer tools to inspect state and follow an exception to its source.

**Exercise:** put all editor settings in one object. Make controls update it, show the current values, and implement reset. Separate a pure settings function from DOM event handling.

**Pass:** each control changes the intended field; invalid values produce a visible message; reset and rapid changes leave controls and state consistent. You can predict the result of an event before running it.

## Stage 3: Canvas and local images

Learn Canvas coordinates, paths, image drawing, clipping, transforms and RGBA pixel arrays. Understand the difference between a canvas's pixel dimensions and its CSS display dimensions.

**Exercise:** decode a selected image, draw it to an immutable source canvas, and render square/circular holes into a separate result canvas. Add a simple PNG download.

**Pass:** an opaque synthetic gradient retains identical pixels outside the holes when rendered at native size without edge shading. Zooming the displayed preview does not change downloaded dimensions. A failed upload leaves the last valid image available.

## Stage 4: Pixel fonts, wrapping and automatic sizing

Start with a 5-by-7 `A` stored as rows of zeroes and ones. Convert ones into `{x, y}` coordinates. Extend to words, spacing, line breaks and alignment before loading a real font.

```text
W, H = working image width and height
d = dot diameter; s = spacing percentage / 100
f = 1 - s; p = d / f                     # dot pitch
row width = (U - 1) * p + d              # U allocated grid columns
manual d = holeSize * W / 1200
automatic cap = min(0.035 * W, sqrt(q * W * H / N))
q = 0.07 for text on image; 0.035 for tile lettering
N = number of active glyph cells
```

The default spacing is 32%, so `p = d / 0.68`. A one-cell gap separates glyphs and a three-cell gap separates lines. Width includes the final dot's diameter, not an extra full pitch. For a text block of width `B` in a region of width `R` with padding `a`, placement is `regionX + a + max(0, R - 2a - B) * positionX / 100`; vertical placement uses the same free-space rule.

**Exercise:** wrap Latin words without squeezing them; split oversized words at characters. Implement a bounded binary search for a diameter whose actual wrapped height fits the target. Then load the bundled font with `FontFace`, rasterize glyphs and extract cells with alpha >= 128.

**Pass:** longer text wraps; explicit newlines survive; positioning moves the whole block; oversized manual text reports a useful error. Supported non-Latin glyphs render correctly, and unsupported characters produce errors rather than silently substituting system fonts.

For full padding, region-size and target-height rules, see [Rendering and layout](algorithm.md). The size ratios are visual heuristics, not a font-design theorem.

## Stage 5: Image tiles and deterministic sampling

Learn rectangles, grid capacity, seeded pseudo-random numbers, shuffling and coordinate transforms. These are sufficient for this project's sampling; semantic segmentation and face detection are not part of the implementation.

**Exercise:** divide the image into cells at least `1.25d` wide and high, select shuffled cells, and place bounded patches inside them. Build lettering from clipped image patches. Keep decorative image holes and text donors in separate arrays.

**Pass:** patches stay inside the image and do not overlap within each sampler. Identical inputs produce identical results. Changing decorative-hole density does not change the text's active cells. When requested text dots exceed source capacity, sample smaller patches and scale them into unchanged text dots.

## Stage 6: Color and a reusable palette

Learn RGB/HEX parsing, HSV conversion, normalized pointer coordinates and color-space conversions. HSV makes a picker convenient; OKLab/OKLCH makes lightness and hue more useful for the paper-color heuristic.

**Exercise:** build one palette for both paper and image holes. Keep HEX, RGB and the HSV field synchronized. Store an opening snapshot, preview accepted colors immediately, commit on Done and restore on Cancel/Escape. Preserve the selected hue when editing gray or black.

**Pass:** `#369` normalizes to `#336699`; RGB values outside 0-255 are rejected without replacing the last valid color. Mouse, touch and arrow keys select colors. Every cancellation path restores color and automatic-color flags.

Next, derive a hue from a small image thumbnail and generate low-chroma paper colors. Convert sRGB to linear sRGB before OKLab, and reduce chroma to stay in gamut. The current suggested light paper uses `L=0.95, C=0.025`; nearly white images prefer dark paper. These suggestions do not guarantee contrast at every glyph.

## Stage 7: Localization and saved settings

Learn translation dictionaries, interpolation, JSON records, field validation, versioning, expiration and defensive reads. Distinguish committed settings from a temporary palette preview.

**Exercise:** translate every visible label and error using keys. Save only known fields with a version and timestamp; restore valid fields and discard expired/corrupt records. Handle unavailable storage without breaking the editor.

**Pass:** changing language updates the entire interface and survives refresh. Text and settings persist for seven days after the last saved change; image files do not. Invalid stored data cannot inject arbitrary settings, and refreshing during a canceled palette edit never restores its preview color.

## Stage 8: Export, zoom and performance

Learn PNG encoding, SVG paths, clipping, XML escaping and object-URL cleanup. Reuse the layout plan instead of reimplementing export geometry. Understand async loading races and coalescing frequent changes with `requestAnimationFrame`.

**Exercise:** export native/2x PNG and SVG with an embedded image. Add bounded Ctrl-wheel zoom around the pointer, normalizing wheel delta units. Keep preview scaling separate from output dimensions.

**Pass:** SVG opens without adjacent image files; PNG dimensions match the selected scale; shape, color and position match the plan. Rapid uploads cannot replace the newest image with an older decode. Zoom changes the view while leaving exports unchanged, and oversized canvases fail visibly.

## Stage 9: Test and publish

Learn Git commits and diffs, HTTP origins, relative asset paths, unit assertions and browser automation. Write tests for visible behavior and mathematical invariants rather than only reproducing the implementation's steps.

**Exercise:** use Node's test runner for layout bounds, HEX/RGB conversion and state expiration. Use Playwright to upload a synthetic image, move text, cancel a palette edit, refresh the language and download an export. Publish the static folder through a GitHub Pages workflow.

**Pass:** a deliberate broken control makes a browser test fail; a geometry regression makes a unit test fail. Deployment waits for passing unit tests. The published page loads fonts/images under its repository subpath and works on a narrow viewport. See [Testing](testing.md) and [Deployment](deployment.md).

## Independent recreation task

Start an empty repository and build a new editor from a written feature checklist. You may consult standards and API documentation; do not copy ArtPunching's implementation. Begin with image upload, bitmap lettering and PNG export, then add the remaining features in the stages above.

Finish when you can explain the data flow and sizing formulas, implement both compositions, keep holes inside bounds, preserve source pixels, support keyboard/touch color selection, restore bilingual settings, export PNG/SVG and publish passing tests. Demonstrate portrait, landscape, long-text, unsupported-character, invalid-color and expired-storage cases. Finally, change one requirement, such as the line gap or a third paper suggestion, and update the implementation and relevant checks yourself.

## Primary learning references

- [MDN Learn Web Development](https://developer.mozilla.org/en-US/docs/Learn_web_development): HTML, CSS, JavaScript and accessibility.
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide): language fundamentals and modules.
- [MDN Canvas tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial): shapes, images, transforms and pixels.
- [MDN SVG](https://developer.mozilla.org/en-US/docs/Web/SVG): vector shapes, clipping and embedded images.
- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API): browser-local persistence.
- [Node.js test runner](https://nodejs.org/api/test.html): dependency-free unit tests.
- [Playwright for Python](https://playwright.dev/python/docs/intro): browser automation and downloads.
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): static deployment.
- [W3C CSS Color 4: OKLab and OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab): perceptual color definitions.
- [SIL Open Font License](https://openfontlicense.org/): font redistribution and reserved-name requirements.

You do not need to memorize every API. Independent proficiency means knowing which tool to use, finding its documentation, reasoning about the result and checking your own work.
