# Alive · 打孔艺术工作室

上传 `image`、输入 `letters`，在浏览器内生成打孔艺术。

默认在原画上以孔洞拼出文字；也可以在原画旁以图像块拼字，选择上下或左右布局。支持中英文点阵、自动估算孔径与换行、水平/垂直定位、智能底色、独立原画散孔、高清 PNG 和内嵌图片的 SVG 导出。预览支持 Ctrl + 滚轮缩放与灵敏度调节。

界面支持中文 / English，每次打开默认中文。默认示例原画署名：[十二時](https://xhslink.cn/o/75GwJDczjxb)，素材权利说明见 [许可文档](docs/licenses.md)。

在线使用：[Alive · 打孔艺术工作室](https://yohanemashiro.github.io/ArtPunching/)。源码仓库：[YohaneMashiro/ArtPunching](https://github.com/YohaneMashiro/ArtPunching)。已通过 GitHub Pages 发布并完成线上检查，提交邮箱使用 `ylpwannzdm@126.com`。应用没有后端、远程字体、分析脚本或上传 API；用户图片只在浏览器内处理。

## 本地启动（WSL）

在项目根目录运行：

```bash
python3 -m http.server 4173 --bind 0.0.0.0 --directory punch-studio/dist
```

打开 <http://localhost:4173/>。通过本地 HTTP 服务打开；直接双击 HTML 的 `file://` 模式不支持模块和本地字库读取。

也可运行 `./start-local.sh`，脚本会从自己的位置定位项目目录。

使用当前浏览器版本的 Chrome、Edge、Firefox 或 Safari。输入图片支持 PNG、JPEG 和 WebP，最多 30 MB；字数上限 120。超出字库覆盖的字符会明确提示。

## 文档

- [使用与控件](docs/usage.md)
- [图像处理、字模与排版算法](docs/algorithm.md)
- [本地测试与验收](docs/testing.md)
- [GitHub Pages 发布与 VPS 部署](docs/deployment.md)
- [字体与参考图许可](docs/licenses.md)

应用是 `punch-studio/dist/` 内的静态文件；无需安装应用依赖，也无需构建。Node 只用于算法自动测试。
