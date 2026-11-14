// 本文件由旧版单文件工具 D:/workbuddy-space/overtime-tracker/index.html 自动抽取
// 大部分函数体保持原样（仅补 export），口径与旧版一致，便于新旧数据/行为对齐。
// 例外：fmtDur 已修「1小时60分」进位缺陷（本次重构口径调整，见 docs/01-重构规格.md）。
// 详见 docs/01-重构规格.md

function pad(n){return String(n).padStart(2,'0')}
function fmtDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parseDate(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function todayStr(){return fmtDate(new Date())}
function weekStart(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function parseTime(t){if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m}
function calcDuration(s,e){if(!s||!e)return null;let a=parseTime(s),b=parseTime(e);if(b<a)b+=1440;return (b-a)/60}
function fmtDur(h){
  if(h==null||isNaN(h))return '0';
  if(h===0)return '0';
  const sign=h<0?'-':'';
  // 先化整到分钟再拆分，避免 Math.round((h-hh)*60) 算出「1小时60分」
  const totalMin=Math.round(Math.abs(h)*60);
  const hh=Math.floor(totalMin/60), mm=totalMin%60;
  let s='';
  if(hh>0)s+=hh+'小时';
  if(mm>0)s+=mm+'分';
  return sign+(s||'0');
}
function fmtDurShort(h){if(h==null||isNaN(h))return '0.0';const hh=Math.floor(h);const mm=Math.round((h-hh)*60);return (hh+mm/60).toFixed(1)}

/* ---- build-miniprogram.mjs 生成的 CommonJS 出口（勿手改） ---- */
module.exports = { pad, fmtDate, parseDate, todayStr, weekStart, addDays, parseTime, calcDuration, fmtDur, fmtDurShort };
