fn main() {
    // The exe icon is compiled into a Windows resource; without this, editing the icon alone does not rebuild it.
    println!("cargo:rerun-if-changed=icons/icon.ico");
    tauri_build::build()
}
