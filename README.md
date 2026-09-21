# Fornost Security Company Website

Official bilingual (EN/TR) static company website for **Fornost Security**.

## Production

- Website: https://fornostsecurity.com
- Contact: info@fornostsecurity.com
- Hosting: Cloudflare Workers Static Assets
- Production branch: `main`

## Deployment

Cloudflare is connected directly to this repository.

- Build command: none
- Deploy command: `npx wrangler deploy`
- Static assets directory: `./public`

Every push to `main` triggers a production deployment.

## Structure

```text
public/
  index.html
  styles.css
  script.js
  favicon.svg
  robots.txt
  sitemap.xml
  _headers
wrangler.jsonc
```

The site is fully static and uses email-only contact. No form backend is required.
