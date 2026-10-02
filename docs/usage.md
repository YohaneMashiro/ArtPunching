# Usage

## Create artwork

1. Open the editor. It initially loads the sample artwork.
2. Click the image area or drag in a PNG, JPEG or WebP file.
3. Enter a name or short phrase. English, Chinese and punctuation within the bundled font coverage are supported. Enter inserts a line break.
4. Adjust the live preview. Use **Export artwork** in the top-right corner to choose original-size PNG, 2x PNG or SVG.

Image processing and exports run in the browser. The editor remembers text and settings locally, but does not retain image files or upload them. Reloading restores the settings over the sample artwork; select a custom image again to continue using it.

The interface supports Chinese and English. First use and expired settings default to Chinese. Changing the interface language preserves the artwork text and settings.

The default artwork is attributed to [ShiErShi](https://xhslink.cn/o/75GwJDczjxb). Its attribution is shown while the sample is selected. See [Asset licenses](licenses.md) for font and artwork notices.

## Composition styles

**Text on image** is the default. Holes form the text and reveal the paper color. The original image dimensions and aspect ratio remain unchanged.

**Image tile lettering** places text made from sampled image tiles beside the image. Decorative image holes and text tiles are controlled independently. Layout options are **Auto**, **Top / bottom** and **Left / right**. Automatic layout puts text beside portrait images and below landscape or square images. The original image keeps its dimensions; the composition expands to accommodate the lettering.

The **Artwork / Original** switch affects only the preview. Exports always contain the complete artwork, including when the original image is being previewed.

Hold **Ctrl + wheel** over the artwork to zoom between 25% and 300%. Ordinary scrolling moves through an enlarged preview. The bottom-right zoom slider provides the same range, and **Sensitivity** adjusts wheel response from 0.2x to 2.5x, with a default of 1.0x. A zoom of 100% fits the artwork to the preview area. Preview zoom does not affect exported dimensions.

## Controls

Settings are grouped under **Text & layout**, **Image holes** and **Paper & details**. The image-hole panel is available in image tile lettering mode.

| Control | Behavior |
| --- | --- |
| Auto color | Derives a low-saturation paper color from the image's average OKLab hue; nearly white images use dark paper |
| Paper palette / HEX / suggested colors | Sets the paper color and the holes in text-on-image mode |
| Auto size | Estimates dot size from the image area, glyphs, text region and spacing |
| Dot size | Sets text dot size manually; the adjacent value shows the actual working-image diameter in pixels |
| Text dot shape | Chooses square or circular text dots |
| Space between dots | Adjusts the gaps between text dots; more space increases dot pitch |
| Horizontal / vertical position | Moves the text block within the image or caption region; defaults to 50% / 82% |
| Text area width | Limits the width available to text and controls automatic wrapping |
| Pixel font | Uses classic 5x7 English and Fusion 12x12 Chinese by default; Fusion mode preserves English letter case |
| Subtle cut-paper edges | Adds a narrow edge to simulate a cut; disabling it limits pixel changes to the holes |
| Hole density | Sets decorative image-hole density from 0% to 12%, default 3.5%; this is a target area fraction subject to non-overlap capacity |
| Image hole size / shape | Changes decorative image holes independently of the text dots |
| Image hole color / Use paper color | Sets a custom image-hole color or links it to the paper color |
| Reset settings | Restores layout, colors, image holes, zoom and sensitivity while keeping the image, text and composition style |

Classic English lettering displays lowercase letters as uppercase glyphs. Chinese uses native pixel glyphs, typically within a 12x12 cell. Symbols with different dimensions are laid out using their actual glyph size.

## Color palette

Paper and image-hole colors share the same web palette across devices. Enter a HEX code directly in the settings panel, or open **Palette** for more controls.

- HEX accepts three or six digits, with an optional `#`: for example `ABC`, `#abc` or `#AABBCC`. Accepted values normalize to six digits.
- Separate R, G and B fields accept integers from 0 to 255 and stay synchronized with HEX.
- Move the hue slider, then click or drag the color field to adjust saturation and brightness. Mouse and touch input are supported. With the field focused, left/right arrow keys adjust saturation and up/down keys adjust brightness. Hold Shift for larger steps.
- Edits update the artwork preview immediately. **Done**, or Enter with valid input, keeps the changes. **Cancel**, the close button, Escape or a click outside the dialog restores the previous colors, automatic-color setting and paper-color link.
- Invalid HEX and incomplete or out-of-range RGB inputs display an error while retaining the last valid color. **Done** is disabled until the input is corrected.

## Saved settings

The editor stores language, text, artwork settings, preview zoom, wheel sensitivity, the original/artwork preview choice and export scale in the current browser. Records expire seven days after the last setting change. Reloading or reopening the page restores a valid record. First use, expiry or clearing site data returns to the defaults with a Chinese interface.

Images are excluded from the saved record. Reopening loads the sample artwork with the saved text and settings; custom images must be selected again. Unconfirmed palette previews are not saved as committed colors.

If browser storage is blocked or full, the editor displays a note and remains usable for editing and export. Changes that cannot be saved are lost on reload or closing the page. Settings do not synchronize between browsers or devices.

## Insufficient space

Larger holes increase dot pitch and cause text to wrap by word or character. Text-on-image mode has a fixed area. If all lines cannot fit, export is disabled and the previous valid preview remains visible with a message that the preview was not updated. Reduce the dot size, shorten the text, increase the text area width or select image tile lettering.

Image tile lettering expands its caption region as needed. When large text dots exceed source sampling capacity, smaller independent image patches are sampled and scaled into the requested dots. Text spacing and glyphs are preserved, while decorative image holes remain subject to their own capacity limits. If even one character cannot fit across the available width, reduce dot size or increase text area width.

## Image and export limits

- Input images may be PNG, JPEG or WebP, up to 30 MB. Text supports up to 120 characters within the bundled font coverage.
- Working images are limited to a 6000 px longest edge and 16 million pixels. Larger images are resized proportionally with a visible notice.
- Compositions are limited to 32 million pixels and 16384 px on either axis. Exceeding these limits requires a settings adjustment.
- PNG exports are limited to 48 million pixels and 16384 px on either axis. Oversized 2x exports require original-size output or a smaller composition.
- Original-size PNG is redrawn from the working image, rather than captured from the preview. A 2x export smooths hole edges without adding detail absent from the original image.
- SVG embeds the working image and requires no external images or fonts. Hole edges are vector shapes; the image itself remains raster data.
- Canvas uses the browser's color management. Transparent image pixels are composited over the selected paper color. The editor does not apply generative redraws.

Photographs, fine line work and busy image regions can make lettering harder to read. Adjust paper contrast, hole shape or spacing, or position the text over a simpler region. Automatic paper color is an aesthetic heuristic and does not guarantee contrast at every text position.
