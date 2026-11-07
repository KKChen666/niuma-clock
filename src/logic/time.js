// 本文件由旧版单文件工具 D:/workbuddy-space/overtime-tracker/index.html 自动抽取
// 函数体保持原样（仅补 export），口径与旧版完全一致，便于新旧数据/行为对齐。
// 详见 docs/01-重构规格.md

export function pad(n){return String(n).padStart(2,'0')}
export function fmtDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
export function parseDate(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
export function todayStr(){return fmtDate(new Date())}
export function weekStart(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x}
export function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
export function parseTime(t){if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m}
export function calcDuration(s,e){if(!s||!e)return null;let a=parseTime(s),b=parseTime(e);if(b<a)b+=1440;return (b-a)/60}
export function fmtDur(h){if(h==null||isNaN(h))return '0';if(h===0)return '0';const sign=h<0?'-':'';h=Math.abs(h);const hh=Math.floor(h);const mm=Math.round((h-hh)*60);let s='';if(hh>0)s+=hh+'小时';if(mm>0)s+=mm+'分';return sign+s}
export function fmtDurShort(h){if(h==null||isNaN(h))return '0.0';const hh=Math.floor(h);const mm=Math.round((h-hh)*60);return (hh+mm/60).toFixed(1)}
