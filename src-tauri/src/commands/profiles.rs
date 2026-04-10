use crate::config::{credentials, profiles};
use crate::models::{AppConfig, ServerProfile};

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    Ok(profiles::load_config())
}

#[tauri::command]
pub fn add_profile(
    alias: String,
    endpoint: String,
    access_key: String,
    secret_key: String,
    use_ssl: bool,
) -> Result<AppConfig, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let profile = ServerProfile {
        id: id.clone(),
        alias,
        endpoint,
        access_key,
        use_ssl,
    };
    credentials::store_secret(&id, &secret_key)?;
    profiles::add_profile(profile)
}

#[tauri::command]
pub fn update_profile(
    id: String,
    alias: String,
    endpoint: String,
    access_key: String,
    secret_key: Option<String>,
    use_ssl: bool,
) -> Result<AppConfig, String> {
    let profile = ServerProfile {
        id: id.clone(),
        alias,
        endpoint,
        access_key,
        use_ssl,
    };
    if let Some(secret) = secret_key {
        credentials::store_secret(&id, &secret)?;
    }
    profiles::update_profile(profile)
}

#[tauri::command]
pub fn delete_profile(id: String) -> Result<AppConfig, String> {
    credentials::delete_secret(&id)?;
    profiles::delete_profile(&id)
}

#[tauri::command]
pub fn set_active_profile(id: String) -> Result<AppConfig, String> {
    profiles::set_active_profile(&id)
}
