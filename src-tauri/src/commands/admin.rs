use crate::mc::admin;
use crate::models::{GroupInfo, PolicyInfo, UserInfo};

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
    admin::attach_policy(&policy, user.as_deref(), group.as_deref()).await
}

#[tauri::command]
pub async fn detach_policy(
    policy: String,
    user: Option<String>,
    group: Option<String>,
) -> Result<(), String> {
    admin::detach_policy(&policy, user.as_deref(), group.as_deref()).await
}
