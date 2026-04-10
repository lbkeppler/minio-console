use crate::mc::{alias, runner};
use crate::models::types::McCommandResult;

/// Known mc admin subcommands that have a sub-subcommand before the alias.
/// Format: mc admin <group> <action> ALIAS [args...]
const ADMIN_TWO_LEVEL: &[&str] = &[
    "user",
    "group",
    "policy",
    "config",
    "bucket",
    "replicate",
    "idp",
    "kms",
];

#[tauri::command]
pub async fn run_mc_command(command: String) -> Result<McCommandResult, String> {
    let alias_name = alias::ensure_alias().await?;

    let parts: Vec<String> =
        shell_words::split(&command).map_err(|e| format!("Failed to parse command: {}", e))?;

    if parts.is_empty() {
        return Err("Empty command".to_string());
    }

    let mut args: Vec<String> = Vec::new();

    if parts[0] == "admin" {
        if parts.len() >= 3 && ADMIN_TWO_LEVEL.contains(&parts[1].as_str()) {
            // mc admin user list ALIAS [extra...]
            // mc admin policy attach ALIAS [extra...]
            args.push(parts[0].clone()); // admin
            args.push(parts[1].clone()); // user/group/policy
            args.push(parts[2].clone()); // list/add/remove/etc
            args.push(alias_name.clone());
            for part in &parts[3..] {
                args.push(part.clone());
            }
        } else if parts.len() >= 2 {
            // mc admin info ALIAS
            // mc admin heal ALIAS
            args.push(parts[0].clone()); // admin
            args.push(parts[1].clone()); // info/heal/trace/etc
            args.push(alias_name.clone());
            for part in &parts[2..] {
                args.push(part.clone());
            }
        } else {
            args.push("admin".to_string());
            args.push(alias_name.clone());
        }
    } else if parts[0] == "version" || parts[0] == "--version" || parts[0] == "update" {
        // Commands that don't need alias
        for part in &parts {
            args.push(part.clone());
        }
    } else {
        // Non-admin commands: mc <cmd> ALIAS[/path] [args...]
        // ls, du, stat, cat, head, find, mb, rb, cp, mv, rm, mirror, diff
        args.push(parts[0].clone());

        if parts.len() > 1 {
            // First path arg gets alias prepended
            let first_arg = &parts[1];
            if first_arg.starts_with('-') {
                // It's a flag, inject alias before it
                args.push(alias_name.clone());
                args.push(first_arg.clone());
            } else {
                // It's a path, prepend alias
                args.push(format!(
                    "{}/{}",
                    alias_name,
                    first_arg.trim_start_matches('/')
                ));
            }
            for part in &parts[2..] {
                args.push(part.clone());
            }
        } else {
            args.push(alias_name.clone());
        }
    }

    // Add --json for structured output
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

fn format_output(raw: &str) -> String {
    let mut results = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
            // Extract key info for readable output
            if let Some(status) = json.get("status").and_then(|v| v.as_str()) {
                let mut parts = Vec::new();
                if status == "success" {
                    parts.push("OK".to_string());
                } else if status == "error" {
                    if let Some(msg) = json.get("error").and_then(|e| {
                        e.as_str().map(|s| s.to_string()).or_else(|| {
                            e.get("message")
                                .and_then(|m| m.as_str())
                                .map(|s| s.to_string())
                        })
                    }) {
                        parts.push(format!("ERROR: {}", msg));
                    } else {
                        parts.push("ERROR".to_string());
                    }
                    results.push(parts.join(" | "));
                    continue;
                } else {
                    parts.push(status.to_string());
                }

                for key in &[
                    "key",
                    "name",
                    "bucket",
                    "accessKey",
                    "policy",
                    "group",
                    "message",
                    "userStatus",
                ] {
                    if let Some(val) = json.get(key).and_then(|v| v.as_str()) {
                        parts.push(format!("{}: {}", key, val));
                    }
                }
                if let Some(size) = json.get("size").and_then(|v| v.as_i64()) {
                    parts.push(format!("size: {}", format_bytes(size as u64)));
                }
                if parts.len() > 1 {
                    results.push(parts.join(" | "));
                    continue;
                }
            }

            // Fall back to pretty JSON
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
