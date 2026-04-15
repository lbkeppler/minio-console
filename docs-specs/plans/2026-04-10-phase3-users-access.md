# Phase 3: Users, Groups, Policies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MinIO IAM management — users (create/delete/list), groups (create/delete/list/members), policies (create/delete/list/edit with JSON editor), and assignment of policies to users/groups — using the MinIO Admin API.

**Architecture:** MinIO Admin API is not S3-compatible — it uses a custom HTTP REST API. We'll use `reqwest` to call the Admin endpoints directly. The admin API requires signing requests with the access/secret key. For simplicity, we'll use MinIO's `mc admin` JSON output via the MC Runner module for operations that are complex to implement via raw HTTP, and direct HTTP for simpler ones. Actually, the simplest approach: use the `mc` CLI with `--json` flag for all admin operations, since the user already has `mc` installed and it handles all the auth complexity.

**Tech Stack:** Rust (tokio::process for mc CLI), React 18, CodeMirror 6 (policy JSON editor), Zustand, Tauri 2 IPC

---

## Design Decision: MC CLI vs Direct Admin API

MinIO's Admin API uses a custom auth scheme (not standard AWS SigV4). Rather than reimplementing this, we leverage the `mc` CLI with `--json` output:

- `mc admin user list ALIAS --json` → list users
- `mc admin user add ALIAS USER PASSWORD --json` → create user
- `mc admin user remove ALIAS USER --json` → delete user
- `mc admin group list ALIAS --json` → list groups
- `mc admin group add ALIAS GROUP USER... --json` → add users to group
- `mc admin group remove ALIAS GROUP USER... --json` → remove users from group
- `mc admin group disable ALIAS GROUP --json` → disable group
- `mc admin policy list ALIAS --json` → list policies
- `mc admin policy info ALIAS POLICY --json` → get policy JSON
- `mc admin policy create ALIAS POLICY /path/to/policy.json --json` → create/update policy
- `mc admin policy remove ALIAS POLICY --json` → delete policy
- `mc admin policy attach ALIAS POLICY --user=USER --json` → attach to user
- `mc admin policy detach ALIAS POLICY --user=USER --json` → detach from user
- `mc admin policy attach ALIAS POLICY --group=GROUP --json` → attach to group
- `mc admin policy entities ALIAS --user USER --json` → get policies for user

The MC Runner needs to know the alias. We'll configure `mc alias set` using the active profile's credentials before running admin commands.

---

## File Structure

### Backend (Rust)

| File | Responsibility |
|---|---|
| `src-tauri/src/mc/mod.rs` | Module re-exports |
| `src-tauri/src/mc/runner.rs` | Execute `mc` commands, parse JSON output |
| `src-tauri/src/mc/alias.rs` | Configure mc alias from active profile |
| `src-tauri/src/mc/admin.rs` | Admin operations: users, groups, policies |
| `src-tauri/src/commands/admin.rs` | Tauri IPC commands for admin operations |
| `src-tauri/src/commands/mod.rs` | Add admin module |
| `src-tauri/src/lib.rs` | Register admin commands |
| `src-tauri/src/models/types.rs` | Add UserInfo, GroupInfo, PolicyInfo types |

### Frontend (React)

| File | Responsibility |
|---|---|
| `src/stores/admin-store.ts` | Zustand store for users, groups, policies |
| `src/pages/users/index.tsx` | Users list + create/delete |
| `src/pages/users/create-user-dialog.tsx` | Create user form |
| `src/pages/groups/index.tsx` | Groups list + create/delete + manage members |
| `src/pages/groups/create-group-dialog.tsx` | Create group form |
| `src/pages/groups/group-members-dialog.tsx` | Add/remove group members |
| `src/pages/policies/index.tsx` | Policies list + create/delete |
| `src/pages/policies/policy-editor.tsx` | JSON policy editor page |

---

## Task 1: MC Runner Module + Types

**Files:**
- Create: `src-tauri/src/mc/mod.rs`, `src-tauri/src/mc/runner.rs`, `src-tauri/src/mc/alias.rs`
- Modify: `src-tauri/src/models/types.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add admin types to models/types.rs**

Add after existing types, before `#[cfg(test)]`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub access_key: String,
    pub status: String,
    pub policies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupInfo {
    pub name: String,
    pub status: String,
    pub members: Vec<String>,
    pub policies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyInfo {
    pub name: String,
    pub policy: String, // JSON string
}
```

- [ ] **Step 2: Add tests**

```rust
    #[test]
    fn test_user_info_serialization() {
        let user = UserInfo {
            access_key: "testuser".to_string(),
            status: "enabled".to_string(),
            policies: vec!["readwrite".to_string()],
        };
        let json = serde_json::to_string(&user).unwrap();
        let deserialized: UserInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.access_key, "testuser");
    }

    #[test]
    fn test_group_info_serialization() {
        let group = GroupInfo {
            name: "developers".to_string(),
            status: "enabled".to_string(),
            members: vec!["user1".to_string()],
            policies: vec!["readwrite".to_string()],
        };
        let json = serde_json::to_string(&group).unwrap();
        let deserialized: GroupInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "developers");
    }
