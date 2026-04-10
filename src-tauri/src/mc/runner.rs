use std::process::Stdio;
use tokio::process::Command;

pub async fn run_mc(args: &[&str]) -> Result<String, String> {
    let mc_path = find_mc().ok_or(
        "mc (MinIO Client) not found in PATH. Please install mc and ensure it's in your PATH.",
    )?;

    // Use a dedicated config dir to avoid permission conflicts with user's mc config
    let mc_config_dir = dirs::config_dir()
        .expect("Could not determine config directory")
        .join("minio-console")
        .join("mc");
    std::fs::create_dir_all(&mc_config_dir)
        .map_err(|e| format!("Failed to create mc config dir: {}", e))?;

    let output = Command::new(&mc_path)
        .args(args)
        .env("MC_CONFIG_DIR", &mc_config_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute mc: {}", e))?;

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

fn find_mc() -> Option<String> {
    for name in &["mc", "mc.exe"] {
        if which::which(name).is_ok() {
            return Some(name.to_string());
        }
    }
    None
}
