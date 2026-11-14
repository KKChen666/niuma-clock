// 牛马时钟 · 小程序版
// 数据：微信云开发（云数据库按 openid 隔离，纯云端唯一存储），见 utils/store.js
const store = require('./utils/store');
const { CLOUD_ENV } = require('./utils/cloud-env.js');

App({
  globalData: {
    cloudReady: false
  },

  onLaunch() {
    // 云开发初始化异常时也必须能正常启动，界面会显示「云服务不可用」
    let cloudReady = false;
    if (!wx.cloud) {
      console.warn('[牛马时钟] 当前基础库不支持云开发');
    } else {
      try {
        // 显式锁定环境，见 utils/cloud-env.js（多环境下比 DYNAMIC_CURRENT_ENV 更稳）
        wx.cloud.init({
          env: CLOUD_ENV,
          traceUser: true
        });
        cloudReady = true;
      } catch (e) {
        console.warn('[牛马时钟] 云开发初始化失败：', e && e.message);
      }
    }
    this.globalData.cloudReady = cloudReady;
    store.bootstrap(cloudReady);
  },

  onShow() {
    // 回前台：拉一次云端（多设备改动同步进来），有未保存改动则先推
    store.pullFromCloud();
  },

  onHide() {
    // 退后台：有未保存的改动立即推一次，别等防抖
    store.flush();
  }
});
