use std::fs;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;

fn get_settings_path() -> PathBuf {
    let config_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    config_dir.join("desk-reminder").join("settings.json")
}

#[tauri::command]
fn load_settings() -> String {
    let path = get_settings_path();
    fs::read_to_string(path).unwrap_or_default()
}

#[tauri::command]
fn save_settings(settings: String) -> Result<(), String> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn play_notification_sound() {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let script = "
            $paths = @('C:\\Windows\\Media\\Windows Notify System Generic.wav', 'C:\\Windows\\Media\\Notify.wav', 'C:\\Windows\\Media\\chimes.wav');
            foreach ($path in $paths) {
                if (Test-Path $path) {
                    (New-Object System.Media.SoundPlayer $path).PlaySync();
                    break;
                }
            }
        ";
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", script])
            .spawn();
    }
}

#[tauri::command]
fn show_notification(app: tauri::AppHandle, title: String, body: String) {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .unwrap();
}

#[tauri::command]
fn show_main_window(window: tauri::Window) {
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--silent"])))
        .invoke_handler(tauri::generate_handler![
            load_settings,
            save_settings,
            play_notification_sound,
            show_notification,
            show_main_window,
        ])
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("健康提醒助手")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
