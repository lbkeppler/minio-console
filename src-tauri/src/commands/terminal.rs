use crate::mc::{alias, runner};
use crate::models::types::McCommandResult;

#[tauri::command]
pub async fn run_mc_command(command: String) -> Result<McCommandResult, String> {
    let alias_name = alias::ensure_alias().await?;

    let parts: Vec<String> =
        shell_words::split(&command).map_err(|e| format!("Failed to parse command: {}", e))?;

    if parts.is_empty() {
        return Err("Empty command".to_string());
    }

    // Build final args with alias injection
    // User types: "admin user list" → mc admin user list ALIAS --json
    // User types: "ls" → mc ls ALIAS --json
    // User types: "ls mybucket" → mc ls ALIAS/mybucket --json
    // User types: "admin info" → mc admin info ALIAS --json
    let mut args: Vec<String> = Vec::new();

    if parts[0] == "admin" {
        if parts.len() >= 2 {
            // mc admin <subcmd> ALIAS [extra args...]
            args.push(parts[0].clone());
            args.push(parts[1].clone());
            args.push(alias_name.clone());
            for part in &parts[2..] {
                args.push(part.clone());
            }
        } else {
            // Just "admin" alone
            args.push("admin".to_string());
            args.push(alias_name.clone());
        }
    } else if parts[0] == "ls" || parts[0] == "du" || parts[0] == "stat" || parts[0] == "cat"
        || parts[0] == "head" || parts[0] == "find"
    {
        // Commands that take ALIAS/path as first argument
        args.push(parts[0].clone());
        if parts.len() > 1 {
            // User provided a path: prepend alias
            let path = &parts[1];
            if path.contains('/') || path.contains('\\') {
                args.push(format!("{}/{}", alias_name, path));
            } else {
                args.push(format!("{}/{}", alias_name, path));
            }
            for part in &parts[2..] {
                args.push(part.clone());
            }
        } else {
            // No path, just list the alias root
            args.push(alias_name.clone());
        }
    } else if parts[0] == "mb" || parts[0] == "rb" {
        // Make/remove bucket: mc mb ALIAS/bucket
        args.push(parts[0].clone());
        if parts.len() > 1 {
            args.push(format!("{}/{}", alias_name, &parts[1]));
            for part in &parts[2..] {
                args.push(part.clone());
            }
        } else {
            args.push(alias_name.clone());
        }
    } else if parts[0] == "version" || parts[0] == "--version" || parts[0] == "update" {
        // Commands that don't need alias
        for part in &parts {
            args.push(part.clone());
        }
    } else {
        // Generic: inject alias as second arg
        args.push(parts[0].clone());
        args.push(alias_name.clone());
        for part in &parts[1..] {
            args.push(part.clone());
        }
    }

    // Add --json for structured output (unless user already specified it)
    if !args.iter().any(|a| a == "--json") {
        args.push("--json".to_string());
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match runner::run_mc(&arg_refs).await {
        Ok(output) => {
            let formatted = format_output(&output);
            Ok(McCommandResult {
                output: formatted,
                exit_code: 0,
            })
        }
        Err(err) => Ok(McCommandResult {
            output: err,
            exit_code: 1,
        }),
    }
}

/// Format mc JSON output into readable text
fn format_output(raw: &str) -> String {
    let mut results = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
            // Try to extract meaningful fields for common responses
            if let Some(status) = json.get("status").and_then(|v| v.as_str()) {
                let mut parts = Vec::new();
                if status == "success" {
                    parts.push("OK".to_string());
                } else {
                    parts.push(status.to_string());
                }
                // Add key info fields if present
                for key in &["key", "name", "bucket", "accessKey", "policy", "group", "message"] {
                    if let Some(val) = json.get(key).and_then(|v| v.as_str()) {
                        parts.push(format!("{}: {}", key, val));
                    }
                }
                if let Some(size) = json.get("size").and_then(|v| v.as_i64()) {
                    parts.push(format!("size: {}", format_bytes(size as u64)));
                }
                results.push(parts.join(" | "));
                continue;
            }

            // Fall back to pretty-printed JSON
            if let Ok(pretty) = serde_json::to_string_pretty(&json) {
                results.push(pretty);
            } else {
                results.push(trimmed.to_string());
            }
        } else {
            results.push(trimmed.to_string());
        }
    }

    if results.is_empty() {
        "(no output)".to_string()
    } else {
        results.join("\n")
    }
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
