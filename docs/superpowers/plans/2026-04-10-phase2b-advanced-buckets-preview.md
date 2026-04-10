# Phase 2b: Bucket Config + Object Preview + Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bucket configuration (versioning, policy, lifecycle rules), inline object preview (images, text, JSON), and search-by-prefix to the MinIO Console.

**Architecture:** New Rust S3 operations for bucket config and object content retrieval. Frontend adds a bucket detail/settings page, an object preview panel, and a search input to the object browser. CodeMirror 6 for JSON policy editing.

**Tech Stack:** aws-sdk-s3 (Rust), CodeMirror 6, React 18, Zustand, Tauri 2 IPC

---

## File Structure

### Backend (Rust) — new/modified

| File | Responsibility |
|---|---|
| `src-tauri/src/s3/bucket_config.rs` | Versioning, policy, lifecycle CRUD operations |
| `src-tauri/src/s3/mod.rs` | Add bucket_config module |
| `src-tauri/src/commands/bucket_config.rs` | Tauri IPC commands for bucket config |
| `src-tauri/src/commands/objects.rs` | Add get_object_content command for preview |
| `src-tauri/src/commands/mod.rs` | Add bucket_config module |
| `src-tauri/src/lib.rs` | Register new commands |
| `src-tauri/src/models/types.rs` | Add BucketConfig, LifecycleRule, ObjectContent types |

### Frontend (React) — new/modified

| File | Responsibility |
|---|---|
| `src/pages/buckets/bucket-settings.tsx` | Bucket settings page (versioning, policy, lifecycle) |
| `src/pages/buckets/policy-editor.tsx` | JSON policy editor using CodeMirror |
| `src/pages/buckets/lifecycle-rules.tsx` | Lifecycle rules list + create/delete |
| `src/pages/objects/object-preview.tsx` | Inline preview panel (image, text, JSON) |
| `src/pages/objects/search-bar.tsx` | Search input for prefix filtering |
| `src/pages/objects/index.tsx` | Add search + preview integration |
| `src/stores/bucket-config-store.ts` | Zustand store for bucket config |
| `src/App.tsx` | Add bucket settings route |

---

## Task 1: Bucket Config Types and Rust Operations

**Files:**
- Modify: `src-tauri/src/models/types.rs`
- Create: `src-tauri/src/s3/bucket_config.rs`
- Modify: `src-tauri/src/s3/mod.rs`

- [ ] **Step 1: Add types to models/types.rs**

