# MC Binary Bundling — Design Spec

**Date:** 2026-04-10
**Status:** Approved
**Goal:** Bundle the MinIO Client (mc) binary with the app installer so it works out of the box on all platforms without requiring the user to install mc separately.

## Approach: Tauri Sidecar (External Binary)

Tauri 2 has native support for bundling external binaries via the `externalBin` configuration. The binary is packaged into the installer and resolved at runtime via Tauri's resource path API.

## Binary Naming Convention

Tauri expects binaries named with the Rust target triple suffix:

```
src-tauri/binaries/
├── mc-x86_64-pc-windows-msvc.exe      # Windows x64
├── mc-aarch64-pc-windows-msvc.exe     # Windows ARM64
├── mc-x86_64-apple-darwin             # macOS Intel
├── mc-aarch64-apple-darwin            # macOS Apple Silicon
├── mc-x86_64-unknown-linux-gnu        # Linux x64
└── mc-aarch64-unknown-linux-gnu       # Linux ARM64
```

Only the binary matching the build target is included in the final installer.

## Configuration

### `tauri.conf.json`

Add `externalBin` to the bundle section:

```json
{
  "bundle": {
    "externalBin": ["binaries/mc"]
  }
}
```

Tauri automatically appends the target triple and `.exe` extension as needed.

### `.gitignore`

Add `src-tauri/binaries/` — binaries are downloaded by a script, not committed to git.

## Download Script

A script `scripts/download-mc.sh` (and `scripts/download-mc.ps1` for Windows dev) downloads mc from MinIO's official CDN:

- Base URL: `https://dl.min.io/client/mc/release/`
- Platforms: `linux-amd64`, `linux-arm64`, `darwin-amd64`, `darwin-arm64`, `windows-amd64`
- Renames each download to the Tauri-expected name with target triple suffix
- Places them in `src-tauri/binaries/`

## Runtime Resolution (`runner.rs`)

Update `find_mc()` to use Tauri's sidecar resolution:

1. **Sidecar path** (primary) — Use `app.shell().sidecar("mc")` or resolve from Tauri's resource directory. This is the bundled binary.
2. **Adjacent to exe** (fallback) — Current logic checking next to the executable.
3. **System PATH** (last resort) — `which::which("mc")` for dev environments or if user has mc installed globally.

The `run_mc` function needs access to the Tauri `AppHandle` to resolve the sidecar path. This means passing the handle from the command layer.

## CI/CD (GitHub Actions)

Each platform build job:
1. Runs the download script for its target platform only
2. Runs `npm run tauri build`
3. The resulting installer includes the mc binary

```yaml
# Example step
- name: Download mc binary
  run: ./scripts/download-mc.sh ${{ matrix.target }}
```

## Size Impact

Each mc binary is ~25MB. Since only one is included per installer, the app size increases by ~25MB (compressed will be less in the final .msi/.dmg/.deb).

## Security Considerations

- Binaries are downloaded over HTTPS from the official MinIO CDN
- The download script can verify SHA256 checksums (published by MinIO alongside releases)
- The bundled binary runs with the same permissions as the app itself

## Changes Required

1. Add `externalBin` to `tauri.conf.json`
2. Create `scripts/download-mc.sh` and `scripts/download-mc.ps1`
3. Update `src-tauri/src/mc/runner.rs` to resolve sidecar path via AppHandle
4. Update command layer to pass AppHandle to mc runner
5. Add `src-tauri/binaries/` to `.gitignore`
6. Add Tauri shell plugin permission for sidecar execution
