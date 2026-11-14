/**
 * 工资与牛马值（朋友建议：设定月薪按计时算工资 + 按时长评牛马值）。
 * 口径（用户拍板 1A 2A 3B）：
 * - 1A 简单时薪 = 月薪 ÷ 21.75 天 ÷ 8 小时（21.75 为法定月计薪天数）
 * - 2A 牛马值 = 累计加班总时长，等级升级制（见习牛马 → … → 牛马圣体）
 * - 3B 展示只在统计页「牛马档案」卡
 * 月薪只存本机：独立 key，与业务数据（overtime_records_v1）互不干扰。
 */
const { fmtDur, parseTime, parseDate } = require('./time.js');

const WAGE_KEY = 'niuma_wage_v1';
const STANDARD_DAYS_PER_MONTH = 21.75;
const STANDARD_HOURS_PER_DAY = 8;

/** 简单时薪：月薪 ÷ 21.75 ÷ 8。月薪缺失/非法返回 null。 */
function hourlyRate(monthly) {
  const m = Number(monthly);
  if (!Number.isFinite(m) || m <= 0) return null;
  return m / STANDARD_DAYS_PER_MONTH / STANDARD_HOURS_PER_DAY;
}

/** 时长 × 时薪 = 收入。任一非法返回 null。 */
function wageOf(hours, rate) {
  const h = Number(hours);
  const r = Number(rate);
  if (!Number.isFinite(h) || !Number.isFinite(r) || r <= 0) return null;
  return h * r;
}

/** 牛马等级：按累计加班小时升级。 */
const NIUMA_LEVELS = [
  { min: 0, title: '见习牛马' },
  { min: 10, title: '正式牛马' },
  { min: 50, title: '资深牛马' },
  { min: 200, title: '牛马王' },
  { min: 500, title: '牛马圣体' }
];

/**
 * 牛马值评定：返回当前称号、等级、升下一级进度（0-100）与还差小时数。
 * 修成正果（满级）时 nextTitle=null、progress=100、gapHours=0。
 */
function niumaLevel(totalHours) {
  const h = Math.max(0, Number(totalHours) || 0);
  let i = 0;
  for (let k = 0; k < NIUMA_LEVELS.length; k++) {
    if (h >= NIUMA_LEVELS[k].min) i = k;
  }
  const cur = NIUMA_LEVELS[i];
  const next = NIUMA_LEVELS[i + 1] || null;
  const span = next ? next.min - cur.min : 1;
  const progress = next ? Math.min(100, ((h - cur.min) / span) * 100) : 100;
  return {
    title: cur.title,
    level: i + 1,
    totalHours: h,
    progress: Number(progress.toFixed(1)),
    nextTitle: next ? next.title : null,
    gapHours: next ? Math.round((next.min - h) * 10) / 10 : 0
  };
}

/* ---------- 单次打卡牛马等级（按每次打卡的时长评定，与累计等级并行） ---------- */

/**
 * 单次打卡段位表：minMinutes 为下限（含）。闪现打卡 → 签到侠 → … → 都市传说·伏地魔。
 * color 为 antd Tag 预设色名，UI 层直接取用。
 */
