fn main() {
    // Expose the target triple at compile time for sidecar binary resolution
    println!(
        "cargo:rustc-env=TARGET_TRIPLE={}",
        std::env::var("TARGET").unwrap_or_else(|_| String::from("unknown"))
    );
    tauri_build::build()
}
