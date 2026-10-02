// UI language is independent of artwork text and rendering settings.
let language = 'zh';
const messages = {
  'page.title': ['Alive · 打孔艺术工作室', 'Alive · Punch Art Studio'],
  'page.description': ['上传原画、输入文字，制作属于你的打孔艺术。支持中英文点阵、智能配色与高清导出，图片在浏览器本地处理。', 'Upload an image and add text to create punch art. Chinese and English pixel fonts, automatic colors and high-resolution exports, processed locally in your browser.'],
  'brand': ['Alive 打孔艺术工作室', 'Alive Punch Art Studio'],
  'brand.note': ['打孔艺术工作室', 'PUNCH ART STUDIO'],
  'privacy': ['图片留在你的浏览器', 'Images stay in your browser'],
  'language': ['界面语言', 'Interface language'],
  'export': ['导出作品', 'Export artwork'],
  'controls': ['作品设置', 'Artwork settings'],
  'intro.eyebrow': ['你的小小艺术工作室', 'YOUR LITTLE ART LAB'],
  'intro.title': ['把文字，留在画里。', 'Leave your words in art.'],
  'intro.description': ['一张原画，一句话，一件新的作品。', 'One image. A few words. A new piece of art.'],
  'image.choose': ['选择原画', 'Choose an image'],
  'image.thumb': ['当前原画缩略图', 'Current image thumbnail'],
  'image.demoName': ['绿野 · 示例原画', 'Green fields · Sample artwork'],
  'image.drop': ['点击更换，或把图片拖到这里', 'Click to change, or drop an image here'],
  'image.formats': ['PNG / JPG / WebP · 最大 30 MB', 'PNG / JPG / WebP · Up to 30 MB'],
  'image.demo': ['使用示例原画', 'Use sample artwork'],
  'image.credit': ['示例原画著作权 ©', 'Default artwork copyright ©'],
  'image.creditTitle': ['查看十二時的原文', 'View the original post by 十二時'],
  'text.write': ['写下文字', 'Write your words'],
  'text.label': ['打孔文字', 'Artwork text'],
  'text.placeholder': ['输入名字、短句或一句喜欢的话', 'Enter a name, a short phrase or a favorite quote'],
  'text.hint': ['中英文均可 · Enter 手动换行', 'Chinese / English · Enter for a new line'],
  'font.loading': ['字库加载中…', 'Loading pixel fonts…'],
  'font.ready': ['离线点阵字库', 'Offline pixel fonts'],
  'font.failed': ['中文字库加载失败', 'Chinese font unavailable'],
  'mode.choose': ['选择打孔方式', 'Choose a style'],
  'mode.label': ['打孔方式', 'Punch art style'],
  'mode.punch': ['原画打字', 'Text on image'],
  'mode.transfer': ['图块拼字', 'Image tile lettering'],
  'split.label': ['画面布局', 'Image layout'],
  'split.group': ['分割方向', 'Split direction'],
  'auto': ['自动', 'Auto'],
  'split.vertical': ['上下', 'Top / bottom'],
  'split.horizontal': ['左右', 'Left / right'],
  'split.autoVertical': ['按原画比例自动选择上下布局。', 'Top / bottom layout selected for this image aspect ratio.'],
  'split.autoHorizontal': ['按原画比例自动选择左右布局。', 'Left / right layout selected for this image aspect ratio.'],
  'split.manualVertical': ['原画在上方，文字在下方。', 'Image above, text below.'],
  'split.manualHorizontal': ['原画在左侧，文字在右侧。', 'Image on the left, text on the right.'],
  'layout.title': ['文字与排版', 'Text & layout'],
  'layout.summary': ['孔径 / 位置', 'Size / position'],
  'hole.size': ['点阵大小', 'Dot size'],
  'hole.auto': ['自动估算', 'Auto size'],
  'hole.autoHint': ['根据文字点数与可用区域估算孔径。', 'Dot size is estimated from the text and available space.'],
  'hole.manualHint': ['放大孔径会自动换行；原画空间不足时会提示调整。', 'Larger dots wrap automatically. A message appears if the image has too little space.'],
  'position.x': ['水平位置', 'Horizontal position'],
  'position.y': ['垂直位置', 'Vertical position'],
  'hole.shape': ['文字点形状', 'Text dot shape'],
  'square': ['方形', 'Square'],
  'circle': ['圆形', 'Circle'],
  'spacing': ['点阵留白', 'Space between dots'],
  'text.width': ['文字区域宽度', 'Text area width'],
  'font.label': ['点阵字库', 'Pixel font'],
  'font.classic': ['经典 5×7 / 中文 12×12', 'Classic 5×7 / Chinese 12×12'],
  'font.fusion': ['Fusion 12 像素字', 'Fusion 12 pixel font'],
  'imageHoles.title': ['原画散孔', 'Image holes'],
  'imageHoles.summary': ['密度 / 孔色 / 形状', 'Density / color / shape'],
  'imageHoles.hint': ['独立调整原画区，不改变文字点阵。', 'Adjust image holes independently of the text dots.'],
  'imageHoles.empty': ['输入文字后可调整原画散孔。', 'Enter text to adjust the image holes.'],
  'imageHoles.density': ['打孔密度', 'Hole density'],
  'imageHoles.size': ['原画孔径', 'Image hole size'],
  'imageHoles.color': ['原画孔色', 'Image hole color'],
  'imageHoles.follow': ['跟随底色', 'Use paper color'],
  'imageHoles.custom': ['自定义原画孔色', 'Custom image hole color'],
  'imageHoles.shape': ['原画孔形', 'Image hole shape'],
  'imageHoles.square': ['方孔', 'Square'],
  'imageHoles.circle': ['圆孔', 'Circle'],
  'paper.title': ['背景与细节', 'Paper & details'],
  'paper.summary': ['纸色 / 切边', 'Color / edges'],
  'paper.color': ['画布底色', 'Paper color'],
  'paper.auto': ['智能配色', 'Auto color'],
  'paper.customLabel': ['自定义画布底色', 'Custom paper color'],
  'paper.swatches': ['推荐底色', 'Suggested paper colors'],
  'paper.light': ['浅纸色', 'Light paper'],
  'paper.complement': ['互补浅色', 'Light complementary color'],
  'paper.warm': ['暖白纸色', 'Warm white paper'],
  'paper.dark': ['深纸色', 'Dark paper'],
  'paper.defaultHint': ['从原画取色，选择柔和的纸张色。', 'Choose a soft paper color from the image palette.'],
  'paper.lightHint': ['延续原画色相，降低饱和度，得到柔和的浅纸色。', 'A soft, light paper color uses the image hue with lower saturation.'],
  'paper.darkHint': ['原画接近白色，使用同色相的深纸色增强孔洞辨识。', 'This image is nearly white. Dark paper in the same hue makes the holes easier to see.'],
  'paper.customHint': ['已使用自定义底色。可以随时恢复智能配色。', 'Using a custom paper color. You can return to automatic colors at any time.'],
  'paper.depth': ['轻微纸张切边', 'Subtle cut-paper edges'],
  'reset': ['恢复默认设置', 'Reset settings'],
  'footer': ['做好一件小作品。', 'Make a little piece of art.'],
  'preview': ['作品预览', 'Artwork preview'],
  'preview.subtitle': ['每个孔，都是一个像素。', 'Every hole is a pixel.'],
  'preview.mode': ['预览模式', 'Preview mode'],
  'preview.result': ['作品', 'Artwork'],
  'preview.original': ['原画', 'Original'],
  'preview.canvas': ['实时生成的打孔艺术作品', 'Live punch art preview'],
  'loading.prepare': ['正在准备原画与点阵字库…', 'Preparing the image and pixel fonts…'],
  'loading.image': ['正在读取原画…', 'Reading image…'],
  'loading.error': ['预览未更新 · 请调整左侧设置', 'Preview not updated · Please adjust the settings'],
  'loading.choose': ['请选择一张原画', 'Please choose an image'],
  'count.holes': ['{count} 个孔', '{count} holes'],
  'count.tiles': ['· {count} 个图块', '· {count} tiles'],
  'count.lines': ['{count} 行文字', '{count} text lines'],
  'zoom.hint': ['在预览区按住 Ctrl 滚动滚轮', 'Hold Ctrl and scroll the wheel over the preview'],
  'zoom.wheel': ['Ctrl + 滚轮', 'Ctrl + wheel'],
  'zoom.label': ['预览缩放', 'Preview zoom'],
  'zoom.sensitivity': ['灵敏度', 'Sensitivity'],
  'zoom.sensitivityLabel': ['滚轮缩放灵敏度', 'Wheel zoom sensitivity'],
  'composition.punch': ['保留原画的色彩与纹理，在文字的位置打孔。', 'Keep the image colors and texture, with holes forming your text.'],
  'composition.transfer': ['原画散孔与图块文字分别调节，图块保留原画的色彩与纹理。', 'Adjust image holes and tile lettering separately. The tiles keep the image colors and texture.'],
  'export.eyebrow': ['带走你的作品', 'TAKE YOUR ART WITH YOU'],
  'export.close': ['关闭导出窗口', 'Close export dialog'],
  'export.title': ['让作品离开屏幕。', 'Take your artwork with you.'],
  'export.description': ['导出完整作品，保留原画与孔洞细节。', 'Export the complete artwork with image and hole details intact.'],
  'export.size': ['导出尺寸', 'Export size'],
  'export.original': ['原始尺寸', 'Original size'],
  'export.double': ['2 倍尺寸', '2× size'],
  'export.png': ['下载 PNG ↓', 'Download PNG ↓'],
  'export.svg': ['下载 SVG', 'Download SVG'],
  'export.svgHint': ['SVG 内嵌原画，无需另附图片。放大孔洞边缘仍清晰。', 'SVG embeds the image in one file. Hole edges remain sharp when enlarged.'],
  'export.dimensions': [' · PNG 保留完整细节', ' · PNG preserves full detail'],
  'export.tooLargeHint': [' · 尺寸较大，请选择原始尺寸或减小画布', ' · Too large: choose original size or reduce the canvas'],
  'export.generating': ['正在生成…', 'Generating…'],
  'export.pngDone': ['作品已导出为 PNG。', 'Artwork exported as PNG.'],
  'export.svgDone': ['作品已导出为 SVG。', 'Artwork exported as SVG.'],
  'image.resized': ['原画较大，工作尺寸调整为 {width} × {height} px，保持长宽比。', 'This image is large. Working size is {width} × {height} px, keeping the aspect ratio.'],
  'hole.smallWarning': ['文字较多，孔径已小于 2 px，建议缩短文字提升辨识度。', 'Dots are smaller than 2 px. Shorter text will be easier to read.'],
  'status.notes': ['{resize}{separator}{small}', '{resize}{separator}{small}'],
  'error.canvasLarge': ['当前画布过大。请减小孔径或缩短文字，再导出完整作品。', 'The canvas is too large. Reduce dot size or shorten the text before exporting.'],
  'error.imageRead': ['无法读取这张图片，请选择有效的 PNG、JPG 或 WebP。', 'Unable to read this image. Choose a valid PNG, JPG or WebP.'],
  'error.imageRetained': ['图片读取失败，已保留上一张原画。', 'Unable to read this image. Your previous image has been kept.'],
  'error.demo': ['示例图片读取失败，请上传你自己的原画。', 'Unable to load the sample. Please upload your own image.'],
  'error.format': ['请选择 PNG、JPG 或 WebP 图片。', 'Please choose a PNG, JPG or WebP image.'],
  'error.fileLarge': ['图片大于 30 MB，请压缩后再选择。', 'The image exceeds 30 MB. Please compress it and try again.'],
  'error.export': ['导出失败，请选择较小的尺寸。', 'Export failed. Please choose a smaller size.'],
  'error.exportLarge': ['导出尺寸过大，请选择原始尺寸。', 'The export is too large. Please choose original size.'],
  'error.svg': ['SVG 导出失败。', 'SVG export failed.'],
  'error.fontFailed': ['中文字库未加载，英文经典点阵仍可使用。', 'The Chinese font did not load. The classic English pixel font is still available.'],
  'error.fontCoverage': ['字库字符表无法读取', 'Unable to load the font character list.'],
  'error.fontPending': ['点阵字库尚未加载，请稍候。', 'The pixel font is still loading. Please wait.'],
  'error.unsupported': ['字库暂不支持「{char}」，请替换这个字符。', 'The font does not support “{char}”. Please replace this character.'],
  'error.glyphWide': ['「{char}」超出点阵字库的字符范围。', '“{char}” is outside the pixel font character range.'],
  'error.glyphEmpty': ['「{char}」没有可打孔的字形，请替换。', '“{char}” has no dots to punch. Please replace this character.'],
  'error.textLong': ['请把文字缩短到 120 个字符以内。', 'Please shorten the text to 120 characters or fewer.'],
  'error.charWide': ['孔径太大，单个字符也超出文字区域。请减小孔径或增加区域宽度。', 'A single character exceeds the text area. Reduce dot size or increase the area width.'],
  'error.charTooWide': ['孔径太大，单个字符超出文字区域。', 'A single character exceeds the text area. Please reduce dot size.'],
  'error.holesMany': ['原画无法容纳这么多孔。请减小孔径或缩短文字。', 'The image cannot fit this many holes. Reduce dot size or shorten the text.'],
  'error.imageDimensions': ['图片尺寸无效。', 'Invalid image dimensions.'],
  'error.holePositive': ['孔径必须大于零。', 'Dot size must be greater than zero.'],
  'error.imageHolePositive': ['原画孔径必须大于零。', 'Image hole size must be greater than zero.'],
  'error.height': ['当前孔径需要更多行，原画高度不足。请减小孔径、缩短文字或切换「碎片拼字」。', 'These dots need more lines than the image can fit. Reduce dot size, shorten the text or switch to Image tile lettering.'],
  'error.generic': ['无法完成此操作，请调整设置后重试。', 'Unable to complete this action. Adjust the settings and try again.'],
};