```

- [ ] **Step 3: Run tests — expect 9 pass**

- [ ] **Step 4: Create MC runner**

Create `src-tauri/src/mc/runner.rs`:

```rust
use std::process::Stdio;
use tokio::process::Command;

pub async fn run_mc(args: &[&str]) -> Result<String, String> {
    let mc_path = find_mc().ok_or("mc (MinIO Client) not found in PATH. Please install mc and ensure it's in your PATH.")?;

    let output = Command::new(&mc_path)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute mc: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        // Try to parse JSON error from mc
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            if let Some(msg) = json.get("error").and_then(|e| e.get("message")).and_then(|m| m.as_str()) {
                return Err(msg.to_string());
            }
        }
        return Err(if stderr.is_empty() { stdout } else { stderr });
    }

    Ok(stdout)
}

fn find_mc() -> Option<String> {
    // Try common names
    for name in &["mc", "mc.exe"] {
        if which::which(name).is_ok() {
            return Some(name.to_string());
        }
    }
    None
}
```

Note: Add `which = "7"` to `src-tauri/Cargo.toml` dependencies.

- [ ] **Step 5: Create MC alias manager**

Create `src-tauri/src/mc/alias.rs`:

```rust
use crate::config::{credentials, profiles};
use super::runner;

const ALIAS_NAME: &str = "minio-console-active";

pub async fn ensure_alias() -> Result<String, String> {
    let config = profiles::load_config();
    let profile_id = config
        .active_profile_id
        .ok_or("No active profile selected")?;

    let profile = config
        .profiles
        .iter()
        .find(|p| p.id == profile_id)
        .ok_or("Active profile not found")?;

    let secret_key = credentials::get_secret(&profile.id)?;

    let scheme = if profile.use_ssl { "https" } else { "http" };
    let endpoint = if profile.endpoint.starts_with("http://")
        || profile.endpoint.starts_with("https://")
    {
        profile.endpoint.clone()
    } else {
        format!("{}://{}", scheme, profile.endpoint)
    };

    runner::run_mc(&[
        "alias",
        "set",
        ALIAS_NAME,
        &endpoint,
        &profile.access_key,
        &secret_key,
    ])
    .await?;

    Ok(ALIAS_NAME.to_string())
}
```

- [ ] **Step 6: Create mc/mod.rs**

```rust
pub mod admin;
pub mod alias;
pub mod runner;
```

Create placeholder `src-tauri/src/mc/admin.rs`:

```rust
// Admin operations will be added in Task 2
```

- [ ] **Step 7: Wire up in lib.rs**

Add `pub mod mc;` to `src-tauri/src/lib.rs`.

- [ ] **Step 8: Add `which` dependency to Cargo.toml**

```toml
which = "7"
```

- [ ] **Step 9: Verify compilation and tests**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check && cargo test
```

- [ ] **Step 10: Commit**

```bash
git add src-tauri/
git commit -m "feat: add MC runner module with alias management and admin types"
```

---

## Task 2: Admin Operations via MC CLI

**Files:**
- Modify: `src-tauri/src/mc/admin.rs`

- [ ] **Step 1: Implement admin operations**

Replace `src-tauri/src/mc/admin.rs`:

