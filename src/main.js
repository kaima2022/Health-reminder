import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { requestPermission } from '@tauri-apps/plugin-notification';

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
  volume: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`
};

const DEFAULT_TASKS = [
  { id: 'sit', title: '久坐提醒', desc: '该起来活动了，走动一下吧~', interval: 45, enabled: true, icon: 'sit' },
  { id: 'water', title: '喝水提醒', desc: '该喝口水了，保持水分充足~', interval: 60, enabled: true, icon: 'water' },
  { id: 'eye', title: '护眼提醒', desc: '让眼睛休息一下，看看远处~', interval: 20, enabled: true, icon: 'eye' }
];

let settings = {
  tasks: [...DEFAULT_TASKS],
  soundEnabled: true,
  autoStart: false,
};

let countdowns = {};
let stats = {
  sitBreaks: 0,
  waterCups: 0,
  workMinutes: 0,
};
let isPaused = false;
let workStartTime = Date.now();
let activePopup = null; 

async function init() {
  await loadSettings();
  
  try {
    settings.autoStart = await isEnabled();
    console.log('Real autostart status:', settings.autoStart);
  } catch (e) {
    console.error('Failed to check autostart status', e);
  }

  try {
    await requestPermission();
  } catch (e) {
    console.error('Failed to request notification permission', e);
  }
  
  settings.tasks.forEach(task => {
    if (countdowns[task.id] === undefined) {
      countdowns[task.id] = task.interval * 60;
    }
  });

  renderFullUI(); 
  setInterval(tick, 1000);
  
  listen('show-window', () => {
    invoke('show_main_window');
  });
}

async function loadSettings() {
  try {
    const saved = await invoke('load_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      settings = { ...settings, ...parsed };
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

function tick() {
  if (isPaused) return;
  stats.workMinutes = Math.floor((Date.now() - workStartTime) / 60000);
  settings.tasks.forEach(task => {
    if (task.enabled && countdowns[task.id] > 0) {
      countdowns[task.id]--;
      if (countdowns[task.id] === 0) {
        triggerNotification(task);
      }
    }
  });
  updateLiveValues(); 
}

async function triggerNotification(task) {
  activePopup = { ...task };
  if (settings.soundEnabled) {
    invoke('play_notification_sound').catch(() => {});
  }
  invoke('show_notification', { title: task.title, body: task.desc }).catch(console.error);
  renderFullUI(); 
}

function dismissNotification() {
  if (!activePopup) return;
  const id = activePopup.id;
  if (id === 'sit') stats.sitBreaks++;
  if (id === 'water') stats.waterCups++;
  const task = settings.tasks.find(t => t.id === id);
  if (task) countdowns[id] = task.interval * 60;
  activePopup = null;
  saveStats();
  renderFullUI();
}

function addTask() {
  const id = 'task_' + Date.now();
  settings.tasks.push({
    id: id, title: '新提醒', desc: '又是充满活力的一天，记得休息哦~',
    interval: 30, enabled: true, icon: 'bell'
  });
  countdowns[id] = 30 * 60;
  saveSettings();
  renderFullUI();
}

function removeTask(id) {
  settings.tasks = settings.tasks.filter(t => t.id !== id);
  delete countdowns[id];
  saveSettings();
  renderFullUI();
}

function updateTask(id, updates) {
  const task = settings.tasks.find(t => t.id === id);
  if (task) {
    Object.assign(task, updates);
    if (updates.interval !== undefined) {
      countdowns[id] = task.interval * 60;
    }
    saveSettings();
  }
}

function togglePause() {
  isPaused = !isPaused;
  renderFullUI();
}

function resetAll() {
  settings.tasks.forEach(task => {
    countdowns[task.id] = task.interval * 60;
  });
  isPaused = false;
  renderFullUI();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateLiveValues() {
  const statsElements = document.querySelectorAll('.status-item .value');
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

  const timerText = document.querySelector('.time-text');
  if (timerText) {
    const timeStr = nextTask ? formatTime(countdowns[nextTask.id]) : '--:--';
    timerText.querySelector('.minutes').innerText = timeStr.split(':')[0];
    timerText.querySelector('.seconds').innerText = ':' + timeStr.split(':')[1];
  }

  const timerLabel = document.querySelector('.timer-label');
  if (timerLabel) {
    timerLabel.innerText = (nextTask ? nextTask.title : '无活动任务') + (isPaused ? ' (已暂停)' : '');
  }

  const mainRing = document.querySelector('.timer-ring .progress');
  if (mainRing && nextTask) {
    const total = nextTask.interval * 60;
    const offset = 502 * (1 - countdowns[nextTask.id] / total);
    mainRing.style.strokeDashoffset = offset;
  }

  settings.tasks.forEach(task => {
    const card = document.querySelector(`.reminder-card[data-id="${task.id}"]`);
    if (card) {
      const current = countdowns[task.id] || 0;
      const total = task.interval * 60;
      const offset = 113 * (1 - current / total);
      card.querySelector('.progress-mini .progress').style.strokeDashoffset = offset;
      const timeDisplay = card.querySelector('.time-remaining');
      if (timeDisplay) timeDisplay.innerText = `(${formatTime(current)})`;
    }
  });
}

function renderFullUI() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="header">
      <h1>健康提醒助手</h1>
      <p>关爱健康，从每一次提醒开始</p>
    </div>

    <div class="status-bar">
      <div class="status-item"><div class="icon">${ICONS.sit}</div><div class="value">${stats.sitBreaks}</div><div class="label">休息次数</div></div>
      <div class="status-item"><div class="icon">${ICONS.water}</div><div class="value">${stats.waterCups}</div><div class="label">喝水次数</div></div>
      <div class="status-item"><div class="icon">${ICONS.work}</div><div class="value">${stats.workMinutes}</div><div class="label">工作分钟</div></div>
    </div>

    <div class="timer-display">
      <div class="timer-ring">
        <svg width="180" height="180" viewBox="0 0 180 180"><circle class="bg" cx="90" cy="90" r="80" /><circle class="progress" cx="90" cy="90" r="80" stroke-dasharray="502" stroke-dashoffset="502" /></svg>
        <div class="time-text"><div class="minutes">00</div><div class="seconds">:00</div></div>
      </div>
      <div class="timer-label">正在加载...</div>
    </div>

    <div class="reminder-cards">
      ${settings.tasks.map(task => `
        <div class="reminder-card" data-id="${task.id}">
          <div class="progress-mini" style="cursor:pointer;" title="点击重置" data-reset-id="${task.id}">
            <svg width="40" height="40" viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="18" /><circle class="progress" cx="20" cy="20" r="18" stroke-dasharray="113" stroke-dashoffset="113" /></svg>
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:var(--primary); pointer-events:none;">${ICONS[task.icon] || ICONS.bell}</div>
          </div>
          <div class="info">
            <div class="title" contenteditable="true" data-id="${task.id}">${task.title}</div>
            <div class="interval-controls">
              <div class="input-group">
                <input type="number" class="interval-input" value="${task.interval}" data-id="${task.id}" min="1" max="1440">
                <span style="font-size:0.8rem; color:var(--text-muted)">分钟 <span class="time-remaining"></span></span>
              </div>
              <div class="presets">
                <button class="preset-btn" data-id="${task.id}" data-val="15">15m</button><button class="preset-btn" data-id="${task.id}" data-val="30">30m</button>
                <button class="preset-btn" data-id="${task.id}" data-val="45">45m</button><button class="preset-btn" data-id="${task.id}" data-val="60">60m</button>
              </div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
            <div class="toggle ${task.enabled ? 'active' : ''}" data-toggle-id="${task.id}"></div>
            ${!['sit', 'water', 'eye'].includes(task.id) ? `<div class="remove-btn" data-id="${task.id}" style="color:var(--danger); cursor:pointer;">${ICONS.trash}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <button class="add-task-btn" id="addTaskBtn">${ICONS.plus} 添加自定义提醒</button>

    <div class="quick-actions">
      <button class="btn btn-primary" id="pauseBtn">${isPaused ? ICONS.play : ICONS.pause} ${isPaused ? '继续' : '暂停'}</button>
      <button class="btn btn-secondary" id="resetBtn">${ICONS.reset} 全部重置</button>
    </div>

    <div class="settings-section">
      <h3>系统设置</h3>
      <div class="setting-row">
        <label>提示音</label>
        <div style="display:flex; gap:12px; align-items:center;">
          <button class="preset-btn" id="testSoundBtn" style="padding:4px 8px; display:flex; gap:4px; align-items:center;">${ICONS.volume} 测试</button>
          <div class="toggle ${settings.soundEnabled ? 'active' : ''}" id="soundToggle"></div>
        </div>
      </div>
      <div class="setting-row">
        <label>开机自启动</label>
        <div class="toggle ${settings.autoStart ? 'active' : ''}" id="startToggle"></div>
      </div>
    </div>

    <div class="notification-popup ${activePopup ? 'show' : ''}">
      <div class="notification-content">
        <div class="emoji">${activePopup ? (ICONS[activePopup.icon] || ICONS.bell) : ''}</div>
        <h2>${activePopup ? activePopup.title : ''}</h2>
        <p>${activePopup ? activePopup.desc : ''}</p>
        <button class="btn btn-primary" id="dismissBtn">我知道了</button>
      </div>
    </div>

    <div class="footer">健康办公助手 v1.4 · 愿你每天都有好身体</div>
  `;

  bindEvents();
  updateLiveValues();
}

