# MinIO Console — Website

Landing page oficial do [MinIO Console](https://github.com/lbkeppler/minio-console), construída com Astro + Tailwind CSS e publicada no GitHub Pages.

## Stack

- **Astro 5** — SSG com i18n nativo
- **Tailwind CSS 4** — estilização
- **GitHub Pages** — hosting gratuito

## Idiomas

- 🇧🇷 Português (default)
- 🇺🇸 English — `/en/`
- 🇪🇸 Español — `/es/`

## Rodando localmente

```bash
cd site
npm install
npm run dev
```

Abre em `http://localhost:4321`.

## Build

```bash
npm run build   # Gera site estático em dist/
npm run preview # Preview do build
```

## Deploy

Automatizado via GitHub Actions (`.github/workflows/deploy-site.yml`). Qualquer push em `master` ou `site` que toque em `site/**` dispara o deploy.

Site público: `https://lbkeppler.github.io/minio-console/`