```rust
use crate::models::{GroupInfo, PolicyInfo, UserInfo};
use super::{alias, runner};

// ===== Users =====

pub async fn list_users() -> Result<Vec<UserInfo>, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "user", "list", &al, "--json"]).await?;

    let mut users = Vec::new();
    for line in output.lines() {
        if line.trim().is_empty() { continue; }
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(access_key) = json.get("accessKey").and_then(|v| v.as_str()) {
                let status = json.get("userStatus")
                    .and_then(|v| v.as_str())
                    .unwrap_or("enabled")
                    .to_string();
                // Get policies for this user
                let policies = get_user_policies(&al, access_key).await.unwrap_or_default();
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

async fn get_user_policies(alias: &str, user: &str) -> Result<Vec<String>, String> {
    let output = runner::run_mc(&["admin", "policy", "entities", alias, "--user", user, "--json"]).await?;
    let mut policies = Vec::new();
    for line in output.lines() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(result) = json.get("result") {
                if let Some(mapping) = result.get("userMappings") {
                    if let Some(arr) = mapping.as_array() {
                        for item in arr {
                            if let Some(p_arr) = item.get("policies").and_then(|v| v.as_array()) {
                                for p in p_arr {
                                    if let Some(s) = p.as_str() {
                                        policies.push(s.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(policies)
}

pub async fn create_user(access_key: &str, secret_key: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    runner::run_mc(&["admin", "user", "add", &al, access_key, secret_key, "--json"]).await?;
    Ok(())
}

pub async fn delete_user(access_key: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    runner::run_mc(&["admin", "user", "remove", &al, access_key, "--json"]).await?;
    Ok(())
}

// ===== Groups =====

pub async fn list_groups() -> Result<Vec<GroupInfo>, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "group", "list", &al, "--json"]).await?;

    let mut groups = Vec::new();
    for line in output.lines() {
        if line.trim().is_empty() { continue; }
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(name) = json.get("group").and_then(|v| v.as_str()) {
                // Get group info
                let info = get_group_info(&al, name).await.unwrap_or_else(|_| GroupInfo {
                    name: name.to_string(),
                    status: "enabled".to_string(),
                    members: Vec::new(),
                    policies: Vec::new(),
                });
                groups.push(info);
            }
        }
    }
    Ok(groups)
}

async fn get_group_info(alias: &str, group: &str) -> Result<GroupInfo, String> {
    let output = runner::run_mc(&["admin", "group", "info", alias, group, "--json"]).await?;

    let mut members = Vec::new();
    let mut status = "enabled".to_string();
    let mut policies = Vec::new();

    for line in output.lines() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(s) = json.get("groupStatus").and_then(|v| v.as_str()) {
                status = s.to_string();
            }
            if let Some(arr) = json.get("members").and_then(|v| v.as_array()) {
                for m in arr {
                    if let Some(s) = m.as_str() {
                        members.push(s.to_string());
                    }
                }
            }
            if let Some(p) = json.get("groupPolicy").and_then(|v| v.as_str()) {
                if !p.is_empty() {
                    policies = p.split(',').map(|s| s.trim().to_string()).collect();
                }
            }
        }
    }

    Ok(GroupInfo {
        name: group.to_string(),
        status,
        members,
        policies,
    })
}

pub async fn create_group(name: &str, members: &[String]) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    let mut args = vec!["admin", "group", "add", &al, name];
    let member_refs: Vec<&str> = members.iter().map(|s| s.as_str()).collect();
    args.extend(member_refs);
    args.push("--json");
    runner::run_mc(&args).await?;
    Ok(())
}

pub async fn delete_group(name: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    runner::run_mc(&["admin", "group", "remove", &al, name, "--json"]).await?;
    Ok(())
}

pub async fn add_group_members(group: &str, members: &[String]) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    let mut args = vec!["admin", "group", "add", &al, group];
    let member_refs: Vec<&str> = members.iter().map(|s| s.as_str()).collect();
    args.extend(member_refs);
    args.push("--json");
    runner::run_mc(&args).await?;
    Ok(())
}

pub async fn remove_group_members(group: &str, members: &[String]) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    let mut args = vec!["admin", "group", "remove", &al, group];
    let member_refs: Vec<&str> = members.iter().map(|s| s.as_str()).collect();
    args.extend(member_refs);
    args.push("--json");
    runner::run_mc(&args).await?;
    Ok(())
}

// ===== Policies =====

pub async fn list_policies() -> Result<Vec<PolicyInfo>, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "policy", "list", &al, "--json"]).await?;

    let mut policies = Vec::new();
    for line in output.lines() {
        if line.trim().is_empty() { continue; }
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(name) = json.get("policy").and_then(|v| v.as_str()) {
                policies.push(PolicyInfo {
                    name: name.to_string(),
                    policy: String::new(), // List doesn't return full policy
                });
            }
        }
    }
    Ok(policies)
}

pub async fn get_policy(name: &str) -> Result<PolicyInfo, String> {
    let al = alias::ensure_alias().await?;
    let output = runner::run_mc(&["admin", "policy", "info", &al, name, "--json"]).await?;

    // mc returns the policy JSON across lines
    let mut policy_json = String::new();
    for line in output.lines() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(p) = json.get("policyJSON") {
                policy_json = serde_json::to_string_pretty(p).unwrap_or_default();
            } else if let Some(p) = json.get("policy").and_then(|v| v.as_str()) {
                // Some mc versions use "policy" as the raw JSON string
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(p) {
                    policy_json = serde_json::to_string_pretty(&parsed).unwrap_or_else(|_| p.to_string());
                } else {
                    policy_json = p.to_string();
                }
            }
        }
    }

    Ok(PolicyInfo {
        name: name.to_string(),
        policy: policy_json,
    })
}

pub async fn create_policy(name: &str, policy_json: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;

    // Write policy to temp file (mc requires a file path)
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("minio-console-policy-{}.json", name));
    std::fs::write(&temp_path, policy_json)
        .map_err(|e| format!("Failed to write temp policy file: {}", e))?;

    let path_str = temp_path.to_string_lossy().to_string();
    let result = runner::run_mc(&["admin", "policy", "create", &al, name, &path_str, "--json"]).await;

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);

    result?;
    Ok(())
}

pub async fn delete_policy(name: &str) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    runner::run_mc(&["admin", "policy", "remove", &al, name, "--json"]).await?;
    Ok(())
}

pub async fn attach_policy(policy: &str, user: Option<&str>, group: Option<&str>) -> Result<(), String> {
    let al = alias::ensure_alias().await?;
    let mut args = vec!["admin", "policy", "attach", &al, policy];
    if let Some(u) = user {
        let user_flag = format!("--user={}", u);
        args.push(&user_flag);
    }
    if let Some(g) = group {
        let group_flag = format!("--group={}", g);
        args.push(&group_flag);
    }
    args.push("--json");

    // Need to own the strings
    let user_flag;
    let group_flag;
    let mut final_args = vec!["admin", "policy", "attach", &al, policy];
    if let Some(u) = user {
        user_flag = format!("--user={}", u);
        final_args.push(&user_flag);
    }
    if let Some(g) = group {
        group_flag = format!("--group={}", g);
        final_args.push(&group_flag);
    }
    final_args.push("--json");
    runner::run_mc(&final_args).await?;
    Ok(())
}

pub async fn detach_policy(policy: &str, user: Option<&str>, group: Option<&str>) -> Result<(), String> {
    let user_flag;
    let group_flag;
    let mut args = vec!["admin", "policy", "detach", &alias::ensure_alias().await?, policy];
    // Rebuild since alias is owned
    let al = alias::ensure_alias().await?;
    let mut final_args = vec!["admin", "policy", "detach", &al, policy];
    if let Some(u) = user {
        user_flag = format!("--user={}", u);
        final_args.push(&user_flag);
    }
    if let Some(g) = group {
        group_flag = format!("--group={}", g);
        final_args.push(&group_flag);
    }
    final_args.push("--json");
    runner::run_mc(&final_args).await?;
    Ok(())
}
```

