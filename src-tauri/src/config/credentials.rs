use keyring::Entry;

const SERVICE_NAME: &str = "minio-console";

pub fn store_secret(profile_id: &str, secret_key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, profile_id).map_err(|e| e.to_string())?;
    entry.set_password(secret_key).map_err(|e| e.to_string())
}

pub fn get_secret(profile_id: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, profile_id).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

pub fn delete_secret(profile_id: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, profile_id).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
