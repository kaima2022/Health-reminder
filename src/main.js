import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { requestPermission } from '@tauri-apps/plugin-notification';
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
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
};

const DEFAULT_TASKS = [
  { id: 'sit', title: '久坐提醒', desc: '该起来活动了，走动一下吧~', interval: 45, enabled: true, icon: 'sit', lockDuration: 60, autoResetOnIdle: true, preNotificationSeconds: 5, snoozeMinutes: 5 },
  { id: 'water', title: '喝水提醒', desc: '该喝口水了，保持水分充足~', interval: 60, enabled: true, icon: 'water', lockDuration: 60, autoResetOnIdle: true, preNotificationSeconds: 5, snoozeMinutes: 5 },
  { id: 'eye', title: '护眼提醒', desc: '让眼睛休息一下，看看远处~', interval: 20, enabled: true, icon: 'eye', lockDuration: 60, autoResetOnIdle: true, preNotificationSeconds: 5, snoozeMinutes: 2 }
];

let settings = {
  tasks: [...DEFAULT_TASKS],
  soundEnabled: true,
  customSoundPath: '',  // 自定义提示音路径
  autoStart: false,
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
};

let countdowns = {};  // 现在由后端事件更新
let snoozedStatus = {}; // 推迟状态
let stats = {
  sitBreaks: 0,
  waterCups: 0,
  workMinutes: 0,
};
let isPaused = false;
let isIdle = false;  // 当前是否处于空闲状态
let workStartTime = Date.now();
let activePopup = null;
let taskQueue = []; // 任务队列
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
let showIdleResetBanner = false;  // 显示空闲重置通知横幅

let domCache = null;
let isUiSuspended = false;
let lastTrayTooltipText = '';
let lastTrayTooltipUpdateAt = 0;
const TRAY_TOOLTIP_MIN_INTERVAL_MS = 5000;

// 同步任务配置到后端
async function syncTasksToBackend() {
  const tasksForBackend = settings.tasks.map(t => ({
    id: t.id,
    title: t.title,
    desc: t.desc,
    interval: t.interval,
    enabled: t.enabled,
    icon: t.icon,
    auto_reset_on_idle: settings.resetOnIdle // 使用全局设置
  }));
  await invoke('sync_tasks', { tasks: tasksForBackend }).catch(console.error);
}

