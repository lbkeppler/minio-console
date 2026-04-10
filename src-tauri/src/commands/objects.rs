use crate::models::{ObjectInfo, PresignedUrlResult};
use crate::s3::{client, operations};

#[tauri::command]
pub async fn list_objects(bucket: String, prefix: String) -> Result<Vec<ObjectInfo>, String> {
    let s3 = client::build_s3_client().await?;
    operations::list_objects(&s3, &bucket, &prefix).await
}

#[tauri::command]
pub async fn delete_object(bucket: String, key: String) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    operations::delete_object(&s3, &bucket, &key).await
}

#[tauri::command]
pub async fn delete_objects(bucket: String, keys: Vec<String>) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    operations::delete_objects(&s3, &bucket, keys).await
}

#[tauri::command]
pub async fn get_presigned_url(
    bucket: String,
    key: String,
    expires_in_secs: u64,
) -> Result<PresignedUrlResult, String> {
    let s3 = client::build_s3_client().await?;
    operations::get_presigned_url(&s3, &bucket, &key, expires_in_secs).await
}

#[tauri::command]
pub async fn upload_object(bucket: String, key: String, file_path: String) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    operations::upload_object(&s3, &bucket, &key, &file_path).await
}

#[tauri::command]
pub async fn download_object(
    bucket: String,
    key: String,
    destination: String,
) -> Result<(), String> {
    let s3 = client::build_s3_client().await?;
    operations::download_object(&s3, &bucket, &key, &destination).await
}