const PUNCH_LEVELS = [
  {
    rank: 'EX', icon: '⚡', color: 'default', title: '闪现打卡', minMinutes: 0,
    blurb: '打卡圈最短小精悍的存在。人在地铁口，定位在公司，工位的灰都嫌你来得太快。'
  },
  {
    rank: 'Lv.1', icon: '🎫', color: 'cyan', title: '签到侠', minMinutes: 5,
    blurb: '屁股没坐热就撤。工资按秒算你早财务自由了，可惜按月算。表演型加班，台下观众就你自己。'
  },
  {
    rank: 'Lv.2', icon: '🎭', color: 'blue', title: '职场气氛组', minMinutes: 30,
    blurb: '专职给领导的背影捧场。加班一小时，摸鱼五十分，演技倒是炉火纯青，可惜不发奥斯卡。'
  },
  {
    rank: 'Lv.3', icon: '🧳', color: 'geekblue', title: '都市隶人', minMinutes: 60,
    blurb: '体面的崩塌，从「我先走了」这三个字再也说不出口开始。房贷在背后拿枪顶着你，你还得回头说谢谢。'
  },
  {
    rank: 'Lv.4', icon: '🐂', color: 'gold', title: '正统牛马', minMinutes: 120,
    blurb: '血统纯正，基因稳定。别人 996 上新闻，你 996 是日常。外卖骑手都背下你的口味了，备注栏长期空白。'
  },
  {
    rank: 'Lv.5', icon: '🐎', color: 'orange', title: '汗血宝马', minMinutes: 240,
    blurb: '血是汗血，马是当牛做马。半条命换一份 PPT，领导一句「辛苦了」让你血赚——亏麻了的那种赚。'
  },
  {
    rank: 'Lv.6', icon: '🪑', color: 'volcano', title: '工位原住民', minMinutes: 360,
    blurb: '公司的水电气你比家里的还熟。房东以为房子租给了空气，猫以为自己被遗弃了，只有钉钉知道你还活着。'
  },
  {
    rank: 'Lv.7', icon: '⚙️', color: 'red', title: '人形永动机', minMinutes: 540,
    blurb: '已探明储量：一人顶三人用，工资按一人发。建议直接住公司，省下的房租给老板换辆车，他不会感谢你的。'
  },
  {
    rank: 'Lv.8', icon: '🎁', color: 'magenta', title: '福报体验官', minMinutes: 720,
    blurb: '恭喜进入福报核心区。体检报告在向你咆哮，ICU 在向你招手。「年轻人要多吃苦」——老板如是说，然后他准时下班了。'
  },
  {
    rank: 'Lv.9', icon: '👑', color: 'purple', title: '牛马圣体', minMinutes: 960,
    blurb: '肉身成圣，修成正果。行军床是婚床，会议室是客厅，工位是故乡。人类睡眠进化在你身上完成了闭环。'
  },
  {
    rank: 'SS', icon: '💀', color: 'purple', title: '都市传说·伏地魔', minMinutes: 1440,
    blurb: '不能被直呼其名的存在。监控里唯一 24 小时在线的生物，建议进化出光合作用，省得吃饭浪费工时。'
  }
];

/**
 * 单次打卡等级评定：按单次时长（小时，与 record.duration 同口径）返回段位、称号与毒舌点评。
 * 分钟数四舍五入后再比段位：record.duration 只留两位小数，5 分钟的班存成 0.08h，
 * 四舍五入回 5 分钟才落回「签到侠」，不然永远掉进「闪现打卡」。
 */
function punchLevel(hours) {
  const minutes = Math.round(Math.max(0, Number(hours) || 0) * 60);
  let i = 0;
  for (let k = 0; k < PUNCH_LEVELS.length; k++) {
    if (minutes >= PUNCH_LEVELS[k].minMinutes) i = k;
  }
  const cur = PUNCH_LEVELS[i];
  const next = PUNCH_LEVELS[i + 1] || null;
  return {
    rank: cur.rank,
    icon: cur.icon,
    color: cur.color,
    title: cur.title,
    blurb: cur.blurb,
    minutes,
    nextTitle: next ? next.title : null,
    gapMinutes: next ? next.minMinutes - minutes : 0
  };
}

/** 打卡中的升级嘲讽：再熬 X 分钟就是下一段位（满级换一句）。 */
function punchTaunt(hours) {
  const lv = punchLevel(hours);
  return lv.nextTitle
    ? `再熬 ${lv.gapMinutes} 分钟就是「${lv.nextTitle}」了，忍一忍，福报在招手 🤚`
    : '已封「都市传说」，建议直接进化出光合作用 🌿';
}

/** 与今天上一班对比的降级慰问：变短才说话，持平 / 更长 / 数据缺失返回 null。 */
function punchVerdict(prevHours, curHours) {
  const prev = Number(prevHours);
  const cur = Number(curHours);
  if (!Number.isFinite(prev) || !Number.isFinite(cur)) return null;
  return cur < prev ? '今天收敛了？老板还没适应没有你的夜晚' : null;
}

