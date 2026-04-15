# Phase 1: Foundation + Profiles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Tauri 2 + React project, build the app shell (sidebar, header, footer, routing, theme), config system, and server profile management — producing a working app that can connect to a MinIO server.

**Architecture:** Tauri 2 with Rust backend and React 18 frontend communicating via IPC. Backend handles config persistence and credential storage. Frontend renders the app shell with collapsible sidebar, header with profile selector, and themed layout.

**Tech Stack:** Tauri 2, React 18, TypeScript (strict), Tailwind CSS 4, Radix UI, Zustand, React Router 7, Vite, Biome, keyring-rs, serde, toml, tracing

---

## Phases Overview

| Phase | Scope | Depends On |
|---|---|---|
| **1 (this plan)** | Foundation + Profiles | — |
| 2 | Buckets + Objects (File Browser) | Phase 1 |
| 3 | Users, Groups, Policies | Phase 1 |
| 4 | Monitoring + MC Terminal | Phase 1 |
| 5 | i18n, Command Palette, CI/CD, Auto-Update | Phase 1-4 |

---

## File Structure

### Backend (Rust) — `src-tauri/`

| File | Responsibility |
|---|---|
| `src-tauri/src/main.rs` | Tauri entry point, registers all commands |
| `src-tauri/src/lib.rs` | Module declarations |
| `src-tauri/src/models/mod.rs` | Module re-exports |
| `src-tauri/src/models/types.rs` | Shared types: `ServerProfile`, `AppConfig` |
| `src-tauri/src/config/mod.rs` | Module re-exports |
| `src-tauri/src/config/profiles.rs` | Profile CRUD: load, save, list, delete, set active |
| `src-tauri/src/config/credentials.rs` | Keyring integration: store/retrieve/delete secrets |
| `src-tauri/src/commands/mod.rs` | Module re-exports |
| `src-tauri/src/commands/profiles.rs` | Tauri IPC commands for profile management |
| `src-tauri/src/commands/connection.rs` | Tauri IPC command to test MinIO connection |
| `src-tauri/Cargo.toml` | Rust dependencies |
| `src-tauri/tauri.conf.json` | Tauri window config, app metadata, permissions |

### Frontend (React) — `src/`

| File | Responsibility |
|---|---|
| `src/main.tsx` | React DOM entry point |
| `src/App.tsx` | Root component: router + layout wrapper |
| `src/styles/globals.css` | Tailwind directives, CSS variables for theming |
| `src/components/ui/button.tsx` | Button component (Radix + Tailwind) |
| `src/components/ui/input.tsx` | Input component |
| `src/components/ui/dialog.tsx` | Dialog/Modal component (Radix Dialog) |
| `src/components/ui/dropdown-menu.tsx` | Dropdown menu (Radix DropdownMenu) |
| `src/components/ui/toast.tsx` | Toast notification component |
| `src/components/layout/sidebar.tsx` | Collapsible sidebar with nav items |
| `src/components/layout/header.tsx` | Header with profile selector, search placeholder, settings |
| `src/components/layout/footer.tsx` | Status bar: connection, version, notifications |
| `src/components/layout/app-layout.tsx` | Combines sidebar + header + footer + content area |
| `src/components/shared/breadcrumb.tsx` | Breadcrumb navigation |
| `src/pages/dashboard/index.tsx` | Dashboard/home page (placeholder) |
| `src/pages/settings/index.tsx` | Settings page: profiles list |
| `src/pages/settings/profile-form.tsx` | Add/edit profile form with connection test |
| `src/stores/profile-store.ts` | Zustand store for profiles + active profile |
| `src/stores/theme-store.ts` | Zustand store for theme (light/dark/system) |
| `src/stores/sidebar-store.ts` | Zustand store for sidebar collapsed state |
| `src/stores/toast-store.ts` | Zustand store for toast notifications |
| `src/lib/tauri.ts` | Typed IPC wrappers for Tauri invoke calls |
| `src/hooks/use-profiles.ts` | Hook wrapping profile store + IPC calls |

### Config/Tooling (root)

| File | Responsibility |
|---|---|
| `package.json` | Frontend dependencies and scripts |
| `tsconfig.json` | TypeScript config (strict) |
| `vite.config.ts` | Vite config with Tauri plugin |
| `tailwind.config.ts` | Tailwind theme, colors, fonts |
| `biome.json` | Biome lint + format rules |

---

## Task 1: Scaffold Tauri 2 + React Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `biome.json`, `tailwind.config.ts`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/globals.css`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`

- [ ] **Step 1: Create Tauri project with React template**

```bash
cd e:/LKeppler/minio-console
npm create tauri-app@latest . -- --template react-ts --manager npm
```

When prompted: select `react-ts` template, `npm` as package manager. If the directory is not empty, allow overwrite.

- [ ] **Step 2: Verify scaffold works**

```bash
cd e:/LKeppler/minio-console
npm install
npm run tauri dev
```

Expected: A Tauri window opens showing the default React template with Vite + Tauri logos.

Close the app after verifying.

- [ ] **Step 3: Install frontend dependencies**

```bash
cd e:/LKeppler/minio-console
npm install react-router-dom@7 zustand @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-slot lucide-react react-hook-form @hookform/resolvers zod class-variance-authority clsx tailwind-merge
npm install -D @biomejs/biome tailwindcss@4 @tailwindcss/vite
```

- [ ] **Step 4: Configure Biome**

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  }
}
```

- [ ] **Step 5: Configure Tailwind CSS 4 and globals.css**

Replace `src/styles/globals.css` (or `src/index.css` if that's what the scaffold created):

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-border: #e5e7eb;
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-danger: #ef4444;
  --color-success: #22c55e;
  --color-warning: #f59e0b;

  --sidebar-width: 240px;
  --sidebar-collapsed-width: 64px;
  --header-height: 56px;
  --footer-height: 32px;
}

.dark {
  --color-bg: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1f1f1f;
  --color-text: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-text-tertiary: #6b7280;
  --color-border: #2e2e2e;
  --color-accent: #3b82f6;
  --color-accent-hover: #60a5fa;
  --color-danger: #f87171;
  --color-success: #4ade80;
  --color-warning: #fbbf24;
}

body {
  margin: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}

* {
  border-color: var(--color-border);
}
```

