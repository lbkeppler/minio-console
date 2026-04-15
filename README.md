# MinIO Console

<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" alt="MinIO Console" />
</p>

<p align="center">
  <strong>Um console desktop pra gerenciar seus servidores MinIO sem dor de cabeça.</strong>
</p>

<p align="center">
  <a href="https://github.com/lbkeppler/minio-console/releases/latest">
    <img alt="Latest Release" src="https://img.shields.io/github/v/release/lbkeppler/minio-console?include_prereleases&color=6366f1" />
  </a>
  <img alt="Platforms" src="https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" />
  <img alt="Built with" src="https://img.shields.io/badge/built%20with-Tauri%202%20%2B%20React-orange" />
  <a href="LICENSE">
    <img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue" />
  </a>
</p>

---

## Por que esse projeto existe

O console web oficial do MinIO é legal, mas rodar uma app nativa no desktop tem umas vantagens que fazem diferença no dia a dia:

- **Zero browser, zero porta aberta** — abre como qualquer outro programa
- **Credenciais seguras no keychain do SO** — nada de senha salva em texto puro
- **Múltiplos servidores num lugar só** — troca de perfil com um clique
- **Tudo funciona offline** — menos a parte que precisa falar com o servidor, óbvio 😄

A ideia é juntar o poder do `mc` CLI com uma interface gráfica que não trava, não precisa de conexão com a internet pra carregar, e entende quem usa isso todo dia.

## O que tem dentro

| Feature | O que faz |
|---------|-----------|
| **Dashboard** | Visão geral do servidor — status, capacidade, uptime, tudo em tempo real |
| **Buckets** | Cria, apaga, configura versioning e política de acesso (privado / download / público — bem simples) |
| **Objects** | Navega pelas pastas, faz upload, download, preview de arquivo, share link, tudo |
| **Users & Groups** | Gerencia IAM sem precisar decorar comando nenhum |
| **Policies** | Cria, edita e atribui policies visualmente |
| **Monitoring** | Métricas do servidor em tempo real |
| **MC Terminal** | Terminal integrado com autocomplete (Tab ou vírgula pra ver todos os comandos) |
| **Multi-perfil** | Conecta em vários MinIOs e alterna rapidinho |
| **Tradução** | Português, Inglês e Espanhol |

## Download

Pega o instalador pra sua plataforma na [página de releases](https://github.com/lbkeppler/minio-console/releases/latest):

- **Windows** — `.msi` ou `.exe` setup
- **macOS** — `.dmg` universal (roda em Intel **e** Apple Silicon, mesmo arquivo)
- **Linux** — `.deb`, `.rpm` ou `.AppImage`

> 💡 O binário do `mc` já vem junto no instalador. Não precisa instalar nada além da app.

## Quero rodar localmente

Você vai precisar de:

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.75+
- [Pré-requisitos do Tauri](https://tauri.app/start/prerequisites/) pro seu sistema
- Um servidor MinIO (local ou remoto) com access/secret key

Depois é só:

```bash
git clone https://github.com/lbkeppler/minio-console.git
cd minio-console
npm install

# Baixa o mc pra sua plataforma (dev)
./scripts/download-mc.sh   # Linux/macOS
# ou
.\scripts\download-mc.ps1  # Windows

# Roda em modo dev (hot-reload no front e no back)
npm run tauri dev
```

A janela abre sozinha. Na primeira vez, vai em **Settings → Add Profile** pra configurar seu servidor.

## Stack

Escolhi as ferramentas pensando em **performance**, **tamanho de instalador** e **segurança**:

| Camada | Tecnologia |
|--------|-----------|
| Framework | [Tauri 2](https://tauri.app/) — web view nativa + backend Rust |
| Frontend | React 18, TypeScript strict, Tailwind CSS 4, Radix UI |
| Estado | Zustand |
| Backend | Rust (aws-sdk-s3, reqwest, tokio) |
| Credenciais | `keyring-rs` — usa o keychain nativo do SO |
| Lint/Format | Biome (front), clippy + rustfmt (back) |
| Build | Vite (front), Cargo (back) |

## Estrutura do projeto

```
minio-console/
├── src/                    # Frontend React
│   ├── components/ui/      # Componentes compartilhados
│   ├── pages/              # Uma pasta por feature
│   ├── stores/             # Estados Zustand
│   ├── lib/                # Wrappers do Tauri invoke()
│   └── i18n/               # Traduções (en, es, pt-BR)
├── src-tauri/              # Backend Rust
│   └── src/
│       ├── commands/       # Handlers dos invokes
│       ├── s3/             # Cliente S3
│       ├── admin/          # API admin do MinIO
│       ├── mc/             # Runner do mc CLI
│       ├── config/         # Configuração da app
│       └── models/         # Tipos compartilhados
├── scripts/                # Scripts auxiliares (download do mc)
└── docs/                   # Specs e design docs
```

## Comandos úteis

```bash
npm run tauri dev          # Desenvolvimento (front + back com hot-reload)
npm run tauri build        # Build de produção pro seu SO
npm run dev                # Só o front (Vite em :1420)
cargo test                 # Testes do backend
npx biome check            # Lint + format do front
cargo clippy               # Lint do Rust
```

## CI/CD

Todo push de tag `v*` dispara o workflow de release — builda Windows, macOS Universal e Linux em paralelo no GitHub Actions e publica um release draft com todos os instaladores. Eu revisar e liberar.

Veja [`.github/workflows/release.yml`](.github/workflows/release.yml).

## Convenções que sigo no projeto

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
- **Idioma do código**: inglês sempre. A UI é traduzida.
- **IPC**: front chama back via `invoke()`. Tudo async, tudo retorna `Result<T, String>`.
- **Credenciais**: nunca em plaintext — sempre via keychain do SO.

## Contribuindo

Achou um bug, tem uma ideia legal ou só quer bater um papo sobre o projeto? Abre uma [issue](https://github.com/lbkeppler/minio-console/issues) ou manda um PR.

## License

[AGPL-3.0](LICENSE) — GNU Affero General Public License v3.0.

Se você usar esse código em um serviço acessível pela rede, o código-fonte (incluindo modificações) precisa ficar disponível pros usuários. Uso pessoal, comercial, fork e modificação são liberados, desde que respeitando os termos da licença.

---

<p align="center">
  Feito com ☕ e muita paciência usando <strong>Rust + React + Tauri</strong>
</p>
