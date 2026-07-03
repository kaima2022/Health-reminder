use chrono::{Local, Timelike};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::BufReader;
use std::path::PathBuf;
#[cfg(target_os = "windows")]
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_notification::NotificationExt;
use url::form_urlencoded;

// ============= 跨平台空闲检测 =============

/// 获取系统空闲时间（秒）
/// Windows: 使用 GetLastInputInfo
/// macOS: 使用 CGEventSourceSecondsSinceLastEventType
/// Linux: 使用 X11 screensaver extension
fn get_idle_seconds() -> u64 {
    #[cfg(target_os = "windows")]
    {
        get_idle_seconds_windows()
    }

    #[cfg(target_os = "macos")]
    {
        get_idle_seconds_macos()
    }

    #[cfg(target_os = "linux")]
    {
        get_idle_seconds_linux()
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        0 // 不支持的平台返回 0
    }
}

#[cfg(target_os = "windows")]
fn get_idle_seconds_windows() -> u64 {
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    unsafe {
        let mut lii = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };

        if GetLastInputInfo(&mut lii).as_bool() {
            let current_tick = GetTickCount();
            let idle_ms = current_tick.wrapping_sub(lii.dwTime);
            (idle_ms / 1000) as u64
        } else {
            0
        }
    }
}

#[cfg(target_os = "macos")]
fn get_idle_seconds_macos() -> u64 {
    use std::process::Command;

    // 使用 ioreg 命令获取空闲时间（更可靠的方式）
    let output = Command::new("ioreg").args(["-c", "IOHIDSystem"]).output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        // 查找 HIDIdleTime 字段
        for line in stdout.lines() {
            if line.contains("HIDIdleTime") {
                // 格式: "HIDIdleTime" = 1234567890
                if let Some(value) = line.split('=').nth(1) {
                    if let Ok(ns) = value.trim().parse::<u64>() {
                        return ns / 1_000_000_000; // 纳秒转秒
                    }
                }
            }
        }
    }
    0
}

#[cfg(target_os = "linux")]
fn get_idle_seconds_linux() -> u64 {
    use std::ptr;
    use x11::xlib::{XCloseDisplay, XDefaultRootWindow, XOpenDisplay};
    use x11::xss::{XScreenSaverAllocInfo, XScreenSaverQueryInfo};

    unsafe {
        let display = XOpenDisplay(ptr::null());
        if display.is_null() {
            return 0;
        }

        let info = XScreenSaverAllocInfo();
        if info.is_null() {
            XCloseDisplay(display);
            return 0;
        }

        let root = XDefaultRootWindow(display);
        let result = XScreenSaverQueryInfo(display, root, info);

        let idle_ms = if result != 0 { (*info).idle } else { 0 };

        x11::xlib::XFree(info as *mut _);
        XCloseDisplay(display);

        (idle_ms / 1000) as u64
    }
}

struct TrayState(Mutex<Option<TrayIcon>>);
struct FloatingState(Mutex<bool>);

#[derive(Clone, serde::Deserialize, serde::Serialize, Debug)]
struct FloatingRevealRect {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

#[derive(Clone, serde::Deserialize, serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct FloatingRevealWatch {
    edge: String,
    restore: FloatingRevealRect,
    monitor: FloatingRevealRect,
    reveal_band: i32,
}

struct FloatingRevealInner {
    generation: u64,
    watch: Option<FloatingRevealWatch>,
}

struct FloatingRevealState(Arc<Mutex<FloatingRevealInner>>);

struct LockStateInner {
    windows: Vec<String>,
    args: Option<LockTaskArgs>,
}
struct LockState(Mutex<LockStateInner>);

struct PauseMenuState(Mutex<Option<MenuItem<tauri::Wry>>>);

// 语言状态管理
struct LanguageState(Mutex<String>);

// 多语言文本
fn get_tray_text(key: &str, lang: &str) -> &'static str {
    match (key, lang) {
        ("quit", "en-US") => "Quit",
        ("quit", _) => "退出",
        ("show", "en-US") => "Show Main Window",
        ("show", _) => "显示主窗口",
        ("reset", "en-US") => "Reset All Tasks",
        ("reset", _) => "重置所有任务",
        ("pause", "en-US") => "Pause",
        ("pause", _) => "暂停",
        ("resume", "en-US") => "Resume",
        ("resume", _) => "继续",
        ("tooltip", "en-US") => "Health Reminder",
        ("tooltip", _) => "健康提醒助手",
        ("reset_submenu", "en-US") => "Reset Single Task",
        ("reset_submenu", _) => "重置单个任务",
        ("reset_prefix", "en-US") => "Reset: ",
        ("reset_prefix", _) => "重置: ",
        ("floating", "en-US") => "Toggle Floating Window",
        ("floating", _) => "显示/隐藏悬浮窗",
        // 默认任务标题翻译
        ("task_sit", "en-US") => "Stand Up Reminder",
        ("task_sit", _) => "久坐提醒",
        ("task_water", "en-US") => "Drink Water Reminder",
        ("task_water", _) => "喝水提醒",
        ("task_eye", "en-US") => "Eye Rest Reminder",
        ("task_eye", _) => "护眼提醒",
        _ => "",
    }
}

// 获取任务显示标题（默认任务使用翻译，自定义任务使用原标题）
fn get_task_display_title<'a>(
    task_id: &str,
    original_title: &'a str,
    lang: &str,
) -> std::borrow::Cow<'a, str> {
    match task_id {
        "sit" => std::borrow::Cow::Borrowed(get_tray_text("task_sit", lang)),
        "water" => std::borrow::Cow::Borrowed(get_tray_text("task_water", lang)),
        "eye" => std::borrow::Cow::Borrowed(get_tray_text("task_eye", lang)),
        _ => std::borrow::Cow::Borrowed(original_title),
    }
}

// ============= 后端定时器系统 =============

fn default_schedule_type() -> String {
    "interval".to_string()
}

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
pub struct TaskConfig {
    pub id: String,
    pub title: String,
    pub desc: String,
    pub interval: u64, // 分钟
    pub enabled: bool,
    pub icon: String,
    #[serde(default)]
    pub auto_reset_on_idle: bool, // 空闲时自动重置
    #[serde(default = "default_schedule_type")]
    pub schedule_type: String,
    #[serde(default)]
    pub daily_times: Vec<String>,
}

#[derive(Clone, Debug)]
struct TaskTimer {
    config: TaskConfig,
    reset_time: Instant,
    triggered: bool,              // 本轮是否已触发
    disabled_at: Option<Instant>, // 禁用时的时间点，用于计算暂停时长
    snoozed: bool,                // 是否处于推迟状态
    snooze_count: u32,            // 当前已推迟次数
    daily_last_trigger_key: Option<String>,
    frozen_remaining: Option<u64>,
    frozen_total: Option<u64>,
}

struct TimerState {
    tasks: HashMap<String, TaskTimer>,
    pending_triggers: Vec<TaskTriggeredPayload>,
    paused: bool,
    pause_start: Option<Instant>,
    system_locked: bool,
    lock_screen_active: bool,
    lock_screen_start: Option<Instant>, // 锁屏开始时间，用于补偿
    // 空闲检测相关
    idle_threshold_seconds: u64, // 空闲阈值（秒），默认 300 秒 = 5 分钟
    is_idle: bool,               // 当前是否处于空闲状态
    idle_start: Option<Instant>, // 进入空闲状态的时间点
    idle_start_timestamp: Option<i64>, // Unix 时间戳（毫秒）
}

impl TimerState {
    fn new() -> Self {
        Self {
            tasks: HashMap::new(),
            pending_triggers: Vec::new(),
            paused: false,
            pause_start: None,
            system_locked: false,
            lock_screen_active: false,
            lock_screen_start: None,
            idle_threshold_seconds: 300, // 默认 5 分钟
            is_idle: false,
            idle_start: None,
            idle_start_timestamp: None,
        }
    }
}

