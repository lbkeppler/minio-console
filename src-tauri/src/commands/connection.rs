use crate::config::credentials;

#[derive(serde::Serialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub server_version: Option<String>,
}

#[tauri::command]
pub async fn test_connection(
    endpoint: String,
    access_key: String,
    secret_key: Option<String>,
    profile_id: Option<String>,
    use_ssl: bool,
) -> Result<ConnectionTestResult, String> {
    let secret = match secret_key {
        Some(s) => s,
        None => {
            let pid = profile_id.ok_or("Either secret_key or profile_id must be provided")?;
            credentials::get_secret(&pid)?
        }
    };

    let scheme = if use_ssl { "https" } else { "http" };
    let url = if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
        format!("{}/minio/health/live", endpoint.trim_end_matches('/'))
    } else {
        format!(
            "{}://{}/minio/health/live",
            scheme,
            endpoint.trim_end_matches('/')
        )
    };

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .basic_auth(&access_key, Some(&secret))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(ConnectionTestResult {
            success: true,
            message: "Connected successfully".to_string(),
            server_version: response
                .headers()
                .get("x-minio-server")
                .and_then(|v| v.to_str().ok())
                .map(String::from),
        })
    } else {
        Ok(ConnectionTestResult {
            success: false,
            message: format!("Server returned status {}", response.status()),
            server_version: None,
        })
    }
}
