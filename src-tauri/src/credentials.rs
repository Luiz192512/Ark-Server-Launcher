use keyring::Entry;

const SERVICE: &str = "enz-launcher";
const ADMIN_USER: &str = "server-admin";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ADMIN_USER).map_err(|e| e.to_string())
}

/// Stores the admin password in the Windows Credential Manager.
pub fn save_admin_password(password: &str) -> Result<(), String> {
    entry()?.set_password(password).map_err(|e| e.to_string())
}

pub fn has_admin_password() -> bool {
    entry()
        .and_then(|e| e.get_password().map_err(|e| e.to_string()))
        .is_ok()
}
