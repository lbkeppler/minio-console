use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ServerProfile {
    pub id: String,
    pub alias: String,
    pub endpoint: String,
    pub access_key: String,
    // secret_key stored in OS keyring, not here
    pub use_ssl: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppConfig {
    pub active_profile_id: Option<String>,
    pub profiles: Vec<ServerProfile>,
    pub theme: String,
    pub sidebar_collapsed: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            active_profile_id: None,
            profiles: Vec::new(),
            theme: "system".to_string(),
            sidebar_collapsed: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketInfo {
    pub name: String,
    pub creation_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectInfo {
    pub key: String,
    pub size: i64,
    pub last_modified: Option<String>,
    pub is_prefix: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresignedUrlResult {
    pub url: String,
    pub expires_in_secs: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_profile_serialization() {
        let profile = ServerProfile {
            id: "test-id".to_string(),
            alias: "local".to_string(),
            endpoint: "http://localhost:9000".to_string(),
            access_key: "minioadmin".to_string(),
            use_ssl: false,
        };
        let toml_str = toml::to_string(&profile).unwrap();
        let deserialized: ServerProfile = toml::from_str(&toml_str).unwrap();
        assert_eq!(profile, deserialized);
    }

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert_eq!(config.active_profile_id, None);
        assert!(config.profiles.is_empty());
        assert_eq!(config.theme, "system");
        assert!(!config.sidebar_collapsed);
    }

    #[test]
    fn test_app_config_serialization_roundtrip() {
        let config = AppConfig {
            active_profile_id: Some("id-1".to_string()),
            profiles: vec![ServerProfile {
                id: "id-1".to_string(),
                alias: "prod".to_string(),
                endpoint: "https://minio.example.com".to_string(),
                access_key: "admin".to_string(),
                use_ssl: true,
            }],
            theme: "dark".to_string(),
            sidebar_collapsed: true,
        };
        let toml_str = toml::to_string(&config).unwrap();
        let deserialized: AppConfig = toml::from_str(&toml_str).unwrap();
        assert_eq!(config, deserialized);
    }

    #[test]
    fn test_bucket_info_serialization() {
        let bucket = BucketInfo {
            name: "my-bucket".to_string(),
            creation_date: Some("2024-01-01T00:00:00Z".to_string()),
        };
        let json = serde_json::to_string(&bucket).unwrap();
        let deserialized: BucketInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "my-bucket");
    }

    #[test]
    fn test_object_info_serialization() {
        let obj = ObjectInfo {
            key: "photos/cat.jpg".to_string(),
            size: 1024,
            last_modified: Some("2024-06-15T12:00:00Z".to_string()),
            is_prefix: false,
        };
        let json = serde_json::to_string(&obj).unwrap();
        let deserialized: ObjectInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.key, "photos/cat.jpg");
        assert!(!deserialized.is_prefix);
    }
}
