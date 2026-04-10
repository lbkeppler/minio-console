# Third-Party Licenses

This application includes or depends on the following third-party software:

---

## MinIO Client (mc)

- **Project:** MinIO Client (mc)
- **Repository:** https://github.com/minio/mc
- **License:** GNU Affero General Public License v3.0 (AGPL-3.0)
- **Copyright:** Copyright (C) 2015-2026 MinIO, Inc.
- **Usage:** This application uses the MinIO Client (`mc`) binary for administrative operations (user management, group management, policy management, server monitoring). The `mc` binary may be bundled with production builds or discovered from the system PATH at runtime.
- **Full License:** https://github.com/minio/mc/blob/master/LICENSE

---

## MinIO Server

- **Project:** MinIO Object Storage
- **Repository:** https://github.com/minio/minio
- **License:** GNU Affero General Public License v3.0 (AGPL-3.0)
- **Copyright:** Copyright (C) 2015-2026 MinIO, Inc.
- **Usage:** This application connects to MinIO servers via the S3-compatible API. MinIO server is not bundled — it must be deployed separately by the user.
- **Full License:** https://github.com/minio/minio/blob/master/LICENSE

---

## Tauri

- **Project:** Tauri
- **Repository:** https://github.com/tauri-apps/tauri
- **License:** Apache License 2.0 / MIT License
- **Copyright:** Copyright (C) 2019-2026 Tauri Contributors
- **Full License:** https://github.com/tauri-apps/tauri/blob/dev/LICENSE_APACHE-2.0

---

## AWS SDK for Rust

- **Project:** AWS SDK for Rust
- **Repository:** https://github.com/awslabs/aws-sdk-rust
- **License:** Apache License 2.0
- **Copyright:** Copyright Amazon.com, Inc. or its affiliates
- **Usage:** Used for S3-compatible API operations (bucket and object management).
- **Full License:** https://github.com/awslabs/aws-sdk-rust/blob/main/LICENSE

---

## React

- **Project:** React
- **Repository:** https://github.com/facebook/react
- **License:** MIT License
- **Copyright:** Copyright (c) Meta Platforms, Inc. and affiliates
- **Full License:** https://github.com/facebook/react/blob/main/LICENSE

---

## Radix UI

- **Project:** Radix UI Primitives
- **Repository:** https://github.com/radix-ui/primitives
- **License:** MIT License
- **Copyright:** Copyright (c) 2022 WorkOS
- **Full License:** https://github.com/radix-ui/primitives/blob/main/LICENSE

---

## Tailwind CSS

- **Project:** Tailwind CSS
- **Repository:** https://github.com/tailwindlabs/tailwindcss
- **License:** MIT License
- **Copyright:** Copyright (c) Tailwind Labs, Inc.
- **Full License:** https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE

---

## Lucide Icons

- **Project:** Lucide Icons
- **Repository:** https://github.com/lucide-icons/lucide
- **License:** ISC License
- **Copyright:** Copyright (c) 2020 Lucide Contributors
- **Full License:** https://github.com/lucide-icons/lucide/blob/main/LICENSE

---

## TanStack Table

- **Project:** TanStack Table
- **Repository:** https://github.com/TanStack/table
- **License:** MIT License
- **Copyright:** Copyright (c) 2016 Tanner Linsley
- **Full License:** https://github.com/TanStack/table/blob/main/LICENSE

---

For a complete list of all transitive dependencies and their licenses, run:
- **Frontend:** `npx license-checker --summary`
- **Backend:** `cargo license`