static TIMER_STATE: std::sync::OnceLock<Mutex<TimerState>> = std::sync::OnceLock::new();

fn get_timer_state() -> &'static Mutex<TimerState> {
    TIMER_STATE.get_or_init(|| Mutex::new(TimerState::new()))
}

fn is_daily_task(task: &TaskConfig) -> bool {
    task.schedule_type == "daily" && !task.daily_times.is_empty()
}

fn parse_daily_time(value: &str) -> Option<(u32, u32)> {
    let trimmed = value.trim();
    let mut parts = trimmed.split(':');
    let hour = parts.next()?.parse::<u32>().ok()?;
    let minute = parts.next()?.parse::<u32>().ok()?;
    if parts.next().is_some() || hour > 23 || minute > 59 {
        return None;
    }
    Some((hour, minute))
}

fn current_daily_trigger_key(task: &TaskConfig) -> Option<String> {
    if !is_daily_task(task) {
        return None;
    }

    let now = Local::now();
    for value in &task.daily_times {
        if let Some((hour, minute)) = parse_daily_time(value) {
            if now.hour() == hour && now.minute() == minute {
                return Some(format!(
                    "{}:{:02}:{:02}",
                    now.format("%Y-%m-%d"),
                    hour,
                    minute
                ));
            }
        }
    }
    None
}

fn daily_remaining_seconds(task: &TaskConfig) -> u64 {
    let now = Local::now();
    let now_secs = now.hour() * 3600 + now.minute() * 60 + now.second();
    let mut best: Option<u32> = None;

    for value in &task.daily_times {
        if let Some((hour, minute)) = parse_daily_time(value) {
            let target_secs = hour * 3600 + minute * 60;
            let remaining = if target_secs >= now_secs {
                target_secs - now_secs
            } else {
                24 * 3600 - now_secs + target_secs
            };
            best = Some(best.map_or(remaining, |current| current.min(remaining)));
        }
    }

    best.unwrap_or(task.interval.saturating_mul(60) as u32) as u64
}

fn calculate_timer_countdown(
    timer: &TaskTimer,
    effective_now: Instant,
    live_daily: bool,
) -> (u64, u64, u64) {
    let is_daily = is_daily_task(&timer.config);
    let mut total_secs = if is_daily {
        24 * 60 * 60
    } else {
        timer.config.interval * 60
    };

    let remaining = if timer.snoozed {
        total_secs = timer
            .reset_time
            .checked_duration_since(effective_now)
            .map(|duration| duration.as_secs().max(1))
            .unwrap_or(1);
        timer
            .reset_time
            .checked_duration_since(effective_now)
            .map(|duration| duration.as_secs())
            .unwrap_or(0)
    } else if is_daily {
        if live_daily {
            daily_remaining_seconds(&timer.config)
        } else {
            timer
                .reset_time
                .checked_duration_since(effective_now)
                .map(|duration| duration.as_secs())
                .unwrap_or(0)
        }
    } else if timer.reset_time > effective_now {
        let wait_time = timer.reset_time.duration_since(effective_now).as_secs();
        total_secs + wait_time
    } else {
        let elapsed = effective_now
            .saturating_duration_since(timer.reset_time)
            .as_secs();
        if elapsed >= total_secs {
            0
        } else {
            total_secs - elapsed
        }
    };

    let snooze_remaining = if timer.reset_time > effective_now {
        timer.reset_time.duration_since(effective_now).as_secs()
    } else {
        0
    };

    (remaining, total_secs, snooze_remaining)
}

fn freeze_timer_countdown(timer: &mut TaskTimer, now: Instant) {
    if !timer.config.enabled {
        return;
    }

    if timer.disabled_at.is_none() && !timer.snoozed && is_daily_task(&timer.config) {
        timer.reset_time = now + Duration::from_secs(daily_remaining_seconds(&timer.config));
    }

    let effective_now = timer.disabled_at.unwrap_or(now);
    let (remaining, total, _) = calculate_timer_countdown(timer, effective_now, false);
    timer.frozen_remaining = Some(remaining);
    timer.frozen_total = Some(total);
}

fn clear_timer_freeze(timer: &mut TaskTimer) {
    timer.frozen_remaining = None;
    timer.frozen_total = None;
}

