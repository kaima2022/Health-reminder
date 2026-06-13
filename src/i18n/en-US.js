/**
 * English Language Pack (US English)
 */
export default {
  // App info
  app: {
    title: 'Health Reminder',
    subtitle: 'Care for your health, one reminder at a time',
    footer: 'Health Reminder v{version} · Wishing you good health every day',
    trayTooltip: 'Health Reminder',
  },

  // Default tasks
  tasks: {
    sit: {
      title: 'Stand Up Reminder',
      desc: 'Time to get up and stretch your legs~',
    },
    water: {
      title: 'Drink Water Reminder',
      desc: 'Time for a drink, stay hydrated~',
    },
    eye: {
      title: 'Eye Rest Reminder',
      desc: 'Give your eyes a break, look at something far away~',
    },
    newTask: {
      title: 'New Reminder',
      desc: 'Another energetic day, remember to take breaks~',
    },
  },

  // Statistics
  stats: {
    sitBreaks: 'Breaks Taken',
    waterCups: 'Drinks Taken',
    workMinutes: 'Work Minutes',
  },

  // Time units
  time: {
    minutes: 'min',
    seconds: 'sec',
    times: 'times',
    daily: 'daily',
  },

  // Buttons
  buttons: {
    pause: 'Pause',
    resume: 'Resume',
    resetAll: 'Reset All',
    gotIt: 'Got It',
    snooze: 'Snooze {minutes} min',
    addTask: 'Add Custom Reminder',
    checkUpdate: 'Check Update',
    updateNow: 'Update Now',
    checking: 'Checking...',
    test: 'Test',
    confirmRest: 'Rest Completed',
    selectBg: 'Select Image',
    changeBg: 'Change Image',
    clear: 'Clear',
    selectSound: 'Select Audio',
    changeSound: 'Change Audio',
    clearSound: 'Use Default',
  },

  // Lock screen
  lockScreen: {
    emergencyUnlock: 'Hold 3 sec to unlock',
    restTime: 'Rest Time',
    restMessage: 'Take a break for your body and eyes~',
    timeUp: 'Rest time is up!',
    confirmMessage: 'Have you finished your rest? Click the button to confirm~',
    snoozeLimit: 'Snooze limit reached',
    strictDisabled: 'Snooze disabled in strict mode',
    snoozeDuring: 'Snoozed {time}',
  },

  // Settings
  settings: {
    title: 'System Settings',
    lockScreen: 'Force Rest Lock Screen',
    lockScreenDesc: 'Lock screen when reminder triggers to ensure real rest',
    strictMode: 'Strict Mode',
    strictModeDesc: 'Hides the emergency unlock button on lock screen, use with caution',
    advanced: 'Advanced Settings',
    autoUnlock: 'Auto Unlock After Countdown',
    autoUnlockDesc: 'Automatically exit lock screen when rest ends, no confirmation needed',
    resetOnIdle: 'Reset & Pause Tasks When Idle',
    resetOnIdleDesc: 'Automatically reset timers and pause when user is away from computer',
    allowStrictSnooze: 'Allow Snooze in Strict Mode',
    allowStrictSnoozeDesc: 'When enabled, snooze is allowed even in strict mode',
    enableMerge: 'Merge Tasks',
    enableMergeDesc: 'Proactively merge upcoming tasks to rest together when a task triggers',
    mergeThreshold: 'Merge Threshold',
    mergeThresholdDesc: 'Tasks with remaining time less than this will be merged',
    idleThreshold: 'Idle Detection Threshold',
    idleThresholdDesc: 'Considered idle after this duration of inactivity',
    idleThresholdDescIdle: 'Considered idle after this duration of inactivity (Currently Idle)',
    maxSnoozeCount: 'Max Snooze Count',
    maxSnoozeCountDesc: 'Maximum consecutive snoozes allowed after task triggers',
    sound: 'Notification Sound',
    soundDesc: 'Play a sound when reminders trigger',
    customSound: 'Custom Sound',
    customSoundDesc: 'Select a local audio file for reminders',
    autoStart: 'Start on Boot',
    autoStartDesc: 'Start the app when you sign in',
    silentAutoStart: 'Silent Auto Start',
    silentAutoStartDesc: 'Hide directly to tray on boot',
    floatingWindow: 'Floating Window',
    floatingWindowDesc: 'Show a compact always-on-top countdown',
    floatingMode: 'Floating Mode',
    floatingModeDesc: 'Show next reminder or a custom countdown',
    floatingModeNext: 'Next Reminder',
    floatingModeCustom: 'Custom Countdown',
    floatingTheme: 'Floating Theme',
    floatingThemeDesc: 'Switch between blue, green, and other capsule themes',
    floatingCustom: 'Custom Countdown',
    floatingCustomDesc: 'Set the floating title and target time',
    floatingTitlePlaceholder: 'E.g. Sale starts',
    version: 'Version Update',
    currentVersion: 'Current version v{version}',
    newVersion: 'Current version v{currentVersion} (New version v{version} available)',
    language: 'Language',
    customBgImage: 'Custom Lock Screen Background',
    customBgImageDesc: 'Select an image for the lock screen background',
    theme: 'Theme',
    themeDesc: 'Switch light/dark mode',
  },

  // Task card
  taskCard: {
    preNotify: 'Pre-notify',
    schedule: 'Schedule',
    intervalSchedule: 'Interval',
    dailySchedule: 'Daily',
    dailyTimes: 'Times',
    allowSnooze: 'Allow snooze',
    lockDuration: 'Lock duration',
    clickToReset: 'Click to reset',
    settings: 'Settings',
    resetTask: 'Reset this task',
  },

  // Status
  status: {
    paused: 'Paused',
    idle: 'Idle',
    loading: 'Loading...',
    noActiveTask: 'No Active Task',
    snoozed: 'Snoozed',
    disabled: 'Disabled',
  },

  // Idle
  idle: {
    resetNotice: 'Idle detected, tasks reset and paused',
  },

  // Notifications
  notification: {
    preNotifyTitle: 'Upcoming: {title}',
    preNotifyBody: 'Reminder will trigger in {seconds} seconds, get ready.',
    permissionDenied: 'System notification permission is off; using in-app fallback',
    fallback: 'System notification failed; using in-app fallback',
    soundFailed: 'Sound playback failed; the reminder will continue',
  },

  // Floating window
  floating: {
    nextReminder: 'Next Reminder',
    customCountdown: 'Custom Countdown',
    customTitle: 'Countdown',
    noTarget: 'No target time set',
    done: 'Target time reached',
    toggleMode: 'Toggle mode',
    themeToggle: 'Switch theme: {theme}',
    resetTimer: 'Reset current reminder',
    selectTask: 'Select floating task',
    nearest: 'Nearest',
    theme: {
      blue: 'Blue',
      green: 'Green',
      teal: 'Teal',
      slate: 'Deep Blue',
    },
    openMain: 'Open main window',
    hide: 'Hide floating window',
  },

  // Update
  update: {
    newVersion: 'New version v{version} available',
    updating: 'Updating...',
    upToDate: 'Already up to date!',
    checkFailed: 'Update check failed: {error}',
    installFailed: 'Update install failed: {error}',
    networkError: 'Network error, please try again later',
  },

  // Tray menu
  tray: {
    quit: 'Quit',
    show: 'Show Main Window',
    reset: 'Reset All Tasks',
    pause: 'Pause',
    resume: 'Resume',
  },
};