- [ ] **Step 2: Verify compilation**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/mc/admin.rs
git commit -m "feat: add MC admin operations for users, groups, and policies"
```

---

## Task 3: Admin IPC Commands

**Files:**
- Create: `src-tauri/src/commands/admin.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create admin commands**

Create `src-tauri/src/commands/admin.rs`:

```rust
use crate::mc::admin;
use crate::models::{GroupInfo, PolicyInfo, UserInfo};

// Users
#[tauri::command]
pub async fn list_users() -> Result<Vec<UserInfo>, String> {
    admin::list_users().await
}

#[tauri::command]
pub async fn create_user(access_key: String, secret_key: String) -> Result<(), String> {
    admin::create_user(&access_key, &secret_key).await
}

#[tauri::command]
pub async fn delete_user(access_key: String) -> Result<(), String> {
    admin::delete_user(&access_key).await
}

// Groups
#[tauri::command]
pub async fn list_groups() -> Result<Vec<GroupInfo>, String> {
    admin::list_groups().await
}

#[tauri::command]
pub async fn create_group(name: String, members: Vec<String>) -> Result<(), String> {
    admin::create_group(&name, &members).await
}

#[tauri::command]
pub async fn delete_group(name: String) -> Result<(), String> {
    admin::delete_group(&name).await
}

#[tauri::command]
pub async fn add_group_members(group: String, members: Vec<String>) -> Result<(), String> {
    admin::add_group_members(&group, &members).await
}

#[tauri::command]
pub async fn remove_group_members(group: String, members: Vec<String>) -> Result<(), String> {
    admin::remove_group_members(&group, &members).await
}

// Policies
#[tauri::command]
pub async fn list_policies() -> Result<Vec<PolicyInfo>, String> {
    admin::list_policies().await
}

#[tauri::command]
pub async fn get_policy(name: String) -> Result<PolicyInfo, String> {
    admin::get_policy(&name).await
}

#[tauri::command]
pub async fn create_policy(name: String, policy_json: String) -> Result<(), String> {
    admin::create_policy(&name, &policy_json).await
}

#[tauri::command]
pub async fn delete_policy(name: String) -> Result<(), String> {
    admin::delete_policy(&name).await
}

#[tauri::command]
pub async fn attach_policy(
    policy: String,
    user: Option<String>,
    group: Option<String>,
) -> Result<(), String> {
    admin::attach_policy(
        &policy,
        user.as_deref(),
        group.as_deref(),
    ).await
}

#[tauri::command]
pub async fn detach_policy(
    policy: String,
    user: Option<String>,
    group: Option<String>,
) -> Result<(), String> {
    admin::detach_policy(
        &policy,
        user.as_deref(),
        group.as_deref(),
    ).await
}
```

- [ ] **Step 2: Add `pub mod admin;` to commands/mod.rs**

- [ ] **Step 3: Register all admin commands in lib.rs**

Add to invoke_handler:

```rust
            commands::admin::list_users,
            commands::admin::create_user,
            commands::admin::delete_user,
            commands::admin::list_groups,
            commands::admin::create_group,
            commands::admin::delete_group,
            commands::admin::add_group_members,
            commands::admin::remove_group_members,
            commands::admin::list_policies,
            commands::admin::get_policy,
            commands::admin::create_policy,
            commands::admin::delete_policy,
            commands::admin::attach_policy,
            commands::admin::detach_policy,
```

