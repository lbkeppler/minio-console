# MinIO Console — Design Spec

**Data:** 2026-04-10
**Status:** Aprovado
**Stack:** Tauri 2 + React 18 + TypeScript + Tailwind CSS + Rust

---

## 1. Visao Geral

Aplicacao desktop cross-platform para gestao completa de servidores MinIO. Combina as capacidades do MinIO CLI (`mc`) com uma interface grafica minimalista e sofisticada. Roda nativamente em Windows, macOS, Linux (incluindo ARM/Raspberry Pi).

### Objetivos

- Paridade funcional com `mc` CLI em interface grafica
- Design minimalista/clean (estilo Linear, Vercel Dashboard)
- Acessivel para desenvolvedores novatos e produtivo para power users
- Binarios leves (~5-15 MB), sem runtime externo
- Suporte a i18n (ingles padrao, portugues brasileiro incluso)

### Publico-Alvo

- DevOps/SREs que ja conhecem MinIO e buscam produtividade
- Desenvolvedores em geral que precisam de orientacao na UI
- Interface intuitiva para novatos com atalhos e views avancadas para power users

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────┐
│                   Tauri Shell                    │
│  ┌───────────────────────────────────────────┐  │
│  │         Frontend (WebView nativo)         │  │
│  │  React 18 + TypeScript + Tailwind CSS     │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │  Pages  │ │Components│ │  Stores    │  │  │
│  │  │(Router) │ │ (UI Kit) │ │ (Zustand)  │  │  │
│  │  └────┬────┘ └─────┬────┘ └─────┬─────┘  │  │
│  │       └────────────┼────────────┘         │  │
│  │                    │ Tauri IPC (invoke)    │  │
│  └────────────────────┼─────────────────────┘  │
│                       │                         │
│  ┌────────────────────┼─────────────────────┐  │
│  │         Backend (Rust Core)               │  │
│  │  ┌────────────┐ ┌────────────┐           │  │
│  │  │  S3 Client │ │Admin Client│           │  │
│  │  │(aws-sdk-s3)│ │ (reqwest)  │           │  │
│  │  └─────┬──────┘ └─────┬──────┘           │  │
│  │        │              │                   │  │
│  │  ┌─────┴──────┐ ┌────┴──────┐           │  │
│  │  │ MC Runner  │ │ Config    │           │  │
│  │  │(tokio proc)│ │ Manager   │           │  │
│  │  └────────────┘ └───────────┘           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Camadas

- **Frontend (WebView nativo):** React com roteamento por paginas, componentes reutilizaveis (UI Kit proprio), estado global via Zustand. Tailwind para estilizacao.
- **Backend Rust:** Quatro modulos:
  - **S3 Client** — operacoes de objetos/buckets via S3 API (aws-sdk-rust)
  - **Admin Client** — operacoes administrativas via MinIO Admin API (reqwest)
  - **MC Runner** — executa comandos `mc` como subprocesso (tokio::process), parseia saida JSON
  - **Config Manager** — profiles de servidores, credenciais criptografadas, preferencias
- **IPC:** Frontend chama backend via `invoke()` do Tauri — tipado, seguro, assincrono

---

## 3. Modulos Funcionais (v1)

### 3.1 Gestao de Servidores (Profiles)

- Criar/editar/remover conexoes (alias, endpoint, access key, secret key)
- Seletor de profile ativo no header da app
- Teste de conexao antes de salvar
- Credenciais armazenadas com criptografia local via keyring do SO (Windows Credential Store, macOS Keychain, Linux Secret Service)

### 3.2 Buckets

- Listar, criar, remover buckets
- Configurar versionamento, object locking, quota
- Visualizar/editar politicas de acesso (public, private, custom)
- Configurar lifecycle rules
- Configurar event notifications

### 3.3 Objects (File Browser)

