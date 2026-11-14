/**
 * 打卡瞬间毒舌弹幕（v3）：上班 / 下班打卡成功时各弹一条（用户拍板：只在打卡瞬间，计时中保持升段提示）。
 * 按场景分池（开工 / 收工 / 深夜 / 周末 / 短班彩蛋 / 超长班彩蛋），seq 轮换避免当天重复。
 * 纯函数，不碰 DOM；分钟口径与 punchLevel 一致（minutes = Math.round(hours * 60)）。
 */

const QUOTE_POOLS = {
  /** 开工池：上班打卡 */
  clockIn: [
    '你打卡的样子，像极了自愿。',
    '又来给老板的别墅添砖加瓦了 🧱',
    '叫醒你的不是闹钟，是贫穷。',
    '来得比保洁阿姨还早，感动吗？不敢动。',
    '今天也是为别人的财富自由添砖加瓦的一天 ✨',
    '工位的灰还没想好怎么落，你就来了。',
    '考勤表看了都替你敬业。'
  ],
  /** 收工池：下班打卡 */
  clockOut: [
    '恭喜下班！今日福报已到账，注意查收（并没有加班费）。',
    '你走后，公司安静得像没人爱过。',
    '关灯前想想，电费里有你的一份（并没有）。',
    '下班不积极，脑子有问题；下班太积极，钱包有问题。',
    '今日份的命已交付，明天请早。',
    '走了就别回头，回头还得打卡。',
    '工位替你向椅子转达了谢意。'
  ],
  /** 深夜池：22:00 - 05:00 打卡 */
  night: [
    '凌晨两点，全世界都睡了，只有你和路灯在给老板发光。',
    '月亮不睡你不睡，你是秃头小宝贝 🌙',
    '这个点还在公司，阎王爷看了都劝你早点走。',
    '保安大叔都认识你了，真不考虑办个年卡？',
    '别人的梦里是诗和远方，你的梦里是没做完的表格。',
    '公司才是你的家，钥匙都舍不得配一把？'
  ],
  /** 周末池：周六日打卡 */
  weekend: [
    '周末的公司，空调都比你会休息。',
    '朋友以为你失踪了，其实你在工位上发光（物理）。',
    '别人的周末叫生活，你的周末叫生存。',
    '节假日加班，主打一个陪伴——陪打印机。'
  ],
  /** 短班彩蛋：本次 < 5 分钟（闪现打卡段位） */
  flash: [
    '⚡ 闪现打卡 · 打卡界到此一游 🚩',
    '屁股没坐热就走，椅子都想跟你谈谈心。',
    '来都来了，就这？',
    '工位的灰还没认全你，你就走了。'
  ],
  /** 超长班彩蛋：本次 ≥ 16 小时（牛马圣体 / 伏地段位） */
  marathon: [
    '建议直接睡公司，省下的房租就是变相加薪。',
    '你不是打工人，你是公司固定资产，记得计提折旧。',
    '这一班熬穿了黑夜和白天，考勤系统都看呆了。',
    '体检报告上每个箭头都是军功章 🏅'
  ],
  /** 加班池：计时器翻红（跨过下班时间）那一刻 */
  overtime: [
    '计时器红了。恭喜进入加班时段，老板的宝马就靠你了。',
    '下班时间已过，你现在是自愿的（并没有）。',
    '红了红了，这不是涨薪，是加班。',
    '到点没走，福报续上了。',
    '这一段红的，都是给老板的爱马仕添的砖 🧱'
  ]
};

const NIGHT_START_HOUR = 22; // [22:00, 05:00) 算深夜
const NIGHT_END_HOUR = 5;

function isNight(now) {
  const h = now.getHours();
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

function isWeekend(now) {
  const d = now.getDay();
  return d === 0 || d === 6;
}

/**
 * 选池名。kind: 'in' | 'out'。
 * out 的优先级：短班彩蛋 → 超长班彩蛋 → 深夜 → 周末 → 收工；
 * in 的优先级：深夜 → 周末 → 开工。
 */
function quotePool(kind, { hours = 0, now = new Date() } = {}) {
  const minutes = Math.round(Math.max(0, Number(hours) || 0) * 60);
  if (kind === 'out') {
    if (minutes < 5) return 'flash';
    if (minutes >= 960) return 'marathon';
    if (isNight(now)) return 'night';
    if (isWeekend(now)) return 'weekend';
    return 'clockOut';
  }
  if (isNight(now)) return 'night';
  if (isWeekend(now)) return 'weekend';
  return 'clockIn';
}

/**
 * 取一条毒舌。seq 自增轮换（0 起），同池当天不重复，转一圈后回环。
 * now 传 Date 或时间戳均可（内部 new Date(now) 归一）。
 */
function punchQuote(kind, { hours = 0, now = new Date(), seq = 0 } = {}) {
  const pool = QUOTE_POOLS[quotePool(kind, { hours, now: new Date(now) })];
  const i = ((Math.trunc(seq) % pool.length) + pool.length) % pool.length;
  return pool[i];
}

/** 取一条加班池毒舌（计时器翻红瞬间）。seq 轮换与 punchQuote 同款。 */
function overtimeQuote(seq = 0) {
  const pool = QUOTE_POOLS.overtime;
  const i = ((Math.trunc(seq) % pool.length) + pool.length) % pool.length;
  return pool[i];
}

/* ---- build-miniprogram.mjs 生成的 CommonJS 出口（勿手改） ---- */
module.exports = { quotePool, punchQuote, overtimeQuote, QUOTE_POOLS };
