use std::process::Stdio;
use std::sync::LazyLock;
use tokio::process::Command;
use tokio::sync::Mutex;

/// Global mutex to serialize mc CLI calls — mc uses a single config.json
/// and concurrent writes cause "Access is denied" on Windows.
static MC_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

pub async fn run_mc(args: &[&str]) -> Result<String, String> {
    let mc_path = find_mc().ok_or(
        "mc (MinIO Client) not found in PATH. Please install mc and ensure it's in your PATH.",
    )?;

    let mc_config_dir = dirs::config_dir()
        .expect("Could not determine config directory")
        .join("minio-console")
        .join("mc");
    std::fs::create_dir_all(&mc_config_dir)
        .map_err(|e| format!("Failed to create mc config dir: {}", e))?;

    // Serialize all mc calls to prevent concurrent config.json writes
    let _guard = MC_LOCK.lock().await;

    let output = Command::new(&mc_path)
        .args(args)
        .env("MC_CONFIG_DIR", &mc_config_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute mc: {}", e))?;

    drop(_guard);

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            if let Some(msg) = json
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
            {
                return Err(msg.to_string());
            }
        }
        return Err(if stderr.is_empty() { stdout } else { stderr });
    }

    Ok(stdout)
}

/// Find mc binary. Checks in order:
/// 1. Bundled mc next to our own executable (embedded distribution)
/// 2. Tauri resources directory (for bundled builds)
/// 3. System PATH
pub fn find_mc() -> Option<String> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // Check next to executable
            for name in &["mc.exe", "mc"] {
                let bundled = exe_dir.join(name);
                if bundled.exists() {
                    return Some(bundled.to_string_lossy().to_string());
                }
            }
            // Check Tauri resources directory (Windows: same as exe dir for resources)
            for name in &["mc.exe", "mc"] {
                let resource = exe_dir.join("resources").join(name);
                if resource.exists() {
                    return Some(resource.to_string_lossy().to_string());
                }
            }
        }
    }

    // Fall back to PATH
    for name in &["mc", "mc.exe"] {
        if which::which(name).is_ok() {
            return Some(name.to_string());
        }
    }
    None
}