- [ ] **Step 6: Configure Vite with Tailwind CSS 4 plugin**

Update `vite.config.ts`:

```typescript
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 7: Update tsconfig.json for strict mode and path aliases**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Set up minimal entry points**

`src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx`:

```tsx
export function App() {
  return (
    <div className="flex h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">
        MinIO Console
      </h1>
    </div>
  );
}
```

- [ ] **Step 9: Add Rust backend dependencies to Cargo.toml**

Add these dependencies to `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"
keyring = { version = "3", features = ["apple-native", "windows-native", "sync-secret-service"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
uuid = { version = "1", features = ["v4"] }
dirs = "6"
```

- [ ] **Step 10: Verify everything compiles and runs**

```bash
cd e:/LKeppler/minio-console
npm run tauri dev
```

Expected: App window opens showing "MinIO Console" centered text. No compilation errors.

- [ ] **Step 11: Commit**

```bash
cd e:/LKeppler/minio-console
git add -A
git commit -m "feat: scaffold Tauri 2 + React project with dependencies"
```

---

## Task 2: Rust Config & Profile Models

**Files:**
- Create: `src-tauri/src/models/mod.rs`, `src-tauri/src/models/types.rs`
- Create: `src-tauri/src/config/mod.rs`, `src-tauri/src/config/profiles.rs`, `src-tauri/src/config/credentials.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write tests for profile types serialization**

Create `src-tauri/src/models/types.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ServerProfile {
    pub id: String,
    pub alias: String,
    pub endpoint: String,
    pub access_key: String,
    // secret_key stored in OS keyring, not here
    pub use_ssl: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppConfig {
    pub active_profile_id: Option<String>,
    pub profiles: Vec<ServerProfile>,
    pub theme: String,
    pub sidebar_collapsed: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            active_profile_id: None,
            profiles: Vec::new(),
            theme: "system".to_string(),
            sidebar_collapsed: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_profile_serialization() {
        let profile = ServerProfile {
            id: "test-id".to_string(),
            alias: "local".to_string(),
            endpoint: "http://localhost:9000".to_string(),
            access_key: "minioadmin".to_string(),
            use_ssl: false,
        };
        let toml_str = toml::to_string(&profile).unwrap();
        let deserialized: ServerProfile = toml::from_str(&toml_str).unwrap();
        assert_eq!(profile, deserialized);
    }

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert_eq!(config.active_profile_id, None);
        assert!(config.profiles.is_empty());
        assert_eq!(config.theme, "system");
        assert!(!config.sidebar_collapsed);
    }

    #[test]
    fn test_app_config_serialization_roundtrip() {
        let config = AppConfig {
            active_profile_id: Some("id-1".to_string()),
            profiles: vec![ServerProfile {
                id: "id-1".to_string(),
                alias: "prod".to_string(),
                endpoint: "https://minio.example.com".to_string(),
                access_key: "admin".to_string(),
                use_ssl: true,
            }],
            theme: "dark".to_string(),
            sidebar_collapsed: true,
        };
        let toml_str = toml::to_string(&config).unwrap();
        let deserialized: AppConfig = toml::from_str(&toml_str).unwrap();
        assert_eq!(config, deserialized);
    }
}
```

Create `src-tauri/src/models/mod.rs`:

```rust
pub mod types;
pub use types::*;
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd e:/LKeppler/minio-console/src-tauri
cargo test models
```

Expected: 3 tests pass.

- [ ] **Step 3: Implement profile persistence (config/profiles.rs)**

Create `src-tauri/src/config/profiles.rs`:

```rust
use crate::models::{AppConfig, ServerProfile};
use std::fs;
use std::path::PathBuf;

fn config_dir() -> PathBuf {
    let dir = dirs::config_dir()
        .expect("Could not determine config directory")
        .join("minio-console");
    fs::create_dir_all(&dir).expect("Could not create config directory");
    dir
}

fn config_path() -> PathBuf {
    config_dir().join("config.toml")
}

pub fn load_config() -> AppConfig {
    let path = config_path();
    if !path.exists() {
        return AppConfig::default();
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    toml::from_str(&content).unwrap_or_default()
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = config_path();
    let content = toml::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn add_profile(profile: ServerProfile) -> Result<AppConfig, String> {
    let mut config = load_config();
    config.profiles.push(profile);
    save_config(&config)?;
    Ok(config)
}

pub fn update_profile(profile: ServerProfile) -> Result<AppConfig, String> {
    let mut config = load_config();
    let pos = config
        .profiles
        .iter()
        .position(|p| p.id == profile.id)
        .ok_or_else(|| format!("Profile '{}' not found", profile.id))?;
    config.profiles[pos] = profile;
    save_config(&config)?;
    Ok(config)
}

pub fn delete_profile(id: &str) -> Result<AppConfig, String> {
    let mut config = load_config();
    config.profiles.retain(|p| p.id != id);
    if config.active_profile_id.as_deref() == Some(id) {
        config.active_profile_id = None;
    }
    save_config(&config)?;
    Ok(config)
}

pub fn set_active_profile(id: &str) -> Result<AppConfig, String> {
    let mut config = load_config();
    if !config.profiles.iter().any(|p| p.id == id) {
        return Err(format!("Profile '{}' not found", id));
    }
    config.active_profile_id = Some(id.to_string());
    save_config(&config)?;
    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn setup_test_config() {
        // Use temp dir for tests to avoid polluting real config
        env::set_var("XDG_CONFIG_HOME", env::temp_dir().join("minio-console-test"));
    }

    #[test]
    fn test_load_default_config() {
        let config = AppConfig::default();
        assert!(config.profiles.is_empty());
    }
}
```

- [ ] **Step 4: Implement credential storage (config/credentials.rs)**

Create `src-tauri/src/config/credentials.rs`:

```rust
use keyring::Entry;

const SERVICE_NAME: &str = "minio-console";

pub fn store_secret(profile_id: &str, secret_key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, profile_id).map_err(|e| e.to_string())?;
    entry.set_password(secret_key).map_err(|e| e.to_string())
}

pub fn get_secret(profile_id: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, profile_id).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

pub fn delete_secret(profile_id: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, profile_id).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already gone, that's fine
        Err(e) => Err(e.to_string()),
    }
}
```

Create `src-tauri/src/config/mod.rs`:

```rust
pub mod credentials;
pub mod profiles;
```

- [ ] **Step 5: Wire up modules in lib.rs**

Update `src-tauri/src/lib.rs`:

```rust
pub mod commands;
pub mod config;
pub mod models;
```

Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod connection;
pub mod profiles;
```

- [ ] **Step 6: Run cargo check to verify compilation**

```bash
cd e:/LKeppler/minio-console/src-tauri
cargo check
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd e:/LKeppler/minio-console
git add src-tauri/src/models/ src-tauri/src/config/ src-tauri/src/lib.rs src-tauri/src/commands/mod.rs
git commit -m "feat: add profile models, config persistence, and keyring credential storage"
```

---

## Task 3: Tauri IPC Commands for Profiles

**Files:**
- Create: `src-tauri/src/commands/profiles.rs`, `src-tauri/src/commands/connection.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Implement profile commands**

Create `src-tauri/src/commands/profiles.rs`:

```rust
use crate::config::{credentials, profiles};
use crate::models::{AppConfig, ServerProfile};

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    Ok(profiles::load_config())
}

#[tauri::command]
pub fn add_profile(
    alias: String,
    endpoint: String,
    access_key: String,
    secret_key: String,
    use_ssl: bool,
) -> Result<AppConfig, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let profile = ServerProfile {
        id: id.clone(),
        alias,
        endpoint,
        access_key,
        use_ssl,
    };
    credentials::store_secret(&id, &secret_key)?;
    profiles::add_profile(profile)
}

#[tauri::command]
pub fn update_profile(
    id: String,
    alias: String,
    endpoint: String,
    access_key: String,
    secret_key: Option<String>,
    use_ssl: bool,
) -> Result<AppConfig, String> {
    let profile = ServerProfile {
        id: id.clone(),
        alias,
        endpoint,
        access_key,
        use_ssl,
    };
    if let Some(secret) = secret_key {
        credentials::store_secret(&id, &secret)?;
    }
    profiles::update_profile(profile)
}

#[tauri::command]
pub fn delete_profile(id: String) -> Result<AppConfig, String> {
    credentials::delete_secret(&id)?;
    profiles::delete_profile(&id)
}

#[tauri::command]
pub fn set_active_profile(id: String) -> Result<AppConfig, String> {
    profiles::set_active_profile(&id)
}
```

- [ ] **Step 2: Implement connection test command**

Create `src-tauri/src/commands/connection.rs`:

```rust
use crate::config::credentials;
use crate::models::ServerProfile;

#[derive(serde::Serialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub server_version: Option<String>,
}

#[tauri::command]
pub async fn test_connection(
    endpoint: String,
    access_key: String,
    secret_key: Option<String>,
    profile_id: Option<String>,
    use_ssl: bool,
) -> Result<ConnectionTestResult, String> {
    let secret = match secret_key {
        Some(s) => s,
        None => {
            let pid = profile_id.ok_or("Either secret_key or profile_id must be provided")?;
            credentials::get_secret(&pid)?
        }
    };

    let scheme = if use_ssl { "https" } else { "http" };
    let url = if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
        format!("{}/minio/health/live", endpoint.trim_end_matches('/'))
    } else {
        format!("{}://{}/minio/health/live", scheme, endpoint.trim_end_matches('/'))
    };

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .basic_auth(&access_key, Some(&secret))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(ConnectionTestResult {
            success: true,
            message: "Connected successfully".to_string(),
            server_version: response
                .headers()
                .get("x-minio-server")
                .and_then(|v| v.to_str().ok())
                .map(String::from),
        })
    } else {
        Ok(ConnectionTestResult {
            success: false,
            message: format!("Server returned status {}", response.status()),
            server_version: None,
        })
    }
}
```

- [ ] **Step 3: Register commands in main.rs**

Update `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            minio_console::commands::profiles::get_config,
            minio_console::commands::profiles::add_profile,
            minio_console::commands::profiles::update_profile,
            minio_console::commands::profiles::delete_profile,
            minio_console::commands::profiles::set_active_profile,
            minio_console::commands::connection::test_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Note: the crate name in `Cargo.toml` should be `minio-console` which Rust normalizes to `minio_console`.

- [ ] **Step 4: Verify compilation**

```bash
cd e:/LKeppler/minio-console/src-tauri
cargo check
```

Expected: No errors. If the crate name differs, adjust the `main.rs` module path accordingly.

- [ ] **Step 5: Commit**

```bash
cd e:/LKeppler/minio-console
git add src-tauri/src/commands/ src-tauri/src/main.rs
git commit -m "feat: add Tauri IPC commands for profile CRUD and connection testing"
```

---

## Task 4: Frontend UI Kit (Core Components)

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/toast.tsx`

- [ ] **Step 1: Create utility functions**

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create Button component**

Create `src/components/ui/button.tsx`:

```tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
	{
		variants: {
			variant: {
				default:
					"bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
				destructive:
					"bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90",
				outline:
					"border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-bg-secondary)]",
				ghost: "hover:bg-[var(--color-bg-secondary)]",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 px-3 text-xs",
				lg: "h-10 px-6",
				icon: "h-9 w-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";
```

- [ ] **Step 3: Create Input component**

Create `src/components/ui/input.tsx`:

```tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
	HTMLInputElement,
	InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
	return (
		<input
			type={type}
			className={cn(
				"flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
});
Input.displayName = "Input";
```

- [ ] **Step 4: Create Dialog component**

Create `src/components/ui/dialog.tsx`:

```tsx
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<DialogPrimitive.Portal>
		<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				"fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-lg",
				className,
			)}
			{...props}
		>
			{children}
			<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
				<X className="h-4 w-4" />
			</DialogPrimitive.Close>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);

export const DialogTitle = forwardRef<
	HTMLHeadingElement,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn("text-lg font-semibold leading-none tracking-tight", className)}
		{...props}
	/>
));
DialogTitle.displayName = "DialogTitle";
```

- [ ] **Step 5: Create DropdownMenu component**

Create `src/components/ui/dropdown-menu.tsx`:

```tsx
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			className={cn(
				"z-50 min-w-[8rem] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-1 shadow-md",
				className,
			)}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Item
		ref={ref}
		className={cn(
			"relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-[var(--color-bg-secondary)] focus:bg-[var(--color-bg-secondary)]",
			className,
		)}
		{...props}
	/>
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Separator
		ref={ref}
		className={cn("-mx-1 my-1 h-px bg-[var(--color-border)]", className)}
		{...props}
	/>
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
```

- [ ] **Step 6: Create Toast component**

Create `src/components/ui/toast.tsx`:

```tsx
import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastData {
	id: string;
	title: string;
	description?: string;
	variant?: "default" | "success" | "error" | "warning";
	duration?: number;
}

const icons = {
	default: Info,
	success: CheckCircle,
	error: AlertCircle,
	warning: AlertCircle,
};

const variantStyles = {
	default: "border-[var(--color-border)]",
	success: "border-[var(--color-success)]",
	error: "border-[var(--color-danger)]",
	warning: "border-[var(--color-warning)]",
};

export function Toast({
	toast,
	onDismiss,
}: {
	toast: ToastData;
	onDismiss: (id: string) => void;
}) {
	const variant = toast.variant ?? "default";
	const Icon = icons[variant];

	useEffect(() => {
		const timer = setTimeout(() => {
			onDismiss(toast.id);
		}, toast.duration ?? 4000);
		return () => clearTimeout(timer);
	}, [toast.id, toast.duration, onDismiss]);

	return (
		<div
			className={cn(
				"pointer-events-auto flex w-80 items-start gap-3 rounded-lg border bg-[var(--color-bg)] p-4 shadow-lg",
				variantStyles[variant],
			)}
		>
			<Icon className="mt-0.5 h-4 w-4 shrink-0" />
			<div className="flex-1">
				<p className="text-sm font-medium">{toast.title}</p>
				{toast.description && (
					<p className="mt-1 text-xs text-[var(--color-text-secondary)]">
						{toast.description}
					</p>
				)}
			</div>
			<button
				onClick={() => onDismiss(toast.id)}
				className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	);
}

export function ToastContainer({
	toasts,
	onDismiss,
}: {
	toasts: ToastData[];
	onDismiss: (id: string) => void;
}) {
	return (
		<div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
			{toasts.map((t) => (
				<Toast key={t.id} toast={t} onDismiss={onDismiss} />
			))}
		</div>
	);
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd e:/LKeppler/minio-console
npx tsc --noEmit
```

Expected: No errors. If path alias `@/` isn't resolved, ensure `vite.config.ts` has the resolve alias too (add in next step if needed).

- [ ] **Step 8: Commit**

```bash
cd e:/LKeppler/minio-console
git add src/lib/ src/components/ui/
git commit -m "feat: add core UI kit — Button, Input, Dialog, DropdownMenu, Toast"
```

---

## Task 5: Zustand Stores

**Files:**
- Create: `src/stores/profile-store.ts`, `src/stores/theme-store.ts`, `src/stores/sidebar-store.ts`, `src/stores/toast-store.ts`

- [ ] **Step 1: Create toast store**

Create `src/stores/toast-store.ts`:

```typescript
import { create } from "zustand";
import type { ToastData } from "@/components/ui/toast";

interface ToastStore {
	toasts: ToastData[];
	addToast: (toast: Omit<ToastData, "id">) => void;
	dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
	toasts: [],
	addToast: (toast) =>
		set((state) => ({
			toasts: [
				...state.toasts,
				{ ...toast, id: crypto.randomUUID() },
			],
		})),
	dismissToast: (id) =>
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		})),
}));
```

- [ ] **Step 2: Create theme store**

Create `src/stores/theme-store.ts`:

```typescript
import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	if (theme === "system") {
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		root.classList.toggle("dark", prefersDark);
	} else {
		root.classList.toggle("dark", theme === "dark");
	}
}

export const useThemeStore = create<ThemeStore>((set) => ({
	theme: (localStorage.getItem("theme") as Theme) ?? "system",
	setTheme: (theme) => {
		localStorage.setItem("theme", theme);
		applyTheme(theme);
		set({ theme });
	},
}));

// Apply theme on load
applyTheme(useThemeStore.getState().theme);

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
	if (useThemeStore.getState().theme === "system") {
		applyTheme("system");
	}
});
```

- [ ] **Step 3: Create sidebar store**

Create `src/stores/sidebar-store.ts`:

```typescript
import { create } from "zustand";

interface SidebarStore {
	collapsed: boolean;
	toggle: () => void;
	setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
	collapsed: localStorage.getItem("sidebar-collapsed") === "true",
	toggle: () =>
		set((state) => {
			const next = !state.collapsed;
			localStorage.setItem("sidebar-collapsed", String(next));
			return { collapsed: next };
		}),
	setCollapsed: (collapsed) => {
		localStorage.setItem("sidebar-collapsed", String(collapsed));
		set({ collapsed });
	},
}));
```

- [ ] **Step 4: Create profile store**

Create `src/stores/profile-store.ts`:

```typescript
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface ServerProfile {
	id: string;
	alias: string;
	endpoint: string;
	access_key: string;
	use_ssl: boolean;
}

export interface AppConfig {
	active_profile_id: string | null;
	profiles: ServerProfile[];
	theme: string;
	sidebar_collapsed: boolean;
}

export interface ConnectionTestResult {
	success: boolean;
	message: string;
	server_version: string | null;
}

interface ProfileStore {
	config: AppConfig | null;
	loading: boolean;
	loadConfig: () => Promise<void>;
	addProfile: (
		alias: string,
		endpoint: string,
		accessKey: string,
		secretKey: string,
		useSsl: boolean,
	) => Promise<void>;
	updateProfile: (
		id: string,
		alias: string,
		endpoint: string,
		accessKey: string,
		secretKey: string | null,
		useSsl: boolean,
	) => Promise<void>;
	deleteProfile: (id: string) => Promise<void>;
	setActiveProfile: (id: string) => Promise<void>;
	testConnection: (
		endpoint: string,
		accessKey: string,
		secretKey: string | null,
		profileId: string | null,
		useSsl: boolean,
	) => Promise<ConnectionTestResult>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
	config: null,
	loading: false,
	loadConfig: async () => {
		set({ loading: true });
		const config = await invoke<AppConfig>("get_config");
		set({ config, loading: false });
	},
	addProfile: async (alias, endpoint, accessKey, secretKey, useSsl) => {
		const config = await invoke<AppConfig>("add_profile", {
			alias,
			endpoint,
			accessKey,
			secretKey,
			useSsl,
		});
		set({ config });
	},
	updateProfile: async (id, alias, endpoint, accessKey, secretKey, useSsl) => {
		const config = await invoke<AppConfig>("update_profile", {
			id,
			alias,
			endpoint,
			accessKey,
			secretKey,
			useSsl,
		});
		set({ config });
	},
	deleteProfile: async (id) => {
		const config = await invoke<AppConfig>("delete_profile", { id });
		set({ config });
	},
	setActiveProfile: async (id) => {
		const config = await invoke<AppConfig>("set_active_profile", { id });
		set({ config });
	},
	testConnection: async (endpoint, accessKey, secretKey, profileId, useSsl) => {
		return invoke<ConnectionTestResult>("test_connection", {
			endpoint,
			accessKey,
			secretKey,
			profileId,
			useSsl,
		});
	},
}));
```

- [ ] **Step 5: Commit**

```bash
cd e:/LKeppler/minio-console
git add src/stores/
git commit -m "feat: add Zustand stores — profiles, theme, sidebar, toast"
```

---

## Task 6: App Layout Components

**Files:**
- Create: `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`, `src/components/layout/app-layout.tsx`
- Create: `src/components/shared/breadcrumb.tsx`

- [ ] **Step 1: Create Sidebar component**

Create `src/components/layout/sidebar.tsx`:

```tsx
import { useLocation, Link } from "react-router-dom";
import {
	Database,
	FolderOpen,
	Users,
	UsersRound,
	Shield,
	Activity,
	Terminal,
	Settings,
	PanelLeftClose,
	PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";

const navItems = [
	{ path: "/buckets", label: "Buckets", icon: Database },
	{ path: "/objects", label: "Objects", icon: FolderOpen },
	{ path: "/users", label: "Users", icon: Users },
	{ path: "/groups", label: "Groups", icon: UsersRound },
	{ path: "/policies", label: "Policies", icon: Shield },
	{ path: "/monitoring", label: "Monitoring", icon: Activity },
	{ path: "/terminal", label: "MC Terminal", icon: Terminal },
];

export function Sidebar() {
	const { collapsed, toggle } = useSidebarStore();
	const location = useLocation();

	return (
		<aside
			className={cn(
				"flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-200",
				collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]",
			)}
		>
			<div className="flex items-center justify-between p-3">
				{!collapsed && (
					<span className="text-sm font-semibold text-[var(--color-text)]">MinIO</span>
				)}
				<button
					onClick={toggle}
					className="rounded-md p-1.5 hover:bg-[var(--color-bg-tertiary)]"
				>
					{collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
				</button>
			</div>

			<nav className="flex-1 space-y-1 px-2">
				{navItems.map((item) => {
					const isActive = location.pathname.startsWith(item.path);
					return (
						<Link
							key={item.path}
							to={item.path}
							className={cn(
								"flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
								isActive
									? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
									: "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]",
								collapsed && "justify-center px-0",
							)}
							title={collapsed ? item.label : undefined}
						>
							<item.icon className="h-4 w-4 shrink-0" />
							{!collapsed && <span>{item.label}</span>}
						</Link>
					);
				})}
			</nav>

			<div className="border-t border-[var(--color-border)] p-2">
				<Link
					to="/settings"
					className={cn(
						"flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]",
						collapsed && "justify-center px-0",
					)}
				>
					<Settings className="h-4 w-4 shrink-0" />
					{!collapsed && <span>Settings</span>}
				</Link>
			</div>
		</aside>
	);
}
```

- [ ] **Step 2: Create Header component**

Create `src/components/layout/header.tsx`:

```tsx
import { Search, Sun, Moon, Monitor } from "lucide-react";
import { useProfileStore } from "@/stores/profile-store";
import { useThemeStore } from "@/stores/theme-store";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
	const { config, setActiveProfile } = useProfileStore();
	const { theme, setTheme } = useThemeStore();

	const activeProfile = config?.profiles.find(
		(p) => p.id === config.active_profile_id,
	);

	const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
	const ThemeIcon = themeIcon;

	return (
		<header className="flex h-[var(--header-height)] items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4">
			<div className="flex items-center gap-4">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="min-w-[160px] justify-start">
							{activeProfile ? activeProfile.alias : "No server selected"}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{config?.profiles.map((profile) => (
							<DropdownMenuItem
								key={profile.id}
								onClick={() => setActiveProfile(profile.id)}
							>
								<span className="flex-1">{profile.alias}</span>
								{profile.id === config.active_profile_id && (
									<span className="ml-2 text-xs text-[var(--color-accent)]">active</span>
								)}
							</DropdownMenuItem>
						))}
						{config?.profiles.length === 0 && (
							<DropdownMenuItem disabled>No profiles configured</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="flex items-center gap-2">
				<Button variant="ghost" size="sm" className="gap-2 text-[var(--color-text-secondary)]">
					<Search className="h-4 w-4" />
					<span className="text-xs">Ctrl+K</span>
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<ThemeIcon className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => setTheme("light")}>
							<Sun className="mr-2 h-4 w-4" /> Light
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<Moon className="mr-2 h-4 w-4" /> Dark
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setTheme("system")}>
							<Monitor className="mr-2 h-4 w-4" /> System
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
```

- [ ] **Step 3: Create Footer component**

Create `src/components/layout/footer.tsx`:

```tsx
import { useProfileStore } from "@/stores/profile-store";

export function Footer() {
	const { config } = useProfileStore();
	const activeProfile = config?.profiles.find(
		(p) => p.id === config.active_profile_id,
	);

	return (
		<footer className="flex h-[var(--footer-height)] items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 text-xs text-[var(--color-text-tertiary)]">
			<div className="flex items-center gap-2">
				{activeProfile ? (
					<>
						<span className="inline-block h-2 w-2 rounded-full bg-[var(--color-success)]" />
						<span>{activeProfile.endpoint}</span>
					</>
				) : (
					<>
						<span className="inline-block h-2 w-2 rounded-full bg-[var(--color-text-tertiary)]" />
						<span>Not connected</span>
					</>
				)}
			</div>
			<span>v0.1.0</span>
		</footer>
	);
}
```

- [ ] **Step 4: Create Breadcrumb component**

Create `src/components/shared/breadcrumb.tsx`:

```tsx
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export function Breadcrumb() {
	const location = useLocation();
	const segments = location.pathname.split("/").filter(Boolean);

	if (segments.length === 0) return null;

	return (
		<nav className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
			<Link to="/" className="hover:text-[var(--color-text)]">
				Home
			</Link>
			{segments.map((segment, index) => {
				const path = `/${segments.slice(0, index + 1).join("/")}`;
				const isLast = index === segments.length - 1;
				const label = segment.charAt(0).toUpperCase() + segment.slice(1);

				return (
					<span key={path} className="flex items-center gap-1">
						<ChevronRight className="h-3 w-3" />
						{isLast ? (
							<span className="font-medium text-[var(--color-text)]">{label}</span>
						) : (
							<Link to={path} className="hover:text-[var(--color-text)]">
								{label}
							</Link>
						)}
					</span>
				);
			})}
		</nav>
	);
}
```

- [ ] **Step 5: Create AppLayout component**

Create `src/components/layout/app-layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Footer } from "./footer";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ToastContainer } from "@/components/ui/toast";
import { useToastStore } from "@/stores/toast-store";

export function AppLayout() {
	const { toasts, dismissToast } = useToastStore();

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg)]">
			<Header />
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />
				<main className="flex flex-1 flex-col overflow-hidden">
					<div className="border-b border-[var(--color-border)] px-6 py-3">
						<Breadcrumb />
					</div>
					<div className="flex-1 overflow-auto p-6">
						<Outlet />
					</div>
				</main>
			</div>
			<Footer />
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
```

- [ ] **Step 6: Commit**

```bash
cd e:/LKeppler/minio-console
git add src/components/layout/ src/components/shared/
git commit -m "feat: add app layout — sidebar, header, footer, breadcrumb"
```

---

## Task 7: Routing and App Shell

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/dashboard/index.tsx`
- Create: `src/pages/settings/index.tsx`

- [ ] **Step 1: Create Dashboard placeholder page**

Create `src/pages/dashboard/index.tsx`:

```tsx
export function DashboardPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<p className="text-[var(--color-text-secondary)]">
				Select a server profile to get started, or add one in Settings.
			</p>
		</div>
	);
}
```

- [ ] **Step 2: Create placeholder pages for all nav items**

Create `src/pages/buckets/index.tsx`:

```tsx
export function BucketsPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Buckets</h1>
			<p className="text-[var(--color-text-secondary)]">Coming in Phase 2.</p>
		</div>
	);
}
```

Create `src/pages/objects/index.tsx`:

```tsx
export function ObjectsPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Objects</h1>
			<p className="text-[var(--color-text-secondary)]">Coming in Phase 2.</p>
		</div>
	);
}
```

Create `src/pages/users/index.tsx`:

```tsx
export function UsersPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Users</h1>
			<p className="text-[var(--color-text-secondary)]">Coming in Phase 3.</p>
		</div>
	);
}
```

Create `src/pages/groups/index.tsx`:

```tsx
export function GroupsPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Groups</h1>
			<p className="text-[var(--color-text-secondary)]">Coming in Phase 3.</p>
		</div>
	);
}
```

Create `src/pages/policies/index.tsx`:

```tsx
export function PoliciesPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Policies</h1>
			<p className="text-[var(--color-text-secondary)]">Coming in Phase 3.</p>
		</div>
	);
}
```

Create `src/pages/monitoring/index.tsx`:

```tsx
export function MonitoringPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Monitoring</h1>
			<p className="text-[var(--color-text-secondary)]">Coming in Phase 4.</p>
		</div>
	);
}
```

Create `src/pages/terminal/index.tsx`:

```tsx
export function TerminalPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">MC Terminal</h1>
			<p className="text-[var(--color-text-secondary)]">Coming in Phase 4.</p>
		</div>
	);
}
```

- [ ] **Step 3: Wire up routing in App.tsx**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard/index";
import { BucketsPage } from "@/pages/buckets/index";
import { ObjectsPage } from "@/pages/objects/index";
import { UsersPage } from "@/pages/users/index";
import { GroupsPage } from "@/pages/groups/index";
import { PoliciesPage } from "@/pages/policies/index";
import { MonitoringPage } from "@/pages/monitoring/index";
import { TerminalPage } from "@/pages/terminal/index";
import { SettingsPage } from "@/pages/settings/index";
import { useProfileStore } from "@/stores/profile-store";

export function App() {
	const loadConfig = useProfileStore((s) => s.loadConfig);

	useEffect(() => {
		loadConfig();
	}, [loadConfig]);

	return (
		<BrowserRouter>
			<Routes>
				<Route element={<AppLayout />}>
					<Route path="/" element={<DashboardPage />} />
					<Route path="/buckets" element={<BucketsPage />} />
					<Route path="/objects" element={<ObjectsPage />} />
					<Route path="/users" element={<UsersPage />} />
					<Route path="/groups" element={<GroupsPage />} />
					<Route path="/policies" element={<PoliciesPage />} />
					<Route path="/monitoring" element={<MonitoringPage />} />
					<Route path="/terminal" element={<TerminalPage />} />
					<Route path="/settings" element={<SettingsPage />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
```