function bindEvents() {
  document.querySelectorAll('.toggle').forEach(el => {
    el.addEventListener('click', async (e) => {
      console.log('Toggle clicked:', el.id || el.dataset.toggleId);
      
      if (el.dataset.toggleId) {
        // 任务卡片开关
        const task = settings.tasks.find(t => t.id === el.dataset.toggleId);
        if (task) {
          task.enabled = !task.enabled;
          el.classList.toggle('active', task.enabled);
          saveSettings();
          updateLiveValues();
        }
      } else if (el.id === 'soundToggle') {
        // 提示音开关
        settings.soundEnabled = !settings.soundEnabled;
        el.classList.toggle('active', settings.soundEnabled);
        saveSettings();
      } else if (el.id === 'startToggle') {
        // 自启动开关
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
          console.log('Autostart toggled to:', settings.autoStart);
        } catch (err) {
          console.error('Failed to toggle autostart', err);
          alert('设置自启动失败，请检查系统权限');
        }
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

  document.querySelectorAll('.progress-mini[data-reset-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.resetId;
      const task = settings.tasks.find(t => t.id === id);
      if (task) {
        countdowns[id] = task.interval * 60;
        updateLiveValues();
      }
    });
  });

  document.querySelectorAll('.remove-btn').forEach(el => {
    el.addEventListener('click', () => removeTask(el.dataset.id));
  });

  document.getElementById('addTaskBtn').onclick = addTask;
  document.getElementById('pauseBtn').onclick = togglePause;
  document.getElementById('resetBtn').onclick = resetAll;
  document.getElementById('dismissBtn').onclick = dismissNotification;
  
  document.getElementById('testSoundBtn').onclick = () => {
    console.log('Test sound button clicked');
    invoke('play_notification_sound').catch(e => console.error('Sound invoke failed:', e));
  };
}

window.triggerNotification = triggerNotification;
window.settings = settings;

init();