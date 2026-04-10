use crate::models::{BucketConfig, LifecycleRule};
use crate::s3::{bucket_config, client};

#[tauri::command]
pub async fn get_bucket_config(bucket: String) -> Result<BucketConfig, String> {
    let s3 = client::build_s3_client().await?;
    bucket_config::get_bucket_config(&s3, &bucket).await
}

#[tauri::command]
pub async fn set_versioning(bucket: String, enabled: bool) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    bucket_config::set_versioning(&s3, &bucket, enabled).await
}

#[tauri::command]
pub async fn set_bucket_policy(bucket: String, policy: String) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    bucket_config::set_bucket_policy(&s3, &bucket, &policy).await
}

#[tauri::command]
pub async fn delete_bucket_policy(bucket: String) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    bucket_config::delete_bucket_policy(&s3, &bucket).await
}

#[tauri::command]
pub async fn get_lifecycle_rules(bucket: String) -> Result<Vec<LifecycleRule>, String> {
    let s3 = client::build_s3_client().await?;
    bucket_config::get_lifecycle_rules(&s3, &bucket).await
}

#[tauri::command]
pub async fn put_lifecycle_rule(bucket: String, rule: LifecycleRule) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    bucket_config::put_lifecycle_rule(&s3, &bucket, &rule).await
}

#[tauri::command]
pub async fn delete_lifecycle_rule(bucket: String, rule_id: String) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    bucket_config::delete_lifecycle_rule(&s3, &bucket, &rule_id).await
}
