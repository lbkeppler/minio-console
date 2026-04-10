use super::{alias, runner};
use crate::models::types::{DiskInfo, ServerInfo};

pub async fn get_server_info() -> Result<ServerInfo, String> {
    let al = alias::ensure_alias().await?;

    // Get JSON info for structured data (buckets, disks, usage)
    let json_output = runner::run_mc(&["admin", "info", &al, "--json"]).await?;

    // Also get plain text output for version/uptime (not in JSON format)
    let text_output = runner::run_mc(&["admin", "info", &al])
        .await
        .unwrap_or_default();

    // Parse JSON
    let mut online_disks = 0i32;
    let mut offline_disks = 0i32;
    let mut total_usage: u64 = 0;
    let mut bucket_count: u64 = 0;

    for line in json_output.lines() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            // Try info.backend for disk counts
            if let Some(info) = json.get("info") {
                if let Some(backend) = info.get("backend") {
                    online_disks += backend
                        .get("onlineDisks")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0) as i32;
                    offline_disks += backend
                        .get("offlineDisks")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0) as i32;
                }
                if let Some(buckets) = info.get("buckets") {
                    bucket_count = buckets.get("count").and_then(|v| v.as_u64()).unwrap_or(0);
                }
                if let Some(usage) = info.get("usage") {
                    total_usage = usage.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
                }
            }

            // Some mc versions put servers at root level
            if let Some(servers) = json.get("servers").and_then(|v| v.as_array()) {
                for server in servers {
                    online_disks += server
                        .get("drives_online")
                        .or_else(|| server.get("onlineDisks"))
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0) as i32;
                    offline_disks += server
                        .get("drives_offline")
                        .or_else(|| server.get("offlineDisks"))
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0) as i32;
                }
            }
        }
    }

    // Parse plain text for version and uptime
    // mc admin info output looks like:
    //   ● minio.example.com
    //     Uptime: 3 days
    //     Version: RELEASE.2024-06-01T00-00-00Z
    //     Network: 1/1 OK
    //     Drives: 1/1 OK
    //     ...
    let mut version = String::new();
    let mut uptime = String::new();
    let mut network = String::new();

    for line in text_output.lines() {
        let trimmed = line.trim();
        if let Some(v) = trimmed.strip_prefix("Version:") {
            version = v.trim().to_string();
        } else if let Some(v) = trimmed.strip_prefix("Uptime:") {
            uptime = v.trim().to_string();
        } else if let Some(v) = trimmed.strip_prefix("Network:") {
            network = v.trim().to_string();
        } else if let Some(v) = trimmed.strip_prefix("Drives:") {
            // Parse "1/1 OK" format as fallback for disk counts
            if online_disks == 0 {
                let drive_str = v.trim();
                if let Some(slash_pos) = drive_str.find('/') {
                    if let Ok(total) = drive_str[slash_pos + 1..]
                        .split_whitespace()
                        .next()
                        .unwrap_or("0")
                        .parse::<i32>()
                    {
                        online_disks = total;
                    }
                }
            }
        }
    }

    // Build summary for network if not found in text
    if network.is_empty() && (online_disks > 0 || offline_disks > 0) {
        network = format!("{} online, {} offline", online_disks, offline_disks);
    }

    // Add usage info to version if available
    if !version.is_empty() && total_usage > 0 {
        version = format!(
            "{} ({} buckets, {} used)",
            version,
            bucket_count,
            format_bytes(total_usage)
        );
    }

    Ok(ServerInfo {
        version: if version.is_empty() {
            "N/A".to_string()
        } else {
            version
        },
        uptime: if uptime.is_empty() {
            "N/A".to_string()
        } else {
            uptime
        },
        network: if network.is_empty() {
            "N/A".to_string()
        } else {
            network
        },
        drives_online: online_disks,
        drives_offline: offline_disks,
    })
}

pub async fn get_disk_usage() -> Result<Vec<DiskInfo>, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "info", &al, "--json"]).await?;

    let mut disks = Vec::new();

    for line in output.lines() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            // Try servers[].drives[] (older mc format)
            if let Some(servers) = json.get("servers").and_then(|v| v.as_array()) {
                for server in servers {
                    if let Some(drives) = server.get("drives").and_then(|v| v.as_array()) {
                        for drive in drives {
                            if let Some(disk) = parse_drive(drive) {
                                disks.push(disk);
                            }
                        }
                    }
                }
            }

            // Try info.backend (newer mc format) — derive single disk from usage
            if disks.is_empty() {
                if let Some(info) = json.get("info") {
                    let total_usage = info
                        .get("usage")
                        .and_then(|u| u.get("size"))
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);

                    if total_usage > 0 {
                        disks.push(DiskInfo {
                            path: "Total Usage".to_string(),
                            total_bytes: 0, // Not available in this format
                            used_bytes: total_usage,
                            available_bytes: 0,
                            usage_percent: 0.0,
                        });
                    }
                }
            }
        }
    }

    Ok(disks)
}

fn parse_drive(drive: &serde_json::Value) -> Option<DiskInfo> {
    let path = drive
        .get("path")
        .or_else(|| drive.get("endpoint"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if path.is_empty() {
        return None;
    }

    let total = drive
        .get("totalSpace")
        .or_else(|| drive.get("totalspace"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    let used = drive
        .get("usedSpace")
        .or_else(|| drive.get("usedspace"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    let available = total.saturating_sub(used);
    let percent = if total > 0 {
        (used as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    Some(DiskInfo {
        path,
        total_bytes: total,
        used_bytes: used,
        available_bytes: available,
        usage_percent: percent,
    })
}

fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    if bytes == 0 {
        return "0 B".to_string();
    }
    let i = (bytes as f64).log(1024.0).floor() as usize;
    let i = i.min(UNITS.len() - 1);
    format!("{:.1} {}", bytes as f64 / 1024_f64.powi(i as i32), UNITS[i])
}
