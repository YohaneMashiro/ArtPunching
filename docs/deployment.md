# 发布与部署

目标仓库：[YohaneMashiro/ArtPunching](https://github.com/YohaneMashiro/ArtPunching)。当前 GitHub Pages 工作流已准备，待本机 GitHub 授权后推送并启用，尚未确认线上发布成功。提交使用邮箱 `ylpwannzdm@126.com`。

应用无后端，整个 `punch-studio/dist/` 可以直接作为静态站点发布。所有地址为相对地址，能放在 GitHub Pages 的仓库子路径。

## GitHub 与 Pages

`.github/workflows/pages.yml` 在推送 `main` 时或手动触发时执行：运行算法测试，将 `punch-studio/dist` 打包为 Pages artifact，再发布到 `github-pages` 环境。应用无需构建；测试失败会停止发布。

发布步骤：

1. 在本机完成 GitHub 登录，所用账号需有目标仓库的写入和 Pages 设置权限；无需把密钥发到聊天或写入项目。
2. 将项目推送到目标仓库的 `main`。
3. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 在 **Actions** 检查工作流，必要时手动运行。成功后访问预期地址 `https://yohanemashiro.github.io/ArtPunching/`，核对上传、字库、缩放与导出。

工作流使用平台提供的 `GITHUB_TOKEN` 与 `pages: write`、`id-token: write` 权限，无需另外创建部署 secret。步骤与权限依据 [GitHub Pages 自定义工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。静态文件使用相对路径，兼容 `/ArtPunching/` 子路径。

随发布保留字体 `OFL.txt` 与 `LICENSES/` 全部上游声明；素材来源见 [许可说明](licenses.md)。GitHub Pages 仅提供应用文件，编辑时不会接收用户上传的图片。

## VPS

VPS 只需静态 HTTP 服务；图片无需经过 VPS，服务器负载主要为首次加载应用和本地字库。

例如将 `dist` 内容复制到 `/var/www/alive-punch`，Nginx server 配置的核心是：

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;
    root /var/www/alive-punch;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

`YOUR_DOMAIN` 为待填写占位符。域名、SSH 访问方式和目标目录确认后再实施。生产环境配置 HTTPS。此工具不需要数据库、图片上传服务、API key 或常驻 Node 进程。

## 本地访问

默认本地测试服务在 WSL 启动，Windows 浏览器访问 `http://localhost:4173/`。示例命令绑定 `0.0.0.0`，兼容 WSL 的 localhost 转发；服务是否可从局域网访问取决于 Windows 防火墙和 WSL 网络配置。

若仅在 WSL 内访问，可改为 `--bind 127.0.0.1`。不用更改 Codex 的 WSL 执行环境。停止服务可在启动窗口按 Ctrl+C。
