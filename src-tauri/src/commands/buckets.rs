use crate::models::BucketInfo;
use crate::s3::{client, operations};

#[tauri::command]
pub async fn list_buckets() -> Result<Vec<BucketInfo>, String> {
    let s3 = client::build_s3_client().await?;
    operations::list_buckets(&s3).await
}

#[tauri::command]
pub async fn create_bucket(name: String) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    operations::create_bucket(&s3, &name).await
}

#[tauri::command]
pub async fn delete_bucket(name: String) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    operations::delete_bucket(&s3, &name).await
}
