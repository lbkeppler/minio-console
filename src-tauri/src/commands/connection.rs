use crate::config::credentials;

use aws_config::Region;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::Builder as S3ConfigBuilder;
use aws_sdk_s3::Client;

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
        Some(s) if !s.is_empty() => s,
        _ => {
            let pid = profile_id.ok_or("Either secret_key or profile_id must be provided")?;
            credentials::get_secret(&pid)?
        }
    };

    let scheme = if use_ssl { "https" } else { "http" };
    let endpoint_url = if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
        endpoint.clone()
    } else {
        format!("{}://{}", scheme, endpoint)
    };

    let creds = Credentials::new(&access_key, &secret, None, None, "minio-console-test");

    let s3_config = S3ConfigBuilder::new()
        .endpoint_url(&endpoint_url)
        .region(Region::new("us-east-1"))
        .credentials_provider(creds)
        .force_path_style(true)
        .behavior_version_latest()
        .build();

    let client = Client::from_conf(s3_config);

    match client.list_buckets().send().await {
        Ok(output) => {
            let count = output.buckets().len();
            Ok(ConnectionTestResult {
                success: true,
                message: format!("Connected successfully ({} buckets found)", count),
                server_version: None,
            })
        }
        Err(e) => Ok(ConnectionTestResult {
            success: false,
            message: format!("Connection failed: {}", e),
            server_version: None,
        }),
    }
}