- [ ] **Step 4: Verify**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check && cargo test
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/
git commit -m "feat: add Tauri IPC commands for user, group, and policy management"
```

---

## Task 4: Admin Store + Users Page (Frontend)

**Files:**
- Create: `src/stores/admin-store.ts`
- Create: `src/pages/users/create-user-dialog.tsx`
- Modify: `src/pages/users/index.tsx`

- [ ] **Step 1: Create admin store**

Create `src/stores/admin-store.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface UserInfo {
	access_key: string;
	status: string;
	policies: string[];
}

export interface GroupInfo {
	name: string;
	status: string;
	members: string[];
	policies: string[];
}

export interface PolicyInfo {
	name: string;
	policy: string;
}

interface AdminStore {
	users: UserInfo[];
	groups: GroupInfo[];
	policies: PolicyInfo[];
	loading: boolean;
	loadUsers: () => Promise<void>;
	createUser: (accessKey: string, secretKey: string) => Promise<void>;
	deleteUser: (accessKey: string) => Promise<void>;
	loadGroups: () => Promise<void>;
	createGroup: (name: string, members: string[]) => Promise<void>;
	deleteGroup: (name: string) => Promise<void>;
	addGroupMembers: (group: string, members: string[]) => Promise<void>;
	removeGroupMembers: (group: string, members: string[]) => Promise<void>;
	loadPolicies: () => Promise<void>;
	getPolicy: (name: string) => Promise<PolicyInfo>;
	createPolicy: (name: string, policyJson: string) => Promise<void>;
	deletePolicy: (name: string) => Promise<void>;
	attachPolicy: (policy: string, user?: string, group?: string) => Promise<void>;
	detachPolicy: (policy: string, user?: string, group?: string) => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
	users: [],
	groups: [],
	policies: [],
	loading: false,
	loadUsers: async () => {
		set({ loading: true });
		try {
			const users = await invoke<UserInfo[]>("list_users");
			set({ users, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	createUser: async (accessKey, secretKey) => {
		await invoke("create_user", { accessKey, secretKey });
		await get().loadUsers();
	},
	deleteUser: async (accessKey) => {
		await invoke("delete_user", { accessKey });
		await get().loadUsers();
	},
	loadGroups: async () => {
		set({ loading: true });
		try {
			const groups = await invoke<GroupInfo[]>("list_groups");
			set({ groups, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	createGroup: async (name, members) => {
		await invoke("create_group", { name, members });
		await get().loadGroups();
	},
	deleteGroup: async (name) => {
		await invoke("delete_group", { name });
		await get().loadGroups();
	},
	addGroupMembers: async (group, members) => {
		await invoke("add_group_members", { group, members });
		await get().loadGroups();
	},
	removeGroupMembers: async (group, members) => {
		await invoke("remove_group_members", { group, members });
		await get().loadGroups();
	},
	loadPolicies: async () => {
		set({ loading: true });
		try {
			const policies = await invoke<PolicyInfo[]>("list_policies");
			set({ policies, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	getPolicy: async (name) => {
		return invoke<PolicyInfo>("get_policy", { name });
	},
	createPolicy: async (name, policyJson) => {
		await invoke("create_policy", { name, policyJson });
		await get().loadPolicies();
	},
	deletePolicy: async (name) => {
		await invoke("delete_policy", { name });
		await get().loadPolicies();
	},
	attachPolicy: async (policy, user, group) => {
		await invoke("attach_policy", { policy, user: user ?? null, group: group ?? null });
	},
	detachPolicy: async (policy, user, group) => {
		await invoke("detach_policy", { policy, user: user ?? null, group: group ?? null });
	},
}));
```

- [ ] **Step 2: Create user dialog**

Create `src/pages/users/create-user-dialog.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminStore } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";
import { Loader2 } from "lucide-react";

const userSchema = z.object({
	accessKey: z.string().min(3, "Access key must be at least 3 characters"),
	secretKey: z.string().min(8, "Secret key must be at least 8 characters"),
});

type UserFormData = z.infer<typeof userSchema>;

interface CreateUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
	const { createUser } = useAdminStore();
	const { addToast } = useToastStore();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<UserFormData>({ resolver: zodResolver(userSchema) });

	async function onSubmit(data: UserFormData) {
		try {
			await createUser(data.accessKey, data.secretKey);
			addToast({ title: `User "${data.accessKey}" created`, variant: "success" });
			reset();
			onOpenChange(false);
		} catch (err) {
			addToast({ title: "Error creating user", description: String(err), variant: "error" });
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create User</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="user-access-key" className="text-sm font-medium">Access Key</label>
						<Input id="user-access-key" placeholder="username" {...register("accessKey")} />
						{errors.accessKey && <p className="text-xs text-[var(--color-danger)]">{errors.accessKey.message}</p>}
					</div>
					<div className="space-y-2">
						<label htmlFor="user-secret-key" className="text-sm font-medium">Secret Key</label>
						<Input id="user-secret-key" type="password" placeholder="min 8 characters" {...register("secretKey")} />
						{errors.secretKey && <p className="text-xs text-[var(--color-danger)]">{errors.secretKey.message}</p>}
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							Create
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 3: Build Users page**

Replace `src/pages/users/index.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAdminStore, type UserInfo } from "@/stores/admin-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { CreateUserDialog } from "./create-user-dialog";
import { Plus, Trash2, User, Loader2 } from "lucide-react";

export function UsersPage() {
	const { users, loading, loadUsers, deleteUser } = useAdminStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const [createOpen, setCreateOpen] = useState(false);
	const hasActiveProfile = !!config?.active_profile_id;

	useEffect(() => {
		if (hasActiveProfile) {
			loadUsers().catch((err) => {
				addToast({ title: "Error loading users", description: String(err), variant: "error" });
			});
		}
	}, [hasActiveProfile, loadUsers, addToast]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Users</h1>
				<p className="text-[var(--color-text-secondary)]">Select a server profile first.</p>
			</div>
		);
	}

	async function handleDelete(accessKey: string) {
		try {
			await deleteUser(accessKey);
			addToast({ title: `User "${accessKey}" deleted`, variant: "success" });
		} catch (err) {
			addToast({ title: "Error deleting user", description: String(err), variant: "error" });
		}
	}

	const columns: ColumnDef<UserInfo, string>[] = [
		{
			accessorKey: "access_key",
			header: "Access Key",
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<User className="h-4 w-4 text-[var(--color-accent)]" />
					<span className="font-medium">{row.original.access_key}</span>
				</div>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => (
				<span className={row.original.status === "enabled" ? "text-[var(--color-success)]" : "text-[var(--color-text-tertiary)]"}>
					{row.original.status}
				</span>
			),
		},
		{
			accessorKey: "policies",
			header: "Policies",
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.policies.length > 0
						? row.original.policies.map((p) => (
								<span key={p} className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-xs">{p}</span>
						  ))
						: <span className="text-[var(--color-text-tertiary)]">—</span>}
				</div>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex justify-end">
					<Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(row.original.access_key); }}>
						<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Users</h1>
				<div className="flex items-center gap-2">
					{loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />}
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="h-4 w-4" /> Create User
					</Button>
				</div>
			</div>
			<DataTable columns={columns} data={users} />
			<CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/admin-store.ts src/pages/users/
git commit -m "feat: add admin store and users page (list, create, delete)"
```

---

## Task 5: Groups Page (Frontend)

**Files:**
- Create: `src/pages/groups/create-group-dialog.tsx`
- Create: `src/pages/groups/group-members-dialog.tsx`
- Modify: `src/pages/groups/index.tsx`

- [ ] **Step 1: Create group dialog**

Create `src/pages/groups/create-group-dialog.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminStore } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";
import { Loader2 } from "lucide-react";

const groupSchema = z.object({
	name: z.string().min(1, "Group name is required"),
	members: z.string(),
});

type GroupFormData = z.infer<typeof groupSchema>;

interface CreateGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
	const { createGroup } = useAdminStore();
	const { addToast } = useToastStore();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<GroupFormData>({ resolver: zodResolver(groupSchema), defaultValues: { name: "", members: "" } });

	async function onSubmit(data: GroupFormData) {
		try {
			const members = data.members.split(",").map((s) => s.trim()).filter(Boolean);
			await createGroup(data.name, members);
			addToast({ title: `Group "${data.name}" created`, variant: "success" });
			reset();
			onOpenChange(false);
		} catch (err) {
			addToast({ title: "Error creating group", description: String(err), variant: "error" });
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Group</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="group-name" className="text-sm font-medium">Group Name</label>
						<Input id="group-name" placeholder="developers" {...register("name")} />
						{errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>}
					</div>
					<div className="space-y-2">
						<label htmlFor="group-members" className="text-sm font-medium">Members (comma-separated)</label>
						<Input id="group-members" placeholder="user1, user2" {...register("members")} />
						<p className="text-xs text-[var(--color-text-tertiary)]">At least one member required to create the group.</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							Create
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 2: Create group members dialog**

Create `src/pages/groups/group-members-dialog.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminStore, type GroupInfo } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";
import { UserMinus, UserPlus, Loader2 } from "lucide-react";

interface GroupMembersDialogProps {
	group: GroupInfo;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function GroupMembersDialog({ group, open, onOpenChange }: GroupMembersDialogProps) {
	const { addGroupMembers, removeGroupMembers } = useAdminStore();
	const { addToast } = useToastStore();
	const [newMember, setNewMember] = useState("");
	const [adding, setAdding] = useState(false);

	async function handleAdd() {
		if (!newMember.trim()) return;
		setAdding(true);
		try {
			await addGroupMembers(group.name, [newMember.trim()]);
			addToast({ title: `Added "${newMember.trim()}" to group`, variant: "success" });
			setNewMember("");
		} catch (err) {
			addToast({ title: "Error adding member", description: String(err), variant: "error" });
		} finally {
			setAdding(false);
		}
	}

	async function handleRemove(member: string) {
		try {
			await removeGroupMembers(group.name, [member]);
			addToast({ title: `Removed "${member}" from group`, variant: "success" });
		} catch (err) {
			addToast({ title: "Error removing member", description: String(err), variant: "error" });
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Members — {group.name}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="flex gap-2">
						<Input
							value={newMember}
							onChange={(e) => setNewMember(e.target.value)}
							placeholder="Add user..."
							onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
						/>
						<Button onClick={handleAdd} disabled={adding} size="sm">
							{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
						</Button>
					</div>
					<div className="space-y-1">
						{group.members.length === 0 ? (
							<p className="text-sm text-[var(--color-text-tertiary)]">No members.</p>
						) : (
							group.members.map((m) => (
								<div key={m} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2">
									<span className="text-sm">{m}</span>
									<Button variant="ghost" size="icon" onClick={() => handleRemove(m)}>
										<UserMinus className="h-4 w-4 text-[var(--color-danger)]" />
									</Button>
								</div>
							))
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 3: Build Groups page**

Replace `src/pages/groups/index.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAdminStore, type GroupInfo } from "@/stores/admin-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "./create-group-dialog";
import { GroupMembersDialog } from "./group-members-dialog";
import { Plus, Trash2, UsersRound, Users, Loader2 } from "lucide-react";

export function GroupsPage() {
	const { groups, loading, loadGroups, deleteGroup } = useAdminStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const [createOpen, setCreateOpen] = useState(false);
	const [membersGroup, setMembersGroup] = useState<GroupInfo | null>(null);
	const hasActiveProfile = !!config?.active_profile_id;

	useEffect(() => {
		if (hasActiveProfile) {
			loadGroups().catch((err) => {
				addToast({ title: "Error loading groups", description: String(err), variant: "error" });
			});
		}
	}, [hasActiveProfile, loadGroups, addToast]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Groups</h1>
				<p className="text-[var(--color-text-secondary)]">Select a server profile first.</p>
			</div>
		);
	}

	async function handleDelete(name: string) {
		try {
			await deleteGroup(name);
			addToast({ title: `Group "${name}" deleted`, variant: "success" });
		} catch (err) {
			addToast({ title: "Error deleting group", description: String(err), variant: "error" });
		}
	}

	const columns: ColumnDef<GroupInfo, string>[] = [
		{
			accessorKey: "name",
			header: "Name",
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<UsersRound className="h-4 w-4 text-[var(--color-accent)]" />
					<span className="font-medium">{row.original.name}</span>
				</div>
			),
		},
		{
			accessorKey: "members",
			header: "Members",
			cell: ({ row }) => <span>{row.original.members.length} member(s)</span>,
		},
		{
			accessorKey: "policies",
			header: "Policies",
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.policies.length > 0
						? row.original.policies.map((p) => (
								<span key={p} className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-xs">{p}</span>
						  ))
						: <span className="text-[var(--color-text-tertiary)]">—</span>}
				</div>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex justify-end gap-1">
					<Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setMembersGroup(row.original); }}>
						<Users className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(row.original.name); }}>
						<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Groups</h1>
				<div className="flex items-center gap-2">
					{loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />}
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="h-4 w-4" /> Create Group
					</Button>
				</div>
			</div>
			<DataTable columns={columns} data={groups} />
			<CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
			{membersGroup && (
				<GroupMembersDialog
					group={membersGroup}
					open={!!membersGroup}
					onOpenChange={(open) => { if (!open) { setMembersGroup(null); loadGroups(); } }}
				/>
			)}
		</div>
	);
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/groups/
git commit -m "feat: add groups page (list, create, delete, manage members)"
```

---

## Task 6: Policies Page (Frontend)

**Files:**
- Create: `src/pages/policies/policy-editor.tsx`
- Modify: `src/pages/policies/index.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create policy editor page**

Create `src/pages/policies/policy-editor.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAdminStore } from "@/stores/admin-store";
import { useToastStore } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save } from "lucide-react";

export function PolicyEditorPage() {
	const [searchParams] = useSearchParams();
	const name = searchParams.get("name") ?? "";
	const isNew = searchParams.get("new") === "true";

	const { getPolicy, createPolicy } = useAdminStore();
	const { addToast } = useToastStore();
	const [policyText, setPolicyText] = useState("");
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (name && !isNew) {
			setLoading(true);
			getPolicy(name)
				.then((info) => setPolicyText(info.policy))
				.catch((err) => addToast({ title: "Error loading policy", description: String(err), variant: "error" }))
				.finally(() => setLoading(false));
		} else if (isNew) {
			setPolicyText(JSON.stringify({
				Version: "2012-10-17",
				Statement: [
					{
						Effect: "Allow",
						Action: ["s3:GetObject"],
						Resource: ["arn:aws:s3:::*"],
					},
				],
			}, null, 2));
		}
	}, [name, isNew, getPolicy, addToast]);

	async function handleSave() {
		setSaving(true);
		try {
			JSON.parse(policyText); // Validate JSON
			await createPolicy(name, policyText);
			addToast({ title: `Policy "${name}" saved`, variant: "success" });
		} catch (err) {
			addToast({ title: "Error saving policy", description: String(err), variant: "error" });
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex h-full flex-col space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Link to="/policies">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-2xl font-semibold">{isNew ? "Create Policy" : name}</h1>
				</div>
				<Button onClick={handleSave} disabled={saving}>
					{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
					Save
				</Button>
			</div>

			{loading ? (
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin" />
				</div>
			) : (
				<textarea
					value={policyText}
					onChange={(e) => setPolicyText(e.target.value)}
					className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
					spellCheck={false}
				/>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Build Policies list page**

Replace `src/pages/policies/index.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { useAdminStore, type PolicyInfo } from "@/stores/admin-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Shield, Pencil, Loader2 } from "lucide-react";

export function PoliciesPage() {
	const { policies, loading, loadPolicies, deletePolicy } = useAdminStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const navigate = useNavigate();
	const [createOpen, setCreateOpen] = useState(false);
	const [newPolicyName, setNewPolicyName] = useState("");
	const hasActiveProfile = !!config?.active_profile_id;

	useEffect(() => {
		if (hasActiveProfile) {
			loadPolicies().catch((err) => {
				addToast({ title: "Error loading policies", description: String(err), variant: "error" });
			});
		}
	}, [hasActiveProfile, loadPolicies, addToast]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Policies</h1>
				<p className="text-[var(--color-text-secondary)]">Select a server profile first.</p>
			</div>
		);
	}

	async function handleDelete(name: string) {
		try {
			await deletePolicy(name);
			addToast({ title: `Policy "${name}" deleted`, variant: "success" });
		} catch (err) {
			addToast({ title: "Error deleting policy", description: String(err), variant: "error" });
		}
	}

	function handleCreate() {
		if (newPolicyName.trim()) {
			navigate(`/policies/editor?name=${encodeURIComponent(newPolicyName.trim())}&new=true`);
			setCreateOpen(false);
			setNewPolicyName("");
		}
	}

	const columns: ColumnDef<PolicyInfo, string>[] = [
		{
			accessorKey: "name",
			header: "Name",
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Shield className="h-4 w-4 text-[var(--color-accent)]" />
					<span className="font-medium">{row.original.name}</span>
				</div>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex justify-end gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={(e) => {
							e.stopPropagation();
							navigate(`/policies/editor?name=${encodeURIComponent(row.original.name)}`);
						}}
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(row.original.name); }}>
						<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Policies</h1>
				<div className="flex items-center gap-2">
					{loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />}
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="h-4 w-4" /> Create Policy
					</Button>
				</div>
			</div>
			<DataTable columns={columns} data={policies} />

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New Policy</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="policy-name" className="text-sm font-medium">Policy Name</label>
							<Input
								id="policy-name"
								value={newPolicyName}
								onChange={(e) => setNewPolicyName(e.target.value)}
								placeholder="my-custom-policy"
								onKeyDown={(e) => e.key === "Enter" && handleCreate()}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
							<Button onClick={handleCreate}>Continue to Editor</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
```

- [ ] **Step 3: Add policy editor route to App.tsx**

Add import:
```tsx
import { PolicyEditorPage } from "@/pages/policies/policy-editor";
```

Add route:
```tsx
<Route path="/policies/editor" element={<PolicyEditorPage />} />
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/policies/ src/App.tsx
git commit -m "feat: add policies page with JSON editor (list, create, edit, delete)"
```

---

## Task 7: Lint and Polish

- [ ] **Step 1:** `npx @biomejs/biome check --write src/`
- [ ] **Step 2:** `export PATH="/c/Users/lkr2/.cargo/bin:$PATH" && cd src-tauri && cargo clippy -- -D warnings && cargo fmt`
- [ ] **Step 3:** `export PATH="/c/Users/lkr2/.cargo/bin:$PATH" && cd src-tauri && cargo test`
- [ ] **Step 4:** `npx tsc --noEmit`
- [ ] **Step 5:** If changes: `git add -A && git commit -m "chore: lint fixes and polish for Phase 3"`

---

## Summary

| Task | What it builds |
|---|---|
| 1 | MC runner, alias manager, admin types |
| 2 | Admin operations (users, groups, policies via mc CLI) |
| 3 | Admin IPC commands (14 commands) |
| 4 | Admin store + Users page |
| 5 | Groups page (list, create, delete, manage members) |
| 6 | Policies page + JSON policy editor |
| 7 | Lint and polish |

**End state:** Full IAM management — users (list/create/delete), groups (list/create/delete/manage members), policies (list/create/edit/delete with JSON editor). All operations go through `mc` CLI with JSON output, so they work with any MinIO version.
