use super::{alias, runner};
use crate::models::types::{DiskInfo, ServerInfo};

pub async fn get_server_info() -> Result<ServerInfo, String> {
    let alias = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "info", &alias, "--json"]).await?;

    let json: serde_json::Value =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse mc output: {}", e))?;

    let info = json.get("info").ok_or("Missing 'info' field in mc output")?;

    let version = info
        .get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();
    let uptime = info
        .get("uptime")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();
    let network = info
        .get("network")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let servers = json
        .get("servers")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut drives_online = 0i32;
    let mut drives_offline = 0i32;
    for server in &servers {
        drives_online += server
            .get("drives_online")
            .and_then(|v| v.as_i64())
            .unwrap_or(0) as i32;
        drives_offline += server
            .get("drives_offline")
            .and_then(|v| v.as_i64())
            .unwrap_or(0) as i32;
    }

    Ok(ServerInfo {
        version,
        uptime,
        network,
        drives_online,
        drives_offline,
    })
}

pub async fn get_disk_usage() -> Result<Vec<DiskInfo>, String> {
    let alias = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "info", &alias, "--json"]).await?;

    let json: serde_json::Value =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse mc output: {}", e))?;

    let servers = json
        .get("servers")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut disks = Vec::new();
    for server in &servers {
        if let Some(drives) = server.get("drives").and_then(|v| v.as_array()) {
            for drive in drives {
                let path = drive
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let total_bytes = drive
                    .get("totalSpace")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let used_bytes = drive
                    .get("usedSpace")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let available_bytes = total_bytes.saturating_sub(used_bytes);
                let usage_percent = if total_bytes > 0 {
                    (used_bytes as f64 / total_bytes as f64) * 100.0
                } else {
                    0.0
                };

                disks.push(DiskInfo {
                    path,
                    total_bytes,
                    used_bytes,
                    available_bytes,
                    usage_percent,
                });
            }
        }
    }

    Ok(disks)
}