- Navegacao por pastas (prefixos S3)
- Upload de arquivos e pastas (com drag & drop e barra de progresso)
- Download individual e em lote
- Preview inline para imagens, texto, JSON
- Gerar presigned URLs
- Copiar/mover entre buckets
- Busca por prefixo

### 3.4 Users & Access

- Criar/editar/remover usuarios
- Gerenciar groups
- Criar/editar policies (editor JSON com syntax highlight via CodeMirror)
- Atribuir policies a users/groups
- Gerenciar service accounts

### 3.5 Monitoring

- Server info (versao, uptime, capacidade)
- Metricas de uso de disco por bucket
- Visualizacao de health status
- Logs em tempo real (streaming via backend)

### 3.6 MC Terminal

- Terminal embutido para executar comandos `mc` raw
- Autocomplete de comandos e aliases
- Historico de comandos
- Output formatado (JSON parsed para tabela)

---

## 4. Navegacao e Layout

```
┌──────────────────────────────────────────────────┐
│  [Logo]  Profile Selector ▼    🔍 Search   [⚙]  │  Header
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Buckets   │         Content Area                │
│  Objects   │                                     │
│  Users     │   Breadcrumb: Home > Buckets > ...  │
│  Groups    │  ┌─────────────────────────────┐    │
│  Policies  │  │                             │    │
│  Monitoring│  │      Page Content           │    │
│  MC Term   │  │                             │    │
│            │  │                             │    │
│            │  └─────────────────────────────┘    │
│            │                                     │
├────────────┴─────────────────────────────────────┤
│  Status: Connected ●  │  v1.0.0  │  Notifications│  Footer
└──────────────────────────────────────────────────┘
```

### Principios de Navegacao

- **Sidebar colapsavel** — icones-only quando minimizada
- **Breadcrumb** — sempre visivel, navegacao hierarquica
- **Search global** — `Ctrl+K` / `Cmd+K` abre command palette (busca buckets, objetos, usuarios, comandos)
- **Keyboard-first** — atalhos para todas as acoes principais
- **Notificacoes** — toast no canto inferior direito para operacoes assincronas
- **Tema claro/escuro** — toggle no header, respeita preferencia do SO por padrao

---

## 5. Stack Tecnica

### Frontend

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | React 18 | Ecossistema maduro, componentizacao |
| Linguagem | TypeScript (strict) | Type safety end-to-end |
| Estilizacao | Tailwind CSS 4 | Utilitario, design system rapido |
| Componentes | Radix UI (primitivos) | Acessivel, unstyled, composavel |
| Estado global | Zustand | Leve, sem boilerplate |
| Roteamento | React Router 7 | Lazy loading de pages |
| Tabelas/data | TanStack Table | Sorting, filtering, virtualizacao |
| Editor JSON | CodeMirror 6 | Leve, extensivel, syntax highlight |
| i18n | react-i18next | Maduro, lazy loading de locales |
| Formularios | React Hook Form + Zod | Validacao tipada |
| Icones | Lucide React | Consistente, minimalista |
| Build | Vite | Rapido, HMR, integracao Tauri nativa |

### Backend (Rust)

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Tauri 2 | Cross-platform, seguro, leve |
| S3 Client | aws-sdk-s3 (aws-sdk-rust) | SDK oficial AWS, compativel com MinIO |
| HTTP Client | reqwest | Async, TLS nativo, para Admin API |
| MC Execution | tokio::process | Execucao async de subprocessos |
| Serializacao | serde + serde_json | Standard Rust, tipagem forte |
| Credenciais | keyring-rs | Integra com credential store do SO |
| Config | toml | Arquivo de config legivel |
| Async runtime | Tokio | Standard async Rust |
| Logging | tracing | Structured logging, spans |
| Testes | cargo test + mockall | Unit tests com mocks |

### Tooling

| Ferramenta | Uso |
|---|---|
| Biome | Lint + format (frontend) |
| clippy + rustfmt | Lint + format (Rust) |
| Vitest | Testes frontend |
| Playwright | E2E tests |
| GitHub Actions | CI/CD multi-plataforma |
| tauri-plugin-updater | Auto-update com assinatura |