async function init() {
  applyTheme(settings.theme); // 在加载设置后立即应用主题
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'lock_slave') {
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

  try {
    await requestPermission();
  } catch (e) {
    console.error('Failed to request notification permission', e);
  }

  // 初始化 countdowns 对象用于 UI 显示
  settings.tasks.forEach(task => {
    if (countdowns[task.id] === undefined) {
      countdowns[task.id] = task.interval * 60;
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
  listen('countdown-update', (event) => {
    const updates = event.payload;
    updates.forEach(info => {
      countdowns[info.id] = info.remaining;
      snoozedStatus[info.id] = { 
        active: info.snoozed, 
        remaining: info.snooze_remaining,
        count: info.snooze_count
      };
      
      // 预提醒逻辑
      const task = settings.tasks.find(t => t.id === info.id);
      const preNotifyTime = (task && task.preNotificationSeconds !== undefined) ? task.preNotificationSeconds : 5;
      
      if (info.enabled && !isIdle && !isPaused && preNotifyTime > 0 && info.remaining === preNotifyTime) {
        if (task) {
           if (settings.soundEnabled) {
             invoke('play_notification_sound', { customSoundPath: settings.customSoundPath || null }).catch(() => {});
           }
           invoke('show_notification', {
             title: t('notification.preNotifyTitle', { title: getTaskDisplayTitle(task) }),
             body: t('notification.preNotifyBody', { seconds: preNotifyTime })
           }).catch(console.error);
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
  listen('task-triggered', async (event) => {
    const task = event.payload;
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
  });

  // 监听空闲状态变化
  listen('idle-status-changed', (event) => {
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

  listen('show-window', () => {
    invoke('show_main_window');
  });

  listen('reset-all-tasks', () => {
    resetAll();
  });

  listen('toggle-pause', () => {
    togglePause();
  });

  listen('system-locked', () => {
    invoke('timer_set_system_locked', { locked: true }).catch(console.error);
  });

  listen('system-unlocked', () => {
    invoke('timer_set_system_locked', { locked: false }).catch(console.error);
  });

  // 每秒更新工作时间统计（这个保留在前端）
  setInterval(() => {
    stats.workMinutes = Math.floor((Date.now() - workStartTime) / 60000);
  }, 1000);

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
      const errorMsg = e?.response?.data || e?.message || t('update.networkError');
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
  renderFullUI();
  
  try {
    await updateInfo.update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    console.error('Update failed:', e);
    isUpdating = false;
    renderFullUI();
  }
}

async function loadSettings() {
  try {
    const saved = await invoke('load_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      settings = { ...settings, ...parsed };
      
      // 迁移逻辑：确保旧数据中的任务也有新字段
      settings.tasks = settings.tasks.map(task => {
        const def = DEFAULT_TASKS.find(d => d.id === task.id);
        return {
          preNotificationSeconds: def ? def.preNotificationSeconds : 5,
          snoozeMinutes: def ? def.snoozeMinutes : 5,
          ...task
        };
      });
    }
  } catch (e) {
    console.log('Using default settings');
  }
  
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
  if (settings.soundEnabled) {
    invoke('play_notification_sound', { customSoundPath: settings.customSoundPath || null }).catch(() => {});
  }
  
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
  
  invoke('show_notification', { title: displayTitle, body: getTaskDisplayDesc(task) }).catch(console.error);

  if (settings.lockScreenEnabled) {
    await startLockScreen(task, mergedTasks);
  } else {
    activePopup = { ...task, mergedTaskIds: mergedTasks.map(t => t.id) };
    renderFullUI();
  }
}

async function startLockScreen(task, mergedTasks = []) {
  // 通知后端锁屏模式激活
  invoke('timer_set_lock_screen_active', { active: true }).catch(console.error);

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

  try {
    await invoke('show_main_window');
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

  renderFullUI();

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
  lockScreenState.active = false;
  lockScreenState.waitingConfirm = false;

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
    await invoke('exit_lock_mode');
    await invoke('hide_main_window');
  } catch (e) {
    console.error('Failed to exit lock mode', e);
  }

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
    interval: 30, enabled: true, icon: 'bell', lockDuration: 60, autoResetOnIdle: true, preNotificationSeconds: 5, snoozeMinutes: 5
  });
  countdowns[id] = 30 * 60;
  saveSettings();
  syncTasksToBackend();
  renderFullUI();
}

function removeTask(id) {
  settings.tasks = settings.tasks.filter(t => t.id !== id);
  delete countdowns[id];
  saveSettings();
  syncTasksToBackend();
  renderFullUI();
}

function resetTask(id) {
  const task = settings.tasks.find(t => t.id === id);
  if (task) {
    countdowns[id] = task.interval * 60;
    // 重置时清除推迟状态
    if (snoozedStatus[id]) {
      snoozedStatus[id].active = false;
      snoozedStatus[id].remaining = 0;
    }
    // 通知后端重置该任务
    invoke('timer_reset_task', { taskId: id }).catch(console.error);
    updateTrayTooltip(true);
    updateLiveValues();
  }
}

function updateTask(id, updates) {
  const task = settings.tasks.find(t => t.id === id);
  if (task) {
    Object.assign(task, updates);
    if (updates.interval !== undefined) {
      countdowns[id] = task.interval * 60;
    }
    saveSettings();
    // 同步到后端
    syncTasksToBackend();
  }
}

function togglePause() {
  isPaused = !isPaused;
  // 通知后端暂停/恢复
  if (isPaused) {
    invoke('timer_pause').catch(console.error);
  } else {
    invoke('timer_resume').catch(console.error);
  }
  invoke('update_pause_menu', { paused: isPaused }).catch(() => {});
  updateTrayTooltip(true);
  renderFullUI();
}

function resetAll() {
  // 通知后端重置所有任务
  invoke('timer_reset_all').catch(console.error);
  settings.tasks.forEach(task => {
    countdowns[task.id] = task.interval * 60;
    if (snoozedStatus[task.id]) {
      snoozedStatus[task.id].active = false;
      snoozedStatus[task.id].remaining = 0;
    }
  });
  isPaused = false;
  invoke('timer_resume').catch(console.error);
  updateTrayTooltip(true);
  renderFullUI();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
  const defaultTaskIds = ['sit', 'water', 'eye'];
  if (defaultTaskIds.includes(task.id)) {
    return t(`tasks.${task.id}.title`);
  }
  return task.title;
}

// 获取任务的显示描述（默认任务使用翻译，自定义任务使用用户设置）
function getTaskDisplayDesc(task) {
  const defaultTaskIds = ['sit', 'water', 'eye'];
  if (defaultTaskIds.includes(task.id)) {
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

  let nextTask = null;
  let minTime = Infinity;
  settings.tasks.forEach(t => {
    if (t.enabled && countdowns[t.id] < minTime) {
      minTime = countdowns[t.id];
      nextTask = t;
    }
  });

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
    const total = nextTask.interval * 60;
    if (total > 0) {
      const offset = 502 * (1 - (countdowns[nextTask.id] ?? 0) / total);
      domCache.mainRingProgress.style.strokeDashoffset = offset;
    }
  }

  settings.tasks.forEach(task => {
    const cardRefs = domCache.taskCards.get(task.id);
    if (!cardRefs) return;

    let current = countdowns[task.id] || 0;
    let total = task.interval * 60;
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
                <input type="number" class="interval-input" value="${task.interval}" data-id="${task.id}" min="1" max="1440">
                <span class="time-unit">${t('time.minutes')}</span>
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
              <input type="number" class="lock-input" value="${task.lockDuration || settings.lockDuration}" data-id="${task.id}" min="5" max="3600">
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
          <label>${t('settings.sound')}</label>
          <div style="display:flex; gap:12px; align-items:center;">
            <button class="preset-btn" id="testSoundBtn" style="padding:4px 8px; display:flex; gap:4px; align-items:center;">${ICONS.volume} ${t('buttons.test')}</button>
            <div class="toggle ${settings.soundEnabled ? 'active' : ''}" id="soundToggle"></div>
          </div>
        </div>

        <div class="setting-row" style="${settings.soundEnabled ? '' : 'display:none;'}" id="customSoundRow">
          <div class="setting-info">
            <label>${t('settings.customSound')}</label>
            <span class="setting-desc">${t('settings.customSoundDesc')}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="preset-btn" id="selectCustomSoundBtn" style="padding:6px 12px;">
              ${settings.customSoundPath ? t('buttons.changeSound') : t('buttons.selectSound')}
            </button>
            ${settings.customSoundPath ? `<button class="preset-btn" id="clearCustomSoundBtn" style="padding:6px 12px;">${t('buttons.clearSound')}</button>` : ''}
          </div>
        </div>

        <div class="setting-row">
          <label>${t('settings.autoStart')}</label>
          <div class="toggle ${settings.autoStart ? 'active' : ''}" id="startToggle"></div>
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
            <span class="setting-desc">${updateInfo ? t('settings.newVersion', { version: updateInfo.version }) : t('settings.currentVersion')}</span>
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
        <span class="toast-text">${updateMessage.text}</span>
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
        ${settings.strictMode ? '' : `
        <button class="unlock-btn" id="unlockBtn">
          <div class="unlock-progress"></div>
          <div class="unlock-text">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            ${t('lockScreen.emergencyUnlock')}
          </div>
        </button>
        `}
        ${(() => {
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

    <div class="footer">${t('app.footer')}</div>

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
        // Toggle custom sound row visibility
        const customSoundRow = document.getElementById('customSoundRow');
        if (customSoundRow) {
          customSoundRow.style.display = settings.soundEnabled ? '' : 'none';
        }
        saveSettings();
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
        } catch (err) {
          console.error('Failed to toggle autostart', err);
        }
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
      const val = parseInt(e.target.value);
      if (val > 0) {
        updateTask(el.dataset.id, { interval: val });
        updateLiveValues();
      }
    });
  });

  document.querySelectorAll('.preset-btn:not(#testSoundBtn)').forEach(el => {
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
      updateTask(el.dataset.id, { title: e.target.innerText });
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
  document.querySelectorAll('.lock-input:not(.pre-notify-input)').forEach(el => {
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
        .catch(err => console.error('Failed to test custom sound:', err));
    } else {
      invoke('play_notification_sound', { customSoundPath: null }).catch(e => console.error('Sound invoke failed:', e));
    }
  };
  
  // 选择自定义提示音
  const selectCustomSoundBtn = document.getElementById('selectCustomSoundBtn');
  if (selectCustomSoundBtn) {
    selectCustomSoundBtn.onclick = async () => {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [{
          name: 'Audio',
          extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma']
        }]
      });
      
      if (selected && !Array.isArray(selected)) {
        settings.customSoundPath = selected;
        saveSettings();
        render();
      }
    };
  }
  
  // 清除自定义提示音
  const clearCustomSoundBtn = document.getElementById('clearCustomSoundBtn');
  if (clearCustomSoundBtn) {
    clearCustomSoundBtn.onclick = () => {
      settings.customSoundPath = '';
      saveSettings();
      render();
    };
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
      
      if (selected) {
        // Tauri v2 dialog returns FilePath object, extract the path string
        const imagePath = typeof selected === 'string' ? selected : selected.path;
        if (imagePath) {
          settings.lockScreenBgImage = imagePath;
          saveSettings();
          renderFullUI();
        }
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
    languageSelect.addEventListener('change', (e) => {
      const newLocale = e.target.value;
      settings.language = newLocale;
      setLocale(newLocale);
      saveSettings();
      // 通知后端更新托盘菜单语言
      invoke('update_tray_language', { language: newLocale }).catch(() => {});
      renderFullUI();
    });
  }
}

window.triggerNotification = triggerNotification;
window.settings = settings;

init();
