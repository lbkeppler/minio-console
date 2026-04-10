use super::runner;
use crate::config::{credentials, profiles};

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
    let endpoint =
        if profile.endpoint.starts_with("http://") || profile.endpoint.starts_with("https://") {
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
