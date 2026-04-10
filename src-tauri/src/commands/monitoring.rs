use crate::mc::monitoring;
use crate::models::types::{DiskInfo, ServerInfo};

#[tauri::command]
pub async fn get_server_info() -> Result<ServerInfo, String> {
    monitoring::get_server_info().await
}

#[tauri::command]
pub async fn get_disk_usage() -> Result<Vec<DiskInfo>, String> {
    monitoring::get_disk_usage().await
}
