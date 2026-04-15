# Phase 2a: S3 Client + Buckets + Object Browser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working S3 client, bucket management (list/create/delete), and object browser (navigate/upload/download/delete/presigned URLs) to the MinIO Console desktop app.

**Architecture:** New Rust S3 module wraps `aws-sdk-s3` client, initialized from the active server profile's credentials. Tauri IPC commands expose bucket and object operations to the React frontend. Frontend adds bucket list page and file-browser-style object explorer with drag-and-drop upload.

**Tech Stack:** aws-sdk-s3 (Rust), aws-config, aws-credential-types, Tauri 2 IPC, React 18, TanStack Table, Zustand

---

## File Structure

### Backend (Rust) — new/modified files

| File | Responsibility |
|---|---|
| `src-tauri/src/s3/mod.rs` | Module re-exports |
| `src-tauri/src/s3/client.rs` | S3 client factory: build client from active profile |
| `src-tauri/src/s3/operations.rs` | S3 operations: list/create/delete buckets, list/upload/download/delete objects, presigned URLs |
| `src-tauri/src/commands/buckets.rs` | Tauri IPC commands for bucket operations |
| `src-tauri/src/commands/objects.rs` | Tauri IPC commands for object operations |
| `src-tauri/src/commands/connection.rs` | Fix: use S3 client for connection test instead of HTTP health check |
| `src-tauri/src/commands/mod.rs` | Add new command modules |
| `src-tauri/src/lib.rs` | Register new commands |
| `src-tauri/src/models/types.rs` | Add BucketInfo, ObjectInfo, UploadProgress types |
| `src-tauri/Cargo.toml` | Add aws-sdk-s3, aws-config, aws-credential-types |

### Frontend (React) — new/modified files

| File | Responsibility |
|---|---|
| `src/stores/bucket-store.ts` | Zustand store for bucket list + CRUD |
| `src/stores/object-store.ts` | Zustand store for object list + operations |
| `src/pages/buckets/index.tsx` | Bucket list page with create/delete |
| `src/pages/buckets/create-bucket-dialog.tsx` | Create bucket form dialog |
| `src/pages/objects/index.tsx` | Object browser with prefix navigation |
| `src/pages/objects/upload-dialog.tsx` | Upload dialog with file picker + drag-and-drop |
| `src/pages/objects/object-actions.tsx` | Object row actions (download, delete, presigned URL) |
| `src/components/ui/data-table.tsx` | Reusable data table component (TanStack Table) |
| `src/components/ui/progress.tsx` | Progress bar component for uploads |

---

