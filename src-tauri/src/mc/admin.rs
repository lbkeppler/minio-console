use super::alias;
use super::runner;
use crate::models::{GroupInfo, PolicyInfo, UserInfo};

// ── Users ──────────────────────────────────────────────────────────

pub async fn list_users() -> Result<Vec<UserInfo>, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "user", "list", &al, "--json"]).await?;

    let mut users = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(access_key) = val.get("accessKey").and_then(|v| v.as_str()) {
                let status = val
                    .get("userStatus")
                    .and_then(|v| v.as_str())
                    .unwrap_or("enabled")
                    .to_string();
                let policies = val
                    .get("policyName")
                    .and_then(|v| v.as_str())
                    .map(|p| {
                        p.split(',')
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect()
                    })
                    .unwrap_or_default();
                users.push(UserInfo {
                    access_key: access_key.to_string(),
                    status,
                    policies,
                });
            }
        }
    }
    Ok(users)
}

pub async fn create_user(access_key: &str, secret_key: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    runner::run_mc(&["admin", "user", "add", &al, access_key, secret_key]).await?;
    Ok(())
}

pub async fn delete_user(access_key: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    runner::run_mc(&["admin", "user", "remove", &al, access_key]).await?;
    Ok(())
}

// ── Groups ─────────────────────────────────────────────────────────

pub async fn list_groups() -> Result<Vec<GroupInfo>, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "group", "list", &al, "--json"]).await?;

    let mut group_names = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(groups) = val.get("groups").and_then(|v| v.as_array()) {
                for g in groups {
                    if let Some(name) = g.as_str() {
                        group_names.push(name.to_string());
                    }
                }
            }
        }
    }

    let mut groups = Vec::new();
    for name in &group_names {
        let info_output = runner::run_mc(&["admin", "group", "info", &al, name, "--json"]).await?;
        let mut members = Vec::new();
        let mut status = "enabled".to_string();
        let mut policies = Vec::new();

        for line in info_output.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(m) = val.get("members").and_then(|v| v.as_array()) {
                    members = m
                        .iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect();
                }
                if let Some(s) = val.get("groupStatus").and_then(|v| v.as_str()) {
                    status = s.to_string();
                }
                if let Some(p) = val.get("groupPolicy").and_then(|v| v.as_str()) {
                    policies = p
                        .split(',')
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                }
            }
        }

        groups.push(GroupInfo {
            name: name.clone(),
            status,
            members,
            policies,
        });
    }

    Ok(groups)
}

pub async fn create_group(name: &str, members: &[String]) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    let mut args: Vec<&str> = vec!["admin", "group", "add", &al, name];
    for m in members {
        args.push(m.as_str());
    }
    runner::run_mc(&args).await?;
    Ok(())
}

pub async fn delete_group(name: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    runner::run_mc(&["admin", "group", "remove", &al, name]).await?;
    Ok(())
}

pub async fn add_group_members(group: &str, members: &[String]) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    let mut args: Vec<&str> = vec!["admin", "group", "add", &al, group];
    for m in members {
        args.push(m.as_str());
    }
    runner::run_mc(&args).await?;
    Ok(())
}

pub async fn remove_group_members(group: &str, members: &[String]) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    let mut args: Vec<&str> = vec!["admin", "group", "remove", &al, group];
    for m in members {
        args.push(m.as_str());
    }
    runner::run_mc(&args).await?;
    Ok(())
}

// ── Policies ───────────────────────────────────────────────────────

pub async fn list_policies() -> Result<Vec<PolicyInfo>, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "policy", "list", &al, "--json"]).await?;

    let mut policies = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(name) = val.get("policy").and_then(|v| v.as_str()) {
                policies.push(PolicyInfo {
                    name: name.to_string(),
                    policy: String::new(),
                });
            }
        }
    }
    Ok(policies)
}

pub async fn get_policy(name: &str) -> Result<PolicyInfo, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "policy", "info", &al, name, "--json"]).await?;

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
            let policy_json = val
                .get("policyJSON")
                .map(|v| v.to_string())
                .or_else(|| val.get("policyInfo").map(|v| v.to_string()))
                .unwrap_or_default();
            return Ok(PolicyInfo {
                name: name.to_string(),
                policy: policy_json,
            });
        }
    }

    Err(format!("Policy '{}' not found", name))
}

pub async fn create_policy(name: &str, policy_json: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;

    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("minio-console-policy-{}.json", name));
    std::fs::write(&temp_file, policy_json)
        .map_err(|e| format!("Failed to write temp policy file: {}", e))?;

    let temp_path = temp_file.to_string_lossy().to_string();
    let result = runner::run_mc(&["admin", "policy", "create", &al, name, &temp_path]).await;

    let _ = std::fs::remove_file(&temp_file);
    result?;
    Ok(())
}

pub async fn delete_policy(name: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    runner::run_mc(&["admin", "policy", "remove", &al, name]).await?;
    Ok(())
}

pub async fn attach_policy(
    policy: &str,
    user: Option<&str>,
    group: Option<&str>,
) -> Result<(), String> {
    let al = alias::ensure_alias().await?;

    if let Some(u) = user {
        let user_flag = format!("--user={}", u);
        let args = vec!["admin", "policy", "attach", &al, policy, &user_flag];
        runner::run_mc(&args).await?;
    }

    if let Some(g) = group {
        let group_flag = format!("--group={}", g);
        let args = vec!["admin", "policy", "attach", &al, policy, &group_flag];
        runner::run_mc(&args).await?;
    }

    if user.is_none() && group.is_none() {
        return Err("Either user or group must be specified".to_string());
    }

    Ok(())
}

pub async fn detach_policy(
    policy: &str,
    user: Option<&str>,
    group: Option<&str>,
) -> Result<(), String> {
    let al = alias::ensure_alias().await?;

    if let Some(u) = user {
        let user_flag = format!("--user={}", u);
        let args = vec!["admin", "policy", "detach", &al, policy, &user_flag];
        runner::run_mc(&args).await?;
    }

    if let Some(g) = group {
        let group_flag = format!("--group={}", g);
        let args = vec!["admin", "policy", "detach", &al, policy, &group_flag];
        runner::run_mc(&args).await?;
    }

    if user.is_none() && group.is_none() {
        return Err("Either user or group must be specified".to_string());
    }

    Ok(())
}