fn freeze_active_timers(state: &mut TimerState, now: Instant) {
    for timer in state.tasks.values_mut() {
        freeze_timer_countdown(timer, now);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn interval_timer(interval: u64, reset_time: Instant) -> TaskTimer {
        TaskTimer {
            config: TaskConfig {
                id: "sit".to_string(),
                title: "Stand Up".to_string(),
                desc: String::new(),
                interval,
                enabled: true,
                icon: "clock".to_string(),
                auto_reset_on_idle: true,
                schedule_type: "interval".to_string(),
                daily_times: Vec::new(),
            },
            reset_time,
            triggered: false,
            disabled_at: None,
            snoozed: false,
            snooze_count: 0,
            daily_last_trigger_key: None,
            frozen_remaining: None,
            frozen_total: None,
        }
    }

    #[test]
    fn frozen_interval_remaining_does_not_drift() {
        let now = Instant::now();
        let mut timer = interval_timer(45, now - Duration::from_secs(60));

        freeze_timer_countdown(&mut timer, now);
        timer.disabled_at = Some(now);

        let frozen_remaining = timer.frozen_remaining.unwrap();
        let later = now + Duration::from_secs(300);
        let reported_remaining = timer.frozen_remaining.unwrap_or_else(|| {
            calculate_timer_countdown(&timer, later, false).0
        });

        assert_eq!(frozen_remaining, 44 * 60);
        assert_eq!(reported_remaining, frozen_remaining);
    }

    #[test]
    fn idle_reset_freezes_full_interval() {
        let now = Instant::now();
        let mut timer = interval_timer(45, now);

        freeze_timer_countdown(&mut timer, now);

        assert_eq!(timer.frozen_remaining, Some(45 * 60));
        assert_eq!(timer.frozen_total, Some(45 * 60));
    }
}

#[cfg(target_os = "windows")]
static SYSTEM_LOCKED: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "windows")]
fn start_session_monitor(app_handle: tauri::AppHandle) {
    use windows::core::{w, PCWSTR};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::RemoteDesktop::{
        WTSRegisterSessionNotification, NOTIFY_FOR_THIS_SESSION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DispatchMessageW, GetMessageW, RegisterClassW, TranslateMessage,
        CS_HREDRAW, CS_VREDRAW, MSG, WINDOW_EX_STYLE, WM_WTSSESSION_CHANGE, WNDCLASSW,
        WS_OVERLAPPED,
    };

    const WTS_SESSION_LOCK: u32 = 0x7;
    const WTS_SESSION_UNLOCK: u32 = 0x8;

    std::thread::spawn(move || unsafe {
        let class_name = w!("DeskReminderSessionMonitor");

        let wc = WNDCLASSW {
            style: CS_HREDRAW | CS_VREDRAW,
            lpfnWndProc: Some(session_wnd_proc),
            hInstance: std::mem::zeroed(),
            lpszClassName: class_name,
            ..std::mem::zeroed()
        };

        RegisterClassW(&wc);

        let hwnd = CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            class_name,
            PCWSTR::null(),
            WS_OVERLAPPED,
            0,
            0,
            0,
            0,
            HWND::default(),
            None,
            None,
            None,
        )
        .unwrap_or(HWND::default());

        if hwnd.0 != std::ptr::null_mut() {
            let _ = WTSRegisterSessionNotification(hwnd, NOTIFY_FOR_THIS_SESSION);

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, HWND::default(), 0, 0).as_bool() {
                if msg.message == WM_WTSSESSION_CHANGE {
                    let wparam = msg.wParam.0 as u32;
                    if wparam == WTS_SESSION_LOCK {
                        SYSTEM_LOCKED.store(true, Ordering::SeqCst);
                        let _ = app_handle.emit("system-locked", ());
                    } else if wparam == WTS_SESSION_UNLOCK {
                        SYSTEM_LOCKED.store(false, Ordering::SeqCst);
                        let _ = app_handle.emit("system-unlocked", ());
                    }
                }
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
    });
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn session_wnd_proc(
    hwnd: windows::Win32::Foundation::HWND,
    msg: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::UI::WindowsAndMessaging::DefWindowProcW;
    DefWindowProcW(hwnd, msg, wparam, lparam)
}

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
struct LockTaskArgs {
    title: String,
    desc: String,
    duration: i32,
    icon: String,
    // Slave context
    strict_mode: bool,
    allow_strict_snooze: bool,
    max_snooze_count: u32,
    snooze_minutes: u32,
    current_snooze_count: u32,
    #[serde(default)]
    bg_image: String,
}

// ============= 定时器命令 =============

#[derive(Clone, serde::Serialize)]
struct CountdownInfo {
    id: String,
    remaining: u64, // 剩余秒数
    total: u64,     // 总秒数
    enabled: bool,
    task_paused: bool,
    snoozed: bool,         // 是否推迟中
    snooze_remaining: u64, // 推迟剩余时间
    snooze_count: u32,     // 当前已推迟次数
}

#[derive(Clone, serde::Serialize)]
struct TaskTriggeredPayload {
    id: String,
    title: String,
    desc: String,
    icon: String,
}

fn rebuild_tray_menu(app: &AppHandle) {
    let state = get_timer_state().lock().unwrap();
    let is_paused = state.paused;
    let mut tasks: Vec<TaskConfig> = state.tasks.values().map(|t| t.config.clone()).collect();
    tasks.sort_by(|a, b| a.id.cmp(&b.id));
    drop(state);

    // 获取当前语言
    let lang = app.state::<LanguageState>().0.lock().unwrap().clone();

    let quit = MenuItem::with_id(
        app,
        "quit",
        get_tray_text("quit", &lang),
        true,
        None::<&str>,
    )
    .unwrap();
    let show = MenuItem::with_id(
        app,
        "show",
        get_tray_text("show", &lang),
        true,
        None::<&str>,
    )
    .unwrap();
    let reset_all = MenuItem::with_id(
        app,
        "reset",
        get_tray_text("reset", &lang),
        true,
        None::<&str>,
    )
    .unwrap();
    let floating = MenuItem::with_id(
        app,
        "floating",
        get_tray_text("floating", &lang),
        true,
        None::<&str>,
    )
    .unwrap();
    let pause_text = if is_paused {
        get_tray_text("resume", &lang)
    } else {
        get_tray_text("pause", &lang)
    };
    let pause = MenuItem::with_id(app, "pause", pause_text, true, None::<&str>).unwrap();

    let reset_prefix = get_tray_text("reset_prefix", &lang);
    let mut reset_items = Vec::new();
    for task in tasks {
        let id = format!("reset_task_{}", task.id);
        let display_title = get_task_display_title(&task.id, &task.title, &lang);
        let title = format!("{}{}", reset_prefix, display_title);
        let item = MenuItem::with_id(app, &id, &title, true, None::<&str>).unwrap();
        reset_items.push(item);
    }

    let reset_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = reset_items
        .iter()
        .map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>)
        .collect();
    let reset_submenu = Submenu::with_items(
        app,
        get_tray_text("reset_submenu", &lang),
        true,
        &reset_refs,
    )
    .unwrap();

    let menu = Menu::with_items(
        app,
        &[&show, &floating, &pause, &reset_all, &reset_submenu, &quit],
    )
    .unwrap();

    let tray_state = app.state::<TrayState>();
    let guard = tray_state.0.lock().unwrap();
    if let Some(tray) = guard.as_ref() {
        let _ = tray.set_menu(Some(menu));
    }

    let pause_state = app.state::<PauseMenuState>();
    *pause_state.0.lock().unwrap() = Some(pause);
}

#[tauri::command]
fn sync_tasks(app: tauri::AppHandle, tasks: Vec<TaskConfig>) {
    {
        let mut state = get_timer_state().lock().unwrap();
        let now = Instant::now();
        let should_freeze_new_state =
            state.paused || state.system_locked || state.lock_screen_active || state.is_idle;

        // 保留现有任务的计时状态，只更新配置
        let mut new_tasks: HashMap<String, TaskTimer> = HashMap::new();

        for task in tasks {
            if let Some(existing) = state.tasks.get(&task.id) {
                // 任务已存在
                let interval_changed = existing.config.interval != task.interval
                    || existing.config.schedule_type != task.schedule_type
                    || existing.config.daily_times != task.daily_times;
                let was_disabled = !existing.config.enabled;
                let is_now_enabled = task.enabled;
                let was_enabled = existing.config.enabled;
                let is_now_disabled = !task.enabled;

                if interval_changed {
                    // interval 变了，重置计时
                    let task_id = task.id.clone();
                    let mut new_timer = TaskTimer {
                        config: task,
                        reset_time: now,
                        triggered: false,
                        disabled_at: None,
                        snoozed: false,
                        snooze_count: 0,
                        daily_last_trigger_key: None,
                        frozen_remaining: None,
                        frozen_total: None,
                    };
                    if should_freeze_new_state {
                        freeze_timer_countdown(&mut new_timer, now);
                    }
                    new_tasks.insert(task_id, new_timer);
                } else if was_disabled && is_now_enabled {
                    // 从禁用变为启用，补偿禁用期间的时间
                    let mut new_reset_time = existing.reset_time;
                    if let Some(disabled_at) = existing.disabled_at {
                        let disabled_duration = now.duration_since(disabled_at);
                        new_reset_time += disabled_duration;
                    }
                    let task_id = task.id.clone();
                    let mut new_timer = TaskTimer {
                        config: task,
                        reset_time: new_reset_time,
                        triggered: existing.triggered,
                        disabled_at: None,
                        snoozed: existing.snoozed,
                        snooze_count: existing.snooze_count,
                        daily_last_trigger_key: existing.daily_last_trigger_key.clone(),
                        frozen_remaining: None,
                        frozen_total: None,
                    };
                    if should_freeze_new_state {
                        freeze_timer_countdown(&mut new_timer, now);
                    }
                    new_tasks.insert(task_id, new_timer);
                } else if was_enabled && is_now_disabled {
                    // 从启用变为禁用，记录禁用时间点
                    let task_id = task.id.clone();
                    let mut new_timer = TaskTimer {
                        config: task,
                        reset_time: existing.reset_time,
                        triggered: existing.triggered,
                        disabled_at: Some(now),
                        snoozed: existing.snoozed,
                        snooze_count: existing.snooze_count,
                        daily_last_trigger_key: existing.daily_last_trigger_key.clone(),
                        frozen_remaining: existing.frozen_remaining,
                        frozen_total: existing.frozen_total,
                    };
                    freeze_timer_countdown(&mut new_timer, now);
                    new_tasks.insert(task_id, new_timer);
                } else {
                    // 状态没变，保留
                    new_tasks.insert(
                        task.id.clone(),
                        TaskTimer {
                            config: task,
                            reset_time: existing.reset_time,
                            triggered: existing.triggered,
                            disabled_at: existing.disabled_at,
                            snoozed: existing.snoozed,
                            snooze_count: existing.snooze_count,
                            daily_last_trigger_key: existing.daily_last_trigger_key.clone(),
                            frozen_remaining: existing.frozen_remaining,
                            frozen_total: existing.frozen_total,
                        },
                    );
                }
            } else {
                // 新任务
                let task_id = task.id.clone();
                let mut new_timer = TaskTimer {
                    config: task.clone(),
                    reset_time: now,
                    triggered: false,
                    disabled_at: if task.enabled { None } else { Some(now) },
                    snoozed: false,
                    snooze_count: 0,
                    daily_last_trigger_key: None,
                    frozen_remaining: None,
                    frozen_total: None,
                };
                if should_freeze_new_state {
                    freeze_timer_countdown(&mut new_timer, now);
                }
                new_tasks.insert(task_id, new_timer);
            }
        }

        state.tasks = new_tasks;
    } // drop lock

    rebuild_tray_menu(&app);
}