- [ ] **Step 4: Create Settings page (placeholder — will be expanded in Task 8)**

Create `src/pages/settings/index.tsx`:

```tsx
export function SettingsPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Settings</h1>
			<p className="text-[var(--color-text-secondary)]">Server profiles will appear here.</p>
		</div>
	);
}
```

- [ ] **Step 5: Verify the app shell renders**

```bash
cd e:/LKeppler/minio-console
npm run tauri dev
```

Expected: App opens with sidebar (Buckets, Objects, Users, Groups, Policies, Monitoring, MC Terminal, Settings), header with profile selector and theme toggle, breadcrumb, footer with "Not connected", and Dashboard page in content area. Clicking nav items changes page and breadcrumb. Theme toggle switches between light/dark. Sidebar collapses/expands.

- [ ] **Step 6: Commit**

```bash
cd e:/LKeppler/minio-console
git add src/App.tsx src/pages/
git commit -m "feat: add routing and app shell with all page placeholders"
```

---

## Task 8: Profile Management UI

**Files:**
- Modify: `src/pages/settings/index.tsx`
- Create: `src/pages/settings/profile-form.tsx`

- [ ] **Step 1: Create profile form component**

Create `src/pages/settings/profile-form.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfileStore, type ServerProfile } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const profileSchema = z.object({
	alias: z.string().min(1, "Alias is required"),
	endpoint: z.string().min(1, "Endpoint is required"),
	accessKey: z.string().min(1, "Access key is required"),
	secretKey: z.string().min(1, "Secret key is required"),
	useSsl: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
	profile?: ServerProfile;
	onClose: () => void;
}

export function ProfileForm({ profile, onClose }: ProfileFormProps) {
	const { addProfile, updateProfile, testConnection } = useProfileStore();
	const { addToast } = useToastStore();
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const {
		register,
		handleSubmit,
		getValues,
		formState: { errors, isSubmitting },
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			alias: profile?.alias ?? "",
			endpoint: profile?.endpoint ?? "",
			accessKey: profile?.access_key ?? "",
			secretKey: "",
			useSsl: profile?.use_ssl ?? true,
		},
	});

	async function onSubmit(data: ProfileFormData) {
		try {
			if (profile) {
				await updateProfile(
					profile.id,
					data.alias,
					data.endpoint,
					data.accessKey,
					data.secretKey || null,
					data.useSsl,
				);
				addToast({ title: "Profile updated", variant: "success" });
			} else {
				await addProfile(
					data.alias,
					data.endpoint,
					data.accessKey,
					data.secretKey,
					data.useSsl,
				);
				addToast({ title: "Profile created", variant: "success" });
			}
			onClose();
		} catch (err) {
			addToast({
				title: "Error saving profile",
				description: String(err),
				variant: "error",
			});
		}
	}

	async function handleTestConnection() {
		const values = getValues();
		if (!values.endpoint || !values.accessKey) return;

		setTesting(true);
		setTestResult(null);
		try {
			const result = await testConnection(
				values.endpoint,
				values.accessKey,
				values.secretKey || null,
				profile?.id ?? null,
				values.useSsl,
			);
			setTestResult(result);
		} catch (err) {
			setTestResult({ success: false, message: String(err) });
		} finally {
			setTesting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="space-y-2">
				<label className="text-sm font-medium">Alias</label>
				<Input placeholder="e.g., local, production" {...register("alias")} />
				{errors.alias && (
					<p className="text-xs text-[var(--color-danger)]">{errors.alias.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium">Endpoint</label>
				<Input placeholder="e.g., localhost:9000 or minio.example.com" {...register("endpoint")} />
				{errors.endpoint && (
					<p className="text-xs text-[var(--color-danger)]">{errors.endpoint.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium">Access Key</label>
				<Input placeholder="Access key" {...register("accessKey")} />
				{errors.accessKey && (
					<p className="text-xs text-[var(--color-danger)]">{errors.accessKey.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium">
					Secret Key {profile && "(leave blank to keep current)"}
				</label>
				<Input type="password" placeholder="Secret key" {...register("secretKey")} />
				{errors.secretKey && (
					<p className="text-xs text-[var(--color-danger)]">{errors.secretKey.message}</p>
				)}
			</div>

			<div className="flex items-center gap-2">
				<input type="checkbox" id="useSsl" {...register("useSsl")} className="rounded" />
				<label htmlFor="useSsl" className="text-sm">
					Use SSL/TLS
				</label>
			</div>

			{testResult && (
				<div
					className={`flex items-center gap-2 rounded-md p-3 text-sm ${
						testResult.success
							? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
							: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
					}`}
				>
					{testResult.success ? (
						<CheckCircle className="h-4 w-4" />
					) : (
						<XCircle className="h-4 w-4" />
					)}
					{testResult.message}
				</div>
			)}

			<div className="flex justify-between pt-2">
				<Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
					{testing && <Loader2 className="h-4 w-4 animate-spin" />}
					Test Connection
				</Button>
				<div className="flex gap-2">
					<Button type="button" variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
						{profile ? "Update" : "Create"}
					</Button>
				</div>
			</div>
		</form>
	);
}
```

