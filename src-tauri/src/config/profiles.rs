use crate::models::{AppConfig, ServerProfile};
use std::fs;
use std::path::PathBuf;

fn config_dir() -> PathBuf {
    let dir = dirs::config_dir()
        .expect("Could not determine config directory")
        .join("minio-console");
    fs::create_dir_all(&dir).expect("Could not create config directory");
    dir
}

fn config_path() -> PathBuf {
    config_dir().join("config.toml")
}

pub fn load_config() -> AppConfig {
    let path = config_path();
    if !path.exists() {
        return AppConfig::default();
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    toml::from_str(&content).unwrap_or_default()
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = config_path();
    let content = toml::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn add_profile(profile: ServerProfile) -> Result<AppConfig, String> {
    let mut config = load_config();
    config.profiles.push(profile);
    save_config(&config)?;
    Ok(config)
}

pub fn update_profile(profile: ServerProfile) -> Result<AppConfig, String> {
    let mut config = load_config();
    let pos = config
        .profiles
        .iter()
        .position(|p| p.id == profile.id)
        .ok_or_else(|| format!("Profile '{}' not found", profile.id))?;
    config.profiles[pos] = profile;
    save_config(&config)?;
    Ok(config)
}

pub fn delete_profile(id: &str) -> Result<AppConfig, String> {
    let mut config = load_config();
    config.profiles.retain(|p| p.id != id);
    if config.active_profile_id.as_deref() == Some(id) {
        config.active_profile_id = None;
    }
    save_config(&config)?;
    Ok(config)
}

pub fn set_active_profile(id: &str) -> Result<AppConfig, String> {
    let mut config = load_config();
    if !config.profiles.iter().any(|p| p.id == id) {
        return Err(format!("Profile '{}' not found", id));
    }
    config.active_profile_id = Some(id.to_string());
    save_config(&config)?;
    Ok(config)
}
