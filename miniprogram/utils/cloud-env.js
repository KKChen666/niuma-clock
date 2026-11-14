/**
 * 云开发环境 ID —— 全项目唯一配置点。
 *
 * 小程序端 wx.cloud.init 用这个 ID 锁定环境（避免多环境下
 * DYNAMIC_CURRENT_ENV 指到别的环境）；云函数端仍用 cloud.DYNAMIC_CURRENT_ENV，
 * 部署到哪个环境就属于哪个环境。
 *
 * 换环境时：改这里的常量 → 重新部署 niumaSync 云函数 → 重新编译小程序。
 */
const CLOUD_ENV = 'niuma-d1g5xivypcccb7c8b';

/**
 * 下班提醒订阅消息模板 ID（在 mp.weixin.qq.com → 功能 → 订阅消息 里选用/申请）。
 * 留空 '' = 不请求订阅、不推送，只保留应用内「该下班打卡啦」横幅。
 * 填了之后：上班打卡时会弹一次性订阅授权，到下班点由云函数 niumaRemind 推服务通知。
 * 模板字段名要和 niumaRemind/index.js 里 buildData 的字段对上。
 */
const REMIND_TMPL_ID = 'T-v3mwibSyrHfHu6f53rSC0mUHM1_qrfef2CvZw_Ez0';

module.exports = { CLOUD_ENV, REMIND_TMPL_ID };
