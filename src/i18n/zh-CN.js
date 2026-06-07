/**
 * 中文语言包 (简体中文)
 */
export default {
  // 应用信息
  app: {
    title: '健康提醒助手',
    subtitle: '关爱健康，从每一次提醒开始',
    footer: '健康办公助手 v1.6.2 · 愿你每天都有好身体',
    trayTooltip: '健康提醒助手',
  },

  // 默认任务
  tasks: {
    sit: {
      title: '久坐提醒',
      desc: '该起来活动了，走动一下吧~',
    },
    water: {
      title: '喝水提醒',
      desc: '该喝口水了，保持水分充足~',
    },
    eye: {
      title: '护眼提醒',
      desc: '让眼睛休息一下，看看远处~',
    },
    newTask: {
      title: '新提醒',
      desc: '又是充满活力的一天，记得休息哦~',
    },
  },

  // 统计
  stats: {
    sitBreaks: '休息次数',
    waterCups: '喝水次数',
    workMinutes: '工作分钟',
  },

  // 时间单位
  time: {
    minutes: '分钟',
    seconds: '秒',
    times: '次',
    daily: '定点',
  },

  // 按钮
  buttons: {
    pause: '暂停',
    resume: '继续',
    resetAll: '全部重置',
    gotIt: '我知道了',
    snooze: '推迟 {minutes} 分钟',
    addTask: '添加自定义提醒',
    checkUpdate: '检查更新',
    updateNow: '立即更新',
    checking: '检查中...',
    test: '测试',
    confirmRest: '已完成休息',
    selectBg: '选择图片',
    changeBg: '更换图片',
    clear: '清除',
    selectSound: '选择音频',
    changeSound: '更换音频',
    clearSound: '使用默认',
  },

  // 锁屏
  lockScreen: {
    emergencyUnlock: '长按 3 秒紧急解锁',
    restTime: '休息时间',
    restMessage: '让身体和眼睛休息一下吧~',
    timeUp: '休息时间到！',
    confirmMessage: '您完成休息了吗？点击下方按钮确认~',
    snoozeLimit: '已达推迟上限',
    strictDisabled: '严格模式已禁用推迟',
    snoozeDuring: '推迟中 {time}',
  },

  // 设置
  settings: {
    title: '系统设置',
    lockScreen: '强制休息锁屏',
    lockScreenDesc: '提醒时锁定屏幕，确保真正休息',
    strictMode: '严格模式',
    strictModeDesc: '开启后锁屏界面将隐藏"紧急解锁"按钮，请谨慎开启',
    advanced: '高级设置',
    autoUnlock: '倒计时结束自动解锁',
    autoUnlockDesc: '休息结束后自动退出锁屏，无需手动确认',
    resetOnIdle: '空闲时重置并暂停任务',
    resetOnIdleDesc: '当用户离开电脑（空闲）时自动重置计时并暂停',
    allowStrictSnooze: '严格模式允许推迟',
    allowStrictSnoozeDesc: '开启后，即使在严格模式下也允许使用推迟功能',
    enableMerge: '合并任务',
    enableMergeDesc: '当一个任务触发时，将临近的任务提前合并一起休息',
    mergeThreshold: '合并阈值',
    mergeThresholdDesc: '剩余时间小于此值的任务将被合并',
    idleThreshold: '空闲检测阈值',
    idleThresholdDesc: '超过此时间无操作视为空闲',
    idleThresholdDescIdle: '超过此时间无操作视为空闲 (当前空闲中)',
    maxSnoozeCount: '最大推迟次数',
    maxSnoozeCountDesc: '任务触发后允许连续推迟的次数',
    sound: '提示音',
    soundDesc: '提醒时播放声音',
    customSound: '自定义提示音',
    customSoundDesc: '选择本地音频文件作为提示音',
    autoStart: '开机自启动',
    autoStartDesc: '登录系统后自动启动应用',
    silentAutoStart: '静默自启',
    silentAutoStartDesc: '开机自启时直接隐藏到托盘',
    floatingWindow: '悬浮窗',
    floatingWindowDesc: '显示置顶倒计时小窗',
    floatingMode: '悬浮窗模式',
    floatingModeDesc: '显示下个提醒或自定义倒计时',
    floatingModeNext: '下个提醒',
    floatingModeCustom: '自定义倒计时',
    floatingTheme: '悬浮窗配色',
    floatingThemeDesc: '切换蓝色、绿色等胶囊主题',
    floatingCustom: '自定义倒计时',
    floatingCustomDesc: '设置悬浮窗标题与目标时间',
    floatingTitlePlaceholder: '例如：秒杀开始',
    version: '版本更新',
    currentVersion: '当前版本 v1.6.2',
    newVersion: '当前版本 v1.6.2（有新版本 v{version}）',
    language: '语言',
    customBgImage: '自定义锁屏背景',
    customBgImageDesc: '选择一张图片作为锁屏背景',
    theme: '主题',
    themeDesc: '切换亮色/暗色模式',
  },

  // 任务卡片
  taskCard: {
    preNotify: '预告',
    schedule: '调度',
    intervalSchedule: '间隔',
    dailySchedule: '定点',
    dailyTimes: '时间点',
    allowSnooze: '允许推迟',
    lockDuration: '锁屏时长',
    clickToReset: '点击重置',
    settings: '设置',
    resetTask: '重置此任务',
  },

  // 状态
  status: {
    paused: '已暂停',
    idle: '空闲中',
    loading: '正在加载...',
    noActiveTask: '无活动任务',
    snoozed: '推迟中',
  },

  // 空闲
  idle: {
    resetNotice: '检测到空闲，任务已重置并暂停',
  },

  // 通知
  notification: {
    preNotifyTitle: '即将提醒：{title}',
    preNotifyBody: '还有 {seconds} 秒将触发提醒，请做好准备。',
    permissionDenied: '系统通知权限未开启，已使用应用内提醒兜底',
    fallback: '系统通知发送失败，已使用应用内提醒兜底',
    soundFailed: '提示音播放失败，将继续使用默认提醒',
  },

  // 悬浮窗
  floating: {
    nextReminder: '下个提醒',
    customCountdown: '自定义倒计时',
    customTitle: '秒杀倒计时',
    noTarget: '未设置目标时间',
    done: '目标时间到了',
    toggleMode: '切换模式',
    themeToggle: '切换配色：{theme}',
    theme: {
      blue: '蓝色',
      green: '绿色',
      teal: '青绿',
      slate: '深蓝',
    },
    openMain: '打开主窗口',
    hide: '隐藏悬浮窗',
  },

  // 更新
  update: {
    newVersion: '发现新版本 v{version}',
    updating: '正在更新...',
    upToDate: '已是最新版本！',
    checkFailed: '检查更新失败：{error}',
    networkError: '网络错误，请稍后重试',
  },

  // 托盘菜单
  tray: {
    quit: '退出',
    show: '显示主窗口',
    reset: '重置所有任务',
    pause: '暂停',
    resume: '继续',
  },
};