## Task 1: Add AWS SDK Dependencies and S3 Client Module

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/s3/mod.rs`, `src-tauri/src/s3/client.rs`

- [ ] **Step 1: Add AWS SDK dependencies to Cargo.toml**

Add under `[dependencies]` in `src-tauri/Cargo.toml`:

```toml
aws-sdk-s3 = "1"
aws-config = { version = "1", features = ["behavior-version-latest"] }
aws-credential-types = { version = "1", features = ["hardcoded-credentials"] }
aws-smithy-types = "1"
```

- [ ] **Step 2: Create S3 client factory**

Create `src-tauri/src/s3/client.rs`:

```rust
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
    let endpoint = if profile.endpoint.starts_with("http://")
        || profile.endpoint.starts_with("https://")
    {
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
```

Create `src-tauri/src/s3/mod.rs`:

```rust
pub mod client;
pub mod operations;
```

Note: `operations.rs` will be created in Task 2. For now, create a placeholder:

Create `src-tauri/src/s3/operations.rs`:

```rust
// S3 operations will be added in subsequent tasks
```

- [ ] **Step 3: Wire up s3 module in lib.rs**

Add `pub mod s3;` to `src-tauri/src/lib.rs` with the other module declarations.

- [ ] **Step 4: Verify compilation**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check
```

Expected: passes (first run will download AWS SDK crates, may take a minute).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/s3/ src-tauri/src/lib.rs
git commit -m "feat: add AWS SDK S3 client module with profile-based auth"
```

---

## Task 2: Fix Connection Test + Add S3 Types

**Files:**
- Modify: `src-tauri/src/commands/connection.rs`
- Modify: `src-tauri/src/models/types.rs`

- [ ] **Step 1: Add S3-related types to models/types.rs**

Add after the existing types in `src-tauri/src/models/types.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketInfo {
    pub name: String,
    pub creation_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectInfo {
    pub key: String,
    pub size: i64,
    pub last_modified: Option<String>,
    pub is_prefix: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresignedUrlResult {
    pub url: String,
    pub expires_in_secs: u64,
}
```

- [ ] **Step 2: Add tests for new types**

Add to the `#[cfg(test)] mod tests` block in `src-tauri/src/models/types.rs`:

```rust
    #[test]
    fn test_bucket_info_serialization() {
        let bucket = BucketInfo {
            name: "my-bucket".to_string(),
            creation_date: Some("2024-01-01T00:00:00Z".to_string()),
        };
        let json = serde_json::to_string(&bucket).unwrap();
        let deserialized: BucketInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "my-bucket");
    }

    #[test]
    fn test_object_info_serialization() {
        let obj = ObjectInfo {
            key: "photos/cat.jpg".to_string(),
            size: 1024,
            last_modified: Some("2024-06-15T12:00:00Z".to_string()),
            is_prefix: false,
        };
        let json = serde_json::to_string(&obj).unwrap();
        let deserialized: ObjectInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.key, "photos/cat.jpg");
        assert!(!deserialized.is_prefix);
    }
```

- [ ] **Step 3: Run tests**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo test
```

Expected: 5 tests pass (3 existing + 2 new).

- [ ] **Step 4: Fix connection test to use S3 list_buckets**

Replace `src-tauri/src/commands/connection.rs`:

```rust
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
```

- [ ] **Step 5: Verify compilation**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check
```

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/connection.rs src-tauri/src/models/types.rs
git commit -m "fix: use S3 list_buckets for connection test, add BucketInfo/ObjectInfo types"
```

---

## Task 3: S3 Bucket Operations (Rust)

**Files:**
- Modify: `src-tauri/src/s3/operations.rs`
- Create: `src-tauri/src/commands/buckets.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Implement bucket operations**

Replace `src-tauri/src/s3/operations.rs`:

```rust
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

    // Common prefixes (folders)
    if let Some(prefixes) = output.common_prefixes() {
        for p in prefixes {
            if let Some(prefix_str) = p.prefix() {
                result.push(ObjectInfo {
                    key: prefix_str.to_string(),
                    size: 0,
                    last_modified: None,
                    is_prefix: true,
                });
            }
        }
    }

    // Objects
    for obj in output.contents() {
        let key = obj.key().unwrap_or_default().to_string();
        // Skip the prefix itself if it appears as an object
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
```

- [ ] **Step 2: Create bucket IPC commands**

Create `src-tauri/src/commands/buckets.rs`:

```rust
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
```

- [ ] **Step 3: Create object IPC commands**

Create `src-tauri/src/commands/objects.rs`:

```rust
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
```

- [ ] **Step 4: Update commands/mod.rs**

Replace `src-tauri/src/commands/mod.rs`:

```rust
pub mod buckets;
pub mod connection;
pub mod objects;
pub mod profiles;
```

- [ ] **Step 5: Register new commands in lib.rs**

Update the `invoke_handler` in `src-tauri/src/lib.rs` to add:

```rust
        .invoke_handler(tauri::generate_handler![
            commands::profiles::get_config,
            commands::profiles::add_profile,
            commands::profiles::update_profile,
            commands::profiles::delete_profile,
            commands::profiles::set_active_profile,
            commands::connection::test_connection,
            commands::buckets::list_buckets,
            commands::buckets::create_bucket,
            commands::buckets::delete_bucket,
            commands::objects::list_objects,
            commands::objects::delete_object,
            commands::objects::delete_objects,
            commands::objects::get_presigned_url,
            commands::objects::upload_object,
            commands::objects::download_object,
        ])
```

- [ ] **Step 6: Verify compilation**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check
```

- [ ] **Step 7: Run tests**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo test
```

Expected: 5 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/
git commit -m "feat: add S3 bucket and object operations with Tauri IPC commands"
```

---

## Task 4: DataTable and Progress UI Components

**Files:**
- Create: `src/components/ui/data-table.tsx`
- Create: `src/components/ui/progress.tsx`

- [ ] **Step 1: Install TanStack Table**

```bash
npm install @tanstack/react-table
```

- [ ] **Step 2: Create reusable DataTable component**

Create `src/components/ui/data-table.tsx`:

```tsx
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	onRowClick,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
	});

	return (
		<div className="rounded-md border border-[var(--color-border)]">
			<table className="w-full text-sm">
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id} className="border-b border-[var(--color-border)]">
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]"
								>
									{header.isPlaceholder ? null : (
										<button
											type="button"
											className={cn(
												"flex items-center gap-1",
												header.column.getCanSort() && "cursor-pointer select-none",
											)}
											onClick={header.column.getToggleSortingHandler()}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
											{header.column.getCanSort() &&
												(header.column.getIsSorted() === "asc" ? (
													<ArrowUp className="h-3 w-3" />
												) : header.column.getIsSorted() === "desc" ? (
													<ArrowDown className="h-3 w-3" />
												) : (
													<ArrowUpDown className="h-3 w-3 opacity-30" />
												))}
										</button>
									)}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.length === 0 ? (
						<tr>
							<td
								colSpan={columns.length}
								className="px-4 py-8 text-center text-[var(--color-text-tertiary)]"
							>
								No data
							</td>
						</tr>
					) : (
						table.getRowModel().rows.map((row) => (
							<tr
								key={row.id}
								className={cn(
									"border-b border-[var(--color-border)] last:border-0",
									onRowClick &&
										"cursor-pointer hover:bg-[var(--color-bg-secondary)]",
								)}
								onClick={() => onRowClick?.(row.original)}
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-4 py-3">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
```

- [ ] **Step 3: Create Progress component**

Create `src/components/ui/progress.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface ProgressProps {
	value: number;
	className?: string;
}

export function Progress({ value, className }: ProgressProps) {
	return (
		<div
			className={cn(
				"h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]",
				className,
			)}
		>
			<div
				className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
				style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
			/>
		</div>
	);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/data-table.tsx src/components/ui/progress.tsx package.json package-lock.json
git commit -m "feat: add DataTable and Progress UI components"
```

---

## Task 5: Bucket Store and Bucket List Page

**Files:**
- Create: `src/stores/bucket-store.ts`
- Create: `src/pages/buckets/create-bucket-dialog.tsx`
- Modify: `src/pages/buckets/index.tsx`

- [ ] **Step 1: Create bucket store**

Create `src/stores/bucket-store.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface BucketInfo {
	name: string;
	creation_date: string | null;
}

interface BucketStore {
	buckets: BucketInfo[];
	loading: boolean;
	loadBuckets: () => Promise<void>;
	createBucket: (name: string) => Promise<void>;
	deleteBucket: (name: string) => Promise<void>;
}

export const useBucketStore = create<BucketStore>((set, get) => ({
	buckets: [],
	loading: false,
	loadBuckets: async () => {
		set({ loading: true });
		try {
			const buckets = await invoke<BucketInfo[]>("list_buckets");
			set({ buckets, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	createBucket: async (name) => {
		await invoke("create_bucket", { name });
		await get().loadBuckets();
	},
	deleteBucket: async (name) => {
		await invoke("delete_bucket", { name });
		await get().loadBuckets();
	},
}));
```

- [ ] **Step 2: Create bucket dialog**

Create `src/pages/buckets/create-bucket-dialog.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useBucketStore } from "@/stores/bucket-store";
import { useToastStore } from "@/stores/toast-store";
import { Loader2 } from "lucide-react";

const bucketSchema = z.object({
	name: z
		.string()
		.min(3, "Bucket name must be at least 3 characters")
		.max(63, "Bucket name must be at most 63 characters")
		.regex(
			/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
			"Bucket name must be lowercase, start/end with letter or number",
		),
});

type BucketFormData = z.infer<typeof bucketSchema>;

interface CreateBucketDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateBucketDialog({ open, onOpenChange }: CreateBucketDialogProps) {
	const { createBucket } = useBucketStore();
	const { addToast } = useToastStore();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<BucketFormData>({
		resolver: zodResolver(bucketSchema),
	});

	async function onSubmit(data: BucketFormData) {
		try {
			await createBucket(data.name);
			addToast({ title: `Bucket "${data.name}" created`, variant: "success" });
			reset();
			onOpenChange(false);
		} catch (err) {
			addToast({
				title: "Error creating bucket",
				description: String(err),
				variant: "error",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Bucket</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="bucket-name" className="text-sm font-medium">
							Bucket Name
						</label>
						<Input
							id="bucket-name"
							placeholder="my-bucket"
							{...register("name")}
						/>
						{errors.name && (
							<p className="text-xs text-[var(--color-danger)]">
								{errors.name.message}
							</p>
						)}
						<p className="text-xs text-[var(--color-text-tertiary)]">
							Lowercase letters, numbers, hyphens, and periods. 3-63 characters.
						</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							Create
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 3: Build the Buckets page**

Replace `src/pages/buckets/index.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { useBucketStore, type BucketInfo } from "@/stores/bucket-store";
import { useProfileStore } from "@/stores/profile-store";
import { useToastStore } from "@/stores/toast-store";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { CreateBucketDialog } from "./create-bucket-dialog";
import { Plus, Trash2, Database, Loader2 } from "lucide-react";

const columns: ColumnDef<BucketInfo, string>[] = [
	{
		accessorKey: "name",
		header: "Name",
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<Database className="h-4 w-4 text-[var(--color-accent)]" />
				<span className="font-medium">{row.original.name}</span>
			</div>
		),
	},
	{
		accessorKey: "creation_date",
		header: "Created",
		cell: ({ row }) =>
			row.original.creation_date
				? new Date(row.original.creation_date).toLocaleDateString()
				: "—",
	},
];

export function BucketsPage() {
	const { buckets, loading, loadBuckets, deleteBucket } = useBucketStore();
	const { config } = useProfileStore();
	const { addToast } = useToastStore();
	const navigate = useNavigate();
	const [createOpen, setCreateOpen] = useState(false);

	const hasActiveProfile = !!config?.active_profile_id;

	useEffect(() => {
		if (hasActiveProfile) {
			loadBuckets().catch((err) => {
				addToast({
					title: "Error loading buckets",
					description: String(err),
					variant: "error",
				});
			});
		}
	}, [hasActiveProfile, loadBuckets, addToast]);

	if (!hasActiveProfile) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Buckets</h1>
				<p className="text-[var(--color-text-secondary)]">
					Select a server profile first to view buckets.
				</p>
			</div>
		);
	}

	async function handleDelete(name: string) {
		try {
			await deleteBucket(name);
			addToast({ title: `Bucket "${name}" deleted`, variant: "success" });
		} catch (err) {
			addToast({
				title: "Error deleting bucket",
				description: String(err),
				variant: "error",
			});
		}
	}

	const columnsWithActions: ColumnDef<BucketInfo, string>[] = [
		...columns,
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="icon"
						onClick={(e) => {
							e.stopPropagation();
							handleDelete(row.original.name);
						}}
					>
						<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Buckets</h1>
				<div className="flex items-center gap-2">
					{loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />}
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<Plus className="h-4 w-4" /> Create Bucket
					</Button>
				</div>
			</div>

			<DataTable
				columns={columnsWithActions}
				data={buckets}
				onRowClick={(bucket) => navigate(`/objects?bucket=${bucket.name}`)}
			/>

			<CreateBucketDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/bucket-store.ts src/pages/buckets/
git commit -m "feat: add bucket list page with create and delete"
```

---

## Task 6: Object Store and Object Browser Page

**Files:**
- Create: `src/stores/object-store.ts`
- Create: `src/pages/objects/object-actions.tsx`
- Create: `src/pages/objects/upload-dialog.tsx`
- Modify: `src/pages/objects/index.tsx`

- [ ] **Step 1: Create object store**

Create `src/stores/object-store.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface ObjectInfo {
	key: string;
	size: number;
	last_modified: string | null;
	is_prefix: boolean;
}

export interface PresignedUrlResult {
	url: string;
	expires_in_secs: number;
}

interface ObjectStore {
	objects: ObjectInfo[];
	loading: boolean;
	currentBucket: string;
	currentPrefix: string;
	setBucket: (bucket: string) => void;
	setPrefix: (prefix: string) => void;
	loadObjects: () => Promise<void>;
	deleteObject: (key: string) => Promise<void>;
	deleteObjects: (keys: string[]) => Promise<void>;
	getPresignedUrl: (key: string, expiresInSecs?: number) => Promise<PresignedUrlResult>;
	uploadObject: (key: string, filePath: string) => Promise<void>;
	downloadObject: (key: string, destination: string) => Promise<void>;
}

export const useObjectStore = create<ObjectStore>((set, get) => ({
	objects: [],
	loading: false,
	currentBucket: "",
	currentPrefix: "",
	setBucket: (bucket) => set({ currentBucket: bucket }),
	setPrefix: (prefix) => set({ currentPrefix: prefix }),
	loadObjects: async () => {
		const { currentBucket, currentPrefix } = get();
		if (!currentBucket) return;
		set({ loading: true });
		try {
			const objects = await invoke<ObjectInfo[]>("list_objects", {
				bucket: currentBucket,
				prefix: currentPrefix,
			});
			set({ objects, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	deleteObject: async (key) => {
		const { currentBucket } = get();
		await invoke("delete_object", { bucket: currentBucket, key });
		await get().loadObjects();
	},
	deleteObjects: async (keys) => {
		const { currentBucket } = get();
		await invoke("delete_objects", { bucket: currentBucket, keys });
		await get().loadObjects();
	},
	getPresignedUrl: async (key, expiresInSecs = 3600) => {
		const { currentBucket } = get();
		return invoke<PresignedUrlResult>("get_presigned_url", {
			bucket: currentBucket,
			key,
			expiresInSecs,
		});
	},
	uploadObject: async (key, filePath) => {
		const { currentBucket } = get();
		await invoke("upload_object", {
			bucket: currentBucket,
			key,
			filePath,
		});
		await get().loadObjects();
	},
	downloadObject: async (key, destination) => {
		const { currentBucket } = get();
		await invoke("download_object", {
			bucket: currentBucket,
			key,
			destination,
		});
	},
}));
```

- [ ] **Step 2: Create object actions component**

Create `src/pages/objects/object-actions.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useObjectStore, type ObjectInfo } from "@/stores/object-store";
import { useToastStore } from "@/stores/toast-store";
import { MoreHorizontal, Download, Trash2, Link, Copy } from "lucide-react";

interface ObjectActionsProps {
	object: ObjectInfo;
}

export function ObjectActions({ object }: ObjectActionsProps) {
	const { deleteObject, getPresignedUrl, downloadObject } = useObjectStore();
	const { addToast } = useToastStore();

	async function handleDelete() {
		try {
			await deleteObject(object.key);
			addToast({ title: "Object deleted", variant: "success" });
		} catch (err) {
			addToast({
				title: "Error deleting object",
				description: String(err),
				variant: "error",
			});
		}
	}

	async function handlePresignedUrl() {
		try {
			const result = await getPresignedUrl(object.key);
			await navigator.clipboard.writeText(result.url);
			addToast({
				title: "Presigned URL copied to clipboard",
				description: `Expires in ${result.expires_in_secs / 60} minutes`,
				variant: "success",
			});
		} catch (err) {
			addToast({
				title: "Error generating URL",
				description: String(err),
				variant: "error",
			});
		}
	}

	async function handleDownload() {
		try {
			// Use Tauri save dialog
			const { save } = await import("@tauri-apps/plugin-dialog");
			const fileName = object.key.split("/").pop() ?? object.key;
			const destination = await save({ defaultPath: fileName });
			if (destination) {
				await downloadObject(object.key, destination);
				addToast({ title: "Download complete", variant: "success" });
			}
		} catch (err) {
			addToast({
				title: "Error downloading",
				description: String(err),
				variant: "error",
			});
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handleDownload}>
					<Download className="mr-2 h-4 w-4" /> Download
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handlePresignedUrl}>
					<Link className="mr-2 h-4 w-4" /> Copy Presigned URL
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleDelete} className="text-[var(--color-danger)]">
					<Trash2 className="mr-2 h-4 w-4" /> Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
```

- [ ] **Step 3: Create upload dialog**

Create `src/pages/objects/upload-dialog.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useObjectStore } from "@/stores/object-store";
import { useToastStore } from "@/stores/toast-store";
import { Upload, Loader2 } from "lucide-react";

interface UploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
	const { currentPrefix, uploadObject } = useObjectStore();
	const { addToast } = useToastStore();
	const [uploading, setUploading] = useState(false);

	async function handleSelectFiles() {
		try {
			const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
			const selected = await openDialog({
				multiple: true,
				directory: false,
			});
			if (!selected) return;

			const files = Array.isArray(selected) ? selected : [selected];
			setUploading(true);

			for (const filePath of files) {
				const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
				const key = currentPrefix + fileName;
				await uploadObject(key, filePath);
			}

			addToast({
				title: `${files.length} file(s) uploaded`,
				variant: "success",
			});
			onOpenChange(false);
		} catch (err) {
			addToast({
				title: "Error uploading files",
				description: String(err),
				variant: "error",
			});
		} finally {
			setUploading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Upload Files</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-sm text-[var(--color-text-secondary)]">
						Upload to: <code className="rounded bg-[var(--color-bg-tertiary)] px-1 py-0.5">{currentPrefix || "/"}</code>
					</p>
					<div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] py-8">
						<Upload className="mb-2 h-8 w-8 text-[var(--color-text-tertiary)]" />
						<Button onClick={handleSelectFiles} disabled={uploading}>
							{uploading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Select Files"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 4: Build the Object Browser page**

Replace `src/pages/objects/index.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { useObjectStore, type ObjectInfo } from "@/stores/object-store";
import { useToastStore } from "@/stores/toast-store";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ObjectActions } from "./object-actions";
import { UploadDialog } from "./upload-dialog";
import {
	FolderOpen,
	File,
	Upload,
	ChevronRight,
	Loader2,
} from "lucide-react";

function formatSize(bytes: number): string {
	if (bytes === 0) return "—";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function ObjectsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const bucket = searchParams.get("bucket") ?? "";
	const prefix = searchParams.get("prefix") ?? "";

	const {
		objects,
		loading,
		currentBucket,
		setBucket,
		setPrefix,
		loadObjects,
	} = useObjectStore();
	const { addToast } = useToastStore();
	const [uploadOpen, setUploadOpen] = useState(false);

	useEffect(() => {
		if (bucket) {
			setBucket(bucket);
			setPrefix(prefix);
		}
	}, [bucket, prefix, setBucket, setPrefix]);

	useEffect(() => {
		if (currentBucket) {
			loadObjects().catch((err) => {
				addToast({
					title: "Error loading objects",
					description: String(err),
					variant: "error",
				});
			});
		}
	}, [currentBucket, loadObjects, addToast]);

	function navigateToPrefix(newPrefix: string) {
		setSearchParams({ bucket, prefix: newPrefix });
	}

	if (!bucket) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Objects</h1>
				<p className="text-[var(--color-text-secondary)]">
					Select a bucket from the Buckets page to browse objects.
				</p>
			</div>
		);
	}

	// Build breadcrumb segments from prefix
	const prefixParts = prefix.split("/").filter(Boolean);
	const breadcrumbs = prefixParts.map((part, i) => ({
		label: part,
		prefix: prefixParts.slice(0, i + 1).join("/") + "/",
	}));

	const columns: ColumnDef<ObjectInfo, string>[] = [
		{
			accessorKey: "key",
			header: "Name",
			cell: ({ row }) => {
				const obj = row.original;
				const displayName = obj.is_prefix
					? obj.key.replace(prefix, "").replace(/\/$/, "")
					: obj.key.replace(prefix, "");
				return (
					<div className="flex items-center gap-2">
						{obj.is_prefix ? (
							<FolderOpen className="h-4 w-4 text-[var(--color-warning)]" />
						) : (
							<File className="h-4 w-4 text-[var(--color-text-tertiary)]" />
						)}
						<span className={obj.is_prefix ? "font-medium" : ""}>
							{displayName}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "size",
			header: "Size",
			cell: ({ row }) => formatSize(row.original.size),
		},
		{
			accessorKey: "last_modified",
			header: "Last Modified",
			cell: ({ row }) =>
				row.original.last_modified
					? new Date(row.original.last_modified).toLocaleString()
					: "—",
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				row.original.is_prefix ? null : <ObjectActions object={row.original} />,
		},
	];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{bucket}</h1>
				<div className="flex items-center gap-2">
					{loading && (
						<Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-secondary)]" />
					)}
					<Button onClick={() => setUploadOpen(true)} size="sm">
						<Upload className="h-4 w-4" /> Upload
					</Button>
				</div>
			</div>

			{/* Prefix breadcrumb */}
			<nav className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
				<button
					type="button"
					onClick={() => navigateToPrefix("")}
					className="hover:text-[var(--color-text)]"
				>
					/
				</button>
				{breadcrumbs.map((crumb) => (
					<span key={crumb.prefix} className="flex items-center gap-1">
						<ChevronRight className="h-3 w-3" />
						<button
							type="button"
							onClick={() => navigateToPrefix(crumb.prefix)}
							className="hover:text-[var(--color-text)]"
						>
							{crumb.label}
						</button>
					</span>
				))}
			</nav>

			<DataTable
				columns={columns}
				data={objects}
				onRowClick={(obj) => {
					if (obj.is_prefix) {
						navigateToPrefix(obj.key);
					}
				}}
			/>

			<UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
		</div>
	);
}
```

- [ ] **Step 5: Install Tauri dialog plugin**

The upload/download dialogs use `@tauri-apps/plugin-dialog`. Add to frontend and Rust:

```bash
npm install @tauri-apps/plugin-dialog
```

Add to `src-tauri/Cargo.toml` dependencies:

```toml
tauri-plugin-dialog = "2"
```

Register in `src-tauri/src/lib.rs`:

```rust
.plugin(tauri_plugin_dialog::init())
```

(Add after the existing `.plugin(tauri_plugin_opener::init())` line.)

Also add the dialog permission to `src-tauri/capabilities/default.json`. If the file doesn't exist, check `src-tauri/capabilities/` for whatever capability file exists and add `"dialog:default"` to the permissions array.

- [ ] **Step 6: Verify compilation (both TypeScript and Rust)**

```bash
npx tsc --noEmit
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo check
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add object browser with upload, download, delete, and presigned URLs"
```

---

## Task 7: Lint and Integration Polish

**Files:**
- Potentially any file that needs lint fixes

- [ ] **Step 1: Run Biome lint**

```bash
npx @biomejs/biome check --write src/
```

- [ ] **Step 2: Run Rust lint**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo clippy -- -D warnings && cargo fmt
```

- [ ] **Step 3: Run tests**

```bash
export PATH="/c/Users/lkr2/.cargo/bin:$PATH"
cd src-tauri && cargo test
```

Expected: 5 tests pass.

- [ ] **Step 4: Commit if any changes**

```bash
git add -A
git commit -m "chore: lint fixes and polish for Phase 2a"
```

---

## Summary

| Task | What it builds | Commits |
|---|---|---|
| 1 | AWS SDK deps + S3 client factory | 1 |
| 2 | Fix connection test + S3 types | 1 |
| 3 | S3 bucket/object operations + IPC commands | 1 |
| 4 | DataTable + Progress UI components | 1 |
| 5 | Bucket store + bucket list page | 1 |
| 6 | Object store + object browser page + upload/download | 1 |
| 7 | Lint and integration polish | 1 |

**End state:** Working bucket management (list/create/delete) and object browser (navigate by prefix, upload via file picker, download via save dialog, delete, copy presigned URL). Clicking a bucket navigates to its objects. Connection test fixed to use S3 API.
