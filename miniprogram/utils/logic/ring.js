// 本文件由旧版单文件工具 D:/workbuddy-space/overtime-tracker/index.html 自动抽取
// 函数体保持原样（仅补 export），口径与旧版完全一致，便于新旧数据/行为对齐。
// 详见 docs/01-重构规格.md

function hourAngle(hh,mm){return (hh+(mm||0)/60)*15;}
function polar(cx,cy,r,ang){const t=(ang-90)*Math.PI/180;return [cx+r*Math.cos(t),cy+r*Math.sin(t)];}
function arcPath(cx,cy,r,a0,a1){
  let d=a1-a0;if(d<0)d+=360;if(d===0)d=0.01;
  const [x0,y0]=polar(cx,cy,r,a0),[x1,y1]=polar(cx,cy,r,a1);
  const large=d>180?1:0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/* ---- build-miniprogram.mjs 生成的 CommonJS 出口（勿手改） ---- */
module.exports = { hourAngle, polar, arcPath };
