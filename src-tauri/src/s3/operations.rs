use aws_sdk_s3::Client;
use crate::models::{BucketInfo, ObjectInfo, PresignedUrlResult};

pub async fn list_buckets(client: &Client) -> Result<Vec<BucketInfo>, String> {
    let output = client
        .list_buckets()
        .send()
        .await
        .map_err(|e| format!("Failed to list buckets: {}", e))?;

    Ok(output
        .buckets()
        .iter()
        .map(|b| BucketInfo {
            name: b.name().unwrap_or_default().to_string(),
            creation_date: b.creation_date().map(|d| d.to_string()),
        })
        .collect())
}

pub async fn create_bucket(client: &Client, name: &str) -> Result<(), String> {
    client
        .create_bucket()
        .bucket(name)
        .send()
        .await
        .map_err(|e| format!("Failed to create bucket: {}", e))?;
    Ok(())
}

pub async fn delete_bucket(client: &Client, name: &str) -> Result<(), String> {
    client
        .delete_bucket()
        .bucket(name)
        .send()
        .await
        .map_err(|e| format!("Failed to delete bucket: {}", e))?;
    Ok(())
}

pub async fn list_objects(
    client: &Client,
    bucket: &str,
    prefix: &str,
) -> Result<Vec<ObjectInfo>, String> {
    let mut result = Vec::new();

    let output = client
        .list_objects_v2()
        .bucket(bucket)
        .prefix(prefix)
        .delimiter("/")
        .send()
        .await
        .map_err(|e| format!("Failed to list objects: {}", e))?;

    for p in output.common_prefixes() {
        if let Some(prefix_str) = p.prefix() {
            result.push(ObjectInfo {
                key: prefix_str.to_string(),
                size: 0,
                last_modified: None,
                is_prefix: true,
            });
        }
    }

    for obj in output.contents() {
        let key = obj.key().unwrap_or_default().to_string();
        if key == prefix {
            continue;
        }
        result.push(ObjectInfo {
            key,
            size: obj.size().unwrap_or(0),
            last_modified: obj.last_modified().map(|d| d.to_string()),
            is_prefix: false,
        });
    }

    Ok(result)
}

pub async fn delete_object(client: &Client, bucket: &str, key: &str) -> Result<(), String> {
    client
        .delete_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(|e| format!("Failed to delete object: {}", e))?;
    Ok(())
}

pub async fn delete_objects(
    client: &Client,
    bucket: &str,
    keys: Vec<String>,
) -> Result<(), String> {
    use aws_sdk_s3::types::{Delete, ObjectIdentifier};

    let objects: Vec<ObjectIdentifier> = keys
        .into_iter()
        .map(|key| ObjectIdentifier::builder().key(key).build().unwrap())
        .collect();

    let delete = Delete::builder()
        .set_objects(Some(objects))
        .build()
        .map_err(|e| format!("Failed to build delete request: {}", e))?;

    client
        .delete_objects()
        .bucket(bucket)
        .delete(delete)
        .send()
        .await
        .map_err(|e| format!("Failed to delete objects: {}", e))?;

    Ok(())
}

pub async fn get_presigned_url(
    client: &Client,
    bucket: &str,
    key: &str,
    expires_in_secs: u64,
) -> Result<PresignedUrlResult, String> {
    use aws_sdk_s3::presigning::PresigningConfig;
    use std::time::Duration;

    let presigning_config = PresigningConfig::builder()
        .expires_in(Duration::from_secs(expires_in_secs))
        .build()
        .map_err(|e| format!("Failed to build presigning config: {}", e))?;

    let presigned = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .presigned(presigning_config)
        .await
        .map_err(|e| format!("Failed to generate presigned URL: {}", e))?;

    Ok(PresignedUrlResult {
        url: presigned.uri().to_string(),
        expires_in_secs,
    })
}

pub async fn upload_object(
    client: &Client,
    bucket: &str,
    key: &str,
    file_path: &str,
) -> Result<(), String> {
    let body = aws_sdk_s3::primitives::ByteStream::from_path(std::path::Path::new(file_path))
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(body)
        .send()
        .await
        .map_err(|e| format!("Failed to upload object: {}", e))?;

    Ok(())
}

pub async fn download_object(
    client: &Client,
    bucket: &str,
    key: &str,
    destination: &str,
) -> Result<(), String> {
    let output = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(|e| format!("Failed to download object: {}", e))?;

    let bytes = output
        .body
        .collect()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    std::fs::write(destination, bytes.into_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}