#[tauri::command]
fn timer_pause() {
    let mut state = get_timer_state().lock().unwrap();
    if !state.paused {
        let now = Instant::now();
        freeze_active_timers(&mut state, now);
        state.paused = true;
        state.pause_start = Some(now);
    }
}

#[tauri::command]
fn timer_resume() {
    let mut state = get_timer_state().lock().unwrap();
    if state.paused {
        if let Some(pause_start) = state.pause_start {
            let pause_duration = pause_start.elapsed();
            let keep_frozen = state.system_locked || state.lock_screen_active || state.is_idle;
            // 补偿暂停时间
            for timer in state.tasks.values_mut() {
                timer.reset_time += pause_duration;
                // 如果任务被禁用，也需要同步更新 disabled_at，保持相对时间不变
                if let Some(ref mut disabled_at) = timer.disabled_at {
                    *disabled_at += pause_duration;
                } else if keep_frozen {
                    freeze_timer_countdown(timer, Instant::now());
                } else {
                    clear_timer_freeze(timer);
                }
            }
        }
        state.paused = false;
        state.pause_start = None;
    }
}

#[tauri::command]
fn timer_is_paused() -> bool {
    get_timer_state().lock().unwrap().paused
}

#[tauri::command]
fn timer_pause_task(task_id: String) {
    let mut state = get_timer_state().lock().unwrap();
    let now = Instant::now();
    if let Some(timer) = state.tasks.get_mut(&task_id) {
        if timer.config.enabled && timer.disabled_at.is_none() {
            freeze_timer_countdown(timer, now);
            timer.disabled_at = Some(now);
        }
    }
}

#[tauri::command]
fn timer_resume_task(task_id: String) {
    let mut state = get_timer_state().lock().unwrap();
    let now = Instant::now();
    let keep_frozen =
        state.paused || state.system_locked || state.lock_screen_active || state.is_idle;
    if let Some(timer) = state.tasks.get_mut(&task_id) {
        if timer.config.enabled {
            if let Some(disabled_at) = timer.disabled_at {
                let disabled_duration = now.duration_since(disabled_at);
                timer.reset_time += disabled_duration;
                timer.disabled_at = None;
                if keep_frozen {
                    freeze_timer_countdown(timer, now);
                } else {
                    clear_timer_freeze(timer);
                }
            }
        }
    }
}

#[tauri::command]
fn timer_reset_task(task_id: String) {
    let mut state = get_timer_state().lock().unwrap();
    let now = Instant::now();
    let should_freeze =
        state.paused || state.system_locked || state.lock_screen_active || state.is_idle;
    if let Some(timer) = state.tasks.get_mut(&task_id) {
        timer.reset_time = now;
        timer.triggered = false;
        timer.snoozed = false;
        timer.snooze_count = 0;
        // 如果任务禁用，也更新 disabled_at
        if timer.disabled_at.is_some() {
            timer.disabled_at = Some(now);
            freeze_timer_countdown(timer, now);
        } else if should_freeze {
            freeze_timer_countdown(timer, now);
        } else {
            clear_timer_freeze(timer);
        }
    }
}

#[tauri::command]
fn timer_reset_all() {
    let mut state = get_timer_state().lock().unwrap();
    let now = Instant::now();
    let should_freeze =
        state.paused || state.system_locked || state.lock_screen_active || state.is_idle;
    for timer in state.tasks.values_mut() {
        timer.reset_time = now;
        timer.triggered = false;
        timer.snoozed = false;
        timer.snooze_count = 0;
        // 如果任务禁用，也更新 disabled_at
        if timer.disabled_at.is_some() {
            timer.disabled_at = Some(now);
            freeze_timer_countdown(timer, now);
        } else if should_freeze {
            freeze_timer_countdown(timer, now);
        } else {
            clear_timer_freeze(timer);
        }
    }
}

#[tauri::command]
fn timer_snooze_task(task_id: String, minutes: u64) {
    let mut state = get_timer_state().lock().unwrap();
    let now = Instant::now();
    let should_freeze =
        state.paused || state.system_locked || state.lock_screen_active || state.is_idle;
    if let Some(timer) = state.tasks.get_mut(&task_id) {
        let snooze_duration = Duration::from_secs(minutes * 60);
        timer.reset_time = now + snooze_duration;

        timer.triggered = false;
        timer.snoozed = true;
        timer.snooze_count += 1;
        if should_freeze {
            freeze_timer_countdown(timer, now);
        } else {
            clear_timer_freeze(timer);
        }
    }
}

#[tauri::command]
fn get_countdowns() -> Vec<CountdownInfo> {
    let state = get_timer_state().lock().unwrap();
    let now = Instant::now();
    let frozen_now = if state.paused || state.system_locked {
        state.pause_start.unwrap_or(now)
    } else if state.lock_screen_active {
        state.lock_screen_start.unwrap_or(now)
    } else if state.is_idle {
        state.idle_start.unwrap_or(now)
    } else {
        now
    };
    let globally_frozen =
        state.paused || state.system_locked || state.lock_screen_active || state.is_idle;

    state
        .tasks
        .values()
        .map(|timer| {
            // 如果任务被禁用，使用禁用时间点计算 elapsed，这样时间就"冻结"了
            let effective_now = if let Some(disabled_at) = timer.disabled_at {
                disabled_at
            } else {
                frozen_now
            };

            let timer_frozen = globally_frozen || timer.disabled_at.is_some();
            let (remaining, total_secs, snooze_remaining) = if timer_frozen {
                if let (Some(remaining), Some(total)) = (timer.frozen_remaining, timer.frozen_total)
                {
                    let snooze_remaining = if timer.snoozed {
                        remaining
                    } else {
                        timer
                            .reset_time
                            .checked_duration_since(effective_now)
                            .map(|duration| duration.as_secs())
                            .unwrap_or(0)
                    };
                    (remaining, total, snooze_remaining)
                } else {
                    calculate_timer_countdown(timer, effective_now, false)
                }
            } else {
                calculate_timer_countdown(timer, effective_now, true)
            };

            CountdownInfo {
                id: timer.config.id.clone(),
                remaining,
                total: total_secs,
                enabled: timer.config.enabled,
                task_paused: timer.config.enabled && timer.disabled_at.is_some(),
                snoozed: timer.snoozed,
                snooze_remaining,
                snooze_count: timer.snooze_count,
            }
        })
        .collect()
}

#[tauri::command]
fn take_triggered_tasks() -> Vec<TaskTriggeredPayload> {
    let mut state = get_timer_state().lock().unwrap();
    state.pending_triggers.drain(..).collect()
}

