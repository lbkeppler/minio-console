# MinIO Console

Cross-platform desktop application for complete MinIO server management.
Built with Tauri 2 (Rust backend) + React 18 + TypeScript + Tailwind CSS.

## Quick Reference

- **Design Spec:** `docs-specs/specs/2026-04-10-minio-console-design.md`
- **Frontend:** `src/` — React 18, TypeScript strict, Tailwind CSS 4, Radix UI, Zustand
- **Backend:** `src-tauri/` — Rust, Tauri 2, aws-sdk-s3, reqwest, tokio
- **Tests:** Vitest (frontend), cargo test (backend), Playwright (E2E)
- **Lint/Format:** Biome (frontend), clippy + rustfmt (backend)

## Development Commands

```bash
# Dev
npm run tauri dev          # Start app in dev mode (frontend + backend)
npm run dev                # Frontend only (Vite dev server)
cargo test                 # Rust backend tests
npm run test               # Frontend tests (Vitest)
npm run lint               # Biome lint + format check
cargo clippy               # Rust lint

# Build
npm run tauri build        # Production build for current platform
```

## Conventions

- **Language:** Code and comments in English. UI supports i18n (en default, pt-BR included).
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **Frontend patterns:** One folder per feature in `src/pages/`. Shared components in `src/components/ui/`. Zustand stores in `src/stores/`. Tauri IPC wrappers in `src/lib/`.
- **Backend patterns:** Tauri commands in `src-tauri/src/commands/`. Business logic in domain modules (`s3/`, `admin/`, `mc/`, `config/`). Types in `models/`.
- **IPC:** Frontend calls backend via Tauri `invoke()`. All commands are async. Return `Result<T, String>` from Rust.
- **Error handling:** Rust errors converted to user-friendly strings at the command layer. Frontend shows toast notifications for errors.
- **Credentials:** Never stored in plaintext. Use `keyring-rs` for OS credential store integration.