- [ ] **Step 2: Build the Settings page with profile list**

Replace `src/pages/settings/index.tsx`:

```tsx
import { useState } from "react";
import { useProfileStore, type ServerProfile } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfileForm } from "./profile-form";
import { Plus, Pencil, Trash2, Server } from "lucide-react";

export function SettingsPage() {
	const { config, deleteProfile, setActiveProfile } = useProfileStore();
	const { addToast } = useToastStore();
	const [formOpen, setFormOpen] = useState(false);
	const [editingProfile, setEditingProfile] = useState<ServerProfile | undefined>();

	function handleEdit(profile: ServerProfile) {
		setEditingProfile(profile);
		setFormOpen(true);
	}

	function handleCreate() {
		setEditingProfile(undefined);
		setFormOpen(true);
	}

	async function handleDelete(profile: ServerProfile) {
		try {
			await deleteProfile(profile.id);
			addToast({ title: `Profile "${profile.alias}" deleted`, variant: "success" });
		} catch (err) {
			addToast({ title: "Error deleting profile", description: String(err), variant: "error" });
		}
	}

	async function handleSetActive(id: string) {
		try {
			await setActiveProfile(id);
		} catch (err) {
			addToast({ title: "Error setting active profile", description: String(err), variant: "error" });
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Server Profiles</h1>
				<Button onClick={handleCreate} size="sm">
					<Plus className="h-4 w-4" /> Add Profile
				</Button>
			</div>

			{config?.profiles.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-12">
					<Server className="mb-4 h-10 w-10 text-[var(--color-text-tertiary)]" />
					<p className="text-sm text-[var(--color-text-secondary)]">
						No server profiles configured yet.
					</p>
					<Button onClick={handleCreate} variant="outline" size="sm" className="mt-4">
						<Plus className="h-4 w-4" /> Add your first profile
					</Button>
				</div>
			)}

			<div className="space-y-2">
				{config?.profiles.map((profile) => {
					const isActive = profile.id === config.active_profile_id;
					return (
						<div
							key={profile.id}
							className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
								isActive
									? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
									: "border-[var(--color-border)]"
							}`}
						>
							<button
								onClick={() => handleSetActive(profile.id)}
								className="flex flex-1 items-center gap-3 text-left"
							>
								<div
									className={`h-2 w-2 rounded-full ${
										isActive ? "bg-[var(--color-success)]" : "bg-[var(--color-text-tertiary)]"
									}`}
								/>
								<div>
									<p className="text-sm font-medium">{profile.alias}</p>
									<p className="text-xs text-[var(--color-text-secondary)]">
										{profile.endpoint}
									</p>
								</div>
							</button>

							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleEdit(profile)}
								>
									<Pencil className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleDelete(profile)}
								>
									<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
								</Button>
							</div>
						</div>
					);
				})}
			</div>

			<Dialog open={formOpen} onOpenChange={setFormOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingProfile ? "Edit Profile" : "New Profile"}
						</DialogTitle>
					</DialogHeader>
					<ProfileForm
						profile={editingProfile}
						onClose={() => setFormOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
```

- [ ] **Step 3: Run the app and verify profile management flow**

```bash
cd e:/LKeppler/minio-console
npm run tauri dev
```

Expected: Navigate to Settings. See empty state with "Add your first profile". Click to open form dialog. Fill in fields, test connection (will fail if no MinIO running — that's OK, verify the UI flow works). Create profile, see it appear in the list. Edit and delete work. Switching active profile updates the header selector and footer.

- [ ] **Step 4: Commit**

```bash
cd e:/LKeppler/minio-console
git add src/pages/settings/
git commit -m "feat: add profile management UI — create, edit, delete, test connection"
```

---

## Task 9: Final Integration Test and Polish

**Files:**
- Potentially fix any issues found during integration testing

- [ ] **Step 1: Full app integration test**

```bash
cd e:/LKeppler/minio-console
npm run tauri dev
```

Walk through the entire flow:
1. App opens at Dashboard
2. Navigate to each page via sidebar — breadcrumb updates
3. Collapse/expand sidebar — persists after reload
4. Toggle theme to dark/light/system — persists after reload
5. Go to Settings, create a profile
6. Profile appears in header dropdown
7. Set as active — footer shows connection indicator
8. Edit profile — form pre-fills, secret key says "leave blank to keep"
9. Delete profile — removed from list and header
10. Toasts appear for actions and auto-dismiss

- [ ] **Step 2: Fix any issues found**

Address any compilation errors, visual bugs, or broken interactions.

- [ ] **Step 3: Run lint**

```bash
cd e:/LKeppler/minio-console
npx @biomejs/biome check --write src/
cd src-tauri && cargo clippy && cargo fmt
```

Fix any lint issues.

- [ ] **Step 4: Final commit**

```bash
cd e:/LKeppler/minio-console
git add -A
git commit -m "chore: lint fixes and integration polish for Phase 1"
```

---

## Summary

| Task | What it builds | Commits |
|---|---|---|
| 1 | Tauri + React scaffold with all dependencies | 1 |
| 2 | Rust models, config persistence, keyring credentials | 1 |
| 3 | Tauri IPC commands for profiles + connection test | 1 |
| 4 | Frontend UI Kit (Button, Input, Dialog, Dropdown, Toast) | 1 |
| 5 | Zustand stores (profiles, theme, sidebar, toast) | 1 |
| 6 | App layout (sidebar, header, footer, breadcrumb) | 1 |
| 7 | Routing + page placeholders | 1 |
| 8 | Profile management UI (Settings page + form) | 1 |
| 9 | Integration test + lint polish | 1 |

**End state:** A working Tauri desktop app with full navigation shell, theme support, collapsible sidebar, and complete server profile management (CRUD + connection test + OS keyring storage).