#[tauri::command]
fn timer_set_system_locked(locked: bool) {
    let mut state = get_timer_state().lock().unwrap();
    let now = Instant::now();

    if locked && !state.system_locked {
        // 刚锁屏，记录暂停时间
        freeze_active_timers(&mut state, now);
        state.system_locked = true;
        if state.pause_start.is_none() {
            state.pause_start = Some(now);
        }
    } else if !locked && state.system_locked {
        // 解锁
        let pause_duration = state.pause_start.map(|s| s.elapsed());
        let keep_frozen = state.paused || state.lock_screen_active || state.is_idle;

        for timer in state.tasks.values_mut() {
            if timer.config.auto_reset_on_idle {
                // 勾选了"空闲重置"，直接重置为初始值
                timer.reset_time = now;
                timer.triggered = false;
                // 如果任务被禁用，也更新 disabled_at
                if timer.disabled_at.is_some() {
                    timer.disabled_at = Some(now);
                    freeze_timer_countdown(timer, now);
                } else if keep_frozen {
                    freeze_timer_countdown(timer, now);
                } else {
                    clear_timer_freeze(timer);
                }
            } else if let Some(duration) = pause_duration {
                // 没有勾选，补偿暂停时间
                timer.reset_time += duration;
                // 如果任务被禁用，也需要同步更新 disabled_at，保持相对时间不变
                if let Some(ref mut disabled_at) = timer.disabled_at {
                    *disabled_at += duration;
                } else if keep_frozen {
                    freeze_timer_countdown(timer, now);
                } else {
                    clear_timer_freeze(timer);
                }
            }
        }

        state.system_locked = false;
        if !state.paused {
            state.pause_start = None;
        }
    }
}

#[tauri::command]
fn timer_set_lock_screen_active(active: bool) {
    let mut state = get_timer_state().lock().unwrap();
    if active && !state.lock_screen_active {
        // 刚进入锁屏模式，记录开始时间
        let now = Instant::now();
        freeze_active_timers(&mut state, now);
        state.lock_screen_active = true;
        state.lock_screen_start = Some(now);
    } else if !active && state.lock_screen_active {
        // 退出锁屏模式，补偿锁屏期间的时间
        let keep_frozen = state.paused || state.system_locked || state.is_idle;
        if let Some(lock_start) = state.lock_screen_start {
            let lock_duration = lock_start.elapsed();
            for timer in state.tasks.values_mut() {
                if timer.snoozed {
                    continue;
                }
                timer.reset_time += lock_duration;
                // 如果任务被禁用，也需要同步更新 disabled_at，保持相对时间不变
                if let Some(ref mut disabled_at) = timer.disabled_at {
                    *disabled_at += lock_duration;
                } else if keep_frozen {
                    freeze_timer_countdown(timer, Instant::now());
                } else {
                    clear_timer_freeze(timer);
                }
            }
        }
        state.lock_screen_active = false;
        state.lock_screen_start = None;
    }
}

#[tauri::command]
fn set_idle_threshold(seconds: u64) {
    let mut state = get_timer_state().lock().unwrap();
    state.idle_threshold_seconds = seconds;
}

#[tauri::command]
fn get_idle_threshold() -> u64 {
    let state = get_timer_state().lock().unwrap();
    state.idle_threshold_seconds
}

#[derive(Clone, serde::Serialize)]
struct IdleStatus {
    is_idle: bool,
    idle_seconds: u64,
    threshold: u64,
    idle_start_timestamp: Option<i64>, // 空闲开始时间戳
}

