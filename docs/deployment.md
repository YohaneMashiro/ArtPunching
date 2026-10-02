# Deployment

ArtPunching is static. Publish the contents of `punch-studio/dist/`; there is no build step, backend or image-upload service. Relative asset paths support hosting below a repository subdirectory.

The public instance is [ArtPunching on GitHub Pages](https://yohanemashiro.github.io/ArtPunching/).

## GitHub Pages

`.github/workflows/pages.yml` runs on pushes to `main` and manual dispatch. It runs unit tests, packages the static directory and deploys to the `github-pages` environment.

For another repository:

1. Enable GitHub Actions.
2. In **Settings > Pages > Build and deployment**, select **GitHub Actions**.
3. Push to `main` or run the publishing workflow manually.
4. Open the deployment URL after the workflow succeeds.

The workflow uses GitHub's automatic token with `contents: read`, `pages: write` and `id-token: write`. No additional deployment secret is needed. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Other static hosts

Upload `punch-studio/dist/` to a static host or serve it with a web server. An Nginx example:

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/artpunching;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
```

Replace the domain and directory, and configure HTTPS for public access. Serve JavaScript and font assets with their normal MIME types. No database, application server or API key is required. Keep bundled font notices and artwork attribution; see [asset licenses](licenses.md).

## Deployment checks

Verify font loading, image upload, both compositions, the color palette and PNG/SVG downloads. Select a language and reload to check saved settings. Uploaded images need to be selected again after reload.

Saved settings belong to the browser origin. A new domain or cleared site data starts a new local record.
