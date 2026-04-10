use aws_sdk_s3::Client;
use crate::models::{BucketConfig, LifecycleRule};

pub async fn get_bucket_config(client: &Client, bucket: &str) -> Result<BucketConfig, String> {
    let versioning = client
        .get_bucket_versioning()
        .bucket(bucket)
        .send()
        .await
        .map_err(|e| format!("Failed to get versioning: {}", e))?;

    let versioning_status = versioning
        .status()
        .map(|s| s.as_str().to_string())
        .unwrap_or_default();

    let policy = match client.get_bucket_policy().bucket(bucket).send().await {
        Ok(output) => output.policy().map(|p| p.to_string()),
        Err(_) => None,
    };

    Ok(BucketConfig {
        versioning: versioning_status,
        policy,
    })
}

pub async fn set_versioning(client: &Client, bucket: &str, enabled: bool) -> Result<(), String> {
    use aws_sdk_s3::types::{BucketVersioningStatus, VersioningConfiguration};

    let status = if enabled {
        BucketVersioningStatus::Enabled
    } else {
        BucketVersioningStatus::Suspended
    };

    let config = VersioningConfiguration::builder().status(status).build();

    client
        .put_bucket_versioning()
        .bucket(bucket)
        .versioning_configuration(config)
        .send()
        .await
        .map_err(|e| format!("Failed to set versioning: {}", e))?;

    Ok(())
}

pub async fn set_bucket_policy(client: &Client, bucket: &str, policy: &str) -> Result<(), String> {
    client
        .put_bucket_policy()
        .bucket(bucket)
        .policy(policy)
        .send()
        .await
        .map_err(|e| format!("Failed to set policy: {}", e))?;
    Ok(())
}

pub async fn delete_bucket_policy(client: &Client, bucket: &str) -> Result<(), String> {
    client
        .delete_bucket_policy()
        .bucket(bucket)
        .send()
        .await
        .map_err(|e| format!("Failed to delete policy: {}", e))?;
    Ok(())
}

pub async fn get_lifecycle_rules(client: &Client, bucket: &str) -> Result<Vec<LifecycleRule>, String> {
    let output = match client
        .get_bucket_lifecycle_configuration()
        .bucket(bucket)
        .send()
        .await
    {
        Ok(o) => o,
        Err(_) => return Ok(Vec::new()),
    };

    Ok(output
        .rules()
        .iter()
        .map(|r| LifecycleRule {
            id: r.id().unwrap_or_default().to_string(),
            prefix: r
                .filter()
                .and_then(|f| f.prefix())
                .unwrap_or_default()
                .to_string(),
            status: r.status().as_str().to_string(),
            expiration_days: r.expiration().and_then(|e| e.days()),
        })
        .collect())
}

pub async fn put_lifecycle_rule(
    client: &Client,
    bucket: &str,
    rule: &LifecycleRule,
) -> Result<(), String> {
    use aws_sdk_s3::types::{
        ExpirationStatus, LifecycleExpiration, LifecycleRule as S3Rule,
        LifecycleRuleFilter, BucketLifecycleConfiguration,
    };

    let mut rules = Vec::new();
    if let Ok(existing) = client
        .get_bucket_lifecycle_configuration()
        .bucket(bucket)
        .send()
        .await
    {
        for r in existing.rules() {
            if r.id() != Some(rule.id.as_str()) {
                rules.push(r.clone());
            }
        }
    }

    let mut builder = S3Rule::builder()
        .id(&rule.id)
        .filter(LifecycleRuleFilter::builder().prefix(rule.prefix.clone()).build())
        .status(if rule.status == "Enabled" {
            ExpirationStatus::Enabled
        } else {
            ExpirationStatus::Disabled
        });

    if let Some(days) = rule.expiration_days {
        builder = builder.expiration(
            LifecycleExpiration::builder().days(days).build(),
        );
    }

    rules.push(builder.build().map_err(|e| format!("Failed to build rule: {}", e))?);

    let config = BucketLifecycleConfiguration::builder()
        .set_rules(Some(rules))
        .build()
        .map_err(|e| format!("Failed to build config: {}", e))?;

    client
        .put_bucket_lifecycle_configuration()
        .bucket(bucket)
        .lifecycle_configuration(config)
        .send()
        .await
        .map_err(|e| format!("Failed to put lifecycle config: {}", e))?;

    Ok(())
}

pub async fn delete_lifecycle_rule(
    client: &Client,
    bucket: &str,
    rule_id: &str,
) -> Result<(), String> {
    use aws_sdk_s3::types::BucketLifecycleConfiguration;

    let existing = match client
        .get_bucket_lifecycle_configuration()
        .bucket(bucket)
        .send()
        .await
    {
        Ok(o) => o,
        Err(_) => return Ok(()),
    };

    let rules: Vec<_> = existing
        .rules()
        .iter()
        .filter(|r| r.id() != Some(rule_id))
        .cloned()
        .collect();

    if rules.is_empty() {
        client
            .delete_bucket_lifecycle()
            .bucket(bucket)
            .send()
            .await
            .map_err(|e| format!("Failed to delete lifecycle: {}", e))?;
    } else {
        let config = BucketLifecycleConfiguration::builder()
            .set_rules(Some(rules))
            .build()
            .map_err(|e| format!("Failed to build config: {}", e))?;

        client
            .put_bucket_lifecycle_configuration()
            .bucket(bucket)
            .lifecycle_configuration(config)
            .send()
            .await
            .map_err(|e| format!("Failed to put lifecycle config: {}", e))?;
    }

    Ok(())
}