---

## 6. Estrutura de Diretorios

```
minio-console/
├── src-tauri/                    # Backend Rust
│   ├── src/
│   │   ├── main.rs               # Entry point Tauri
│   │   ├── lib.rs                # Modulo raiz
│   │   ├── commands/             # Tauri IPC commands
│   │   │   ├── mod.rs
│   │   │   ├── buckets.rs
│   │   │   ├── objects.rs
│   │   │   ├── users.rs
│   │   │   ├── policies.rs
│   │   │   ├── monitoring.rs
│   │   │   └── mc_terminal.rs
│   │   ├── s3/                   # S3 API client
│   │   │   ├── mod.rs
│   │   │   ├── client.rs
│   │   │   └── operations.rs
│   │   ├── admin/                # MinIO Admin API client
│   │   │   ├── mod.rs
│   │   │   ├── client.rs
│   │   │   └── operations.rs
│   │   ├── mc/                   # MC CLI runner
│   │   │   ├── mod.rs
│   │   │   ├── runner.rs
│   │   │   └── parser.rs
│   │   ├── config/               # Config & profiles
│   │   │   ├── mod.rs
│   │   │   ├── profiles.rs
│   │   │   └── credentials.rs
│   │   └── models/               # Tipos compartilhados
│   │       ├── mod.rs
│   │       └── types.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── src/                          # Frontend React
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component + router
│   ├── components/               # Componentes reutilizaveis
│   │   ├── ui/                   # UI Kit (Button, Input, Modal...)
│   │   ├── layout/               # Header, Sidebar, Footer
│   │   └── shared/               # Breadcrumb, SearchPalette...
│   ├── pages/                    # Uma pasta por feature
│   │   ├── buckets/
│   │   ├── objects/
│   │   ├── users/
│   │   ├── groups/
│   │   ├── policies/
│   │   ├── monitoring/
│   │   ├── terminal/
│   │   └── settings/
│   ├── stores/                   # Zustand stores
│   ├── hooks/                    # Custom hooks (useS3, useAdmin...)
│   ├── lib/                      # Utilitarios, Tauri IPC wrappers
│   ├── i18n/                     # Configuracao i18next
│   │   └── locales/
│   │       ├── en/
│   │       └── pt-BR/
│   └── styles/                   # Tailwind config, globals
├── docs/                         # Documentacao
├── tests/                        # E2E tests (Playwright)
├── .github/                      # CI/CD workflows
├── package.json
├── vite.config.ts
├── tsconfig.json
├── biome.json
├── tailwind.config.ts
└── CLAUDE.md
```

---

## 7. Distribuicao e CI/CD

### Build Multi-Plataforma (GitHub Actions)

| Target | Runner | Artefato |
|---|---|---|
| Windows x64 | windows-latest | `.msi` + `.exe` (NSIS) |
| macOS x64 | macos-latest | `.dmg` |
| macOS ARM (Apple Silicon) | macos-latest (arm64) | `.dmg` |
| Linux x64 | ubuntu-latest | `.deb` + `.AppImage` |
| Linux ARM64 | ubuntu-latest (cross-compile) | `.deb` + `.AppImage` |

### Canais de Distribuicao

- **Auto-update:** Tauri updater verifica JSON hospedado no GitHub Releases. Assinatura Ed25519 para validar integridade.
- **Package managers:** Publicacao automatizada para `winget`, `brew`, `snap` via CI apos release.
- **GitHub Releases:** Todos os artefatos com checksums SHA256.

### Pipeline CI

```
Push/PR → Lint (Biome + Clippy) → Test (Vitest + Cargo Test) → Build → E2E (Playwright)
                                                                  ↓
                                                          Tag Release → Build Multi-Plataforma → Publish
```

### Versionamento

- Semantic Versioning (`MAJOR.MINOR.PATCH`)
- Changelog gerado automaticamente via conventional commits