/** 牛马之最（纪录墙）：从记录里挖五项纪录，每条配一句毒舌。无记录返回 []。 */
function niumaWall(records = []) {
  const rs = (records || []).filter(r => (Number(r.duration) || 0) > 0);
  if (!rs.length) return [];
  const items = [];
  // 最长 / 最短一班（时长并列取先落库的那笔）
  const longest = rs.reduce((a, b) => (b.duration > a.duration ? b : a));
  const shortest = rs.reduce((a, b) => (b.duration < a.duration ? b : a));
  items.push({ key: 'longest', icon: '🏆', label: '单次最长', value: fmtDur(longest.duration), sub: longest.date, taunt: '这一班，够写进族谱。' });
  // 最晚下班：跨午夜（end < start）按次日折算再比大小
  const endMin = (r) => {
    const e = parseTime(r.end);
    if (e == null) return null;
    const s = parseTime(r.start);
    return e + (s != null && e < s ? 1440 : 0);
  };
  const timed = rs.filter(r => endMin(r) != null);
  if (timed.length) {
    const latest = timed.reduce((a, b) => (endMin(b) > endMin(a) ? b : a));
    items.push({ key: 'latest', icon: '🌙', label: '最晚下班', value: latest.end, sub: latest.date, taunt: '路灯认识你，保安也认识你。' });
  }
  // 单日之王：单日总时长最高
  const byDate = new Map();
  for (const r of rs) byDate.set(r.date, (byDate.get(r.date) || 0) + (Number(r.duration) || 0));
  let bestDate = null; let bestTotal = -1;
  for (const [date, total] of byDate) {
    if (total > bestTotal) { bestTotal = total; bestDate = date; }
  }
  items.push({ key: 'bestDay', icon: '📅', label: '单日之王', value: fmtDur(bestTotal), sub: bestDate, taunt: '这一天，公司才是你的家。' });
  items.push({ key: 'shortest', icon: '⚡', label: '最短一班', value: fmtDur(shortest.duration), sub: shortest.date, taunt: '打卡圈耻辱柱，C 位。' });
  // 最长连击：有记录的自然日最长连续段
  const dates = [...byDate.keys()].sort();
  let streak = 1; let streakFrom = dates[0]; let cur = 1; let curFrom = dates[0];
  for (let i = 1; i < dates.length; i += 1) {
    const gap = (parseDate(dates[i]) - parseDate(dates[i - 1])) / 86400000;
    if (gap === 1) { cur += 1; } else { cur = 1; curFrom = dates[i]; }
    if (cur > streak) { streak = cur; streakFrom = curFrom; }
  }
  items.push({ key: 'streak', icon: '🔥', label: '最长连击', value: `${streak} 天`, sub: `${streakFrom} 起`, taunt: '建议直接住下，省通勤。' });
  return items;
}

/** 读月薪（元）。缺失/坏数据返回 null。 */
function loadWage(storage = globalThis.localStorage, key = WAGE_KEY) {
  try {
    const raw = storage == null ? null : storage.getItem(key);
    if (raw == null || raw === '') return null;
    const v = Number(raw);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** 存月薪。null/非法则清除该 key。 */
function saveWage(monthly, storage = globalThis.localStorage, key = WAGE_KEY) {
  try {
    if (storage == null) return;
    const v = Number(monthly);
    if (!Number.isFinite(v) || v <= 0) storage.removeItem(key);
    else storage.setItem(key, String(v));
  } catch {
    /* 隐私模式等，忽略 */
  }
}

/* ---- build-miniprogram.mjs 生成的 CommonJS 出口（勿手改） ---- */
module.exports = { hourlyRate, wageOf, niumaLevel, punchLevel, punchTaunt, punchVerdict, niumaWall, loadWage, saveWage, WAGE_KEY, STANDARD_DAYS_PER_MONTH, STANDARD_HOURS_PER_DAY, NIUMA_LEVELS, PUNCH_LEVELS };
