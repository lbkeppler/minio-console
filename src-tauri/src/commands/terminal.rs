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

    // Build args with alias injection
    let mut args: Vec<String> = Vec::new();

    if parts[0] == "admin" && parts.len() >= 2 {
        // admin <subcmd> ALIAS ...
        args.push(parts[0].clone());
        args.push(parts[1].clone());
        args.push(alias_name);
        for part in &parts[2..] {
            args.push(part.clone());
        }
    } else {
        // <cmd> ALIAS ...
        args.push(parts[0].clone());
        args.push(alias_name);
        for part in &parts[1..] {
            args.push(part.clone());
        }
    }

    // Add --json flag if not already present
    if !args.iter().any(|a| a == "--json") {
        args.push("--json".to_string());
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match runner::run_mc(&arg_refs).await {
        Ok(output) => {
            let pretty = pretty_print_json(&output);
            Ok(McCommandResult {
                output: pretty,
                exit_code: 0,
            })
        }
        Err(err) => {
            let pretty = pretty_print_json(&err);
            Ok(McCommandResult {
                output: pretty,
                exit_code: 1,
            })
        }
    }
}

fn pretty_print_json(input: &str) -> String {
    // mc can output multiple JSON lines (NDJSON)
    let mut results = Vec::new();
    for line in input.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
            if let Ok(pretty) = serde_json::to_string_pretty(&val) {
                results.push(pretty);
                continue;
            }
        }
        results.push(trimmed.to_string());
    }
    results.join("\n")
}
