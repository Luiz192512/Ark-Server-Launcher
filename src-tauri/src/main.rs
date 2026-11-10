// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Some(code) = enz_launcher_lib::cli::try_run(std::env::args().skip(1).collect()) {
        std::process::exit(code);
    }
    enz_launcher_lib::run()
}