export function t(key, params = {}) {
  const template = messages[key]?.[language === 'en' ? 1 : 0] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

export function setLanguage(value) {
  language = value === 'en' ? 'en' : 'zh';
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
}

// Keep algorithm/font errors independent of the browser UI language.
export function translateError(error) {
  const message = String(error?.message ?? error);
  if (messages[message]) return t(message);
  for (const [key, pair] of Object.entries(messages)) {
    if (key.startsWith('error.') && pair[0] === message) return t(key);
  }
  for (const [pattern, key] of [
    [/^字库暂不支持「(.*)」，请替换这个字符。$/s, 'error.unsupported'],
    [/^「(.*)」超出点阵字库的字符范围。$/s, 'error.glyphWide'],
    [/^「(.*)」没有可打孔的字形，请替换。$/s, 'error.glyphEmpty'],
  ]) {
    const match = message.match(pattern);
    if (match) return t(key, {char: match[1]});
  }
  return language === 'zh' || !/[\u3400-\u9fff]/u.test(message) ? message : t('error.generic');
}

// Translate direct text nodes so nested icons, outputs and event handlers survive.
const bindings = [
  ['title', 'page.title'], ['meta[name="description"]', 'page.description', 'content'],
  ['.brand', 'brand', 'aria-label'], ['.brandnote', 'brand.note'], ['.local-badge', 'privacy'],
  ['#language-select', 'language', 'aria-label'], ['#export-top', 'export'], ['.controls', 'controls', 'aria-label'],
  ['.panel-title .eyebrow', 'intro.eyebrow'], ['.panel-title h1', 'intro.title'], ['.panel-title p', 'intro.description'],
  ['.control-section:nth-of-type(1) h2', 'image.choose'], ['#thumb', 'image.thumb', 'alt'],
  ['.upload-copy > span', 'image.drop'], ['.upload-copy small', 'image.formats'], ['#use-demo', 'image.demo'],
  ['#sample-credit > span', 'image.credit'], ['#sample-credit a', 'image.creditTitle', 'title'],
  ['.control-section:nth-of-type(2) h2', 'text.write'], ['label[for="letters"]', 'text.label'],
  ['#letters', 'text.placeholder', 'placeholder'], ['.input-hint > span:first-child', 'text.hint'],
  ['.control-section:nth-of-type(3) h2', 'mode.choose'], ['.mode-options', 'mode.label', 'aria-label'],
  ['[data-mode="punch"] strong', 'mode.punch'], ['[data-mode="transfer"] strong', 'mode.transfer'],
  ['#split-controls > span', 'split.label'], ['#split-controls [role="group"]', 'split.group', 'aria-label'],
  ['[data-split="auto"]', 'auto'], ['[data-split="vertical"]', 'split.vertical'], ['[data-split="horizontal"]', 'split.horizontal'],
  ['#text-settings summary', 'layout.title'], ['#text-settings summary > span:first-child', 'layout.summary'],
  ['label[for="hole-size"]', 'hole.size'], ['#auto-size', 'hole.auto'],
  ['label[for="position-x"]', 'position.x'], ['label[for="position"]', 'position.y'],
  ['#shape-label', 'hole.shape'], ['[data-shape="square"]', 'square'], ['[data-shape="circle"]', 'circle'],
  ['label[for="density"]', 'spacing'], ['label[for="area-width"]', 'text.width'],
  ['label[for="font-style"]', 'font.label'], ['#font-style option[value="classic"]', 'font.classic'], ['#font-style option[value="fusion"]', 'font.fusion'],
  ['#image-settings summary', 'imageHoles.title'], ['#image-settings summary > span:first-child', 'imageHoles.summary'],
  ['label[for="image-density"]', 'imageHoles.density'], ['label[for="image-hole-size"]', 'imageHoles.size'],
  ['.setting-heading label[for="image-color"]', 'imageHoles.color'], ['#link-image-color', 'imageHoles.follow'],
  ['#image-color', 'imageHoles.custom', 'aria-label'], ['#image-shape-label', 'imageHoles.shape'],
  ['[data-image-shape="square"]', 'imageHoles.square'], ['[data-image-shape="circle"]', 'imageHoles.circle'],
  ['#paper-settings summary', 'paper.title'], ['#paper-settings summary > span:first-child', 'paper.summary'],
  ['.setting-heading label[for="paper-color"]', 'paper.color'], ['#auto-color', 'paper.auto'],
  ['#paper-color', 'paper.customLabel', 'aria-label'], ['#swatches', 'paper.swatches', 'aria-label'],
  ['.checkbox-row span', 'paper.depth'], ['#reset', 'reset'], ['.side-footer', 'footer'],
  ['.studio', 'preview', 'aria-label'], ['.studio-heading h2', 'preview'], ['.studio-subtitle', 'preview.subtitle'],
  ['.view-toggle', 'preview.mode', 'aria-label'], ['#view-result', 'preview.result'], ['#view-original', 'preview.original'],
  ['#artwork', 'preview.canvas', 'aria-label'], ['.zoom-control > span', 'zoom.wheel'], ['.zoom-control > span', 'zoom.hint', 'title'],
  ['#zoom', 'zoom.label', 'aria-label'], ['#sensitivity-settings summary', 'zoom.sensitivity'], ['label[for="zoom-sensitivity"]', 'zoom.sensitivityLabel'],
  ['.dialog-top .eyebrow', 'export.eyebrow'], ['.dialog-close', 'export.close', 'aria-label'],
  ['#export-dialog h2', 'export.title'], ['#export-dialog form > p:not(#export-dimensions)', 'export.description'],
  ['label[for="export-scale"]', 'export.size'], ['#export-scale option[value="1"]', 'export.original'], ['#export-scale option[value="2"]', 'export.double'],
  ['#download-png', 'export.png'], ['#download-svg', 'export.svg'], ['#export-dialog small', 'export.svgHint'],
];

export function translateDOM() {
  for (const [selector, key, attribute] of bindings) {
    for (const node of document.querySelectorAll(selector)) {
      if (attribute) node.setAttribute(attribute, t(key));
      else {
        const text = Array.from(node.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
        if (text) text.textContent = t(key);
        else node.append(document.createTextNode(t(key)));
      }
    }
  }
}