Add after existing types (before `#[cfg(test)]`):

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketConfig {
    pub versioning: String, // "Enabled", "Suspended", or ""
    pub policy: Option<String>, // JSON string
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifecycleRule {
    pub id: String,
    pub prefix: String,
    pub status: String, // "Enabled" or "Disabled"
    pub expiration_days: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectContent {
    pub content_type: String,
    pub size: i64,
    pub data: String, // base64 for binary, raw text for text
    pub is_text: bool,
}
```

- [ ] **Step 2: Add tests**

Add to existing test module:

```rust
    #[test]
    fn test_bucket_config_serialization() {
        let config = BucketConfig {
            versioning: "Enabled".to_string(),
            policy: Some(r#"{"Version":"2012-10-17"}"#.to_string()),
        };
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: BucketConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.versioning, "Enabled");
        assert!(deserialized.policy.is_some());
    }

    #[test]
    fn test_lifecycle_rule_serialization() {
        let rule = LifecycleRule {
            id: "expire-logs".to_string(),
            prefix: "logs/".to_string(),
            status: "Enabled".to_string(),
            expiration_days: Some(30),
        };
        let json = serde_json::to_string(&rule).unwrap();
        let deserialized: LifecycleRule = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.expiration_days, Some(30));
    }
```

- [ ] **Step 3: Run tests**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo test
```

Expected: 7 tests pass.

- [ ] **Step 4: Create bucket_config.rs operations**

Create `src-tauri/src/s3/bucket_config.rs`:

```rust
use aws_sdk_s3::Client;
use crate::models::{BucketConfig, LifecycleRule};

pub async fn get_bucket_config(client: &Client, bucket: &str) -> Result<BucketConfig, String> {
    // Get versioning
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

    // Get policy
    let policy = match client.get_bucket_policy().bucket(bucket).send().await {
        Ok(output) => output.policy().map(|p| p.to_string()),
        Err(_) => None, // No policy set
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
        Err(_) => return Ok(Vec::new()), // No lifecycle config
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

    // Get existing rules
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

    // Build new rule
    let mut builder = S3Rule::builder()
        .id(&rule.id)
        .filter(LifecycleRuleFilter::Prefix(rule.prefix.clone()))
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
```

- [ ] **Step 5: Update s3/mod.rs**

Add `pub mod bucket_config;` to `src-tauri/src/s3/mod.rs`.

- [ ] **Step 6: Verify compilation**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check
```

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/models/types.rs src-tauri/src/s3/
git commit -m "feat: add bucket config operations (versioning, policy, lifecycle)"
```

---

## Task 2: Bucket Config IPC Commands + Object Preview Command

**Files:**
- Create: `src-tauri/src/commands/bucket_config.rs`
- Modify: `src-tauri/src/commands/objects.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create bucket_config commands**

Create `src-tauri/src/commands/bucket_config.rs`:

```rust
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
```

- [ ] **Step 2: Add get_object_content to commands/objects.rs**

Add at the end of `src-tauri/src/commands/objects.rs`:

```rust
use crate::models::ObjectContent;

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
```

- [ ] **Step 3: Add base64 dependency**

Add to `src-tauri/Cargo.toml` dependencies:

```toml
base64 = "0.22"
```

- [ ] **Step 4: Update commands/mod.rs**

Add `pub mod bucket_config;` to `src-tauri/src/commands/mod.rs`.

- [ ] **Step 5: Register all new commands in lib.rs**

Add to the `invoke_handler` in `src-tauri/src/lib.rs`:

```rust
            commands::bucket_config::get_bucket_config,
            commands::bucket_config::set_versioning,
            commands::bucket_config::set_bucket_policy,
            commands::bucket_config::delete_bucket_policy,
            commands::bucket_config::get_lifecycle_rules,
            commands::bucket_config::put_lifecycle_rule,
            commands::bucket_config::delete_lifecycle_rule,
            commands::objects::get_object_content,
```

- [ ] **Step 6: Verify compilation and tests**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check && cargo test
```

- [ ] **Step 7: Commit**

```bash
git add src-tauri/
git commit -m "feat: add bucket config and object preview IPC commands"
```

---

## Task 3: Bucket Settings Page (Frontend)

**Files:**
- Create: `src/stores/bucket-config-store.ts`
- Create: `src/pages/buckets/bucket-settings.tsx`
- Create: `src/pages/buckets/lifecycle-rules.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Install CodeMirror**

```bash
npm install codemirror @codemirror/lang-json @codemirror/view @codemirror/state @codemirror/basic-setup
```

- [ ] **Step 2: Create bucket config store**

Create `src/stores/bucket-config-store.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface BucketConfig {
	versioning: string;
	policy: string | null;
}

export interface LifecycleRule {
	id: string;
	prefix: string;
	status: string;
	expiration_days: number | null;
}

interface BucketConfigStore {
	config: BucketConfig | null;
	lifecycleRules: LifecycleRule[];
	loading: boolean;
	loadConfig: (bucket: string) => Promise<void>;
	setVersioning: (bucket: string, enabled: boolean) => Promise<void>;
	setPolicy: (bucket: string, policy: string) => Promise<void>;
	deletePolicy: (bucket: string) => Promise<void>;
	loadLifecycleRules: (bucket: string) => Promise<void>;
	putLifecycleRule: (bucket: string, rule: LifecycleRule) => Promise<void>;
	deleteLifecycleRule: (bucket: string, ruleId: string) => Promise<void>;
}

export const useBucketConfigStore = create<BucketConfigStore>((set, get) => ({
	config: null,
	lifecycleRules: [],
	loading: false,
	loadConfig: async (bucket) => {
		set({ loading: true });
		try {
			const config = await invoke<BucketConfig>("get_bucket_config", { bucket });
			set({ config, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	setVersioning: async (bucket, enabled) => {
		await invoke("set_versioning", { bucket, enabled });
		await get().loadConfig(bucket);
	},
	setPolicy: async (bucket, policy) => {
		await invoke("set_bucket_policy", { bucket, policy });
		await get().loadConfig(bucket);
	},
	deletePolicy: async (bucket) => {
		await invoke("delete_bucket_policy", { bucket });
		await get().loadConfig(bucket);
	},
	loadLifecycleRules: async (bucket) => {
		const rules = await invoke<LifecycleRule[]>("get_lifecycle_rules", { bucket });
		set({ lifecycleRules: rules });
	},
	putLifecycleRule: async (bucket, rule) => {
		await invoke("put_lifecycle_rule", { bucket, rule });
		await get().loadLifecycleRules(bucket);
	},
	deleteLifecycleRule: async (bucket, ruleId) => {
		await invoke("delete_lifecycle_rule", { bucket, ruleId });
		await get().loadLifecycleRules(bucket);
	},
}));
```

- [ ] **Step 3: Create lifecycle rules component**

Create `src/pages/buckets/lifecycle-rules.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBucketConfigStore, type LifecycleRule } from "@/stores/bucket-config-store";
import { useToastStore } from "@/stores/toast-store";
import { Plus, Trash2, Loader2 } from "lucide-react";

const ruleSchema = z.object({
	id: z.string().min(1, "Rule ID is required"),
	prefix: z.string(),
	expirationDays: z.coerce.number().int().min(1, "Must be at least 1 day"),
});

type RuleFormData = z.infer<typeof ruleSchema>;

interface LifecycleRulesProps {
	bucket: string;
}

export function LifecycleRules({ bucket }: LifecycleRulesProps) {
	const { lifecycleRules, loadLifecycleRules, putLifecycleRule, deleteLifecycleRule } =
		useBucketConfigStore();
	const { addToast } = useToastStore();
	const [createOpen, setCreateOpen] = useState(false);

	useEffect(() => {
		loadLifecycleRules(bucket).catch((err) => {
			addToast({ title: "Error loading lifecycle rules", description: String(err), variant: "error" });
		});
	}, [bucket, loadLifecycleRules, addToast]);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<RuleFormData>({
		resolver: zodResolver(ruleSchema),
		defaultValues: { id: "", prefix: "", expirationDays: 30 },
	});

	async function onSubmit(data: RuleFormData) {
		try {
			await putLifecycleRule(bucket, {
				id: data.id,
				prefix: data.prefix,
				status: "Enabled",
				expiration_days: data.expirationDays,
			});
			addToast({ title: "Lifecycle rule added", variant: "success" });
			reset();
			setCreateOpen(false);
		} catch (err) {
			addToast({ title: "Error adding rule", description: String(err), variant: "error" });
		}
	}

	async function handleDelete(ruleId: string) {
		try {
			await deleteLifecycleRule(bucket, ruleId);
			addToast({ title: "Rule deleted", variant: "success" });
		} catch (err) {
			addToast({ title: "Error deleting rule", description: String(err), variant: "error" });
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium">Lifecycle Rules</h3>
				<Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
					<Plus className="h-3 w-3" /> Add Rule
				</Button>
			</div>

			{lifecycleRules.length === 0 ? (
				<p className="text-sm text-[var(--color-text-tertiary)]">No lifecycle rules configured.</p>
			) : (
				<div className="space-y-2">
					{lifecycleRules.map((rule) => (
						<div
							key={rule.id}
							className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3"
						>
							<div>
								<p className="text-sm font-medium">{rule.id}</p>
								<p className="text-xs text-[var(--color-text-secondary)]">
									Prefix: {rule.prefix || "/"} | Expires: {rule.expiration_days ?? "—"} days |{" "}
									{rule.status}
								</p>
							</div>
							<Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
								<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
							</Button>
						</div>
					))}
				</div>
			)}

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Lifecycle Rule</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="rule-id" className="text-sm font-medium">Rule ID</label>
							<Input id="rule-id" placeholder="expire-old-logs" {...register("id")} />
							{errors.id && <p className="text-xs text-[var(--color-danger)]">{errors.id.message}</p>}
						</div>
						<div className="space-y-2">
							<label htmlFor="rule-prefix" className="text-sm font-medium">Prefix</label>
							<Input id="rule-prefix" placeholder="logs/" {...register("prefix")} />
						</div>
						<div className="space-y-2">
							<label htmlFor="rule-days" className="text-sm font-medium">Expiration (days)</label>
							<Input id="rule-days" type="number" {...register("expirationDays")} />
							{errors.expirationDays && (
								<p className="text-xs text-[var(--color-danger)]">{errors.expirationDays.message}</p>
							)}
						</div>
						<div className="flex justify-end gap-2">
							<Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
								Add Rule
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
```

- [ ] **Step 4: Create bucket settings page**

Create `src/pages/buckets/bucket-settings.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useBucketConfigStore } from "@/stores/bucket-config-store";
import { useToastStore } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { LifecycleRules } from "./lifecycle-rules";
import { ArrowLeft, Loader2, Shield } from "lucide-react";

export function BucketSettingsPage() {
	const [searchParams] = useSearchParams();
	const bucket = searchParams.get("bucket") ?? "";
	const { config, loading, loadConfig, setVersioning, setPolicy, deletePolicy } =
		useBucketConfigStore();
	const { addToast } = useToastStore();
	const [policyText, setPolicyText] = useState("");
	const [savingPolicy, setSavingPolicy] = useState(false);

	useEffect(() => {
		if (bucket) {
			loadConfig(bucket).catch((err) => {
				addToast({ title: "Error loading config", description: String(err), variant: "error" });
			});
		}
	}, [bucket, loadConfig, addToast]);

	useEffect(() => {
		if (config?.policy) {
			try {
				setPolicyText(JSON.stringify(JSON.parse(config.policy), null, 2));
			} catch {
				setPolicyText(config.policy);
			}
		} else {
			setPolicyText("");
		}
	}, [config?.policy]);

	if (!bucket) {
		return <p>No bucket selected.</p>;
	}

	async function handleToggleVersioning() {
		const enabled = config?.versioning !== "Enabled";
		try {
			await setVersioning(bucket, enabled);
			addToast({
				title: `Versioning ${enabled ? "enabled" : "suspended"}`,
				variant: "success",
			});
		} catch (err) {
			addToast({ title: "Error", description: String(err), variant: "error" });
		}
	}

	async function handleSavePolicy() {
		setSavingPolicy(true);
		try {
			if (policyText.trim()) {
				JSON.parse(policyText); // Validate JSON
				await setPolicy(bucket, policyText);
				addToast({ title: "Policy saved", variant: "success" });
			} else {
				await deletePolicy(bucket);
				addToast({ title: "Policy removed", variant: "success" });
			}
		} catch (err) {
			addToast({ title: "Error saving policy", description: String(err), variant: "error" });
		} finally {
			setSavingPolicy(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/buckets">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<h1 className="text-2xl font-semibold">{bucket} — Settings</h1>
				{loading && <Loader2 className="h-4 w-4 animate-spin" />}
			</div>

			{/* Versioning */}
			<section className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
				<h2 className="text-sm font-medium">Versioning</h2>
				<div className="flex items-center justify-between">
					<p className="text-sm text-[var(--color-text-secondary)]">
						Status:{" "}
						<span className={config?.versioning === "Enabled" ? "text-[var(--color-success)]" : "text-[var(--color-text-tertiary)]"}>
							{config?.versioning || "Disabled"}
						</span>
					</p>
					<Button
						size="sm"
						variant={config?.versioning === "Enabled" ? "outline" : "default"}
						onClick={handleToggleVersioning}
					>
						{config?.versioning === "Enabled" ? "Suspend" : "Enable"}
					</Button>
				</div>
			</section>

			{/* Policy */}
			<section className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
				<div className="flex items-center justify-between">
					<h2 className="flex items-center gap-2 text-sm font-medium">
						<Shield className="h-4 w-4" /> Bucket Policy (JSON)
					</h2>
					<Button size="sm" onClick={handleSavePolicy} disabled={savingPolicy}>
						{savingPolicy && <Loader2 className="h-4 w-4 animate-spin" />}
						Save Policy
					</Button>
				</div>
				<textarea
					value={policyText}
					onChange={(e) => setPolicyText(e.target.value)}
					placeholder='{"Version":"2012-10-17","Statement":[...]}'
					className="h-48 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
					spellCheck={false}
				/>
				<p className="text-xs text-[var(--color-text-tertiary)]">
					Leave empty and save to remove the bucket policy.
				</p>
			</section>

			{/* Lifecycle */}
			<section className="rounded-lg border border-[var(--color-border)] p-4">
				<LifecycleRules bucket={bucket} />
			</section>
		</div>
	);
}
```

- [ ] **Step 5: Add route in App.tsx**

Add to the routes in `src/App.tsx`, inside the `<Route element={<AppLayout />}>` block:

```tsx
import { BucketSettingsPage } from "@/pages/buckets/bucket-settings";
```

Add the route:

```tsx
<Route path="/buckets/settings" element={<BucketSettingsPage />} />
```

- [ ] **Step 6: Add settings button to bucket list page**

In `src/pages/buckets/index.tsx`, add a Settings button to the actions column. Import `Settings` from lucide-react and `useNavigate`. In the `columnsWithActions` actions cell, add before the Trash2 button:

```tsx
<Button
    variant="ghost"
    size="icon"
    onClick={(e) => {
        e.stopPropagation();
        navigate(`/buckets/settings?bucket=${row.original.name}`);
    }}
>
    <Settings className="h-4 w-4" />
</Button>
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add bucket settings page (versioning, policy, lifecycle rules)"
```

---

## Task 4: Object Preview Panel

**Files:**
- Create: `src/pages/objects/object-preview.tsx`
- Modify: `src/pages/objects/index.tsx`

- [ ] **Step 1: Create preview component**

Create `src/pages/objects/object-preview.tsx`:

```tsx
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { X, Loader2, FileText, Image } from "lucide-react";

interface ObjectContent {
	content_type: string;
	size: number;
	data: string;
	is_text: boolean;
}

interface ObjectPreviewProps {
	bucket: string;
	objectKey: string;
	onClose: () => void;
}

const MAX_PREVIEW_SIZE = 5 * 1024 * 1024; // 5MB

export function ObjectPreview({ bucket, objectKey, onClose }: ObjectPreviewProps) {
	const [content, setContent] = useState<ObjectContent | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fileName = objectKey.split("/").pop() ?? objectKey;

	useEffect(() => {
		setLoading(true);
		setError(null);
		invoke<ObjectContent>("get_object_content", {
			bucket,
			key: objectKey,
			maxSize: MAX_PREVIEW_SIZE,
		})
			.then(setContent)
			.catch((err) => setError(String(err)))
			.finally(() => setLoading(false));
	}, [bucket, objectKey]);

	const isImage = content?.content_type.startsWith("image/");

	return (
		<div className="flex h-full flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)]">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
				<div className="flex items-center gap-2 overflow-hidden">
					{isImage ? <Image className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
					<span className="truncate text-sm font-medium">{fileName}</span>
				</div>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-4">
				{loading && (
					<div className="flex h-full items-center justify-center">
						<Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-tertiary)]" />
					</div>
				)}

				{error && (
					<div className="rounded-md bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
						{error}
					</div>
				)}

				{content && !loading && !error && (
					<>
						{isImage ? (
							<img
								src={`data:${content.content_type};base64,${content.data}`}
								alt={fileName}
								className="max-w-full rounded-md"
							/>
						) : content.is_text ? (
							<pre className="whitespace-pre-wrap rounded-md bg-[var(--color-bg-secondary)] p-4 font-mono text-xs leading-relaxed">
								{content.data}
							</pre>
						) : (
							<p className="text-sm text-[var(--color-text-secondary)]">
								Binary file ({content.content_type}). Download to view.
							</p>
						)}
					</>
				)}
			</div>

			{/* Footer */}
			{content && (
				<div className="border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-tertiary)]">
					{content.content_type} — {(content.size / 1024).toFixed(1)} KB
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Add search bar component**

Create `src/pages/objects/search-bar.tsx`:

```tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
	onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
	const [query, setQuery] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		onSearch(query);
	}

	function handleClear() {
		setQuery("");
		onSearch("");
	}

	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-2">
			<div className="relative flex-1">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by prefix..."
					className="pl-9 pr-8"
				/>
				{query && (
					<button
						type="button"
						onClick={handleClear}
						className="absolute right-3 top-1/2 -translate-y-1/2"
					>
						<X className="h-3 w-3 text-[var(--color-text-tertiary)]" />
					</button>
				)}
			</div>
			<Button type="submit" size="sm" variant="outline">
				Search
			</Button>
		</form>
	);
}
```

- [ ] **Step 3: Integrate preview and search into objects page**

Modify `src/pages/objects/index.tsx`:

Add imports at the top:

```tsx
import { ObjectPreview } from "./object-preview";
import { SearchBar } from "./search-bar";
```

Add state for preview:

```tsx
const [previewKey, setPreviewKey] = useState<string | null>(null);
```

Add search handler:

```tsx
function handleSearch(query: string) {
    if (query) {
        navigateToPrefix(prefix + query);
    } else {
        // Reload current prefix
        loadObjects();
    }
}
```

Update the `onRowClick` handler — when clicking a non-prefix object, open preview:

```tsx
onRowClick={(obj) => {
    if (obj.is_prefix) {
        navigateToPrefix(obj.key);
    } else {
        setPreviewKey(obj.key);
    }
}}
```

Add the SearchBar after the prefix breadcrumb nav:

```tsx
<SearchBar onSearch={handleSearch} />
```

Wrap the DataTable + Preview in a flex container. Replace the bare `<DataTable>` with:

```tsx
<div className="flex gap-4">
    <div className={previewKey ? "w-1/2" : "w-full"}>
        <DataTable
            columns={columns}
            data={objects}
            onRowClick={(obj) => {
                if (obj.is_prefix) {
                    navigateToPrefix(obj.key);
                } else {
                    setPreviewKey(obj.key);
                }
            }}
        />
    </div>
    {previewKey && (
        <div className="w-1/2">
            <ObjectPreview
                bucket={bucket}
                objectKey={previewKey}
                onClose={() => setPreviewKey(null)}
            />
        </div>
    )}
</div>
```

Remove the old `<DataTable>` call and the old `<UploadDialog>`.

Keep `<UploadDialog>` at the very end of the return (outside the flex container).

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/objects/
git commit -m "feat: add object preview panel and search by prefix"
```

---

## Task 5: Lint and Polish

**Files:**
- Any file needing lint fixes

- [ ] **Step 1: Biome lint**

```bash
npx @biomejs/biome check --write src/
```

- [ ] **Step 2: Rust lint**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo clippy -- -D warnings && cargo fmt
```

- [ ] **Step 3: Tests**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo test
```

- [ ] **Step 4: tsc**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit if changes**

```bash
git add -A
git commit -m "chore: lint fixes and polish for Phase 2b"
```

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Bucket config Rust operations (versioning, policy, lifecycle) |
| 2 | IPC commands + object preview content command |
| 3 | Bucket settings page (versioning toggle, policy editor, lifecycle rules) |
| 4 | Object preview panel + search by prefix |
| 5 | Lint and polish |

**End state:** Bucket settings page with versioning toggle, JSON policy editor, lifecycle rules CRUD. Object browser now has inline preview for images/text/JSON and search by prefix.
