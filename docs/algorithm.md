# Rendering and layout

ArtPunching turns text into a grid of holes while retaining the source image's colors and texture. Preview, PNG and SVG share a layout plan containing image dimensions, dot geometry, text positions and sampling positions.

## Image pipeline

`app.js` decodes images with `createImageBitmap`, respecting orientation, and draws an immutable source canvas. Images exceeding 6,000 pixels on one side or 16 million pixels in total are resized proportionally.

**Text on image** draws the source and fills active glyph cells with the paper color. **Image tile lettering** draws decorative holes and arranges source-image patches into text in a separate area. Decorative holes (`imageHoles`) and text samples (`donors`) are independent; text patches do not have to correspond to visible decorative holes.

Native-size rendering with edge shading disabled preserves decoded opaque pixels outside the holes. Edge shading affects pixels around each cut, and transparent pixels are composited against the paper color. Resizing, browser color management and discarded file metadata limit comparisons with the original image file.

## Pixel fonts

`font.js` contains an original 5-by-7 alphabet for Latin letters, digits and punctuation. Classic Latin text is displayed in uppercase. Other supported characters and the Fusion option use the bundled 12-pixel [Fusion Pixel font](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.09.25).

The font loads before glyph extraction. Glyphs render at integer coordinates with a baseline of 10 pixels; alpha values of at least 128 define active cells. Layout uses measured glyph advances and aligns mixed scripts by the tallest glyph in each line. A coverage table prevents silent system-font substitution or dropped characters. Input is normalized to NFC.

## Dot sizing and wrapping

Let image dimensions be `W` by `H`, active-cell count be `N`, text-width fraction be `r`, and spacing fraction be `s`.

```text
fill fraction f = 1 - s                  # default: 0.68
pitch p = diameter d / f
maximum diameter = min(0.035W, sqrt(qWH/N))
q = 0.07 for text on image; 0.035 for tile lettering
text region width R = W; 0.9W for left/right tile lettering
padding = min(0.04W, 0.05H) on image; 0.05R for tile lettering
available width = min(rR, R - 2padding - 0.04R)
r = 0.84 by default
target height = 0.32H on image; 0.42H top/bottom; 0.70H left/right
```

A binary search evaluates actual wrapped layouts to find the largest diameter that fits the target height and an individual glyph. Manual diameter is normalized to image width; the interface reports working-image pixels. These ratios are adjustable visual heuristics. Circular dots use the same diameter rule but cover approximately pi/4 of the square-dot area.

Glyphs have a one-cell horizontal gap; lines have a three-cell vertical gap. A line containing `U` cells has width `(U - 1)p + d`. Latin text wraps at words where possible, while long words and Chinese text wrap between characters. Explicit line breaks remain, and automatic line boundaries trim spaces.

Horizontal and vertical position specify the percentage of available free space before the entire text block, with defaults of 50% and 82%. Lines are centered within the block. Impossible text-on-image layouts report an error and disable export. Tile-lettering layouts grow the text area without resizing the source. Blank text produces an unpunched image.

## Composition and sampling

Automatic composition places portrait images on the left with text on the right; landscape and square images use image-above, text-below. Either direction can be selected manually.

Decorative-hole density is a target fraction of source area, from 0% to 12%, defaulting to 3.5%. Requested count is limited by non-overlapping grid capacity. Default image-hole diameter is `28W/1200`, shape is square, and color follows the paper until customized.

Decorative holes and text samples use separate stratified grids and fixed seeds. Cells are at least `d + 0.25d` wide and high, shuffled, and offset within bounds. Each grid's patches stay within the source and do not overlap. When full-size text patches cannot fit, the planner reduces `sourceDiameter` and scales patches into the requested text dots, preserving the text's size, wrapping and active cells. Sampling is repeatable and does not use face detection or semantic segmentation.

## Color selection

Automatic colors use a thumbnail with a longest side of at most 128 pixels. Samples convert from sRGB to linear sRGB and OKLab; alpha below 128 is ignored. Mid-lightness samples with chroma above 0.025 determine average hue. Nearly neutral images use a warm neutral hue.

Light paper uses `OKLCH(L=0.95, C=0.025, h=image hue)`. Average OKLab lightness above 0.92 selects dark paper with `L=0.27` and `C=0.022`. Chroma is reduced until the result fits sRGB. Suggestions also include a light complementary color, warm white and same-hue dark paper. These colors are starting points rather than per-glyph contrast guarantees; OKLab lightness is not WCAG relative luminance.

`color.js` validates HEX/RGB and converts RGB/HSV. `palette.js` shares an in-page picker between paper and decorative-hole colors. Valid changes preview live; cancellation restores original colors and automatic-color flags. Invalid drafts leave the accepted color unchanged.

## Export and local state

PNG renders the working source at native or 2x size. SVG embeds its PNG with vector hole shapes and clipped, transformed image copies for text tiles. Hole coordinates retain four decimal places. Canvas and SVG anti-aliasing can differ.

Preview fit-to-window is 100%. Ctrl plus the wheel applies exponential zoom from 25% to 300%, normalizing pixel, line and page units. Sensitivity ranges from 0.2x to 2.5x. Preview zoom and original-image viewing do not change exports.

`state.js` validates browser-local language, text, layout and preview settings with a seven-day expiration. It stores no images. Palette previews stay temporary until committed; corrupt records and unavailable storage fall back to a usable editor.

## References

- [HTML Canvas image drawing](https://html.spec.whatwg.org/multipage/canvas.html#drawing-images-to-the-canvas)
- [Stratified sampling in PBRT](https://www.pbr-book.org/4ed/Sampling_and_Reconstruction/Stratified_Sampler)
- [W3C OKLab and OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab)
- [OKLab conversion formulas](https://bottosson.github.io/posts/oklab/)
