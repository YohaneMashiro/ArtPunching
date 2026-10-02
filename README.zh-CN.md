# ArtPunching · 打孔艺术工作室

上传原画、输入文字，在浏览器中制作打孔艺术。可以让孔洞在原画上排列成文字，也可以从原画取样图块拼字。

[在线使用](https://yohanemashiro.github.io/ArtPunching/) · [English README](README.md) · [项目文档（英文）](docs/README.md)

## 功能

- **原画打字：** 保留原画，在文字位置打孔，露出所选底色。
- **图块拼字：** 原画散孔与图块文字独立调整，支持自动、上下或左右布局。
- **中英文点阵：** 内置像素字库，自动估算孔径与换行，支持水平和垂直定位。
- **统一调色板：** 提供 HEX、RGB、色相和饱和度 / 明度控制，支持触摸拖动与键盘调整，手机和电脑使用相同网页控件。
- **预览缩放：** 支持 Ctrl + 滚轮、缩放滑块和滚轮灵敏度调节。
- **作品导出：** 支持原始或 2 倍 PNG，以及内嵌原画的 SVG。
- **双语界面：** 中文 / English，首次访问默认中文，后续恢复所选语言。
- **自动保存设置：** 当前浏览器保留文字、作品参数和预览设置，从最后一次修改起保存 7 天。

## 图片与设置

图片读取、字模提取、配色、排版、预览和导出均在浏览器中完成。应用没有后端、上传 API、分析脚本或远程字体请求。

语言、文字、作品参数、缩放、灵敏度、预览模式和导出倍率使用浏览器本地存储。图片文件不保存：重新打开会加载示例原画并恢复文字和设置；自己的原画需重新选择。设置过期后恢复默认值。如果浏览器不允许存储，仍可正常编辑和导出。

默认示例原画作者为 [十二時](https://xhslink.cn/o/75GwJDczjxb)。字体与图片的权利说明见 [素材许可文档（英文）](docs/licenses.md)。

## 本地启动

安装 Python 3 后，从仓库根目录启动静态文件服务：

```bash
git clone https://github.com/YohaneMashiro/ArtPunching.git
cd ArtPunching
python3 -m http.server 4173 --bind 127.0.0.1 --directory punch-studio/dist
```

打开 [localhost:4173](http://localhost:4173/)。如果本机使用 `python` 命令，将 `python3` 替换为 `python`。需要通过 HTTP 服务打开；直接双击 HTML 的 `file://` 模式不支持模块与本地资源读取。

应用无需安装依赖或构建，直接运行 `punch-studio/dist/` 中的静态文件。建议使用当前版本的 Chrome、Edge、Firefox 或 Safari。图片支持 PNG、JPEG、WebP，最多 30 MB；文字最多 120 个字符，超出字库覆盖时会提示。

## 技术栈

- **应用：** HTML、响应式 CSS、JavaScript ES modules 与浏览器 API；Canvas 2D 处理像素与 PNG 渲染，SVG 复用排版几何，WOFF2 字体提供像素字模，本地存储保存设置。
- **算法：** 点阵字形、单词 / 字符换行、二分搜索孔径、分层图像采样、RGB / HSV 转换与 OKLab / OKLCH 配色。
- **开发与发布：** Node.js 单元测试、Python + Playwright 浏览器测试、Python 本地 HTTP 服务，以及 GitHub Actions + GitHub Pages 静态部署。

[学习指南（英文）](docs/learning.md)列出了各模块对应的知识、练习与独立复现的验收标准。

## 开发与文档

界面、图像处理、字模、调色板、状态缓存和翻译模块位于 `punch-studio/dist/`。单元测试需要 Node.js 22 或更新版本：

```bash
node --test punch-studio/tests/*.test.js
```

GitHub Pages 工作流会在 `main` 更新时运行测试并发布静态页面。以下文档使用英文：

- [使用与控件](docs/usage.md)
- [图像处理与排版算法](docs/algorithm.md)
- [技术栈与学习指南](docs/learning.md)
- [测试方法](docs/testing.md)
- [部署方式](docs/deployment.md)
- [字体与图片权利说明](docs/licenses.md)

## 许可证

项目原创代码与文档使用 [MIT License](LICENSE)，允许修改、分发和商业使用，转载时须保留版权与许可声明。内置字体与示例原画适用各自的权利说明，详见 [许可与署名文档（英文）](docs/licenses.md)。
