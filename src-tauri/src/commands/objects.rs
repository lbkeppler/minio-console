use crate::models::{ObjectContent, ObjectInfo, PresignedUrlResult};
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

#[tauri::command]
pub async fn get_object_content(
    bucket: String,
    key: String,
    max_size: i64,
) -> Result<ObjectContent, String> {
    let s3 = client::build_s3_client().await?;

    let head = s3
        .head_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Failed to get object info: {}", e))?;

    let size = head.content_length().unwrap_or(0);
    let content_type = head
        .content_type()
        .unwrap_or("application/octet-stream")
        .to_string();

    if size > max_size {
        return Err(format!(
            "Object too large for preview ({} bytes, max {})",
            size, max_size
        ));
    }

    let output = s3
        .get_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Failed to get object: {}", e))?;

    let bytes = output
        .body
        .collect()
        .await
        .map_err(|e| format!("Failed to read body: {}", e))?
        .into_bytes();

    let is_text = content_type.starts_with("text/")
        || content_type.contains("json")
        || content_type.contains("xml")
        || content_type.contains("yaml")
        || content_type.contains("javascript")
        || content_type.contains("csv");

    let data = if is_text {
        String::from_utf8_lossy(&bytes).to_string()
    } else {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    };

    Ok(ObjectContent {
        content_type,
        size,
        data,
        is_text,
    })
}
