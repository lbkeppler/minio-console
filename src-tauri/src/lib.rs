pub mod commands;
pub mod config;
pub mod mc;
pub mod models;
pub mod s3;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            commands::objects::get_object_content,
            commands::bucket_config::get_bucket_config,
            commands::bucket_config::set_versioning,
            commands::bucket_config::set_bucket_policy,
            commands::bucket_config::delete_bucket_policy,
            commands::bucket_config::get_lifecycle_rules,
            commands::bucket_config::put_lifecycle_rule,
            commands::bucket_config::delete_lifecycle_rule,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
