import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow, currentMonitor, availableMonitors, cursorPosition, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { t, setLocale, getLocale, getSupportedLocales, detectLocale } from './i18n/index.js';

const ICONS = {
  sit: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6v6l4 2"></path></svg>`,
  water: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.32 0L12 2.69z"></path></svg>`,
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  work: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  pause: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
  play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  reset: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
  volume: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`
};

const DEFAULT_TASKS = [
  { id: 'sit', title: '久坐提醒', desc: '该起来活动了，走动一下吧~', interval: 45, enabled: true, icon: 'sit', lockDuration: 60, autoResetOnIdle: true, preNotificationSeconds: 5, snoozeMinutes: 5, scheduleType: 'interval', dailyTimes: [] },
  { id: 'water', title: '喝水提醒', desc: '该喝口水了，保持水分充足~', interval: 60, enabled: true, icon: 'water', lockDuration: 60, autoResetOnIdle: true, preNotificationSeconds: 5, snoozeMinutes: 5, scheduleType: 'interval', dailyTimes: [] },
  { id: 'eye', title: '护眼提醒', desc: '让眼睛休息一下，看看远处~', interval: 20, enabled: true, icon: 'eye', lockDuration: 60, autoResetOnIdle: true, preNotificationSeconds: 5, snoozeMinutes: 2, scheduleType: 'interval', dailyTimes: [] }
];

let settings = {
  tasks: [...DEFAULT_TASKS],
  soundEnabled: true,
  customSoundPath: '',
  autoStart: false,
  silentAutoStart: true,
  lockScreenEnabled: false,
  lockDuration: 20,
  idleThreshold: 300,  // 空闲阈值，秒，默认 5 分钟
  autoUnlock: true,    // 倒计时结束自动解锁
  strictMode: false,   // 严格模式：隐藏紧急解锁按钮
  snoozeMinutes: 5,    // 推迟时间（分钟）
  resetOnIdle: true,   // 空闲时重置所有任务
  advancedSettingsOpen: false, // 高级设置展开状态
  maxSnoozeCount: 1,   // 最大推迟次数
  allowStrictSnooze: false, // 严格模式下是否允许推迟
  enableMerge: true,  // 是否合并临近任务
  mergeThreshold: 60,  // 合并阈值（秒）
  language: 'zh-CN',   // 界面语言
  lockScreenBgImage: '',  // 锁屏背景图片路径
  theme: 'light',      // 主题设置
  floatingWindowEnabled: false,
  floatingWindowMode: 'nextReminder',
  floatingWindowTheme: 'blue',
  floatingWindowWidth: 260,
  floatingWindowFontScale: 100,
  floatingWindowOpacity: 100,
  floatingWindowBgColor: '#2f80ed',
  floatingWindowBgColor2: '#56ccf2',
  floatingWindowTextColor: '#ffffff',
  floatingWindowAutoHide: false,
  floatingSelectedTaskId: '',
  floatingCountdownTitle: '秒杀倒计时',
  floatingCountdownTarget: '',
};

let countdowns = {};  // 现在由后端事件更新
let countdownTotals = {};
let snoozedStatus = {}; // 推迟状态
let stats = {
  sitBreaks: 0,
  waterCups: 0,
  workMinutes: 0,
};
let taskPausedStatus = {};
let isPaused = false;
let isIdle = false;  // 当前是否处于空闲状态
let workStartTime = Date.now();
let activePopup = null;
let taskQueue = []; // 任务队列
let recentTriggeredTasks = {};
let lockScreenState = {
  active: false,
  remaining: 0,
  task: null,
  unlockProgress: 0,
  unlockTimer: null,
  waitingConfirm: false,
};

let updateInfo = null;
let isUpdating = false;
let isCheckingUpdate = false;
let updateMessage = null;
let notificationMessage = null;
let showIdleResetBanner = false;  // 显示空闲重置通知横幅
let notificationPermissionGranted = false;
let startedSilent = false;
let mainWindowVisibleBeforeLock = true;
let floatingWindowVisibleBeforeLock = false;
let floatingCountdownNotified = false;
let isLockSlaveWindow = false;
let floatingTaskMenuOpen = false;
let floatingGeometrySyncing = false;
let floatingWindowLifecycleBound = false;
let floatingMoveTimer = null;
let floatingResizeSaveTimer = null;
let floatingAutoHideTimer = null;
let floatingRevealPollTimer = null;
let floatingEdgeWatchTimer = null;
let floatingHiddenPinTimer = null;
let floatingDragFrame = null;
let floatingDragState = null;
let floatingAutoHideState = { edge: null, hidden: false };
let floatingPointerInside = false;
let floatingSuppressClickUntil = 0;
let appVersion = '1.8.0';

let domCache = null;
let isUiSuspended = false;
let lastTrayTooltipText = '';
let lastTrayTooltipUpdateAt = 0;
const TRAY_TOOLTIP_MIN_INTERVAL_MS = 5000;
const FLOATING_THEMES = ['blue', 'green', 'teal', 'slate', 'transparent'];
const FLOATING_THEME_PRESETS = {
  blue: { bg: '#2f80ed', bg2: '#56ccf2', text: '#ffffff', opacity: 100 },
  green: { bg: '#13a976', bg2: '#7bd88f', text: '#ffffff', opacity: 100 },
  teal: { bg: '#0ea5a4', bg2: '#67e8c9', text: '#ffffff', opacity: 100 },
  slate: { bg: '#334155', bg2: '#0f766e', text: '#ffffff', opacity: 100 },
  transparent: { bg: '#ffffff', bg2: '#ffffff', text: '#111827', opacity: 22 },
};
const FLOATING_MIN_WIDTH = 180;
const FLOATING_MAX_WIDTH = 420;
const FLOATING_MIN_FONT_SCALE = 80;
const FLOATING_MAX_FONT_SCALE = 140;
const FLOATING_BASE_HEIGHT = 88;
const FLOATING_VISIBLE_EDGE_PX = 18;
const FLOATING_EDGE_DOCK_THRESHOLD_PX = 72;
const DEFAULT_TASK_IDS = ['sit', 'water', 'eye'];
const GENERATED_TASK_TITLE_VALUES = ['New Reminder', '新提醒'];
const GENERATED_TASK_DESC_VALUES = [
  'Another energetic day, remember to take breaks~',
  '又是充满活力的一天，记得休息哦~'
];

async function loadAppVersion() {
  try {
    appVersion = await getVersion();
  } catch (e) {
    console.warn('Failed to load app version, using fallback', e);
  }
}

function normalizeErrorMessage(error, fallback) {
  let message = '';

  if (typeof error === 'string') {
    message = error;
  } else if (error?.response?.data) {
    message = normalizeErrorMessage(error.response.data, fallback);
  } else if (error?.message) {
    message = normalizeErrorMessage(error.message, fallback);
  } else if (error) {
    try {
      message = JSON.stringify(error);
    } catch (_) {
      message = String(error);
    }
  }

  message = String(message || '').trim();
  if (!message || message === '{}' || message === '[object Object]') {
    return fallback;
  }

  return message.length > 220 ? `${message.slice(0, 220)}...` : message;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFloatingThemeLabel(theme) {
  const label = t(`floating.theme.${theme}`);
  return label === `floating.theme.${theme}` ? theme : label;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeHexColor(value, fallback) {
  const raw = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  return fallback;
}

function hexToRgb(value) {
  const color = normalizeHexColor(value, '#000000').slice(1);
  return [
    parseInt(color.slice(0, 2), 16),
    parseInt(color.slice(2, 4), 16),
    parseInt(color.slice(4, 6), 16),
  ];
}

function getFloatingThemePreset(theme = settings.floatingWindowTheme) {
  return FLOATING_THEME_PRESETS[theme] || FLOATING_THEME_PRESETS.blue;
}

function applyFloatingThemePreset(theme) {
  const preset = getFloatingThemePreset(theme);
  settings.floatingWindowTheme = FLOATING_THEMES.includes(theme) ? theme : 'blue';
  settings.floatingWindowBgColor = preset.bg;
  settings.floatingWindowBgColor2 = preset.bg2;
  settings.floatingWindowTextColor = preset.text;
  settings.floatingWindowOpacity = preset.opacity;
}

function normalizeFloatingSettings() {
  const preset = getFloatingThemePreset();
  settings.floatingWindowWidth = Math.round(clampNumber(
    settings.floatingWindowWidth,
    FLOATING_MIN_WIDTH,
    FLOATING_MAX_WIDTH,
    260
  ));
  settings.floatingWindowFontScale = Math.round(clampNumber(
    settings.floatingWindowFontScale,
    FLOATING_MIN_FONT_SCALE,
    FLOATING_MAX_FONT_SCALE,
    100
  ));
  settings.floatingWindowOpacity = Math.round(clampNumber(settings.floatingWindowOpacity, 0, 100, preset.opacity));
  settings.floatingWindowBgColor = normalizeHexColor(settings.floatingWindowBgColor, preset.bg);
  settings.floatingWindowBgColor2 = normalizeHexColor(settings.floatingWindowBgColor2, preset.bg2);
  settings.floatingWindowTextColor = normalizeHexColor(settings.floatingWindowTextColor, preset.text);
  settings.floatingWindowAutoHide = !!settings.floatingWindowAutoHide;
}

function getFloatingGeometry(open = floatingTaskMenuOpen) {
  normalizeFloatingSettings();
  const width = settings.floatingWindowWidth;
  const fontScale = settings.floatingWindowFontScale / 100;
  const closedHeight = Math.round(clampNumber(FLOATING_BASE_HEIGHT * fontScale, 70, 116, FLOATING_BASE_HEIGHT));
  const optionCount = Math.max(4, Math.min(6, getFloatingTaskOptions().length || 4));
  const menuHeight = Math.round(clampNumber(24 + optionCount * 26, 112, 180, 128));
  const openHeight = closedHeight + menuHeight + 8;
  return {
    width,
    closedHeight,
    menuHeight,
    openHeight: open ? openHeight : closedHeight,
  };
}

function getFloatingStyleVars(open = floatingTaskMenuOpen) {
  const geometry = getFloatingGeometry(open);
  const bg = hexToRgb(settings.floatingWindowBgColor);
  const bg2 = hexToRgb(settings.floatingWindowBgColor2);
  const text = hexToRgb(settings.floatingWindowTextColor);
  const opacity = settings.floatingWindowOpacity / 100;
  const fontScale = settings.floatingWindowFontScale / 100;
  return [
    `--floating-bg-rgb:${bg.join(', ')}`,
    `--floating-bg-2-rgb:${bg2.join(', ')}`,
    `--floating-text-rgb:${text.join(', ')}`,
    `--floating-opacity:${opacity}`,
    `--floating-font-scale:${fontScale}`,
    `--floating-closed-height:${geometry.closedHeight}px`,
    `--floating-menu-height:${geometry.menuHeight}px`,
  ].join(';');
}

async function syncFloatingWindowGeometry(open = floatingTaskMenuOpen) {
  if (!document.body.classList.contains('floating-mode')) return;
  const geometry = getFloatingGeometry(open);
  const root = document.querySelector('.floating-root');
  if (root) {
    root.setAttribute('style', getFloatingStyleVars(open));
  }

  floatingGeometrySyncing = true;
  try {
    await invoke('set_floating_task_menu_open', {
      open,
      width: geometry.width,
      closedHeight: geometry.closedHeight,
      openHeight: geometry.openHeight,
    }).catch(console.error);
  } finally {
    window.setTimeout(() => {
      floatingGeometrySyncing = false;
    }, 250);
  }
}

function stopFloatingDrag() {
  if (!floatingDragState) return;
  const state = floatingDragState;
  floatingDragState = null;
  if (floatingDragFrame) {
    window.cancelAnimationFrame(floatingDragFrame);
    floatingDragFrame = null;
  }

  window.removeEventListener('pointermove', handleFloatingDragMove);
  window.removeEventListener('pointerup', stopFloatingDrag);
  window.removeEventListener('pointercancel', stopFloatingDrag);
  window.removeEventListener('blur', stopFloatingDrag);
  document.body.classList.remove('floating-dragging');

  if (state.pointerTarget && state.pointerId !== undefined) {
    try {
      if (state.pointerTarget.hasPointerCapture?.(state.pointerId)) {
        state.pointerTarget.releasePointerCapture(state.pointerId);
      }
    } catch (error) {
      console.warn('Failed to release floating pointer capture', error);
    }
  }

  window.setTimeout(() => {
    updateFloatingEdgeCandidate().catch(console.error);
  }, 80);
}

function getMonitorForCursor(cursor, monitors, fallbackMonitor) {
  const activeMonitor = monitors.find((monitor) => {
    const left = monitor.position.x;
    const top = monitor.position.y;
    const right = left + monitor.size.width;
    const bottom = top + monitor.size.height;
    return cursor.x >= left && cursor.x <= right && cursor.y >= top && cursor.y <= bottom;
  });
  return activeMonitor || fallbackMonitor;
}

function getMonitorOverlapArea(position, size, monitor) {
  const windowLeft = position.x;
  const windowTop = position.y;
  const windowRight = windowLeft + size.width;
  const windowBottom = windowTop + size.height;
  const monitorLeft = monitor.position.x;
  const monitorTop = monitor.position.y;
  const monitorRight = monitorLeft + monitor.size.width;
  const monitorBottom = monitorTop + monitor.size.height;
  const overlapWidth = Math.max(0, Math.min(windowRight, monitorRight) - Math.max(windowLeft, monitorLeft));
  const overlapHeight = Math.max(0, Math.min(windowBottom, monitorBottom) - Math.max(windowTop, monitorTop));
  return overlapWidth * overlapHeight;
}

function getMonitorForWindow(position, size, monitors, fallbackMonitor) {
  if (!monitors.length) return fallbackMonitor;
  const byOverlap = monitors
    .map((monitor) => ({ monitor, overlap: getMonitorOverlapArea(position, size, monitor) }))
    .sort((a, b) => b.overlap - a.overlap);
  if (byOverlap[0]?.overlap > 0) return byOverlap[0].monitor;

  const windowCenterX = position.x + size.width / 2;
  const windowCenterY = position.y + size.height / 2;
  return monitors
    .map((monitor) => {
      const centerX = monitor.position.x + monitor.size.width / 2;
      const centerY = monitor.position.y + monitor.size.height / 2;
      return {
        monitor,
        distance: Math.hypot(windowCenterX - centerX, windowCenterY - centerY),
      };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.monitor || fallbackMonitor;
}

function getVirtualDesktopBounds(monitors, fallbackMonitor) {
  const available = monitors && monitors.length ? monitors : (fallbackMonitor ? [fallbackMonitor] : []);
  if (!available.length) return null;
  const left = Math.min(...available.map((monitor) => monitor.position.x));
  const top = Math.min(...available.map((monitor) => monitor.position.y));
  const right = Math.max(...available.map((monitor) => monitor.position.x + monitor.size.width));
  const bottom = Math.max(...available.map((monitor) => monitor.position.y + monitor.size.height));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    left,
    top,
    right,
    bottom,
  };
}

function getFloatingMonitorBounds(monitor) {
  if (!monitor) return null;
  const left = monitor.position.x;
  const top = monitor.position.y;
  const right = left + monitor.size.width;
  const bottom = top + monitor.size.height;
  return {
    x: left,
    y: top,
    width: monitor.size.width,
    height: monitor.size.height,
    left,
    top,
    right,
    bottom,
  };
}

function normalizeFloatingBounds(bounds) {
  if (!bounds) return null;
  const left = typeof bounds.left === 'number' ? bounds.left : bounds.x;
  const top = typeof bounds.top === 'number' ? bounds.top : bounds.y;
  const width = bounds.width;
  const height = bounds.height;
  if (![left, top, width, height].every(Number.isFinite)) return null;
  return {
    x: left,
    y: top,
    width,
    height,
    left,
    top,
    right: typeof bounds.right === 'number' ? bounds.right : left + width,
    bottom: typeof bounds.bottom === 'number' ? bounds.bottom : top + height,
  };
}

function isSameFloatingBounds(a, b) {
  const left = normalizeFloatingBounds(a);
  const right = normalizeFloatingBounds(b);
  if (!left || !right) return false;
  return Math.abs(left.left - right.left) <= 2 &&
    Math.abs(left.top - right.top) <= 2 &&
    Math.abs(left.right - right.right) <= 2 &&
    Math.abs(left.bottom - right.bottom) <= 2;
}

function isFloatingEdgeExternal(edge, bounds, monitors, fallbackMonitor) {
  const monitorBounds = normalizeFloatingBounds(bounds);
  const virtualBounds = getVirtualDesktopBounds(monitors, fallbackMonitor);
  if (!monitorBounds || !virtualBounds) return true;
  const tolerance = 2;
  if (edge === 'left') return Math.abs(monitorBounds.left - virtualBounds.left) <= tolerance;
  if (edge === 'right') return Math.abs(monitorBounds.right - virtualBounds.right) <= tolerance;
  if (edge === 'top') return Math.abs(monitorBounds.top - virtualBounds.top) <= tolerance;
  if (edge === 'bottom') return Math.abs(monitorBounds.bottom - virtualBounds.bottom) <= tolerance;
  return true;
}

function getFloatingDockCandidates(metrics) {
  if (!metrics) return [];
  const { position, size, scale, monitor, monitors } = metrics;
  const available = monitors && monitors.length ? monitors : (monitor ? [monitor] : []);
  const ownerBounds = getFloatingMonitorBounds(monitor);
  const threshold = Math.max(48, Math.round(FLOATING_EDGE_DOCK_THRESHOLD_PX * scale));
  const rangePadding = threshold;
  const candidates = [];

  available.forEach((item) => {
    const bounds = getFloatingMonitorBounds(item);
    if (!bounds) return;
    const overlapsVertically = position.y + size.height >= bounds.top - rangePadding &&
      position.y <= bounds.bottom + rangePadding;
    const overlapsHorizontally = position.x + size.width >= bounds.left - rangePadding &&
      position.x <= bounds.right + rangePadding;

    if (overlapsVertically) {
      candidates.push({ edge: 'left', value: Math.abs(position.x - bounds.left), bounds });
      candidates.push({ edge: 'right', value: Math.abs(position.x + size.width - bounds.right), bounds });
    }
    if (overlapsHorizontally) {
      candidates.push({ edge: 'top', value: Math.abs(position.y - bounds.top), bounds });
      candidates.push({ edge: 'bottom', value: Math.abs(position.y + size.height - bounds.bottom), bounds });
    }
  });

  return candidates
    .filter((candidate) => candidate.value <= threshold)
    .map((candidate) => ({
      ...candidate,
      external: isFloatingEdgeExternal(candidate.edge, candidate.bounds, available, monitor),
    }))
    .map((candidate) => ({
      ...candidate,
      owner: isSameFloatingBounds(candidate.bounds, ownerBounds),
    }))
    .sort((a, b) => {
      const distanceDelta = a.value - b.value;
      if (Math.abs(distanceDelta) > 4) return distanceDelta;
      if (a.owner !== b.owner) return a.owner ? -1 : 1;
      return distanceDelta;
    });
}

function detectFloatingDock(metrics, preferredDock = null) {
  const candidates = getFloatingDockCandidates(metrics);
  if (!candidates.length) return null;

  if (preferredDock?.edge && preferredDock?.bounds) {
    const stableCandidate = candidates.find((candidate) =>
      candidate.edge === preferredDock.edge && isSameFloatingBounds(candidate.bounds, preferredDock.bounds)
    );
    if (stableCandidate) return stableCandidate;
  }

  return candidates[0];
}

async function applyFloatingDragFrame() {
  floatingDragFrame = null;
  if (!floatingDragState) return;

  const cursor = await cursorPosition().catch(() => null);
  if (!cursor || !floatingDragState) return;

  const { window: floatingWindow, startCursor, startPosition, size, monitor, monitors } = floatingDragState;
  const bounds = getVirtualDesktopBounds(monitors, monitor);
  if (!bounds) return;
  const x = clampNumber(startPosition.x + cursor.x - startCursor.x, bounds.left, bounds.right - size.width, startPosition.x);
  const y = clampNumber(startPosition.y + cursor.y - startCursor.y, bounds.top, bounds.bottom - size.height, startPosition.y);

  await floatingWindow
    .setPosition(new PhysicalPosition(Math.round(x), Math.round(y)))
    .catch(console.error);
}

function handleFloatingDragMove(event) {
  if (!floatingDragState) return;
  event.preventDefault();
  if (floatingDragFrame) return;
  floatingDragFrame = window.requestAnimationFrame(() => {
    applyFloatingDragFrame().catch(console.error);
  });
}

async function revealFloatingWindowFromHiddenInteraction(event = null, options = {}) {
  if (options.primaryButtonOnly && event?.button !== 0) return false;
  const hiddenState = await recoverFloatingHiddenStateFromGeometry();
  if (!hiddenState?.hidden) return false;

  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (event?.type === 'pointerdown' || event?.type === 'mousedown') {
    floatingSuppressClickUntil = Date.now() + 400;
  }
  clearFloatingAutoHideTimer();
  floatingPointerInside = true;
  await revealFloatingWindowFromEdge().catch(console.error);
  return true;
}

async function startFloatingDrag(event) {
  if (await revealFloatingWindowFromHiddenInteraction(event, { primaryButtonOnly: true })) return;
  if (event.button !== 0 || event.target.closest('button, input, select, textarea')) return;
  event.preventDefault();
  event.stopPropagation();

  floatingPointerInside = true;
  clearFloatingAutoHideTimer();
  await revealFloatingWindowFromEdge().catch(console.error);

  const metrics = await getFloatingWindowMetrics().catch(() => null);
  const startCursor = await cursorPosition().catch(() => null);
  if (!metrics || !startCursor) return;
  const monitors = await availableMonitors().catch(() => []);

  floatingDragState = {
    window: metrics.window,
    startCursor,
    startPosition: metrics.position,
    size: metrics.size,
    monitor: metrics.monitor,
    monitors: monitors.length ? monitors : [metrics.monitor],
    pointerId: event.pointerId,
    pointerTarget: event.currentTarget,
  };
  floatingAutoHideState = { edge: null, hidden: false };
  setFloatingHiddenUiState(false);
  stopFloatingEdgeWatch();
  stopFloatingRevealPolling();
  document.body.classList.add('floating-dragging');

  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  } catch (error) {
    console.warn('Failed to capture floating pointer', error);
  }

  window.addEventListener('pointermove', handleFloatingDragMove, { passive: false });
  window.addEventListener('pointerup', stopFloatingDrag);
  window.addEventListener('pointercancel', stopFloatingDrag);
  window.addEventListener('blur', stopFloatingDrag);
}

async function getFloatingWindowMetrics() {
  const window = getCurrentWindow();
  const [position, size, scale, current, monitors] = await Promise.all([
    window.outerPosition(),
    window.outerSize(),
    window.scaleFactor(),
    currentMonitor().catch(() => null),
    availableMonitors().catch(() => []),
  ]);
  const monitor = current || getMonitorForWindow(position, size, monitors, monitors[0] || null);
  if (!monitor) return null;

  return { window, position, size, scale, monitor, monitors };
}

function detectFloatingEdge(metrics) {
  return detectFloatingDock(metrics)?.edge || null;
}

function setFloatingHiddenUiState(hidden) {
  document.body?.classList.toggle('floating-hidden', Boolean(hidden));
}

function inferHiddenFloatingDock(metrics) {
  if (!metrics) return null;
  const { position, size, scale, monitor, monitors } = metrics;
  const available = monitors && monitors.length ? monitors : (monitor ? [monitor] : []);
  const visibleEdge = Math.max(8, Math.round((FLOATING_VISIBLE_EDGE_PX + 6) * scale));
  const near = (a, b) => Math.abs(a - b) <= visibleEdge + 2;

  for (const item of available) {
    const bounds = getFloatingMonitorBounds(item);
    if (!bounds) continue;
    const leftExternal = isFloatingEdgeExternal('left', bounds, available, monitor);
    const rightExternal = isFloatingEdgeExternal('right', bounds, available, monitor);
    const topExternal = isFloatingEdgeExternal('top', bounds, available, monitor);
    const bottomExternal = isFloatingEdgeExternal('bottom', bounds, available, monitor);
    const externalLeft = leftExternal && position.x < bounds.left && position.x + size.width <= bounds.left + visibleEdge;
    const externalRight = rightExternal && position.x + size.width > bounds.right && position.x >= bounds.right - visibleEdge;
    const externalTop = topExternal && position.y < bounds.top && position.y + size.height <= bounds.top + visibleEdge;
    const externalBottom = bottomExternal && position.y + size.height > bounds.bottom && position.y >= bounds.bottom - visibleEdge;
    const collapsedLeft = size.width <= visibleEdge + 2 &&
      near(position.x, bounds.left) &&
      position.x >= bounds.left - 2 &&
      position.x <= bounds.left + visibleEdge;
    const collapsedRight = size.width <= visibleEdge + 2 &&
      near(position.x + size.width, bounds.right) &&
      position.x + size.width <= bounds.right + 2 &&
      position.x + size.width >= bounds.right - visibleEdge;
    const collapsedTop = size.height <= visibleEdge + 2 &&
      near(position.y, bounds.top) &&
      position.y >= bounds.top - 2 &&
      position.y <= bounds.top + visibleEdge;
    const collapsedBottom = size.height <= visibleEdge + 2 &&
      near(position.y + size.height, bounds.bottom) &&
      position.y + size.height <= bounds.bottom + 2 &&
      position.y + size.height >= bounds.bottom - visibleEdge;

    if (externalLeft || collapsedLeft) {
      return { edge: 'left', bounds, external: leftExternal };
    }
    if (externalRight || collapsedRight) {
      return { edge: 'right', bounds, external: rightExternal };
    }
    if (externalTop || collapsedTop) {
      return { edge: 'top', bounds, external: topExternal };
    }
    if (externalBottom || collapsedBottom) {
      return { edge: 'bottom', bounds, external: bottomExternal };
    }
  }
  return null;
}

function getFloatingHiddenRect(edge, bounds, restore, scale, external) {
  const visibleEdge = Math.max(4, Math.round(FLOATING_VISIBLE_EDGE_PX * scale));
  let x = restore.x;
  let y = restore.y;
  let width = restore.width;
  let height = restore.height;

  if (!external && (edge === 'left' || edge === 'right')) {
    width = visibleEdge;
  } else if (!external && (edge === 'top' || edge === 'bottom')) {
    height = visibleEdge;
  }

  if (edge === 'left' && external) {
    x = bounds.left - restore.width + visibleEdge;
    y = clampNumber(restore.y, bounds.top, bounds.bottom - restore.height, restore.y);
  } else if (edge === 'right' && external) {
    x = bounds.right - visibleEdge;
    y = clampNumber(restore.y, bounds.top, bounds.bottom - restore.height, restore.y);
  } else if (edge === 'top' && external) {
    y = bounds.top - restore.height + visibleEdge;
    x = clampNumber(restore.x, bounds.left, bounds.right - restore.width, restore.x);
  } else if (edge === 'bottom' && external) {
    y = bounds.bottom - visibleEdge;
    x = clampNumber(restore.x, bounds.left, bounds.right - restore.width, restore.x);
  } else if (edge === 'left') {
    x = bounds.left;
    y = clampNumber(restore.y, bounds.top, bounds.bottom - restore.height, restore.y);
  } else if (edge === 'right') {
    x = bounds.right - width;
    y = clampNumber(restore.y, bounds.top, bounds.bottom - restore.height, restore.y);
  } else if (edge === 'top') {
    y = bounds.top;
    x = clampNumber(restore.x, bounds.left, bounds.right - restore.width, restore.x);
  } else if (edge === 'bottom') {
    y = bounds.bottom - height;
    x = clampNumber(restore.x, bounds.left, bounds.right - restore.width, restore.x);
  }

  return { x, y, width, height };
}

function getFloatingRestoreRect(edge, metrics, dockBounds = null) {
  const { position, size, scale, monitor } = metrics;
  const bounds = normalizeFloatingBounds(dockBounds) || getFloatingMonitorBounds(monitor);
  if (!bounds) return { x: position.x, y: position.y, width: size.width, height: size.height };
  const width = Math.round(clampNumber(settings.floatingWindowWidth, FLOATING_MIN_WIDTH, FLOATING_MAX_WIDTH, 260) * scale);
  const height = Math.round(getFloatingGeometry(false).closedHeight * scale);

  if (edge === 'left') {
    return { x: bounds.left, y: clampNumber(position.y, bounds.top, bounds.bottom - height, bounds.top), width, height };
  }
  if (edge === 'right') {
    return { x: bounds.right - width, y: clampNumber(position.y, bounds.top, bounds.bottom - height, bounds.top), width, height };
  }
  if (edge === 'top') {
    return { x: clampNumber(position.x, bounds.left, bounds.right - width, bounds.left), y: bounds.top, width, height };
  }
  if (edge === 'bottom') {
    return { x: clampNumber(position.x, bounds.left, bounds.right - width, bounds.left), y: bounds.bottom - height, width, height };
  }
  return { x: position.x, y: position.y, width: size.width, height: size.height };
}

async function startFloatingRevealWatch(edge, metrics, restore, dockBounds = null) {
  if (!edge || !metrics || !restore) return;
  const { scale, monitor } = metrics;
  const bounds = normalizeFloatingBounds(dockBounds) || getFloatingMonitorBounds(monitor);
  if (!bounds) return;
  await invoke('start_floating_reveal_watch', {
    watch: {
      edge,
      restore,
      monitor: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      revealBand: Math.max(56, Math.round((FLOATING_VISIBLE_EDGE_PX + 36) * scale)),
    },
  }).catch(console.error);
}

async function recoverFloatingHiddenState() {
  if (!settings.floatingWindowAutoHide || floatingAutoHideState.hidden) return;
  const metrics = await getFloatingWindowMetrics().catch(() => null);
  const dock = inferHiddenFloatingDock(metrics);
  if (!metrics || !dock) return;

  const restore = getFloatingRestoreRect(dock.edge, metrics, dock.bounds);
  floatingAutoHideState = { edge: dock.edge, hidden: true, restore, bounds: dock.bounds, external: dock.external };
  setFloatingHiddenUiState(true);
  await startFloatingRevealWatch(dock.edge, metrics, restore, dock.bounds);
  startFloatingRevealPolling();
}

async function recoverFloatingHiddenStateFromGeometry() {
  if (floatingAutoHideState.hidden && floatingAutoHideState.edge) return floatingAutoHideState;
  const metrics = await getFloatingWindowMetrics().catch(() => null);
  const dock = inferHiddenFloatingDock(metrics);
  if (!metrics || !dock) return null;

  const restore = floatingAutoHideState.restore || getFloatingRestoreRect(dock.edge, metrics, dock.bounds);
  floatingAutoHideState = {
    edge: dock.edge,
    hidden: true,
    restore,
    bounds: dock.bounds,
    external: dock.external,
  };
  setFloatingHiddenUiState(true);
  await startFloatingRevealWatch(dock.edge, metrics, restore, dock.bounds);
  startFloatingRevealPolling();
  return floatingAutoHideState;
}

async function pinFloatingHiddenWindowToEdge() {
  if (!floatingAutoHideState.hidden || !floatingAutoHideState.edge) return;
  const metrics = await getFloatingWindowMetrics().catch(() => null);
  if (!metrics) return;
  const bounds = normalizeFloatingBounds(floatingAutoHideState.bounds) || getFloatingMonitorBounds(metrics.monitor);
  if (!bounds) return;
  const external = typeof floatingAutoHideState.external === 'boolean'
    ? floatingAutoHideState.external
    : isFloatingEdgeExternal(floatingAutoHideState.edge, bounds, metrics.monitors, metrics.monitor);
  const restore = floatingAutoHideState.restore || getFloatingRestoreRect(floatingAutoHideState.edge, metrics, bounds);
  const hiddenRect = getFloatingHiddenRect(floatingAutoHideState.edge, bounds, restore, metrics.scale, external);

  floatingGeometrySyncing = true;
  await metrics.window.setSize(new PhysicalSize(Math.round(hiddenRect.width), Math.round(hiddenRect.height))).catch(console.error);
  await metrics.window.setPosition(new PhysicalPosition(Math.round(hiddenRect.x), Math.round(hiddenRect.y))).catch(console.error);
  floatingAutoHideState = {
    edge: floatingAutoHideState.edge,
    hidden: true,
    restore,
    bounds,
    external,
  };
  setFloatingHiddenUiState(true);
  window.setTimeout(() => {
    floatingGeometrySyncing = false;
  }, 180);
}

function scheduleFloatingHiddenPin() {
  if (!floatingAutoHideState.hidden || floatingGeometrySyncing) return;
  window.clearTimeout(floatingHiddenPinTimer);
  floatingHiddenPinTimer = window.setTimeout(() => {
    floatingHiddenPinTimer = null;
    pinFloatingHiddenWindowToEdge().catch(console.error);
  }, 60);
}

async function setFloatingWindowEdgePosition(edge, hidden, dockBounds = null) {
  const metrics = await getFloatingWindowMetrics();
  if (!metrics || !edge) return;
  const { window, position, size, scale, monitor, monitors } = metrics;
  const bounds = normalizeFloatingBounds(dockBounds) || getFloatingMonitorBounds(monitor);
  if (!bounds) return;
  const external = isFloatingEdgeExternal(edge, bounds, monitors, monitor);
  let x = position.x;
  let y = position.y;
  let width = size.width;
  let height = size.height;

  if (hidden) {
    const restore = { x: position.x, y: position.y, width: size.width, height: size.height };
    const hiddenRect = getFloatingHiddenRect(edge, bounds, restore, scale, external);
    ({ x, y, width, height } = hiddenRect);

    floatingGeometrySyncing = true;
    await window.setSize(new PhysicalSize(Math.round(width), Math.round(height))).catch(console.error);
    await window.setPosition(new PhysicalPosition(Math.round(x), Math.round(y))).catch(console.error);
    floatingAutoHideState = { edge, hidden: true, restore, bounds, external };
    setFloatingHiddenUiState(true);
    await startFloatingRevealWatch(edge, metrics, restore, bounds);
    startFloatingRevealPolling();
    window.setTimeout(() => {
      floatingGeometrySyncing = false;
    }, 250);
    return;
  }

  const restore = floatingAutoHideState.restore || {
    x: position.x,
    y: position.y,
    width: Math.round(settings.floatingWindowWidth * scale),
    height: Math.round(getFloatingGeometry(floatingTaskMenuOpen).closedHeight * scale),
  };
  width = restore.width;
  height = restore.height;
  if (edge === 'left') {
    x = bounds.left;
    y = clampNumber(restore.y, bounds.top, bounds.bottom - height, restore.y);
  } else if (edge === 'right') {
    x = bounds.right - width;
    y = clampNumber(restore.y, bounds.top, bounds.bottom - height, restore.y);
  } else if (edge === 'top') {
    x = clampNumber(restore.x, bounds.left, bounds.right - width, restore.x);
    y = bounds.top;
  } else if (edge === 'bottom') {
    x = clampNumber(restore.x, bounds.left, bounds.right - width, restore.x);
    y = bounds.bottom - height;
  }

  floatingGeometrySyncing = true;
  await invoke('stop_floating_reveal_watch').catch(() => {});
  await window.setPosition(new PhysicalPosition(Math.round(x), Math.round(y))).catch(console.error);
  await window.setSize(new PhysicalSize(Math.round(width), Math.round(height))).catch(console.error);
  floatingAutoHideState = { edge, hidden: false, restore: null, bounds, external };
  setFloatingHiddenUiState(false);
  stopFloatingRevealPolling();
  if (settings.floatingWindowAutoHide) {
    startFloatingEdgeWatch();
  }
  window.setTimeout(() => {
    floatingGeometrySyncing = false;
  }, 250);
}

async function updateFloatingEdgeCandidate() {
  if (!document.body.classList.contains('floating-mode') || !settings.floatingWindowAutoHide) return;
  if (floatingTaskMenuOpen) return;
  const metrics = await getFloatingWindowMetrics().catch(() => null);
  const dock = detectFloatingDock(metrics, floatingAutoHideState);
  floatingAutoHideState = dock
    ? { edge: dock.edge, hidden: false, bounds: dock.bounds, external: dock.external }
    : { edge: null, hidden: false };
  if (dock) {
    startFloatingEdgeWatch();
  } else {
    stopFloatingEdgeWatch();
  }
  if (dock && !floatingPointerInside) {
    scheduleFloatingAutoHide();
  }
}

async function hideFloatingWindowToEdge() {
  if (!settings.floatingWindowAutoHide || floatingTaskMenuOpen) return;
  const metrics = await getFloatingWindowMetrics().catch(() => null);
  const dock = floatingAutoHideState.edge
    ? floatingAutoHideState
    : detectFloatingDock(metrics);
  if (!dock?.edge) return;
  await setFloatingWindowEdgePosition(dock.edge, true, dock.bounds);
}

async function revealFloatingWindowFromEdge() {
  if (!floatingAutoHideState.hidden || !floatingAutoHideState.edge) return;
  await invoke('stop_floating_reveal_watch').catch(() => {});
  await setFloatingWindowEdgePosition(floatingAutoHideState.edge, false, floatingAutoHideState.bounds);
}

function markFloatingWindowRevealed() {
  const { edge, bounds, external } = floatingAutoHideState;
  floatingAutoHideState = { edge: edge || null, hidden: false, restore: null, bounds, external };
  setFloatingHiddenUiState(false);
  floatingPointerInside = true;
  clearFloatingAutoHideTimer();
  stopFloatingRevealPolling();
  if (settings.floatingWindowAutoHide) {
    window.setTimeout(() => {
      updateFloatingEdgeCandidate().catch(console.error);
    }, 150);
  }
}

function stopFloatingRevealPolling() {
  if (floatingRevealPollTimer) {
    window.clearInterval(floatingRevealPollTimer);
    floatingRevealPollTimer = null;
  }
}

function stopFloatingEdgeWatch() {
  if (floatingEdgeWatchTimer) {
    window.clearInterval(floatingEdgeWatchTimer);
    floatingEdgeWatchTimer = null;
  }
}

function startFloatingEdgeWatch() {
  if (floatingEdgeWatchTimer) return;
  floatingEdgeWatchTimer = window.setInterval(() => {
    checkFloatingAutoHideEdge().catch(console.error);
  }, 220);
}

function startFloatingRevealPolling() {
  stopFloatingRevealPolling();
  stopFloatingEdgeWatch();
  floatingRevealPollTimer = window.setInterval(() => {
    checkFloatingRevealEdge().catch(console.error);
  }, 200);
}

function isCursorInsideFloatingWindow(metrics, cursor, padding = 0) {
  if (!metrics || !cursor) return false;
  const { position, size } = metrics;
  return cursor.x >= position.x - padding &&
    cursor.x <= position.x + size.width + padding &&
    cursor.y >= position.y - padding &&
    cursor.y <= position.y + size.height + padding;
}

function clearFloatingAutoHideTimer() {
  window.clearTimeout(floatingAutoHideTimer);
  floatingAutoHideTimer = null;
}

async function checkFloatingAutoHideEdge() {
  if (!settings.floatingWindowAutoHide || floatingTaskMenuOpen || floatingDragState || floatingAutoHideState.hidden) {
    if (!floatingAutoHideState.hidden) stopFloatingEdgeWatch();
    return;
  }

  const metrics = await getFloatingWindowMetrics().catch(() => null);
  if (!metrics) return;

  const dock = floatingAutoHideState.edge
    ? detectFloatingDock(metrics, floatingAutoHideState) || floatingAutoHideState
    : detectFloatingDock(metrics);
  if (!dock?.edge) {
    floatingAutoHideState = { edge: null, hidden: false };
    stopFloatingEdgeWatch();
    return;
  }

  floatingAutoHideState = {
    edge: dock.edge,
    hidden: false,
    bounds: dock.bounds,
    external: dock.external,
  };
  const cursor = await cursorPosition().catch(() => null);
  if (!cursor) return;

  floatingPointerInside = isCursorInsideFloatingWindow(metrics, cursor, Math.round(4 * metrics.scale));
  if (!floatingPointerInside) {
    scheduleFloatingAutoHide();
  }
}

async function checkFloatingRevealEdge() {
  if (!floatingAutoHideState.hidden || !floatingAutoHideState.edge) {
    stopFloatingRevealPolling();
    return;
  }

  const metrics = await getFloatingWindowMetrics().catch(() => null);
  if (!metrics) return;
  const cursor = await cursorPosition().catch(() => null);
  if (!cursor) return;

  const { position, size, scale, monitor } = metrics;
  const bounds = normalizeFloatingBounds(floatingAutoHideState.bounds) || getFloatingMonitorBounds(monitor);
  if (!bounds) return;
  const edge = floatingAutoHideState.edge;
  const revealBand = Math.max(48, Math.round((FLOATING_VISIBLE_EDGE_PX + 28) * scale));
  const rangePadding = Math.max(18, Math.round(18 * scale));
  const inVerticalRange = cursor.y >= position.y - rangePadding && cursor.y <= position.y + size.height + rangePadding;
  const inHorizontalRange = cursor.x >= position.x - rangePadding && cursor.x <= position.x + size.width + rangePadding;
  const shouldReveal =
    (edge === 'left' && cursor.x >= bounds.left - revealBand && cursor.x <= bounds.left + revealBand && inVerticalRange) ||
    (edge === 'right' && cursor.x >= bounds.right - revealBand && cursor.x <= bounds.right + revealBand && inVerticalRange) ||
    (edge === 'top' && cursor.y >= bounds.top - revealBand && cursor.y <= bounds.top + revealBand && inHorizontalRange) ||
    (edge === 'bottom' && cursor.y >= bounds.bottom - revealBand && cursor.y <= bounds.bottom + revealBand && inHorizontalRange);

  if (shouldReveal) {
    floatingPointerInside = true;
    await revealFloatingWindowFromEdge();
  }
}

function scheduleFloatingAutoHide() {
  if (!settings.floatingWindowAutoHide) return;
  if (floatingDragState) return;
  if (floatingAutoHideTimer) return;
  floatingAutoHideTimer = window.setTimeout(async () => {
    floatingAutoHideTimer = null;
    const metrics = await getFloatingWindowMetrics().catch(() => null);
    const cursor = await cursorPosition().catch(() => null);
    if (metrics && cursor && isCursorInsideFloatingWindow(metrics, cursor, Math.round(4 * metrics.scale))) {
      floatingPointerInside = true;
      return;
    }
    await hideFloatingWindowToEdge().catch(console.error);
  }, 650);
}

async function ensureFloatingAutoHideState() {
  clearFloatingAutoHideTimer();
  if (!settings.floatingWindowAutoHide && floatingAutoHideState.hidden) {
    await revealFloatingWindowFromEdge().catch(console.error);
  }
  if (!settings.floatingWindowAutoHide) {
    floatingAutoHideState = { edge: null, hidden: false };
    setFloatingHiddenUiState(false);
    invoke('stop_floating_reveal_watch').catch(() => {});
    stopFloatingEdgeWatch();
    stopFloatingRevealPolling();
    return;
  }

  updateFloatingEdgeCandidate().catch(console.error);
}

// 同步任务配置到后端
async function syncTasksToBackend() {
  const tasksForBackend = settings.tasks.map(task => ({
    id: task.id,
    title: getTaskDisplayTitle(task),
    desc: getTaskDisplayDesc(task),
    interval: task.interval,
    enabled: task.enabled,
    icon: task.icon,
    auto_reset_on_idle: settings.resetOnIdle, // 使用全局设置
    schedule_type: task.scheduleType || 'interval',
    daily_times: Array.isArray(task.dailyTimes) ? task.dailyTimes : []
  }));
  await invoke('sync_tasks', { tasks: tasksForBackend }).catch(console.error);
}

function extractDialogPath(selected) {
  if (!selected) return '';
  if (typeof selected === 'string') return selected;
  if (Array.isArray(selected)) return extractDialogPath(selected[0]);
  return selected.path || '';
}

function normalizeDailyTimes(value) {
  return String(value || '')
    .split(/[,\s，、]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const match = item.match(/^(\d{1,2}):(\d{1,2})$/);
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour > 23 || minute > 59) return null;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    })
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .sort();
}

function migrateTaskLocalization(task) {
  const migrated = { ...task };
  if (DEFAULT_TASK_IDS.includes(migrated.id)) {
    return migrated;
  }

  if (!migrated.titleKey && GENERATED_TASK_TITLE_VALUES.includes(migrated.title)) {
    migrated.titleKey = 'tasks.newTask.title';
  }
  if (!migrated.descKey && GENERATED_TASK_DESC_VALUES.includes(migrated.desc)) {
    migrated.descKey = 'tasks.newTask.desc';
  }
  return migrated;
}

function isDailyTask(task) {
  return task.scheduleType === 'daily' && Array.isArray(task.dailyTimes) && task.dailyTimes.length > 0;
}

function getCountdownTotal(task) {
  return countdownTotals[task.id] || (isDailyTask(task) ? 24 * 60 * 60 : task.interval * 60);
}

function getNextTaskInfo() {
  let nextTask = null;
  let minTime = Infinity;
  settings.tasks.forEach(task => {
    const remaining = countdowns[task.id];
    if (task.enabled && !taskPausedStatus[task.id] && remaining !== undefined && remaining < minTime) {
      minTime = remaining;
      nextTask = task;
    }
  });

  return { task: nextTask, remaining: minTime === Infinity ? 0 : minTime };
}

function getFloatingReminderInfo() {
  const selectedTaskId = settings.floatingSelectedTaskId || '';
  if (selectedTaskId) {
    const task = settings.tasks.find(item => item.id === selectedTaskId);
    if (task) {
      return { task, remaining: countdowns[task.id] ?? 0 };
    }
  }
  return getNextTaskInfo();
}

function getFloatingTaskOptions() {
  const sortedTasks = [...settings.tasks].sort((a, b) => {
    const aRank = !a.enabled ? 2 : taskPausedStatus[a.id] ? 1 : 0;
    const bRank = !b.enabled ? 2 : taskPausedStatus[b.id] ? 1 : 0;
    if (aRank !== bRank) return aRank - bRank;
    const aRemaining = countdowns[a.id] ?? Number.POSITIVE_INFINITY;
    const bRemaining = countdowns[b.id] ?? Number.POSITIVE_INFINITY;
    return aRemaining - bRemaining;
  });

  return [
    { id: '', label: t('floating.nextReminder') },
    ...sortedTasks.map(task => {
      const remaining = countdowns[task.id];
      const state = taskPausedStatus[task.id]
        ? ` (${t('status.paused')})`
        : !task.enabled
          ? ` (${t('status.disabled')})`
          : '';
      const time = remaining === undefined ? '' : ` ${formatDuration(remaining)}`;
      return { id: task.id, label: `${getTaskDisplayTitle(task)}${time}${state}` };
    })
  ];
}

async function selectFloatingTask(taskId) {
  settings.floatingSelectedTaskId = taskId;
  floatingTaskMenuOpen = false;
  await saveSettings();
  updateFloatingUI();
  await syncFloatingWindowGeometry(false);
}

async function setFloatingTaskMenuOpen(open) {
  if (open) {
    await revealFloatingWindowFromEdge().catch(console.error);
  }
  floatingTaskMenuOpen = open;
  updateFloatingUI();
  await syncFloatingWindowGeometry(open);
}

async function closeFloatingTaskMenu() {
  if (!floatingTaskMenuOpen) return;
  await setFloatingTaskMenuOpen(false);
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getCustomCountdownRemaining() {
  if (!settings.floatingCountdownTarget) return null;
  const target = new Date(settings.floatingCountdownTarget);
  if (Number.isNaN(target.getTime())) return null;
  return Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
}

function showMessage(type, text, timeout = 3500) {
  notificationMessage = { type, text };
  if (document.body.classList.contains('floating-mode')) {
    updateFloatingUI();
  } else {
    renderFullUI();
  }
  if (timeout > 0) {
    setTimeout(() => {
      notificationMessage = null;
      if (document.body.classList.contains('floating-mode')) {
        updateFloatingUI();
      } else {
        renderFullUI();
      }
    }, timeout);
  }
}

function renderCurrentSurface() {
  if (document.body.classList.contains('floating-mode')) {
    updateFloatingUI();
  } else {
    renderFullUI();
  }
}

function applyCountdownInfo(info) {
  countdowns[info.id] = info.remaining;
  countdownTotals[info.id] = info.total;
  snoozedStatus[info.id] = {
    active: info.snoozed,
    remaining: info.snooze_remaining,
    count: info.snooze_count
  };
  taskPausedStatus[info.id] = !!info.task_paused;
}

function applyCountdownUpdates(updates) {
  if (!Array.isArray(updates)) return;
  updates.forEach(applyCountdownInfo);
}

async function refreshCountdownsFromBackend(options = {}) {
  const { render = true } = options;
  const updates = await invoke('get_countdowns');
  applyCountdownUpdates(updates);
  updateTrayTooltip(true);
  if (render) {
    renderCurrentSurface();
  }
}

async function applyPauseState(paused, options = {}) {
  const { broadcast = true, render = true } = options;
  isPaused = paused;
  if (isPaused) {
    await invoke('timer_pause').catch(console.error);
  } else {
    await invoke('timer_resume').catch(console.error);
  }
  await refreshCountdownsFromBackend({ render: false }).catch(console.error);
  invoke('update_pause_menu', { paused: isPaused }).catch(() => {});
  if (broadcast) {
    emit('pause-state-updated', { paused: isPaused }).catch(() => {});
  }
  updateTrayTooltip(true);
  if (render) {
    renderCurrentSurface();
  }
}

async function handlePauseStateUpdated(paused) {
  if (isPaused === paused) return;
  isPaused = paused;
  await refreshCountdownsFromBackend({ render: false }).catch(console.error);
  updateTrayTooltip(true);
  renderCurrentSurface();
}

function watchPauseState() {
  listen('pause-state-updated', (event) => {
    handlePauseStateUpdated(!!event.payload?.paused).catch(console.error);
  }).catch(console.error);
}

async function playReminderSound() {
  if (!settings.soundEnabled) return;
  await invoke('play_notification_sound', {
    customSoundPath: settings.customSoundPath || null
  }).catch(err => {
    console.error('Sound invoke failed:', err);
    showMessage('warning', t('notification.soundFailed'));
  });
}

async function ensureNotificationPermission() {
  try {
    notificationPermissionGranted = await isPermissionGranted();
    if (!notificationPermissionGranted) {
      const permission = await requestPermission();
      notificationPermissionGranted = permission === 'granted';
    }
  } catch (e) {
    notificationPermissionGranted = false;
    console.error('Failed to check notification permission', e);
  }
  return notificationPermissionGranted;
}

async function notifySystem(title, body, options = {}) {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    if (options.showToast !== false) {
      showMessage('warning', t('notification.permissionDenied'));
    }
    return false;
  }

  try {
    await invoke('show_notification', { title, body });
    return true;
  } catch (e) {
    console.error('System notification failed:', e);
    if (options.showToast !== false) {
      showMessage('warning', t('notification.fallback'));
    }
    return false;
  }
}

async function syncFloatingWindow() {
  if (settings.floatingWindowEnabled) {
    await invoke('show_floating_window').catch(console.error);
  } else {
    await invoke('hide_floating_window').catch(console.error);
  }
  emit('settings-updated', settings).catch(() => {});
}

async function handleTriggeredTask(task) {
  const now = Date.now();
  if (recentTriggeredTasks[task.id] && now - recentTriggeredTasks[task.id] < 5000) {
    return;
  }
  recentTriggeredTasks[task.id] = now;

  // 找到完整的任务配置
  const fullTask = settings.tasks.find(t => t.id === task.id) || task;

  if (activePopup || lockScreenState.active) {
    // 如果当前已有弹窗或锁屏，加入队列
    if (!taskQueue.find(t => t.id === fullTask.id)) {
      taskQueue.push(fullTask);
    }
  } else {
    await triggerNotification(fullTask);
  }
}

async function pollTriggeredTasks() {
  try {
    const tasks = await invoke('take_triggered_tasks');
    if (Array.isArray(tasks)) {
      for (const task of tasks) {
        await handleTriggeredTask(task);
      }
    }
  } catch (e) {
    console.error('Failed to poll triggered tasks', e);
  }
}

function startTriggeredTaskPolling() {
  const run = async () => {
    await pollTriggeredTasks();
    window.setTimeout(run, 1000);
  };
  run();
}

window.__HEALTH_REMINDER_HANDLE_TRIGGER__ = (task) => {
  handleTriggeredTask(task).catch(console.error);
};

async function init() {
  applyTheme(settings.theme); // 在加载设置后立即应用主题
  await loadAppVersion();
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'floating') {
    document.body.classList.add('floating-mode');
    setLocale(settings.language || detectLocale());
    renderFloatingUI();

    window.setTimeout(async () => {
      await loadSettings();
      applyTheme(settings.theme);
      setLocale(settings.language || detectLocale());
      isPaused = await invoke('timer_is_paused').catch(() => false);
      renderFloatingUI();
      bindFloatingWindowLifecycle().catch(console.error);
      syncFloatingWindowGeometry(false).catch(console.error);
      recoverFloatingHiddenState().catch(console.error);

      watchPauseState();

      document.addEventListener('pointerdown', (event) => {
        if (!floatingTaskMenuOpen) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('#floatingTaskMenu') || target.closest('#floatingTaskCycleBtn')) return;
        closeFloatingTaskMenu().catch(console.error);
      });
      window.addEventListener('blur', () => {
        closeFloatingTaskMenu().catch(console.error);
      });

      listen('countdown-update', (event) => {
        applyCountdownUpdates(event.payload);
        updateFloatingUI();
      }).catch(console.error);

      listen('settings-updated', (event) => {
        settings = { ...settings, ...event.payload };
        normalizeFloatingSettings();
        setLocale(settings.language || detectLocale());
        applyTheme(settings.theme);
        renderFloatingUI();
        ensureFloatingAutoHideState().catch(console.error);
        recoverFloatingHiddenState().catch(console.error);
        syncFloatingWindowGeometry(floatingTaskMenuOpen).catch(console.error);
      });

      window.__HEALTH_REMINDER_FLOATING_REVEALED__ = markFloatingWindowRevealed;
      listen('floating-window-revealed', () => {
        markFloatingWindowRevealed();
      }).catch(console.error);

      setInterval(updateFloatingUI, 1000);
    }, 500);
    return;
  }

  if (urlParams.get('mode') === 'lock_slave') {
    isLockSlaveWindow = true;
    const task = {
      title: urlParams.get('title') || '休息时间',
      desc: urlParams.get('desc') || '让眼睛休息一下',
      icon: urlParams.get('icon') || 'eye',
      id: 'slave_lock'
    };
    const duration = parseInt(urlParams.get('duration') || '10');

    // Parse slave settings
    settings.lockDuration = duration;
    settings.strictMode = urlParams.get('strict_mode') === 'true';
    settings.allowStrictSnooze = urlParams.get('allow_strict_snooze') === 'true';
    settings.maxSnoozeCount = parseInt(urlParams.get('max_snooze_count') || '1');
    settings.lockScreenBgImage = urlParams.get('bg_image') || '';

    const taskSnoozeMinutes = parseInt(urlParams.get('snooze_minutes') || '5');
    const currentSnoozeCount = parseInt(urlParams.get('current_snooze_count') || '0');

    task.snoozeMinutes = taskSnoozeMinutes;
    snoozedStatus[task.id] = { count: currentSnoozeCount, active: false, remaining: 0 };

    lockScreenState = {
      active: true,
      remaining: duration,
      task: task,
      unlockProgress: 0,
      unlockTimer: null,
      waitingConfirm: false,
    };

    renderFullUI();

    // 隐藏从属屏幕的解锁按钮
    setTimeout(() => {
      const btn = document.querySelector('.unlock-btn');
      if (btn) btn.style.display = 'none';
    }, 0);

    const lockInterval = setInterval(() => {
      lockScreenState.remaining--;
      updateLockScreenTimer();
      if (lockScreenState.remaining <= 0) {
        clearInterval(lockInterval);
      }
    }, 1000);

    return;
  }

  await loadSettings();
  applyTheme(settings.theme); // 确保在加载设置后立即应用主题
  isPaused = await invoke('timer_is_paused').catch(() => false);
  startedSilent = await invoke('was_started_silent').catch(() => false);

  // 初始化语言设置
  if (settings.language) {
    setLocale(settings.language);
  } else {
    // 如果没有保存的语言设置，自动检测
    settings.language = detectLocale();
    setLocale(settings.language);
  }

  // 通知后端更新托盘菜单语言（确保启动时托盘菜单语言与界面一致）
  invoke('update_tray_language', { language: settings.language }).catch(() => {});

  try {
    settings.autoStart = await isEnabled();
  } catch (e) {
    console.error('Failed to check autostart status', e);
  }

  await ensureNotificationPermission();

  // 初始化 countdowns 对象用于 UI 显示
  settings.tasks.forEach(task => {
    if (countdowns[task.id] === undefined) {
      countdowns[task.id] = isDailyTask(task) ? 0 : task.interval * 60;
    }
  });

  // 同步任务到后端定时器
  await syncTasksToBackend();

  // 同步空闲阈值到后端
  await invoke('set_idle_threshold', { seconds: settings.idleThreshold }).catch(console.error);

  renderFullUI();

  isUiSuspended = document.hidden;
  document.addEventListener('visibilitychange', () => {
    isUiSuspended = document.hidden;
    if (!isUiSuspended) {
      cacheDomRefs();
      updateLiveValues();
      updateTrayTooltip(true);
    }
  });

  // 监听后端倒计时更新事件
  await listen('countdown-update', (event) => {
    const updates = event.payload;
    updates.forEach(info => {
      applyCountdownInfo(info);
      
      // 预提醒逻辑
      const task = settings.tasks.find(t => t.id === info.id);
      const preNotifyTime = (task && task.preNotificationSeconds !== undefined) ? task.preNotificationSeconds : 5;
      
      if (info.enabled && !info.task_paused && !isIdle && !isPaused && preNotifyTime > 0 && info.remaining === preNotifyTime) {
        if (task) {
           if (settings.soundEnabled) {
             playReminderSound();
           }
           notifySystem(
             t('notification.preNotifyTitle', { title: getTaskDisplayTitle(task) }),
             t('notification.preNotifyBody', { seconds: preNotifyTime }),
             { showToast: false }
           );
        }
      }
    });
    if (!isUiSuspended) {
      updateLiveValues();
    } else {
      updateTrayTooltip();
    }
  });

  // 监听后端任务触发事件
  await listen('task-triggered', async (event) => {
    await handleTriggeredTask(event.payload);
  });
  startTriggeredTaskPolling();

  // 监听空闲状态变化
  await listen('idle-status-changed', (event) => {
    const status = event.payload;
    const wasIdle = isIdle;
    isIdle = status.is_idle;

    // 刚进入空闲状态时，显示横幅通知
    if (isIdle && !wasIdle && settings.resetOnIdle) {
      showIdleResetBanner = true;
      renderFullUI();
    }

    if (!isUiSuspended) {
      updateLiveValues();
    } else {
      updateTrayTooltip();
    }
  });

  await listen('show-window', () => {
    invoke('show_main_window');
  });

  await listen('reset-all-tasks', () => {
    resetAll().catch(console.error);
  });

  await listen('toggle-pause', () => {
    togglePause().catch(console.error);
  });

  watchPauseState();

  await listen('system-locked', () => {
    invoke('timer_set_system_locked', { locked: true }).catch(console.error);
  });

  await listen('system-unlocked', () => {
    invoke('timer_set_system_locked', { locked: false }).catch(console.error);
  });

  // 每秒更新工作时间统计（这个保留在前端）
  setInterval(() => {
    stats.workMinutes = Math.floor((Date.now() - workStartTime) / 60000);
  }, 1000);

  if (startedSilent && settings.silentAutoStart) {
    await invoke('hide_main_window').catch(() => {});
  } else {
    await invoke('show_main_window').catch(() => {});
  }
  await syncFloatingWindow();

  checkForUpdates();
}

async function checkForUpdates(manual = false) {
  if (manual) {
    isCheckingUpdate = true;
    updateMessage = null;
    renderFullUI();
  }

  try {
    const update = await check();
    if (update) {
      updateInfo = {
        version: update.version,
        body: update.body,
        update: update
      };
      updateMessage = null;
      renderFullUI();
    } else if (manual) {
      // 手动检查且没有更新时显示提示
      updateMessage = { type: 'success', text: t('update.upToDate') };
      renderFullUI();
      setTimeout(() => {
        updateMessage = null;
        renderFullUI();
      }, 3000);
    }
  } catch (e) {
    console.error('Update check failed:', e);
    if (manual) {
      const errorMsg = normalizeErrorMessage(e, t('update.networkError'));
      updateMessage = { type: 'error', text: t('update.checkFailed', { error: errorMsg }) };
      renderFullUI();
      setTimeout(() => {
        updateMessage = null;
        renderFullUI();
      }, 3000);
    }
  } finally {
    if (manual) {
      isCheckingUpdate = false;
      renderFullUI();
    }
  }
}

async function performUpdate() {
  if (!updateInfo || isUpdating) return;
  
  isUpdating = true;
  updateMessage = null;
  renderFullUI();
  
  try {
    await updateInfo.update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    console.error('Update failed:', e);
    isUpdating = false;
    const errorMsg = normalizeErrorMessage(e, t('update.networkError'));
    updateMessage = { type: 'error', text: t('update.installFailed', { error: errorMsg }) };
    renderFullUI();
    setTimeout(() => {
      updateMessage = null;
      renderFullUI();
    }, 5000);
  }
}

async function loadSettings() {
  try {
    const saved = await invoke('load_settings');
    if (saved) {
      const parsed = JSON.parse(saved.replace(/^\uFEFF/, ''));
      settings = { ...settings, ...parsed };
      if (!Object.prototype.hasOwnProperty.call(parsed, 'floatingWindowBgColor')) {
        applyFloatingThemePreset(settings.floatingWindowTheme || 'blue');
      }
      normalizeFloatingSettings();
      
      // 迁移逻辑：确保旧数据中的任务也有新字段
      settings.tasks = settings.tasks.map(task => {
        const def = DEFAULT_TASKS.find(d => d.id === task.id);
        return migrateTaskLocalization({
          preNotificationSeconds: def ? def.preNotificationSeconds : 5,
          snoozeMinutes: def ? def.snoozeMinutes : 5,
          scheduleType: 'interval',
          dailyTimes: [],
          ...task
        });
      });
    }
  } catch (e) {
    console.log('Using default settings');
  }
  normalizeFloatingSettings();
  
  const savedStats = localStorage.getItem('reminder_stats');
  if (savedStats) {
    const parsed = JSON.parse(savedStats);
    if (parsed.date === new Date().toDateString()) {
      stats = parsed.stats;
    }
  }
}

async function saveSettings() {
  await invoke('save_settings', { settings: JSON.stringify(settings) });
  emit('settings-updated', settings).catch(() => {});
}

function saveStats() {
  localStorage.setItem('reminder_stats', JSON.stringify({
    date: new Date().toDateString(),
    stats: stats,
  }));
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
}


// tick 函数已移至 Rust 后端，不再需要前端定时器

async function triggerNotification(task) {
  await playReminderSound();
  
  // 计算合并的任务
  let mergedTasks = [task];
  if (settings.enableMerge) {
    settings.tasks.forEach(t => {
      if (t.id !== task.id && t.enabled) {
        const remaining = countdowns[t.id];
        // 如果剩余时间小于阈值，且没有正在推迟（或者推迟了但也快到了，这里简单起见只看remaining）
        // 注意：countdowns可能会有延迟，但通常是准的
        if (remaining !== undefined && remaining <= settings.mergeThreshold) {
          mergedTasks.push(t);
        }
      }
    });
  }

  // 构建显示标题和描述
  // 如果有合并任务，可以在这里修改标题或描述，或者保持原样
  // 更新：现在使用合并的标题
  const mergedTaskIds = mergedTasks.map(t => t.id);
  const displayTitle = getMergedDisplayTitle(mergedTaskIds);
  
  notifySystem(displayTitle, getTaskDisplayDesc(task)).catch(console.error);

  if (settings.lockScreenEnabled) {
    renderFullUI();
    await new Promise(resolve => setTimeout(resolve, 0));
    await startLockScreen(task, mergedTasks);
  } else {
    activePopup = { ...task, mergedTaskIds: mergedTasks.map(t => t.id) };
    renderFullUI();
  }
}

async function startLockScreen(task, mergedTasks = []) {
  try {
    invoke('timer_set_lock_screen_active', { active: true }).catch(console.error);
  } catch (e) {
    console.error(e);
  }
  mainWindowVisibleBeforeLock = true;
  // 通知后端锁屏模式激活
  invoke('timer_set_lock_screen_active', { active: true }).catch(console.error);
  invoke('is_main_window_visible')
    .then(visible => {
      mainWindowVisibleBeforeLock = visible;
    })
    .catch(() => {
      mainWindowVisibleBeforeLock = true;
    });
  floatingWindowVisibleBeforeLock = settings.floatingWindowEnabled;
  // 使用任务级别的锁屏时长，如果没有则使用全局设置
  const lockDuration = task.lockDuration || settings.lockDuration;
  const mergedIds = mergedTasks.length > 0 ? mergedTasks.map(t => t.id) : [task.id];

  lockScreenState = {
    active: true,
    remaining: lockDuration,
    task: { ...task },
    mergedTaskIds: mergedIds,
    unlockProgress: 0,
    unlockTimer: null,
    waitingConfirm: false,
  };

  renderFullUI();

  try {
    await invoke('enter_lock_mode', {
      task: {
        title: getMergedDisplayTitle(mergedIds),
        desc: getMergedDisplayDesc(mergedIds),
        duration: parseInt(lockDuration),
        icon: task.icon,
        strict_mode: !!settings.strictMode,
        allow_strict_snooze: !!settings.allowStrictSnooze,
        max_snooze_count: parseInt(settings.maxSnoozeCount),
        snooze_minutes: parseInt(task.snoozeMinutes || 5),
        current_snooze_count: parseInt(snoozedStatus[task.id]?.count || 0),
        bg_image: settings.lockScreenBgImage || ''
      }
    });
  } catch (e) {
    console.error('Failed to enter lock mode', e);
  }

  const lockInterval = setInterval(() => {
    if (!lockScreenState.active) {
      clearInterval(lockInterval);
      return;
    }

    lockScreenState.remaining--;
    updateLockScreenTimer();

    if (lockScreenState.remaining <= 0) {
      clearInterval(lockInterval);
      if (settings.autoUnlock) {
        endLockScreen();
      } else {
        showLockConfirm();
      }
    }
  }, 1000);
}

function showLockConfirm() {
  lockScreenState.waitingConfirm = true;
  renderFullUI();
}

async function snoozeTask(minutes) {
  const idsToSnooze = [];
  
  if (lockScreenState.active && lockScreenState.task) {
    if (lockScreenState.mergedTaskIds && lockScreenState.mergedTaskIds.length > 0) {
      idsToSnooze.push(...lockScreenState.mergedTaskIds);
    } else {
      idsToSnooze.push(lockScreenState.task.id);
    }
  } else if (activePopup) {
    if (activePopup.mergedTaskIds && activePopup.mergedTaskIds.length > 0) {
      idsToSnooze.push(...activePopup.mergedTaskIds);
    } else {
      idsToSnooze.push(activePopup.id);
    }
  }

  // 去重
  const uniqueIds = [...new Set(idsToSnooze)];

  for (const id of uniqueIds) {
    await invoke('timer_snooze_task', { taskId: id, minutes: parseInt(minutes) }).catch(console.error);
  }
  
  // 从队列中移除这些已推迟的任务，防止它们作为新弹窗出现
  if (uniqueIds.length > 0) {
    taskQueue = taskQueue.filter(t => !uniqueIds.includes(t.id));
  }

  if (lockScreenState.active) {
    endLockScreen(true);
  } else if (activePopup) {
    activePopup = null;
    renderFullUI();
  }
}

async function endLockScreen(snoozed = false) {
  const restoreMainWindow = mainWindowVisibleBeforeLock;
  const restoreFloatingWindow = floatingWindowVisibleBeforeLock && settings.floatingWindowEnabled;

  // 通知后端锁屏模式结束
  invoke('timer_set_lock_screen_active', { active: false }).catch(console.error);

  if (!snoozed) {
    // 重置所有合并的任务
    const idsToReset = lockScreenState.mergedTaskIds || (lockScreenState.task ? [lockScreenState.task.id] : []);
    
    // 从队列中移除已合并的任务，防止解锁后再次弹窗
    taskQueue = taskQueue.filter(t => !idsToReset.includes(t.id));

    idsToReset.forEach(id => {
      if (id === 'sit') stats.sitBreaks++;
      if (id === 'water') stats.waterCups++;
      resetTask(id);
    });
    
    saveStats();
  }

  try {
    await invoke('exit_lock_mode', { restoreVisible: restoreMainWindow });
    if (restoreFloatingWindow) {
      invoke('show_floating_window').catch(console.error);
    }
  } catch (e) {
    console.error('Failed to exit lock mode', e);
  }

  lockScreenState.active = false;
  lockScreenState.waitingConfirm = false;
  processNextTask();
}

function updateLockScreenTimer() {
  const secondsEl = document.querySelector('.lock-seconds');
  const unitEl = document.querySelector('.lock-unit');
  const progressEl = document.querySelector('.lock-timer-ring .progress');

  if (secondsEl) {
    const remaining = lockScreenState.remaining;
    if (remaining >= 60) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      secondsEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
      if (unitEl) unitEl.textContent = '分钟';
    } else {
      secondsEl.textContent = remaining;
      if (unitEl) unitEl.textContent = '秒';
    }
  }

  if (progressEl) {
    // 使用任务级别的锁屏时长，如果没有则使用全局设置
    const total = lockScreenState.task?.lockDuration || settings.lockDuration;
    const offset = 565 * (1 - lockScreenState.remaining / total);
    progressEl.style.strokeDashoffset = offset;
  }
}

function startUnlockPress() {
  if (lockScreenState.unlockTimer) return;
  
  lockScreenState.unlockProgress = 0;
  const btn = document.querySelector('.unlock-btn');
  const progressBar = document.querySelector('.unlock-progress');
  
  if (btn) btn.classList.add('pressing');
  
  lockScreenState.unlockTimer = setInterval(() => {
    lockScreenState.unlockProgress += 100 / 30;
    
    if (progressBar) {
      progressBar.style.width = `${lockScreenState.unlockProgress}%`;
    }
    
    if (lockScreenState.unlockProgress >= 100) {
      cancelUnlockPress();
      endLockScreen();
    }
  }, 100);
}

function cancelUnlockPress() {
  if (lockScreenState.unlockTimer) {
    clearInterval(lockScreenState.unlockTimer);
    lockScreenState.unlockTimer = null;
  }
  
  lockScreenState.unlockProgress = 0;
  
  const btn = document.querySelector('.unlock-btn');
  const progressBar = document.querySelector('.unlock-progress');
  
  if (btn) btn.classList.remove('pressing');
  if (progressBar) progressBar.style.width = '0';
}

function processNextTask() {
  if (taskQueue.length > 0 && !activePopup && !lockScreenState.active) {
    const nextTask = taskQueue.shift();
    triggerNotification(nextTask);
  } else {
    renderFullUI();
  }
}

function dismissNotification() {
  if (!activePopup) return;
  
  // 点击“我知道了”仅记录统计数据，不再负责计时重置（重置已在触发时提前完成）
  // 修正：上面的注释是旧的，现在改为在此处重置（或在触发时重置，看逻辑）
  // 根据新逻辑，我们在结束时重置
  
  const idsToReset = activePopup.mergedTaskIds || [activePopup.id];
  
  // 从队列中移除已合并的任务
  taskQueue = taskQueue.filter(t => !idsToReset.includes(t.id));

  idsToReset.forEach(id => {
    if (id === 'sit') stats.sitBreaks++;
    if (id === 'water') stats.waterCups++;
    resetTask(id);
  });
  
  activePopup = null;
  saveStats();
  processNextTask();
}

function addTask() {
  const id = 'task_' + Date.now();
  settings.tasks.push({
    id: id, title: t('tasks.newTask.title'), desc: t('tasks.newTask.desc'),
    titleKey: 'tasks.newTask.title', descKey: 'tasks.newTask.desc',
    interval: 30, enabled: true, icon: 'bell', lockDuration: 60, autoResetOnIdle: true, preNotificationSeconds: 5, snoozeMinutes: 5, scheduleType: 'interval', dailyTimes: []
  });
  countdowns[id] = 30 * 60;
  saveSettings();
  syncTasksToBackend();
  renderFullUI();
}

function removeTask(id) {
  settings.tasks = settings.tasks.filter(t => t.id !== id);
  if (settings.floatingSelectedTaskId === id) {
    settings.floatingSelectedTaskId = '';
  }
  delete countdowns[id];
  saveSettings();
  syncTasksToBackend();
  renderFullUI();
}

function resetTask(id) {
  const task = settings.tasks.find(t => t.id === id);
  if (task) {
    if (!isDailyTask(task)) {
      countdowns[id] = task.interval * 60;
    }
    // 重置时清除推迟状态
    if (snoozedStatus[id]) {
      snoozedStatus[id].active = false;
      snoozedStatus[id].remaining = 0;
    }
    // 通知后端重置该任务
    invoke('timer_reset_task', { taskId: id })
      .then(() => refreshCountdownsFromBackend({ render: false }))
      .catch(console.error);
    updateTrayTooltip(true);
    updateLiveValues();
  }
}

function updateTask(id, updates) {
  const task = settings.tasks.find(t => t.id === id);
  if (task) {
    Object.assign(task, updates);
    if (updates.interval !== undefined && !isDailyTask(task)) {
      countdowns[id] = task.interval * 60;
    }
    saveSettings();
    // 同步到后端
    syncTasksToBackend();
  }
}

async function togglePause() {
  await applyPauseState(!isPaused);
}

async function resetAll() {
  // 通知后端重置所有任务
  await invoke('timer_reset_all').catch(console.error);
  settings.tasks.forEach(task => {
    if (!isDailyTask(task)) {
      countdowns[task.id] = task.interval * 60;
    }
    if (snoozedStatus[task.id]) {
      snoozedStatus[task.id].active = false;
      snoozedStatus[task.id].remaining = 0;
    }
  });
  await applyPauseState(false, { render: false });
  updateTrayTooltip(true);
  renderFullUI();
}

function formatTime(seconds) {
  return formatDuration(seconds);
}

function formatLockTime(seconds) {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { time: `${mins}:${String(secs).padStart(2, '0')}`, unit: t('time.minutes') };
  }
  return { time: seconds, unit: t('time.seconds') };
}

// 获取任务的显示标题（默认任务使用翻译，自定义任务使用用户设置）
function getTaskDisplayTitle(task) {
  if (task.titleKey) {
    return t(task.titleKey);
  }
  if (DEFAULT_TASK_IDS.includes(task.id)) {
    return t(`tasks.${task.id}.title`);
  }
  return task.title;
}

// 获取任务的显示描述（默认任务使用翻译，自定义任务使用用户设置）
function getTaskDisplayDesc(task) {
  if (task.descKey) {
    return t(task.descKey);
  }
  if (DEFAULT_TASK_IDS.includes(task.id)) {
    return t(`tasks.${task.id}.desc`);
  }
  return task.desc;
}

function getMergedDisplayTitle(taskIds) {
  if (!taskIds || taskIds.length === 0) return '';
  // 去重
  const uniqueIds = [...new Set(taskIds)];
  const titles = uniqueIds.map(id => {
    const task = settings.tasks.find(t => t.id === id);
    return task ? getTaskDisplayTitle(task) : '';
  }).filter(t => t);
  
  return titles.join(' & ');
}

// 获取合并任务的描述（如果是默认任务，显示默认的休息文案，否则组合显示）
function getMergedDisplayDesc(taskIds) {
  if (!taskIds || taskIds.length === 0) return '';
  // 如果包含了默认任务，优先显示通用的休息文案
  if (taskIds.some(id => ['sit', 'water', 'eye'].includes(id))) {
    return t('lockScreen.restMessage');
  }
  
  // 否则组合显示描述
  const uniqueIds = [...new Set(taskIds)];
  const descs = uniqueIds.map(id => {
    const task = settings.tasks.find(t => t.id === id);
    return task ? getTaskDisplayDesc(task) : '';
  }).filter(t => t);
  
  return descs.join('; ');
}

function cacheDomRefs() {
  domCache = {
    statsValues: Array.from(document.querySelectorAll('.status-item .value')),
    timerMinutes: document.querySelector('.time-text .minutes'),
    timerSeconds: document.querySelector('.time-text .seconds'),
    timerLabel: document.querySelector('.timer-label'),
    mainRingProgress: document.querySelector('.timer-ring .progress'),
    taskCards: new Map(),
  };

  document.querySelectorAll('.reminder-card[data-id]').forEach(card => {
    domCache.taskCards.set(card.dataset.id, {
      card,
      miniProgress: card.querySelector('.progress-mini .progress'),
      timeDisplay: card.querySelector('.time-remaining'),
    });
  });
}

function updateTrayTooltip(force = false) {
  const now = Date.now();
  if (!force && now - lastTrayTooltipUpdateAt < TRAY_TOOLTIP_MIN_INTERVAL_MS) {
    return;
  }

  const lines = [t('app.trayTooltip')];
  if (isPaused) {
    lines.push('(' + t('status.paused') + ')');
  } else {
    settings.tasks.forEach(t_task => {
      if (t_task.enabled) {
        lines.push(`${getTaskDisplayTitle(t_task)}：${formatTime(countdowns[t_task.id] ?? 0)}`);
      }
    });
  }

  const text = lines.join('\n');
  if (!force && text === lastTrayTooltipText) {
    return;
  }

  lastTrayTooltipText = text;
  lastTrayTooltipUpdateAt = now;
  invoke('update_tray_tooltip', { tooltip: text }).catch(() => {});
}

function updateLiveValues() {
  if (isUiSuspended) {
    updateTrayTooltip();
    return;
  }

  if (!domCache) {
    cacheDomRefs();
  }

  const statsElements = domCache.statsValues;
  if (statsElements[0]) statsElements[0].innerText = stats.sitBreaks;
  if (statsElements[1]) statsElements[1].innerText = stats.waterCups;
  if (statsElements[2]) statsElements[2].innerText = stats.workMinutes;

  const { task: nextTask } = getNextTaskInfo();

  if (domCache.timerMinutes && domCache.timerSeconds) {
    const timeStr = nextTask ? formatTime(countdowns[nextTask.id]) : '--:--';
    const [mins, secs] = timeStr.split(':');
    domCache.timerMinutes.innerText = mins;
    domCache.timerSeconds.innerText = ':' + secs;
  }

  if (domCache.timerLabel) {
    let statusText = nextTask ? getTaskDisplayTitle(nextTask) : t('status.noActiveTask');
    if (isPaused) {
      statusText += ' (' + t('status.paused') + ')';
    } else if (isIdle) {
      statusText += ' (' + t('status.idle') + ')';
    }
    domCache.timerLabel.innerText = statusText;
  }

  if (domCache.mainRingProgress && nextTask) {
    const total = getCountdownTotal(nextTask);
    if (total > 0) {
      const offset = 502 * (1 - (countdowns[nextTask.id] ?? 0) / total);
      domCache.mainRingProgress.style.strokeDashoffset = offset;
    }
  }

  settings.tasks.forEach(task => {
    const cardRefs = domCache.taskCards.get(task.id);
    if (!cardRefs) return;

    let current = countdowns[task.id] || 0;
    let total = getCountdownTotal(task);
    const snoozeState = snoozedStatus[task.id];
    const isSnoozed = snoozeState && snoozeState.active;

    if (isSnoozed) {
      total = (task.snoozeMinutes || 5) * 60;
    }

    if (cardRefs.miniProgress && total > 0) {
      const progress = Math.min(1, Math.max(0, current / total));
      const offset = 126 * (1 - progress);
      cardRefs.miniProgress.style.strokeDashoffset = offset;
    }

    if (cardRefs.timeDisplay) {
      if (isSnoozed) {
        cardRefs.card.classList.add('snoozed');
        cardRefs.timeDisplay.innerText = t('status.snoozed') + ' ' + formatTime(current);
        cardRefs.timeDisplay.style.color = 'var(--warning)';
      } else {
        cardRefs.card.classList.remove('snoozed');
        cardRefs.timeDisplay.innerText = `(${formatTime(current)})`;
        cardRefs.timeDisplay.style.color = '';
      }
    }
  });

  updateTrayTooltip();
}

function renderFullUI() {
  normalizeFloatingSettings();
  const app = document.getElementById('app');
  const locales = getSupportedLocales();
  const currentLang = getLocale();

  app.innerHTML = `
    <div class="header">
      <h1>${t('app.title')}</h1>
      <p>${t('app.subtitle')}</p>
      <div class="language-switcher">
        <span class="language-icon">${ICONS.globe}</span>
        <select id="languageSelect">
          ${locales.map(l => `<option value="${l.code}" ${l.code === currentLang ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-item"><div class="icon">${ICONS.sit}</div><div class="value">${stats.sitBreaks}</div><div class="label">${t('stats.sitBreaks')}</div></div>
      <div class="status-item"><div class="icon">${ICONS.water}</div><div class="value">${stats.waterCups}</div><div class="label">${t('stats.waterCups')}</div></div>
      <div class="status-item"><div class="icon">${ICONS.work}</div><div class="value">${stats.workMinutes}</div><div class="label">${t('stats.workMinutes')}</div></div>
    </div>

    <div class="timer-display">
      <div class="timer-ring">
        <svg width="180" height="180" viewBox="0 0 180 180"><circle class="bg" cx="90" cy="90" r="80" /><circle class="progress" cx="90" cy="90" r="80" stroke-dasharray="502" stroke-dashoffset="502" /></svg>
        <div class="time-text"><div class="minutes">00</div><div class="seconds">:00</div></div>
      </div>
      <div class="timer-label">${t('status.loading')}</div>
    </div>

    <div class="reminder-cards">
      ${settings.tasks.map(task => {
        const snoozeState = snoozedStatus[task.id];
        const isSnoozed = snoozeState && snoozeState.active;
        return `
        <div class="reminder-card ${isSnoozed ? 'snoozed' : ''}" data-id="${task.id}">
          <div class="card-main">
            <div class="progress-mini" style="cursor:pointer;" title="${t('taskCard.clickToReset')}" data-reset-id="${task.id}">
              <svg width="44" height="44" viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="20" /><circle class="progress" cx="22" cy="22" r="20" stroke-dasharray="126" stroke-dashoffset="126" /></svg>
              <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:var(--primary); pointer-events:none;">${ICONS[task.icon] || ICONS.bell}</div>
            </div>
            <div class="info">
              <div class="title" contenteditable="${!['sit', 'water', 'eye'].includes(task.id)}" data-id="${task.id}">${getTaskDisplayTitle(task)}</div>
              <div class="time-info">
                <input type="number" class="interval-input" value="${task.interval}" data-id="${task.id}" min="1" max="1440" ${isDailyTask(task) ? 'disabled' : ''}>
                <span class="time-unit">${isDailyTask(task) ? t('time.daily') : t('time.minutes')}</span>
                <span class="time-remaining"></span>
              </div>
            </div>
            <div class="card-actions">
              <div class="toggle ${task.enabled ? 'active' : ''}" data-toggle-id="${task.id}"></div>
              <div class="action-row" style="display:flex; gap:8px;">
                <div class="settings-btn" title="${t('taskCard.settings')}" data-settings-id="${task.id}" style="cursor:pointer; color:var(--text-muted); padding:4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.82 1.65h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </div>
                <div class="reset-task-btn" title="${t('taskCard.resetTask')}" data-reset-id="${task.id}" style="cursor:pointer; color:var(--primary); padding:4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                </div>
                ${!['sit', 'water', 'eye'].includes(task.id) ? `<div class="remove-btn" data-id="${task.id}" style="cursor:pointer; padding:4px;">${ICONS.trash}</div>` : ''}
              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="footer-option">
              <span>${t('taskCard.schedule')}</span>
              <div class="schedule-type-control" role="group" aria-label="${t('taskCard.schedule')}">
                <button type="button" class="schedule-type-option ${(task.scheduleType || 'interval') === 'interval' ? 'active' : ''}" data-id="${task.id}" data-schedule-type="interval">${t('taskCard.intervalSchedule')}</button>
                <button type="button" class="schedule-type-option ${(task.scheduleType || 'interval') === 'daily' ? 'active' : ''}" data-id="${task.id}" data-schedule-type="daily">${t('taskCard.dailySchedule')}</button>
              </div>
            </div>
            <div class="footer-option daily-times-option">
              <span>${t('taskCard.dailyTimes')}</span>
              <input type="text" class="daily-times-input" value="${(task.dailyTimes || []).join(', ')}" data-id="${task.id}" placeholder="11:00, 21:00">
            </div>
            <div class="footer-option">
              <span>${t('taskCard.preNotify')}</span>
              <input type="number" class="lock-input pre-notify-input" value="${task.preNotificationSeconds !== undefined ? task.preNotificationSeconds : 5}" data-id="${task.id}" min="0" max="120">
              <span>${t('time.seconds')}</span>
            </div>
            <div class="footer-option">
              <span>${t('taskCard.allowSnooze')}</span>
              <input type="number" class="lock-input snooze-input" value="${task.snoozeMinutes || 5}" data-id="${task.id}" min="1" max="60">
              <span>${t('time.minutes')}</span>
            </div>
            <div class="footer-option">
              <span>${t('taskCard.lockDuration')}</span>
              <input type="number" class="lock-input lock-duration-input" value="${task.lockDuration || settings.lockDuration}" data-id="${task.id}" min="5" max="3600">
              <span>${t('time.seconds')}</span>
            </div>
          </div>
        </div>
        `;
      }).join('')}
    </div>

    <button class="add-task-btn" id="addTaskBtn">${ICONS.plus} ${t('buttons.addTask')}</button>

    <div class="quick-actions">
      <button class="btn btn-primary" id="pauseBtn">${isPaused ? ICONS.play : ICONS.pause} ${isPaused ? t('buttons.resume') : t('buttons.pause')}</button>
      <button class="btn btn-secondary" id="resetBtn">${ICONS.reset} ${t('buttons.resetAll')}</button>
    </div>

    <div class="settings-section">
      <h3>${t('settings.title')}</h3>
      <div class="setting-row">
        <div class="setting-info">
          <label>${t('settings.lockScreen')}</label>
          <span class="setting-desc">${t('settings.lockScreenDesc')}</span>
        </div>
        <div class="toggle ${settings.lockScreenEnabled ? 'active' : ''}" id="lockToggle"></div>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <label style="color:var(--danger, #ff4d4f);">${t('settings.strictMode')}</label>
          <span class="setting-desc">${t('settings.strictModeDesc')}</span>
        </div>
        <div class="toggle ${settings.strictMode ? 'active' : ''}" id="strictModeToggle"></div>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <label>${t('settings.theme')}</label>
          <span class="setting-desc">${t('settings.themeDesc')}</span>
        </div>
        <div class="toggle ${settings.theme === 'dark' ? 'active' : ''}" id="themeToggle"></div>
      </div>

      <div class="setting-row" id="advancedToggle" style="cursor:pointer; opacity:0.7;">
        <div style="display:flex; align-items:center; gap:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:${settings.advancedSettingsOpen ? 'rotate(180deg)' : 'rotate(0)'}; transition:transform 0.3s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
          <span style="font-weight:500; font-size:0.85rem;">${t('settings.advanced')}</span>
        </div>
      </div>

      <div class="advanced-settings-content" style="display:${settings.advancedSettingsOpen ? 'block' : 'none'};">

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.autoUnlock')}</label>
            <span class="setting-desc">${t('settings.autoUnlockDesc')}</span>
          </div>
          <div class="toggle ${settings.autoUnlock ? 'active' : ''}" id="autoUnlockToggle"></div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.resetOnIdle')}</label>
            <span class="setting-desc">${t('settings.resetOnIdleDesc')}</span>
          </div>
          <div class="toggle ${settings.resetOnIdle ? 'active' : ''}" id="resetOnIdleToggle"></div>
        </div>

        <div class="setting-row" id="idleThresholdRow" style="display: ${settings.resetOnIdle ? 'flex' : 'none'};">
          <div class="setting-info">
            <label>${t('settings.idleThreshold')}</label>
            <span class="setting-desc">${isIdle ? t('settings.idleThresholdDescIdle') : t('settings.idleThresholdDesc')}</span>
          </div>
          <div class="idle-threshold-input-group">
            <input type="number" class="idle-threshold-input" id="idleThresholdInput" value="${Math.floor(settings.idleThreshold / 60)}" min="1" max="60">
            <span class="input-unit">${t('time.minutes')}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.allowStrictSnooze')}</label>
            <span class="setting-desc">${t('settings.allowStrictSnoozeDesc')}</span>
          </div>
          <div class="toggle ${settings.allowStrictSnooze ? 'active' : ''}" id="allowStrictSnoozeToggle"></div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.enableMerge')}</label>
            <span class="setting-desc">${t('settings.enableMergeDesc')}</span>
          </div>
          <div class="toggle ${settings.enableMerge ? 'active' : ''}" id="enableMergeToggle"></div>
        </div>

        <div class="setting-row" id="mergeThresholdRow" style="display: ${settings.enableMerge ? 'flex' : 'none'};">
          <div class="setting-info">
            <label>${t('settings.mergeThreshold')}</label>
            <span class="setting-desc">${t('settings.mergeThresholdDesc')}</span>
          </div>
          <div class="idle-threshold-input-group">
            <input type="number" class="idle-threshold-input" id="mergeThresholdInput" value="${settings.mergeThreshold}" min="5" max="300">
            <span class="input-unit">${t('time.seconds')}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.maxSnoozeCount')}</label>
            <span class="setting-desc">${t('settings.maxSnoozeCountDesc')}</span>
          </div>
          <div class="idle-threshold-input-group">
            <input type="number" class="idle-threshold-input" id="maxSnoozeCountInput" value="${settings.maxSnoozeCount || 1}" min="0" max="10">
            <span class="input-unit">${t('time.times')}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.sound')}</label>
            <span class="setting-desc">${t('settings.soundDesc')}</span>
          </div>
          <div style="display:flex; gap:12px; align-items:center;">
            <button class="preset-btn" id="testSoundBtn" style="padding:4px 8px; display:flex; gap:4px; align-items:center;">${ICONS.volume} ${t('buttons.test')}</button>
            <div class="toggle ${settings.soundEnabled ? 'active' : ''}" id="soundToggle"></div>
          </div>
        </div>

        <div class="setting-row" style="${settings.soundEnabled ? '' : 'display:none;'}" id="customSoundRow">
          <div class="setting-info">
            <label>${t('settings.customSound')}</label>
            <span class="setting-desc">${settings.customSoundPath || t('settings.customSoundDesc')}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="preset-btn" id="selectCustomSoundBtn" style="padding:6px 12px;">
              ${settings.customSoundPath ? t('buttons.changeSound') : t('buttons.selectSound')}
            </button>
            ${settings.customSoundPath ? `<button class="preset-btn" id="clearCustomSoundBtn" style="padding:6px 12px;">${t('buttons.clearSound')}</button>` : ''}
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.autoStart')}</label>
            <span class="setting-desc">${t('settings.autoStartDesc')}</span>
          </div>
          <div class="toggle ${settings.autoStart ? 'active' : ''}" id="startToggle"></div>
        </div>

        <div class="setting-row" style="${settings.autoStart ? '' : 'display:none;'}" id="silentAutoStartRow">
          <div class="setting-info">
            <label>${t('settings.silentAutoStart')}</label>
            <span class="setting-desc">${t('settings.silentAutoStartDesc')}</span>
          </div>
          <div class="toggle ${settings.silentAutoStart ? 'active' : ''}" id="silentAutoStartToggle"></div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.floatingWindow')}</label>
            <span class="setting-desc">${t('settings.floatingWindowDesc')}</span>
          </div>
          <div class="toggle ${settings.floatingWindowEnabled ? 'active' : ''}" id="floatingWindowToggle"></div>
        </div>

        <div class="setting-row" style="${settings.floatingWindowEnabled ? '' : 'display:none;'}" id="floatingModeRow">
          <div class="setting-info">
            <label>${t('settings.floatingMode')}</label>
            <span class="setting-desc">${t('settings.floatingModeDesc')}</span>
          </div>
          <select class="inline-select" id="floatingModeSelect">
            <option value="nextReminder" ${settings.floatingWindowMode === 'nextReminder' ? 'selected' : ''}>${t('settings.floatingModeNext')}</option>
            <option value="customCountdown" ${settings.floatingWindowMode === 'customCountdown' ? 'selected' : ''}>${t('settings.floatingModeCustom')}</option>
          </select>
        </div>

        <div class="setting-row" style="${settings.floatingWindowEnabled ? '' : 'display:none;'}" id="floatingThemeRow">
          <div class="setting-info">
            <label>${t('settings.floatingTheme')}</label>
            <span class="setting-desc">${t('settings.floatingThemeDesc')}</span>
          </div>
          <div class="floating-theme-swatches">
            ${FLOATING_THEMES.map(theme => `
              <button
                type="button"
                class="floating-theme-swatch floating-theme-${theme} ${settings.floatingWindowTheme === theme ? 'active' : ''}"
                data-theme="${theme}"
                title="${getFloatingThemeLabel(theme)}"
                aria-label="${getFloatingThemeLabel(theme)}"
              ></button>
            `).join('')}
          </div>
        </div>

        <div class="setting-row" style="${settings.floatingWindowEnabled ? '' : 'display:none;'}" id="floatingAutoHideRow">
          <div class="setting-info">
            <label>${t('settings.floatingAutoHide')}</label>
            <span class="setting-desc">${t('settings.floatingAutoHideDesc')}</span>
          </div>
          <div class="toggle ${settings.floatingWindowAutoHide ? 'active' : ''}" id="floatingAutoHideToggle"></div>
        </div>

        <div class="setting-row floating-style-row" style="${settings.floatingWindowEnabled ? '' : 'display:none;'}" id="floatingSizeRow">
          <div class="setting-info">
            <label>${t('settings.floatingSize')}</label>
          </div>
          <div class="floating-style-controls">
            <label class="floating-control-row">
              <span>${t('settings.floatingWidth')}</span>
              <input type="range" id="floatingWidthInput" min="${FLOATING_MIN_WIDTH}" max="${FLOATING_MAX_WIDTH}" value="${settings.floatingWindowWidth}">
              <strong id="floatingWidthValue">${settings.floatingWindowWidth}px</strong>
            </label>
            <label class="floating-control-row">
              <span>${t('settings.floatingFontScale')}</span>
              <input type="range" id="floatingFontScaleInput" min="${FLOATING_MIN_FONT_SCALE}" max="${FLOATING_MAX_FONT_SCALE}" value="${settings.floatingWindowFontScale}">
              <strong id="floatingFontScaleValue">${settings.floatingWindowFontScale}%</strong>
            </label>
            <label class="floating-control-row">
              <span>${t('settings.floatingOpacity')}</span>
              <input type="range" id="floatingOpacityInput" min="0" max="100" value="${settings.floatingWindowOpacity}">
              <strong id="floatingOpacityValue">${settings.floatingWindowOpacity}%</strong>
            </label>
          </div>
        </div>

        <div class="setting-row floating-style-row" style="${settings.floatingWindowEnabled ? '' : 'display:none;'}" id="floatingColorRow">
          <div class="setting-info">
            <label>${t('settings.floatingColors')}</label>
          </div>
          <div class="floating-color-controls">
            <label>
              <span>${t('settings.floatingBackground')}</span>
              <input type="color" id="floatingBgColorInput" value="${settings.floatingWindowBgColor}">
            </label>
            <label>
              <span>${t('settings.floatingTextColor')}</span>
              <input type="color" id="floatingTextColorInput" value="${settings.floatingWindowTextColor}">
            </label>
          </div>
        </div>

        <div class="setting-row" style="${settings.floatingWindowEnabled && settings.floatingWindowMode === 'customCountdown' ? '' : 'display:none;'}" id="floatingCustomRow">
          <div class="setting-info">
            <label>${t('settings.floatingCustom')}</label>
            <span class="setting-desc">${t('settings.floatingCustomDesc')}</span>
          </div>
          <div class="floating-custom-inputs">
            <input type="text" id="floatingCountdownTitleInput" value="${settings.floatingCountdownTitle || ''}" placeholder="${t('settings.floatingTitlePlaceholder')}">
            <input type="datetime-local" id="floatingCountdownTargetInput" value="${settings.floatingCountdownTarget || ''}">
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.customBgImage')}</label>
            <span class="setting-desc">${t('settings.customBgImageDesc')}</span>
          </div>
          <button class="preset-btn" id="selectBgImageBtn" style="padding:6px 12px;">
            ${settings.lockScreenBgImage ? t('buttons.changeBg') : t('buttons.selectBg')}
          </button>
        </div>
        ${settings.lockScreenBgImage ? `
        <div class="setting-row" style="padding-left:20px;">
          <div class="setting-info">
            <span class="setting-desc" style="font-size:0.75rem; word-break:break-all;">${settings.lockScreenBgImage}</span>
          </div>
          <button class="preset-btn" id="clearBgImageBtn" style="padding:4px 8px; background:var(--danger); color:white;">
            ${t('buttons.clear')}
          </button>
        </div>
        ` : ''}

        <div class="setting-row">
          <div class="setting-info">
            <label>${t('settings.version')}</label>
            <span class="setting-desc">${updateInfo ? t('settings.newVersion', { currentVersion: appVersion, version: updateInfo.version }) : t('settings.currentVersion', { version: appVersion })}</span>
          </div>
          <button class="check-update-btn" id="checkUpdateBtn" ${isCheckingUpdate ? 'disabled' : ''}>
            ${isCheckingUpdate ? '<span class="spinner"></span> ' + t('buttons.checking') : (updateInfo ? t('buttons.updateNow') : t('buttons.checkUpdate'))}
          </button>
        </div>

      </div>
    </div>

    ${updateMessage ? `
    <div class="toast-message ${updateMessage.type === 'error' ? 'error' : 'success'}">
      <div class="toast-content">
        <span class="toast-icon">${updateMessage.type === 'error' ? '❌' : '✅'}</span>
        <span class="toast-text">${escapeHtml(updateMessage.text)}</span>
      </div>
    </div>
    ` : ''}

    ${notificationMessage ? `
    <div class="toast-message ${notificationMessage.type}">
      <div class="toast-content">
        <span class="toast-icon">${notificationMessage.type === 'warning' ? '!' : 'i'}</span>
        <span class="toast-text">${escapeHtml(notificationMessage.text)}</span>
      </div>
    </div>
    ` : ''}

    <div class="notification-popup ${activePopup ? 'show' : ''}">
      <div class="notification-content">
        <div class="emoji">${activePopup ? (ICONS[activePopup.icon] || ICONS.bell) : ''}</div>
        <h2>${activePopup ? (activePopup.mergedTaskIds ? getMergedDisplayTitle(activePopup.mergedTaskIds) : getTaskDisplayTitle(activePopup)) : ''}</h2>
        <p>${activePopup ? (activePopup.mergedTaskIds ? getMergedDisplayDesc(activePopup.mergedTaskIds) : getTaskDisplayDesc(activePopup)) : ''}</p>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button class="btn btn-primary" id="dismissBtn">${t('buttons.gotIt')}</button>
          ${(() => {
            const count = (activePopup && snoozedStatus[activePopup.id]) ? snoozedStatus[activePopup.id].count : 0;
            const isStrictRestricted = settings.strictMode && !settings.allowStrictSnooze;
            if (count < settings.maxSnoozeCount && !isStrictRestricted) {
              return `<button class="btn btn-secondary" id="popupSnoozeBtn">${t('buttons.snooze', { minutes: activePopup ? (activePopup.snoozeMinutes || 5) : 5 })}</button>`;
            }
            return '';
          })()}
        </div>
      </div>
    </div>

    <div class="lock-screen ${lockScreenState.active ? 'show' : ''}" style="${settings.lockScreenBgImage && settings.lockScreenBgImage.trim() !== '' ? `background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${convertFileSrc(settings.lockScreenBgImage)}');` : ''}">
      <div class="lock-screen-content">
        <div class="lock-timer-ring">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="lockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#007aff"/>
                <stop offset="100%" style="stop-color:#34c759"/>
              </linearGradient>
            </defs>
            <circle class="bg" cx="100" cy="100" r="90" />
            <circle class="progress" cx="100" cy="100" r="90" stroke-dasharray="565" stroke-dashoffset="0" />
          </svg>
          <div class="center-content">
            <div class="lock-icon">${lockScreenState.task ? (ICONS[lockScreenState.task.icon] || ICONS.bell) : ICONS.eye}</div>
            <div class="lock-seconds">${lockScreenState.waitingConfirm ? '✓' : formatLockTime(lockScreenState.remaining).time}</div>
            <div class="lock-unit">${lockScreenState.waitingConfirm ? t('buttons.confirmRest').split(' ')[0] : formatLockTime(lockScreenState.remaining).unit}</div>
          </div>
        </div>
        <div class="lock-title">${lockScreenState.waitingConfirm ? t('lockScreen.timeUp') : (lockScreenState.task ? (lockScreenState.mergedTaskIds ? getMergedDisplayTitle(lockScreenState.mergedTaskIds) : getTaskDisplayTitle(lockScreenState.task)) : t('lockScreen.restTime'))}</div>
        <div class="lock-message">${lockScreenState.waitingConfirm ? t('lockScreen.confirmMessage') : (lockScreenState.task ? (lockScreenState.mergedTaskIds ? getMergedDisplayDesc(lockScreenState.mergedTaskIds) : getTaskDisplayDesc(lockScreenState.task)) : t('lockScreen.restMessage'))}</div>
        ${lockScreenState.waitingConfirm ? `
        <button class="confirm-btn" id="confirmBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ${t('buttons.confirmRest')}
        </button>
        ` : `
        ${settings.strictMode || isLockSlaveWindow ? '' : `
        <button class="unlock-btn" id="unlockBtn">
          <div class="unlock-progress"></div>
          <div class="unlock-text">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            ${t('lockScreen.emergencyUnlock')}
          </div>
        </button>
        `}
        ${(() => {
          if (isLockSlaveWindow) {
            return '';
          }
          const count = (lockScreenState.task && snoozedStatus[lockScreenState.task.id]) ? snoozedStatus[lockScreenState.task.id].count : 0;
          const isStrictRestricted = settings.strictMode && !settings.allowStrictSnooze;

          if (count >= settings.maxSnoozeCount) {
            return '<div style="color:rgba(255,255,255,0.5); font-size:0.8rem; margin-top:15px;">' + t('lockScreen.snoozeLimit') + '</div>';
          } else if (isStrictRestricted) {
            return '<div style="color:rgba(255,255,255,0.5); font-size:0.8rem; margin-top:15px;">' + t('lockScreen.strictDisabled') + '</div>';
          } else {
            return `
            <button id="lockSnoozeBtn" style="margin-top:15px; background:rgba(255,255,255,0.2); border:none; padding:8px 16px; border-radius:20px; color:white; font-size:14px; cursor:pointer;">
              💤 ${t('buttons.snooze', { minutes: lockScreenState.task ? (lockScreenState.task.snoozeMinutes || 5) : 5 })}
            </button>
            `;
          }
        })()}
        `}
      </div>
    </div>

    <div class="footer">${t('app.footer', { version: appVersion })}</div>

    ${showIdleResetBanner ? `
    <div class="idle-reset-banner">
      <div class="idle-reset-content">
        <div class="idle-reset-info">
          <span class="idle-reset-icon">😴</span>
          <span class="idle-reset-text">${t('idle.resetNotice')}</span>
        </div>
        <button class="idle-reset-btn" id="idleResetDismissBtn">${t('buttons.gotIt')}</button>
      </div>
    </div>
    ` : ''}

    ${updateInfo ? `
    <div class="update-banner ${isUpdating ? 'updating' : ''}">
      <div class="update-content">
        <div class="update-info">
          <span class="update-icon">🎉</span>
          <span class="update-text">${isUpdating ? t('update.updating') : t('update.newVersion', { version: updateInfo.version })}</span>
        </div>
        ${!isUpdating ? `<button class="update-btn" id="updateBtn">${t('buttons.updateNow')}</button>` : `<div class="update-spinner"></div>`}
      </div>
    </div>
    ` : ''}
  `;

  cacheDomRefs();
  bindEvents();
  updateLiveValues();
}

function getFloatingStatusText(task) {
  if (isPaused) return t('status.paused');
  if (isIdle) return t('status.idle');
  if (task && !task.enabled) return t('status.disabled');
  if (task && taskPausedStatus[task.id]) return t('status.paused');
  if (task && snoozedStatus[task.id]?.active) return t('status.snoozed');
  return t('floating.nextReminder');
}

function getFloatingMetaText(task) {
  const status = getFloatingStatusText(task);
  const selectedTaskId = settings.floatingSelectedTaskId || '';
  if (!selectedTaskId || !task) return status;

  const next = getNextTaskInfo();
  if (next.task && next.task.id !== task.id) {
    return `${status} · ${t('floating.nearest')}: ${getTaskDisplayTitle(next.task)} ${formatDuration(next.remaining)}`;
  }
  return status;
}

async function toggleFloatingTaskPause() {
  if (settings.floatingWindowMode === 'customCountdown') return;
  const { task } = getFloatingReminderInfo();
  if (!task || !task.enabled) return;

  if (taskPausedStatus[task.id]) {
    await invoke('timer_resume_task', { taskId: task.id });
    taskPausedStatus[task.id] = false;
  } else {
    await invoke('timer_pause_task', { taskId: task.id });
    taskPausedStatus[task.id] = true;
  }
  await refreshCountdownsFromBackend({ render: false }).catch(console.error);
  updateFloatingUI();
}

function renderFloatingUI() {
  const app = document.getElementById('app');
  const floatingTheme = FLOATING_THEMES.includes(settings.floatingWindowTheme) ? settings.floatingWindowTheme : 'blue';
  const floatingVars = getFloatingStyleVars(floatingTaskMenuOpen);
  app.innerHTML = `
    <div class="floating-root floating-theme-${floatingTheme}" style="${floatingVars}">
      <div class="floating-shell">
        <div class="floating-main">
          <div class="floating-title">${t('floating.nextReminder')}</div>
          <div class="floating-time-row">
            <div class="floating-time">--:--</div>
            <button class="floating-task-cycle" id="floatingTaskCycleBtn" title="${t('floating.selectTask')}">${ICONS.chevronDown}</button>
          </div>
          <div class="floating-meta">${t('status.loading')}</div>
        </div>
        <div class="floating-task-menu" id="floatingTaskMenu">
          ${getFloatingTaskOptions().map(option => `
            <button type="button" class="floating-task-menu-item ${(settings.floatingSelectedTaskId || '') === option.id ? 'active' : ''}" data-task-id="${option.id}">
              ${option.label}
            </button>
          `).join('')}
        </div>
        <div class="floating-actions">
          <button class="floating-action" id="floatingPauseBtn" title="${t('buttons.pause')}">${ICONS.pause}</button>
          <button class="floating-action" id="floatingResetBtn" title="${t('floating.resetTimer')}">${ICONS.reset}</button>
          <button class="floating-action" id="floatingOpenBtn" title="${t('floating.openMain')}">O</button>
          <button class="floating-action" id="floatingHideBtn" title="${t('floating.hide')}">X</button>
        </div>
        <button class="floating-resize-handle" id="floatingResizeHandle" title="${t('floating.resize')}" aria-label="${t('floating.resize')}"></button>
      </div>
    </div>
  `;
  bindFloatingEvents();
  updateFloatingUI();
}

function bindFloatingEvents() {
  const root = document.querySelector('.floating-root');
  const revealFromHidden = (event) => {
    revealFloatingWindowFromHiddenInteraction(event).catch(console.error);
  };
  if (root) {
    root.addEventListener('click', (event) => {
      if (Date.now() <= floatingSuppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, { capture: true });
    root.addEventListener('mouseenter', () => {
      floatingPointerInside = true;
      clearFloatingAutoHideTimer();
      revealFloatingWindowFromEdge().catch(console.error);
    });
    root.addEventListener('mouseleave', () => {
      floatingPointerInside = false;
      scheduleFloatingAutoHide();
    });
    root.addEventListener('pointerenter', revealFromHidden);
    root.addEventListener('pointermove', revealFromHidden);
    root.addEventListener('pointerdown', (event) => {
      revealFloatingWindowFromHiddenInteraction(event, { primaryButtonOnly: true }).catch(console.error);
    }, { capture: true });
  }
  document.addEventListener('mouseenter', () => {
    floatingPointerInside = true;
    clearFloatingAutoHideTimer();
    revealFloatingWindowFromEdge().catch(console.error);
  });
  document.addEventListener('mouseleave', () => {
    floatingPointerInside = false;
    scheduleFloatingAutoHide();
  });
  window.addEventListener('blur', () => {
    scheduleFloatingAutoHide();
  });

  const shell = document.querySelector('.floating-shell');
  if (shell) {
    shell.addEventListener('pointerenter', revealFromHidden);
    shell.addEventListener('pointermove', revealFromHidden);
    shell.addEventListener('pointerdown', startFloatingDrag);
  }

  const openBtn = document.getElementById('floatingOpenBtn');
  if (openBtn) {
    openBtn.addEventListener('click', async () => {
      await closeFloatingTaskMenu();
      invoke('show_main_window').catch(console.error);
    });
  }

  const hideBtn = document.getElementById('floatingHideBtn');
  if (hideBtn) {
    hideBtn.addEventListener('click', async () => {
      await setFloatingTaskMenuOpen(false);
      invoke('hide_floating_window').catch(console.error);
    });
  }

  const pauseBtn = document.getElementById('floatingPauseBtn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      toggleFloatingTaskPause().catch(console.error);
    });
  }

  const resetBtn = document.getElementById('floatingResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      await closeFloatingTaskMenu();
      const { task } = getFloatingReminderInfo();
      if (!task) return;
      resetTask(task.id);
      updateFloatingUI();
    });
  }

  const taskCycleBtn = document.getElementById('floatingTaskCycleBtn');
  if (taskCycleBtn) {
    taskCycleBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      await setFloatingTaskMenuOpen(!floatingTaskMenuOpen);
    });
  }

  const resizeHandle = document.getElementById('floatingResizeHandle');
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', async (event) => {
      if (await revealFloatingWindowFromHiddenInteraction(event, { primaryButtonOnly: true })) return;
      event.preventDefault();
      event.stopPropagation();
      await revealFloatingWindowFromEdge().catch(console.error);
      await getCurrentWindow().startResizeDragging('SouthEast').catch(console.error);
    });
  }

  document.querySelectorAll('.floating-task-menu-item').forEach(item => {
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      selectFloatingTask(item.dataset.taskId || '').catch(console.error);
    });
  });
}

async function bindFloatingWindowLifecycle() {
  if (floatingWindowLifecycleBound) return;
  floatingWindowLifecycleBound = true;
  const currentWindow = getCurrentWindow();

  await currentWindow.onMoved(() => {
    if (floatingGeometrySyncing) return;
    if (floatingAutoHideState.hidden) {
      scheduleFloatingHiddenPin();
      return;
    }
    window.clearTimeout(floatingMoveTimer);
    floatingMoveTimer = window.setTimeout(() => {
      updateFloatingEdgeCandidate().catch(console.error);
    }, 200);
  }).catch(console.error);

  await currentWindow.onResized((event) => {
    if (floatingGeometrySyncing) return;
    if (floatingAutoHideState.hidden) {
      scheduleFloatingHiddenPin();
      return;
    }
    window.clearTimeout(floatingResizeSaveTimer);
    floatingResizeSaveTimer = window.setTimeout(async () => {
      const scale = await getCurrentWindow().scaleFactor().catch(() => 1);
      const logicalWidth = event.payload.width / scale;
      const logicalHeight = event.payload.height / scale;
      const menuOffset = floatingTaskMenuOpen ? getFloatingGeometry(true).menuHeight + 8 : 0;
      const closedHeight = Math.max(60, logicalHeight - menuOffset);

      settings.floatingWindowWidth = Math.round(clampNumber(
        logicalWidth,
        FLOATING_MIN_WIDTH,
        FLOATING_MAX_WIDTH,
        settings.floatingWindowWidth
      ));
      settings.floatingWindowFontScale = Math.round(clampNumber(
        (closedHeight / FLOATING_BASE_HEIGHT) * 100,
        FLOATING_MIN_FONT_SCALE,
        FLOATING_MAX_FONT_SCALE,
        settings.floatingWindowFontScale
      ));
      normalizeFloatingSettings();
      updateFloatingUI();
      await saveSettings();
    }, 250);
  }).catch(console.error);
}

function updateFloatingUI() {
  if (!document.body.classList.contains('floating-mode')) return;

  const titleEl = document.querySelector('.floating-title');
  const timeEl = document.querySelector('.floating-time');
  const metaEl = document.querySelector('.floating-meta');
  const pauseBtn = document.getElementById('floatingPauseBtn');
  const taskCycleBtn = document.getElementById('floatingTaskCycleBtn');
  const taskMenu = document.getElementById('floatingTaskMenu');
  if (!titleEl || !timeEl || !metaEl) return;

  if (settings.floatingWindowMode === 'customCountdown') {
    titleEl.style.display = '';
    if (taskCycleBtn) taskCycleBtn.style.display = 'none';
    if (pauseBtn) {
      pauseBtn.innerHTML = ICONS.pause;
      pauseBtn.title = t('buttons.pause');
      pauseBtn.disabled = true;
    }
    if (floatingTaskMenuOpen) {
      floatingTaskMenuOpen = false;
      syncFloatingWindowGeometry(false).catch(console.error);
    }
    if (taskMenu) taskMenu.classList.remove('open');
    const remaining = getCustomCountdownRemaining();
    const title = settings.floatingCountdownTitle || t('floating.customTitle');
    titleEl.textContent = title;
    timeEl.textContent = remaining === null ? '--:--' : formatDuration(remaining);
    metaEl.textContent = settings.floatingCountdownTarget ? t('floating.customCountdown') : t('floating.noTarget');

    if (remaining === 0 && settings.floatingCountdownTarget && !floatingCountdownNotified) {
      floatingCountdownNotified = true;
      playReminderSound();
      notifySystem(title, t('floating.done'), { showToast: false });
    }
    return;
  }

  titleEl.style.display = '';
  if (taskCycleBtn) {
    taskCycleBtn.style.display = '';
    taskCycleBtn.classList.toggle('active', floatingTaskMenuOpen);
    taskCycleBtn.setAttribute('aria-expanded', String(floatingTaskMenuOpen));
  }
  if (taskMenu) {
    taskMenu.classList.toggle('open', floatingTaskMenuOpen);
  }
  const { task, remaining } = getFloatingReminderInfo();
  if (pauseBtn) {
    const taskPaused = !!(task && taskPausedStatus[task.id]);
    pauseBtn.innerHTML = taskPaused ? ICONS.play : ICONS.pause;
    pauseBtn.title = taskPaused ? t('buttons.resume') : t('buttons.pause');
    pauseBtn.disabled = !task || !task.enabled;
  }
  titleEl.textContent = task ? getTaskDisplayTitle(task) : t('status.noActiveTask');
  timeEl.textContent = task ? formatDuration(remaining) : '--:--';
  metaEl.textContent = getFloatingMetaText(task);
}

function bindEvents() {
  document.querySelectorAll('.toggle').forEach(el => {
    el.addEventListener('click', async (e) => {
      if (el.dataset.toggleId) {
        const task = settings.tasks.find(t => t.id === el.dataset.toggleId);
        if (task) {
          task.enabled = !task.enabled;
          el.classList.toggle('active', task.enabled);
          saveSettings();
          syncTasksToBackend();  // 同步到后端
          updateLiveValues();
        }
      } else if (el.id === 'soundToggle') {
        settings.soundEnabled = !settings.soundEnabled;
        el.classList.toggle('active', settings.soundEnabled);
        saveSettings();
        renderFullUI();
      } else if (el.id === 'startToggle') {
        try {
          const newState = !settings.autoStart;
          if (newState) {
            await enable();
          } else {
            await disable();
          }
          settings.autoStart = newState;
          el.classList.toggle('active', settings.autoStart);
          saveSettings();
          renderFullUI();
        } catch (err) {
          console.error('Failed to toggle autostart', err);
        }
      } else if (el.id === 'silentAutoStartToggle') {
        settings.silentAutoStart = !settings.silentAutoStart;
        el.classList.toggle('active', settings.silentAutoStart);
        saveSettings();
      } else if (el.id === 'floatingWindowToggle') {
        settings.floatingWindowEnabled = !settings.floatingWindowEnabled;
        el.classList.toggle('active', settings.floatingWindowEnabled);
        saveSettings();
        syncFloatingWindow();
        renderFullUI();
      } else if (el.id === 'floatingAutoHideToggle') {
        settings.floatingWindowAutoHide = !settings.floatingWindowAutoHide;
        el.classList.toggle('active', settings.floatingWindowAutoHide);
        saveSettings();
        syncFloatingWindow();
      } else if (el.id === 'lockToggle') {
        settings.lockScreenEnabled = !settings.lockScreenEnabled;
        el.classList.toggle('active', settings.lockScreenEnabled);
        saveSettings();
        renderFullUI();
      } else if (el.id === 'autoUnlockToggle') {
        settings.autoUnlock = !settings.autoUnlock;
        el.classList.toggle('active', settings.autoUnlock);
        saveSettings();
      } else if (el.id === 'strictModeToggle') {
        settings.strictMode = !settings.strictMode;
        el.classList.toggle('active', settings.strictMode);
        saveSettings();
      } else if (el.id === 'resetOnIdleToggle') {
        settings.resetOnIdle = !settings.resetOnIdle;
        el.classList.toggle('active', settings.resetOnIdle);
        // 显示/隐藏空闲阈值设置
        const idleThresholdRow = document.getElementById('idleThresholdRow');
        if (idleThresholdRow) {
          idleThresholdRow.style.display = settings.resetOnIdle ? 'flex' : 'none';
        }
        saveSettings();
        syncTasksToBackend();
      } else if (el.id === 'allowStrictSnoozeToggle') {
        settings.allowStrictSnooze = !settings.allowStrictSnooze;
        el.classList.toggle('active', settings.allowStrictSnooze);
        saveSettings();
        renderFullUI();
      } else if (el.id === 'enableMergeToggle') {
        settings.enableMerge = !settings.enableMerge;
        el.classList.toggle('active', settings.enableMerge);
        saveSettings();
        renderFullUI();
      } else if (el.id === 'themeToggle') {
        settings.theme = settings.theme === 'light' ? 'dark' : 'light';
        el.classList.toggle('active', settings.theme === 'dark');
        applyTheme(settings.theme);
        saveSettings();
      }
    });
  });

  document.querySelectorAll('.interval-input').forEach(el => {
    el.addEventListener('input', (e) => {
      if (el.disabled) return;
      const val = parseInt(e.target.value);
      if (val > 0) {
        updateTask(el.dataset.id, { interval: val });
        updateLiveValues();
      }
    });
  });

  document.querySelectorAll('.floating-theme-swatch').forEach(el => {
    el.addEventListener('click', async () => {
      applyFloatingThemePreset(el.dataset.theme || 'blue');
      await saveSettings();
      await syncFloatingWindow();
      renderFullUI();
    });
  });

  document.querySelectorAll('.schedule-type-option').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const scheduleType = el.dataset.scheduleType;
      const task = settings.tasks.find(t => t.id === id);
      if (!task) return;
      if (scheduleType === 'daily' && (!task.dailyTimes || task.dailyTimes.length === 0)) {
        task.dailyTimes = ['11:00'];
      }
      updateTask(id, { scheduleType, dailyTimes: task.dailyTimes || [] });
      renderFullUI();
    });
  });

  document.querySelectorAll('.daily-times-input').forEach(el => {
    el.addEventListener('change', (e) => {
      const id = el.dataset.id;
      const dailyTimes = normalizeDailyTimes(e.target.value);
      e.target.value = dailyTimes.join(', ');
      updateTask(id, { dailyTimes, scheduleType: dailyTimes.length > 0 ? 'daily' : 'interval' });
      renderFullUI();
    });
  });

  document.querySelectorAll('.preset-btn[data-val]').forEach(el => {
    el.addEventListener('click', () => {
      const val = parseInt(el.dataset.val);
      updateTask(el.dataset.id, { interval: val });
      const input = document.querySelector(`.interval-input[data-id="${el.dataset.id}"]`);
      if (input) input.value = val;
      updateLiveValues();
    });
  });

  document.querySelectorAll('.title[contenteditable="true"]').forEach(el => {
    el.addEventListener('blur', (e) => {
      const task = settings.tasks.find(t => t.id === el.dataset.id);
      if (task) {
        delete task.titleKey;
      }
      updateTask(el.dataset.id, { title: e.target.innerText.trim() });
      updateLiveValues();
    });
  });

  // 进度条点击重置 (保留旧逻辑)
  document.querySelectorAll('.progress-mini[data-reset-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.resetId;
      resetTask(id);
    });
  });

  // 新增：旋转箭头按钮重置
  document.querySelectorAll('.reset-task-btn[data-reset-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      // 阻止冒泡防止触发其他点击事件
      e.stopPropagation();
      const id = el.dataset.resetId;
      resetTask(id);
      
      // 添加旋转动画效果
      const svg = el.querySelector('svg');
      if(svg) {
        svg.style.transition = 'transform 0.5s ease';
        svg.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          svg.style.transition = 'none';
          svg.style.transform = 'rotate(0deg)';
        }, 500);
      }
    });
  });

  // 新增：设置按钮切换展开
  document.querySelectorAll('.settings-btn[data-settings-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.settingsId;
      const card = document.querySelector(`.reminder-card[data-id="${id}"]`);
      if (card) {
        card.classList.toggle('expanded');
        const svg = el.querySelector('svg');
        if (svg) {
          svg.style.transition = 'transform 0.3s ease';
          svg.style.transform = card.classList.contains('expanded') ? 'rotate(60deg)' : 'rotate(0deg)';
          el.style.color = card.classList.contains('expanded') ? 'var(--primary)' : 'var(--text-muted)';
        }
      }
    });
  });

  document.querySelectorAll('.remove-btn').forEach(el => {
    el.addEventListener('click', () => removeTask(el.dataset.id));
  });

  // 任务级别的锁屏时长输入框
  document.querySelectorAll('.lock-duration-input').forEach(el => {
    el.addEventListener('input', (e) => {
      const id = el.dataset.id;
      const task = settings.tasks.find(t => t.id === id);
      const val = parseInt(e.target.value);
      if (task && val >= 5) {
        task.lockDuration = val;
        saveSettings();
      }
    });
  });

  // 任务级别的预告时间输入框
  document.querySelectorAll('.pre-notify-input').forEach(el => {
    el.addEventListener('input', (e) => {
      const id = el.dataset.id;
      const task = settings.tasks.find(t => t.id === id);
      const val = parseInt(e.target.value);
      if (task && val >= 0) {
        task.preNotificationSeconds = val;
        saveSettings();
      }
    });
  });

  // 任务级别的推迟时间输入框
  document.querySelectorAll('.snooze-input').forEach(el => {
    el.addEventListener('input', (e) => {
      const id = el.dataset.id;
      const task = settings.tasks.find(t => t.id === id);
      const val = parseInt(e.target.value);
      if (task && val >= 1) {
        task.snoozeMinutes = val;
        saveSettings();
      }
    });
  });

  document.getElementById('addTaskBtn').onclick = addTask;
  document.getElementById('pauseBtn').onclick = togglePause;
  document.getElementById('resetBtn').onclick = resetAll;
  document.getElementById('dismissBtn').onclick = dismissNotification;
  
  const popupSnoozeBtn = document.getElementById('popupSnoozeBtn');
  if (popupSnoozeBtn) {
    popupSnoozeBtn.onclick = () => {
      const minutes = activePopup ? (activePopup.snoozeMinutes || 5) : 5;
      snoozeTask(minutes);
    };
  }

  const lockSnoozeBtn = document.getElementById('lockSnoozeBtn');
  if (lockSnoozeBtn) {
    lockSnoozeBtn.addEventListener('click', () => {
      const minutes = lockScreenState.task ? (lockScreenState.task.snoozeMinutes || 5) : 5;
      snoozeTask(minutes);
    });
  }
  
  document.getElementById('testSoundBtn').onclick = () => {
    if (settings.customSoundPath) {
      invoke('test_custom_sound', { filePath: settings.customSoundPath })
        .catch(err => {
          console.error('Failed to test custom sound:', err);
          showMessage('warning', t('notification.soundFailed'));
        });
    } else {
      playReminderSound();
    }
  };

  const selectCustomSoundBtn = document.getElementById('selectCustomSoundBtn');
  if (selectCustomSoundBtn) {
    selectCustomSoundBtn.addEventListener('click', async () => {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [{
          name: 'Audio',
          extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma']
        }]
      });
      const audioPath = extractDialogPath(selected);
      if (audioPath) {
        settings.customSoundPath = audioPath;
        saveSettings();
        renderFullUI();
      }
    });
  }

  const clearCustomSoundBtn = document.getElementById('clearCustomSoundBtn');
  if (clearCustomSoundBtn) {
    clearCustomSoundBtn.addEventListener('click', () => {
      settings.customSoundPath = '';
      saveSettings();
      renderFullUI();
    });
  }

  const unlockBtn = document.getElementById('unlockBtn');
  if (unlockBtn) {
    unlockBtn.addEventListener('mousedown', startUnlockPress);
    unlockBtn.addEventListener('mouseup', cancelUnlockPress);
    unlockBtn.addEventListener('mouseleave', cancelUnlockPress);
    unlockBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startUnlockPress();
    });
    unlockBtn.addEventListener('touchend', cancelUnlockPress);
    unlockBtn.addEventListener('touchcancel', cancelUnlockPress);
  }

  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', endLockScreen);
  }

  const updateBtn = document.getElementById('updateBtn');
  if (updateBtn) {
    updateBtn.addEventListener('click', performUpdate);
  }

  // 空闲重置横幅关闭按钮
  const idleResetDismissBtn = document.getElementById('idleResetDismissBtn');
  if (idleResetDismissBtn) {
    idleResetDismissBtn.addEventListener('click', () => {
      showIdleResetBanner = false;
      renderFullUI();
    });
  }

  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', () => {
      if (updateInfo) {
        // 如果已经有更新信息，执行更新
        performUpdate();
      } else {
        // 否则检查更新
        checkForUpdates(true);
      }
    });
  }

  const idleThresholdInput = document.getElementById('idleThresholdInput');
  if (idleThresholdInput) {
    idleThresholdInput.addEventListener('input', async (e) => {
      const minutes = parseInt(e.target.value);
      if (minutes >= 1 && minutes <= 60) {
        settings.idleThreshold = minutes * 60;  // 转换为秒
        saveSettings();
        await invoke('set_idle_threshold', { seconds: settings.idleThreshold }).catch(console.error);
      }
    });
  }

  const advancedToggle = document.getElementById('advancedToggle');
  if (advancedToggle) {
    advancedToggle.onclick = () => {
      settings.advancedSettingsOpen = !settings.advancedSettingsOpen;
      saveSettings();
      renderFullUI();
    };
  }

  const mergeThresholdInput = document.getElementById('mergeThresholdInput');
  if (mergeThresholdInput) {
    mergeThresholdInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (val >= 5) {
        settings.mergeThreshold = val;
        saveSettings();
      }
    });
  }

  const maxSnoozeCountInput = document.getElementById('maxSnoozeCountInput');
  if (maxSnoozeCountInput) {
    maxSnoozeCountInput.addEventListener('input', (e) => {
      const count = parseInt(e.target.value);
      if (count >= 0) {
        settings.maxSnoozeCount = count;
        saveSettings();
      }
    });
  }

  const floatingModeSelect = document.getElementById('floatingModeSelect');
  if (floatingModeSelect) {
    floatingModeSelect.addEventListener('change', (e) => {
      settings.floatingWindowMode = e.target.value;
      floatingCountdownNotified = false;
      saveSettings();
      syncFloatingWindow();
      renderFullUI();
    });
  }

  const bindFloatingRange = (inputId, settingKey, valueId, suffix) => {
    const input = document.getElementById(inputId);
    const valueEl = document.getElementById(valueId);
    if (!input) return;
    input.addEventListener('input', (e) => {
      settings[settingKey] = parseInt(e.target.value, 10);
      normalizeFloatingSettings();
      if (valueEl) valueEl.textContent = `${settings[settingKey]}${suffix}`;
      saveSettings();
      syncFloatingWindow();
    });
  };

  bindFloatingRange('floatingWidthInput', 'floatingWindowWidth', 'floatingWidthValue', 'px');
  bindFloatingRange('floatingFontScaleInput', 'floatingWindowFontScale', 'floatingFontScaleValue', '%');
  bindFloatingRange('floatingOpacityInput', 'floatingWindowOpacity', 'floatingOpacityValue', '%');

  const floatingBgColorInput = document.getElementById('floatingBgColorInput');
  if (floatingBgColorInput) {
    floatingBgColorInput.addEventListener('input', (e) => {
      settings.floatingWindowBgColor = normalizeHexColor(e.target.value, settings.floatingWindowBgColor);
      settings.floatingWindowBgColor2 = settings.floatingWindowBgColor;
      settings.floatingWindowTheme = 'custom';
      saveSettings();
      syncFloatingWindow();
    });
  }

  const floatingTextColorInput = document.getElementById('floatingTextColorInput');
  if (floatingTextColorInput) {
    floatingTextColorInput.addEventListener('input', (e) => {
      settings.floatingWindowTextColor = normalizeHexColor(e.target.value, settings.floatingWindowTextColor);
      settings.floatingWindowTheme = 'custom';
      saveSettings();
      syncFloatingWindow();
    });
  }

  const floatingCountdownTitleInput = document.getElementById('floatingCountdownTitleInput');
  if (floatingCountdownTitleInput) {
    floatingCountdownTitleInput.addEventListener('change', (e) => {
      settings.floatingCountdownTitle = e.target.value.trim() || t('floating.customTitle');
      saveSettings();
      syncFloatingWindow();
    });
  }

  const floatingCountdownTargetInput = document.getElementById('floatingCountdownTargetInput');
  if (floatingCountdownTargetInput) {
    floatingCountdownTargetInput.addEventListener('change', (e) => {
      settings.floatingCountdownTarget = e.target.value;
      floatingCountdownNotified = false;
      saveSettings();
      syncFloatingWindow();
    });
  }

  const selectBgImageBtn = document.getElementById('selectBgImageBtn');
  if (selectBgImageBtn) {
    selectBgImageBtn.addEventListener('click', async () => {
      const selected = await openDialog({
        multiple: false,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
        }]
      });
      
      const imagePath = extractDialogPath(selected);
      if (imagePath) {
        settings.lockScreenBgImage = imagePath;
        saveSettings();
        renderFullUI();
      }
    });
  }

  const clearBgImageBtn = document.getElementById('clearBgImageBtn');
  if (clearBgImageBtn) {
    clearBgImageBtn.addEventListener('click', () => {
      settings.lockScreenBgImage = '';
      saveSettings();
      renderFullUI();
    });
  }

  // 语言切换事件
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.addEventListener('change', async (e) => {
      const newLocale = e.target.value;
      settings.language = newLocale;
      setLocale(newLocale);
      await saveSettings();
      // 通知后端更新托盘菜单语言
      invoke('update_tray_language', { language: newLocale }).catch(() => {});
      await syncTasksToBackend();
      updateTrayTooltip(true);
      renderFullUI();
    });
  }
}

window.triggerNotification = triggerNotification;
window.settings = settings;

init();
