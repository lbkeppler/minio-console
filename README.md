# MinIO Console

<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" alt="MinIO Console Icon" />
</p>

<p align="center">
  <strong>Cross-platform desktop application for complete MinIO server management.</strong>
</p>

<p align="center">
  Built with Tauri 2 + React 18 + TypeScript + Tailwind CSS 4
</p>

---

## Features

- **Dashboard** — Server overview with real-time status, capacity and uptime
- **Buckets** — Create, delete, configure versioning and access policies (private/download/public)
- **Objects** — Browse, upload, download and manage objects with prefix navigation
- **Users** — Create and manage IAM users with service accounts
- **Groups** — Organize users into groups with policy assignments
- **Policies** — View, create and attach IAM policies
- **Monitoring** — Real-time server metrics and performance data
- **Terminal** — Built-in MC command interface with full autocomplete (Tab/comma trigger)
- **Multi-profile** — Connect to multiple MinIO servers with secure credential storage
- **i18n** — English and Portuguese (BR) included

## Screenshots

> _Coming soon_

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Tauri 2](https://tauri.app/) |
| Frontend | React 18, TypeScript (strict), Tailwind CSS 4, Radix UI |
| State | Zustand |
| Backend | Rust, aws-sdk-s3, reqwest, tokio |
| Credentials | keyring-rs (OS native credential store) |
| Lint/Format | Biome (frontend), clippy + rustfmt (backend) |
| Build | Vite (frontend), Cargo (backend) |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.75
- [Tauri CLI](https://tauri.app/start/prerequisites/) prerequisites for your OS
- MinIO server (local or remote) with access/secret keys

## Getting Started

```bash
# Clone
git clone https://github.com/lbkeppler/minio-console.git
cd minio-console

# Install dependencies
npm install

# Start in development mode (frontend + backend hot-reload)
npm run tauri dev
```

The app window will open automatically. Configure your first MinIO server profile in Settings.

## Development Commands

```bash
# Dev
npm run tauri dev          # Full app (frontend + Rust backend)
npm run dev                # Frontend only (Vite dev server on :1420)
cargo test                 # Rust backend tests
npx biome check           # Lint + format check
cargo clippy               # Rust lint

# Build
npm run tauri build        # Production build for current platform
```

## Project Structure

```
minio-console/
├── src/                        # Frontend (React + TypeScript)
│   ├── components/ui/          # Shared UI components (Button, Dialog, DataTable...)
│   ├── pages/                  # Feature pages
│   │   ├── dashboard/          # Server overview
│   │   ├── buckets/            # Bucket management + settings
│   │   ├── objects/            # Object browser
│   │   ├── users/              # User management
│   │   ├── groups/             # Group management
│   │   ├── policies/           # IAM policies
│   │   ├── monitoring/         # Server metrics
│   │   ├── terminal/           # MC terminal with autocomplete
│   │   └── settings/           # App settings + profiles
│   ├── stores/                 # Zustand state stores
│   ├── lib/                    # Tauri IPC wrappers
│   └── i18n/                   # Internationalization (en, pt-BR)
├── src-tauri/                  # Backend (Rust)
│   └── src/
│       ├── commands/           # Tauri IPC command handlers
│       ├── s3/                 # S3 client operations
│       ├── admin/              # MinIO admin API
│       ├── mc/                 # MC CLI runner
│       ├── config/             # App configuration
│       └── models/             # Shared types
└── docs/                       # Design specs and documentation
```

## Building for Production

```bash
npm run tauri build
```

Outputs platform-specific installers:
- **Windows**: `.msi` / `.exe` in `src-tauri/target/release/bundle/`
- **macOS**: `.dmg` / `.app`
- **Linux**: `.deb` / `.AppImage`

## Conventions

- **Language**: Code and comments in English. UI supports i18n.
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- **IPC**: Frontend calls backend via Tauri `invoke()`. All commands are async, return `Result<T, String>`.
- **Credentials**: Never stored in plaintext. Uses OS keychain via `keyring-rs`.

## License

Private — All rights reserved.

---

<p align="center">
  Made with Rust + React + Tauri
</p>
