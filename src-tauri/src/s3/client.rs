use aws_config::Region;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::Builder as S3ConfigBuilder;
use aws_sdk_s3::Client;

use crate::config::{credentials, profiles};

pub async fn build_s3_client() -> Result<Client, String> {
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

    let creds = Credentials::new(
        &profile.access_key,
        &secret_key,
        None,
        None,
        "minio-console",
    );

    let scheme = if profile.use_ssl { "https" } else { "http" };
    let endpoint =
        if profile.endpoint.starts_with("http://") || profile.endpoint.starts_with("https://") {
            profile.endpoint.clone()
        } else {
            format!("{}://{}", scheme, profile.endpoint)
        };

    let s3_config = S3ConfigBuilder::new()
        .endpoint_url(&endpoint)
        .region(Region::new("us-east-1"))
        .credentials_provider(creds)
        .force_path_style(true)
        .behavior_version_latest()
        .build();

    Ok(Client::from_conf(s3_config))
}