fn start_timer_thread(app_handle: AppHandle) {
    thread::spawn(move || {
        // Linux uses shorter interval for better lock screen enforcement
        #[cfg(target_os = "linux")]
        let base_interval = Duration::from_millis(200);
        #[cfg(not(target_os = "linux"))]
        let base_interval = Duration::from_secs(1);

        #[cfg(target_os = "linux")]
        let mut tick_counter: u32 = 0;

        loop {
            thread::sleep(base_interval);

            #[cfg(target_os = "linux")]
            {
                tick_counter += 1;
            }

            // Check if we should run the full timer logic (every 1 second)
            #[cfg(target_os = "linux")]
            let should_run_timer_logic = tick_counter >= 5; // 200ms * 5 = 1 second
            #[cfg(not(target_os = "linux"))]
            let should_run_timer_logic = true;

            // Always check lock screen watchdog on Linux (every 200ms)
            // On other platforms, check every 1 second
            let is_locked = get_timer_state().lock().unwrap().lock_screen_active;
            if is_locked {
                // 主窗口
                if let Some(window) = app_handle.get_webview_window("main") {
                    if !window.is_visible().unwrap_or(false) {
                        let _ = window.show();
                    }
                    let _ = window.unminimize();
                    if !window.is_focused().unwrap_or(false) {
                        let _ = window.set_focus();
                    }
                    let _ = window.set_always_on_top(true);

                    // Linux-specific: Additional focus enforcement for both X11 and Wayland
                    #[cfg(target_os = "linux")]
                    {
                        let _ = window.set_focus();
                        // Try to grab keyboard focus more aggressively
                        let _ = window.set_always_on_top(true);
                    }
                }

                let lock_state = app_handle.state::<LockState>();
                let mut guard = lock_state.0.lock().unwrap();
                let windows = guard.windows.clone();
                let args = guard.args.clone();

                for label in &windows {
                    if let Some(window) = app_handle.get_webview_window(label) {
                        if !window.is_visible().unwrap_or(false) {
                            let _ = window.show();
                        }
                        if !window.is_focused().unwrap_or(false) {
                            let _ = window.set_focus();
                        }
                        let _ = window.set_always_on_top(true);

                        // Linux-specific: Additional focus and fullscreen enforcement
                        // Works for both X11 and Wayland (Tauri abstracts the differences)
                        #[cfg(target_os = "linux")]
                        {
                            let _ = window.set_fullscreen(true);
                            let _ = window.set_focus();
                            let _ = window.set_always_on_top(true);
                        }
                    }
                }

                // Self-Healing (only run every 1 second to avoid performance issues)
                if should_run_timer_logic {
                    if let Ok(monitors) = app_handle.available_monitors() {
                        let mut covered_indices = HashSet::new();

                        if let Some(main_win) = app_handle.get_webview_window("main") {
                            if let Ok(pos) = main_win.outer_position() {
                                for (i, m) in monitors.iter().enumerate() {
                                    if m.position().x == pos.x && m.position().y == pos.y {
                                        covered_indices.insert(i);
                                        break;
                                    }
                                }
                            }
                        }

                        for label in &windows {
                            if let Some(slave) = app_handle.get_webview_window(label) {
                                if let Ok(pos) = slave.outer_position() {
                                    for (i, m) in monitors.iter().enumerate() {
                                        if m.position().x == pos.x && m.position().y == pos.y {
                                            covered_indices.insert(i);
                                        }
                                    }
                                }
                            }
                        }

                        for (i, m) in monitors.iter().enumerate() {
                            if !covered_indices.contains(&i) {
                                let label = format!("lock-slave-{}", i);
                                if let Some(win) = app_handle.get_webview_window(&label) {
                                    let _ = win.set_position(m.position().clone());
                                    let _ = win.set_size(tauri::Size::Physical(m.size().clone()));
                                    let _ = win.set_fullscreen(true);
                                } else {
                                    if let Some(new_label) =
                                        create_slave_window(&app_handle, m, args.as_ref(), i)
                                    {
                                        guard.windows.push(new_label);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Reset counter and run timer logic
            #[cfg(target_os = "linux")]
            if should_run_timer_logic {
                tick_counter = 0;
            }

            if !should_run_timer_logic {
                continue; // Skip the rest of the loop on Linux intermediate ticks
            }

            let mut tasks_to_trigger: Vec<TaskTriggeredPayload> = Vec::new();
            let mut idle_status_changed = false;
            let current_idle_status;

            {
                let mut state = get_timer_state().lock().unwrap();

                // 如果暂停、系统锁屏或锁屏模式激活，跳过检查
                if state.paused || state.system_locked || state.lock_screen_active {
                    continue;
                }

                let now = Instant::now();
                let idle_seconds = get_idle_seconds();
                let threshold = state.idle_threshold_seconds;
                let was_idle = state.is_idle;
                let is_now_idle = idle_seconds >= threshold;

                // 检测空闲状态变化
                if is_now_idle && !was_idle {
                    // 刚进入空闲状态
                    state.is_idle = true;
                    state.idle_start = Some(now);
                    let timestamp = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as i64;
                    state.idle_start_timestamp = Some(timestamp);
                    idle_status_changed = true;

                    // 重置所有勾选了「空闲重置」的任务
                    for timer in state.tasks.values_mut() {
                        if timer.config.enabled {
                            if timer.config.auto_reset_on_idle {
                                timer.reset_time = now;
                                timer.triggered = false;
                            }
                            freeze_timer_countdown(timer, now);
                        }
                    }
                } else if !is_now_idle && was_idle {
                    // 刚从空闲状态恢复
                    state.is_idle = false;

                    // 重新开始倒计时（从头开始）
                    for timer in state.tasks.values_mut() {
                        if timer.config.auto_reset_on_idle && timer.config.enabled {
                            timer.reset_time = now;
                            timer.triggered = false;
                            if timer.disabled_at.is_some() {
                                timer.disabled_at = Some(now);
                                freeze_timer_countdown(timer, now);
                            }
                        }
                        if timer.disabled_at.is_none() {
                            clear_timer_freeze(timer);
                        }
                    }

                    state.idle_start = None;
                    state.idle_start_timestamp = None;
                    idle_status_changed = true;
                }

                current_idle_status = IdleStatus {
                    is_idle: state.is_idle,
                    idle_seconds,
                    threshold,
                    idle_start_timestamp: state.idle_start_timestamp,
                };

                // 如果处于空闲状态，不检查任务触发（计时暂停）
                if state.is_idle {
                    // 空闲时不触发任何任务，但仍然发送倒计时更新
                } else {
                    // 正常检查任务触发
                    for timer in state.tasks.values_mut() {
                        if !timer.config.enabled {
                            continue;
                        }
                        if timer.disabled_at.is_some() {
                            continue;
                        }

                        if timer.snoozed {
                            if now >= timer.reset_time {
                                tasks_to_trigger.push(TaskTriggeredPayload {
                                    id: timer.config.id.clone(),
                                    title: timer.config.title.clone(),
                                    desc: timer.config.desc.clone(),
                                    icon: timer.config.icon.clone(),
                                });
                                timer.triggered = true;
                                timer.snoozed = false;
                            }
                            continue;
                        }

                        if is_daily_task(&timer.config) {
                            if let Some(key) = current_daily_trigger_key(&timer.config) {
                                if timer.daily_last_trigger_key.as_deref() != Some(&key) {
                                    tasks_to_trigger.push(TaskTriggeredPayload {
                                        id: timer.config.id.clone(),
                                        title: timer.config.title.clone(),
                                        desc: timer.config.desc.clone(),
                                        icon: timer.config.icon.clone(),
                                    });
                                    timer.daily_last_trigger_key = Some(key);
                                    timer.triggered = true;
                                }
                            }
                        } else if !timer.triggered {
                            let elapsed = now.saturating_duration_since(timer.reset_time).as_secs();
                            let total_secs = timer.config.interval * 60;

                            if elapsed >= total_secs {
                                // 触发提醒
                                tasks_to_trigger.push(TaskTriggeredPayload {
                                    id: timer.config.id.clone(),
                                    title: timer.config.title.clone(),
                                    desc: timer.config.desc.clone(),
                                    icon: timer.config.icon.clone(),
                                });

                                // 标记为已触发，等待用户操作（重置或推迟）
                                timer.triggered = true;
                            }
                        }
                    }
                }
            }

            if !tasks_to_trigger.is_empty() {
                let mut state = get_timer_state().lock().unwrap();
                state
                    .pending_triggers
                    .extend(tasks_to_trigger.iter().cloned());
            }

            // 发送触发事件到前端
            for task in tasks_to_trigger {
                if let Some(window) = app_handle.get_webview_window("main") {
                    if let Ok(payload) = serde_json::to_string(&task) {
                        let script = format!(
                            "window.__HEALTH_REMINDER_HANDLE_TRIGGER__ && window.__HEALTH_REMINDER_HANDLE_TRIGGER__({});",
                            payload
                        );
                        let _ = window.eval(&script);
                    }
                }
                let _ = app_handle.emit("task-triggered", task);
            }

            // 发送空闲状态更新（只在状态变化时发送，或每 5 秒发送一次状态）
            if idle_status_changed {
                let _ = app_handle.emit("idle-status-changed", current_idle_status.clone());
            }

            // 发送倒计时更新
            let countdowns = get_countdowns();
            let _ = app_handle.emit("countdown-update", countdowns);
        }
    });
}

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
fn was_started_silent() -> bool {
    std::env::args().any(|arg| arg == "--silent")
}

fn play_custom_audio_file(file_path: &str) -> Result<(), String> {
    use rodio::{Decoder, OutputStreamBuilder, Sink};
    use std::fs::File;

    let stream_handle = OutputStreamBuilder::open_default_stream()
        .map_err(|e| format!("Failed to create audio output stream: {}", e))?;
    let sink = Sink::connect_new(stream_handle.mixer());
    let file = File::open(file_path).map_err(|e| format!("Failed to open audio file: {}", e))?;
    let source = Decoder::try_from(BufReader::new(file))
        .map_err(|e| format!("Failed to decode audio file: {}", e))?;

    sink.append(source);
    sink.sleep_until_end();
    Ok(())
}

fn play_custom_audio_async(file_path: String) {
    thread::spawn(move || {
        let _ = play_custom_audio_file(&file_path);
    });
}

fn play_system_notification_sound() {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        let _ = Command::new("powershell")
            .args([
                "-NoProfile",
                "-WindowStyle",
                "Hidden",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                "Add-Type -AssemblyName System.Sound; [System.Media.SystemSounds]::Beep.Play();",
            ])
            .creation_flags(0x08000000)
            .output();
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let _ = Command::new("afplay")
            .args(["/System/Library/Sounds/Glass.aiff"])
            .output();
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        // 尝试多种 Linux 系统声音命令
        if Command::new("paplay")
            .args(["/usr/share/sounds/alsa/Front_Left.wav"])
            .output()
            .is_ok()
        {
            return;
        }

        if Command::new("aplay")
            .args(["/usr/share/sounds/alsa/Front_Left.wav"])
            .output()
            .is_ok()
        {
            return;
        }

        // 最后尝试系统提示音
        let _ = Command::new("echo").args(["\u{0007}"]).output();
    }
}

#[tauri::command]
fn play_notification_sound(custom_sound_path: Option<String>) -> Result<(), String> {
    if let Some(path) = custom_sound_path {
        if !path.trim().is_empty() && std::path::Path::new(&path).exists() {
            play_custom_audio_async(path);
            return Ok(());
        }
    }

    play_system_notification_sound();
    Ok(())
}

#[tauri::command]
fn test_custom_sound(file_path: String) -> Result<(), String> {
    if file_path.trim().is_empty() {
        return Err("No sound file selected".to_string());
    }

    if !std::path::Path::new(&file_path).exists() {
        return Err("Sound file does not exist".to_string());
    }

    play_custom_audio_async(file_path);
    Ok(())
}

#[tauri::command]
fn show_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_main_window(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
fn is_main_window_visible(window: tauri::Window) -> bool {
    window.is_visible().unwrap_or(false)
}

fn ensure_floating_window(
    app: &AppHandle,
    visible_on_create: bool,
) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window("floating-window") {
        return Ok(window);
    }

    let builder = WebviewWindowBuilder::new(
        app,
        "floating-window",
        WebviewUrl::App(PathBuf::from("index.html?mode=floating")),
    )
    .title("Reminder")
    .inner_size(260.0, 88.0)
    .min_inner_size(180.0, 70.0)
    .resizable(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(visible_on_create);

    #[cfg(target_os = "windows")]
    let builder = builder
        .transparent(true)
        .background_color(tauri::utils::config::Color(0, 0, 0, 0))
        .shadow(false);

    builder.build().map_err(|e| e.to_string())
}

fn show_floating_window_now(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("floating-window") {
        if !window.is_visible().unwrap_or(false) {
            window.show().map_err(|e| e.to_string())?;
        }
    } else {
        let _ = ensure_floating_window(app, true)?;
    }
    Ok(())
}

#[tauri::command]
fn show_floating_window(app: AppHandle, state: State<FloatingState>) -> Result<(), String> {
    *state.0.lock().unwrap() = true;
    let app_for_window = app.clone();
    tauri::async_runtime::spawn(async move {
        let _ = show_floating_window_now(&app_for_window);
    });
    Ok(())
}

#[tauri::command]
fn hide_floating_window(app: AppHandle, state: State<FloatingState>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("floating-window") {
        window.hide().map_err(|e| e.to_string())?;
    }
    *state.0.lock().unwrap() = false;
    Ok(())
}

#[cfg(target_os = "windows")]
fn get_global_cursor_position() -> Option<(i32, i32)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    unsafe {
        let mut point = POINT { x: 0, y: 0 };
        if GetCursorPos(&mut point).is_ok() {
            Some((point.x, point.y))
        } else {
            None
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn get_global_cursor_position() -> Option<(i32, i32)> {
    None
}

fn cursor_should_reveal_floating(edge: &str, watch: &FloatingRevealWatch, cursor: (i32, i32)) -> bool {
    let (cursor_x, cursor_y) = cursor;
    let left = watch.monitor.x;
    let top = watch.monitor.y;
    let right = left + watch.monitor.width as i32;
    let bottom = top + watch.monitor.height as i32;
    let padding = watch.reveal_band.max(48);
    let restore_left = watch.restore.x;
    let restore_top = watch.restore.y;
    let restore_right = restore_left + watch.restore.width as i32;
    let restore_bottom = restore_top + watch.restore.height as i32;
    let in_vertical = cursor_y >= restore_top - padding && cursor_y <= restore_bottom + padding;
    let in_horizontal = cursor_x >= restore_left - padding && cursor_x <= restore_right + padding;

    match edge {
        "left" => cursor_x >= left - padding && cursor_x <= left + padding && in_vertical,
        "right" => cursor_x >= right - padding && cursor_x <= right + padding && in_vertical,
        "top" => cursor_y >= top - padding && cursor_y <= top + padding && in_horizontal,
        "bottom" => cursor_y >= bottom - padding && cursor_y <= bottom + padding && in_horizontal,
        _ => false,
    }
}

fn reveal_floating_window_from_watch(app: &AppHandle, watch: &FloatingRevealWatch) {
    if let Some(window) = app.get_webview_window("floating-window") {
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
            watch.restore.x,
            watch.restore.y,
        )));
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
            watch.restore.width,
            watch.restore.height,
        )));
        let _ = window.show();
        let _ = window.eval(
            "window.__HEALTH_REMINDER_FLOATING_REVEALED__ && window.__HEALTH_REMINDER_FLOATING_REVEALED__();",
        );
    }
    let _ = app.emit("floating-window-revealed", ());
}

#[tauri::command]
fn start_floating_reveal_watch(
    app: AppHandle,
    state: State<FloatingRevealState>,
    watch: FloatingRevealWatch,
) -> Result<(), String> {
    let shared_state = state.0.clone();
    let generation = {
        let mut guard = shared_state.lock().unwrap();
        guard.generation = guard.generation.wrapping_add(1);
        guard.watch = Some(watch);
        guard.generation
    };
    let app_for_thread = app.clone();

    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_millis(80));
            let current_watch = {
                let guard = shared_state.lock().unwrap();
                if guard.generation != generation {
                    return;
                }
                guard.watch.clone()
            };

            let Some(watch) = current_watch else {
                return;
            };
            let Some(cursor) = get_global_cursor_position() else {
                continue;
            };

            if cursor_should_reveal_floating(&watch.edge, &watch, cursor) {
                {
                    let mut guard = shared_state.lock().unwrap();
                    if guard.generation == generation {
                        guard.watch = None;
                    }
                }
                reveal_floating_window_from_watch(&app_for_thread, &watch);
                return;
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn stop_floating_reveal_watch(state: State<FloatingRevealState>) {
    let mut guard = state.0.lock().unwrap();
    guard.generation = guard.generation.wrapping_add(1);
    guard.watch = None;
}

#[tauri::command]
fn set_floating_task_menu_open(
    app: AppHandle,
    open: bool,
    width: Option<f64>,
    closed_height: Option<f64>,
    open_height: Option<f64>,
) -> Result<(), String> {
    let window = app
        .get_webview_window("floating-window")
        .ok_or_else(|| "floating window not found".to_string())?;
    let scale = window.scale_factor().unwrap_or(1.0);
    let logical_width = width.unwrap_or(260.0).clamp(180.0, 420.0);
    let logical_closed_height = closed_height.unwrap_or(88.0).clamp(70.0, 116.0);
    let logical_open_height = open_height
        .unwrap_or(logical_closed_height + 128.0)
        .clamp(logical_closed_height, 320.0);
    let target_height = if open {
        (logical_open_height * scale).round() as u32
    } else {
        (logical_closed_height * scale).round() as u32
    };
    let target_width = (logical_width * scale).round() as u32;
    let current_size = window.outer_size().map_err(|e| e.to_string())?;

    if current_size.height == target_height && current_size.width == target_width {
        return Ok(());
    }

    let current_position = window.outer_position().map_err(|e| e.to_string())?;
    let delta = target_height as i32 - current_size.height as i32;
    if delta != 0 {
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
                current_position.x,
                current_position.y - delta,
            )))
            .map_err(|e| e.to_string())?;
    }
    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
            target_width,
            target_height,
        )))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_floating_window_always_on_top(app: AppHandle, always_on_top: bool) -> Result<(), String> {
    let window = ensure_floating_window(&app, false)?;
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_tray_tooltip(state: State<TrayState>, tooltip: String) {
    if let Some(tray) = state.0.lock().unwrap().as_ref() {
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

#[tauri::command]
fn update_pause_menu(state: State<PauseMenuState>, lang_state: State<LanguageState>, paused: bool) {
    if let Some(menu_item) = state.0.lock().unwrap().as_ref() {
        let lang = lang_state.0.lock().unwrap();
        let text = if paused {
            get_tray_text("resume", &lang)
        } else {
            get_tray_text("pause", &lang)
        };
        let _ = menu_item.set_text(text);
    }
}

#[tauri::command]
fn update_tray_language(app: AppHandle, lang_state: State<LanguageState>, language: String) {
    // 更新语言状态
    *lang_state.0.lock().unwrap() = language.clone();

    // 重新构建托盘菜单以应用新语言
    rebuild_tray_menu(&app);

    // 更新托盘提示文本
    let tray_state = app.state::<TrayState>();
    let guard = tray_state.0.lock().unwrap();
    if let Some(tray) = guard.as_ref() {
        let _ = tray.set_tooltip(Some(get_tray_text("tooltip", &language)));
    }
}

fn create_slave_window(
    app: &AppHandle,
    monitor: &tauri::Monitor,
    task: Option<&LockTaskArgs>,
    index: usize,
) -> Option<String> {
    let label = format!("lock-slave-{}", index);

    let mut url_str = String::from("index.html?mode=lock_slave");
    if let Some(t) = task {
        let encoded: String = form_urlencoded::Serializer::new(String::new())
            .append_pair("title", &t.title)
            .append_pair("desc", &t.desc)
            .append_pair("duration", &t.duration.to_string())
            .append_pair("icon", &t.icon)
            .append_pair("strict_mode", &t.strict_mode.to_string())
            .append_pair("allow_strict_snooze", &t.allow_strict_snooze.to_string())
            .append_pair("max_snooze_count", &t.max_snooze_count.to_string())
            .append_pair("snooze_minutes", &t.snooze_minutes.to_string())
            .append_pair("current_snooze_count", &t.current_snooze_count.to_string())
            .append_pair("bg_image", &t.bg_image)
            .finish();
        url_str = format!("index.html?mode=lock_slave&{}", encoded);
    }

    if let Ok(slave) =
        WebviewWindowBuilder::new(app, &label, WebviewUrl::App(PathBuf::from(url_str)))
            .title("Lock Screen")
            .always_on_top(true)
            .closable(false)
            .minimizable(false)
            .decorations(false)
            .resizable(false)
            .skip_taskbar(true)
            .visible(false)
            .focused(true)
            .build()
    {
        let _ = slave.set_position(monitor.position().clone());
        let _ = slave.set_size(tauri::Size::Physical(monitor.size().clone()));
        let _ = slave.show();
        let _ = slave.set_focus();
        let _ = slave.set_fullscreen(true);

        // Additional focus and z-order enforcement for Linux
        #[cfg(target_os = "linux")]
        {
            // Request focus again after fullscreen
            let _ = slave.set_focus();
            // On Linux, we may need to ensure the window is always on top multiple times
            let _ = slave.set_always_on_top(true);
        }

        Some(label)
    } else {
        None
    }
}

#[tauri::command]
async fn enter_lock_mode(
    app: tauri::AppHandle,
    state: State<'_, LockState>,
    task: Option<LockTaskArgs>,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    if let Some(floating_window) = app.get_webview_window("floating-window") {
        let _ = floating_window.hide();
    }

    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_fullscreen(true);
    let _ = window.set_always_on_top(true);
    let _ = window.set_closable(false);
    let _ = window.set_minimizable(false);
    let _ = window.set_focus();

    let monitors = window.available_monitors().unwrap_or_default();
    let current_monitor = window.current_monitor().unwrap_or(None);

    let mut created_windows = Vec::new();

    for (i, m) in monitors.iter().enumerate() {
        if let Some(ref cm) = current_monitor {
            // Basic position check to assume it's the same monitor
            if m.position().x == cm.position().x && m.position().y == cm.position().y {
                continue;
            }
        }

        if let Some(label) = create_slave_window(&app, m, task.as_ref(), i) {
            created_windows.push(label);
        }
    }

    // Additional focus enforcement for Linux after all windows are created
    #[cfg(target_os = "linux")]
    {
        // Re-focus all slave windows to ensure they stay on top
        for label in created_windows.iter() {
            if let Some(w) = app.get_webview_window(label) {
                let _ = w.set_focus();
                let _ = w.set_always_on_top(true);
            }
        }
        // Re-focus main window
        let _ = window.set_focus();
        let _ = window.set_always_on_top(true);
    }

    let mut state_guard = state.0.lock().unwrap();
    state_guard.windows.extend(created_windows);
    state_guard.args = task;

    Ok(())
}

#[tauri::command]
fn exit_lock_mode(app: tauri::AppHandle, state: State<LockState>, restore_visible: Option<bool>) {
    let restore_visible = restore_visible.unwrap_or(false);
    let window = app.get_webview_window("main");

    if let Some(window) = window {
        if !restore_visible {
            let _ = window.hide();
        }

        let _ = window.set_fullscreen(false);
        let _ = window.set_always_on_top(false);
        let _ = window.set_closable(true);
        let _ = window.set_minimizable(true);

        if restore_visible {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }

    let mut state_guard = state.0.lock().unwrap();
    for label in state_guard.windows.iter() {
        if let Some(w) = app.get_webview_window(label) {
            let _ = w.close();
        }
    }
    state_guard.windows.clear();
    state_guard.args = None;
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--silent"]),
        ))
        .invoke_handler(tauri::generate_handler![
            load_settings,
            save_settings,
            was_started_silent,
            play_notification_sound,
            test_custom_sound,
            show_notification,
            show_main_window,
            hide_main_window,
            is_main_window_visible,
            show_floating_window,
            hide_floating_window,
            start_floating_reveal_watch,
            stop_floating_reveal_watch,
            set_floating_task_menu_open,
            set_floating_window_always_on_top,
            update_tray_tooltip,
            update_pause_menu,
            update_tray_language,
            enter_lock_mode,
            exit_lock_mode,
            sync_tasks,
            timer_pause,
            timer_resume,
            timer_is_paused,
            timer_pause_task,
            timer_resume_task,
            timer_reset_task,
            timer_reset_all,
            timer_snooze_task,
            get_countdowns,
            take_triggered_tasks,
            timer_set_system_locked,
            timer_set_lock_screen_active,
            set_idle_threshold,
            get_idle_threshold,
        ])
        .manage(TrayState(Mutex::new(None)))
        .manage(FloatingState(Mutex::new(false)))
        .manage(FloatingRevealState(Arc::new(Mutex::new(
            FloatingRevealInner {
                generation: 0,
                watch: None,
            },
        ))))
        .manage(LockState(Mutex::new(LockStateInner {
            windows: Vec::new(),
            args: None,
        })))
        .manage(PauseMenuState(Mutex::new(None)))
        .manage(LanguageState(Mutex::new("zh-CN".to_string())))
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let floating =
                MenuItem::with_id(app, "floating", "显示/隐藏悬浮窗", true, None::<&str>)?;
            let reset = MenuItem::with_id(app, "reset", "重置所有任务", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "暂停", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &floating, &pause, &reset, &quit])?;

            let tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("健康提醒助手")
                .on_menu_event(|app, event| {
                    let id_str = event.id.as_ref();
                    if id_str == "quit" {
                        app.exit(0);
                    } else if id_str == "show" {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    } else if id_str == "floating" {
                        let state = app.state::<FloatingState>();
                        let visible = *state.0.lock().unwrap();
                        if visible {
                            let _ = hide_floating_window(app.clone(), state);
                        } else {
                            let _ = show_floating_window(app.clone(), state);
                        }
                    } else if id_str == "reset" {
                        let _ = app.emit("reset-all-tasks", ());
                    } else if id_str == "pause" {
                        let _ = app.emit("toggle-pause", ());
                    } else if id_str.starts_with("reset_task_") {
                        let task_id = id_str.trim_start_matches("reset_task_");
                        let mut state = get_timer_state().lock().unwrap();
                        let now = Instant::now();
                        if let Some(timer) = state.tasks.get_mut(task_id) {
                            timer.reset_time = now;
                            timer.triggered = false;
                            timer.snoozed = false;
                            timer.snooze_count = 0;
                            if timer.disabled_at.is_some() {
                                timer.disabled_at = Some(now);
                            }
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            *app.state::<TrayState>().0.lock().unwrap() = Some(tray);
            *app.state::<PauseMenuState>().0.lock().unwrap() = Some(pause);

            // 启动后端定时器线程
            start_timer_thread(app.handle().clone());

            #[cfg(target_os = "windows")]
            start_session_monitor(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // If the window is a lock slave, just close it (don't prevent close)
                // The label check: main window has label "main" (default).
                // Slave windows have "lock-slave-X".
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = _event {
                if let Some(window) = _app_handle.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
