/** 下班打卡 / 补录保存的庆祝反馈：彩带 + 牛马探头。纯 DOM，动画结束自动销毁。 */
import { freedomImg } from '../assets/scenes.js';

// v2 冷灰蓝调色板（docs/03 2.1）：蓝 / 琥珀 / 薄荷 / 警示橙 / 雾蓝 / 陶土红
const COLORS = ['#5B7FA6', '#C49A6C', '#68B89A', '#D4943E', '#8FAFC7', '#D4736C'];

export function celebrate(text = '记下了，又熬一天') {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const host = document.createElement('div');
  host.className = 'confetti-host';
  host.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 20; i += 1) {
    const bit = document.createElement('i');
    bit.style.left = `${4 + (i * 4.8) % 92}%`;
    bit.style.background = COLORS[i % COLORS.length];
    bit.style.animationDelay = `${(i % 7) * 0.07}s`;
    bit.style.setProperty('--drift', `${(i % 2 ? 1 : -1) * (18 + (i % 5) * 14)}px`);
    host.appendChild(bit);
  }

  const pop = document.createElement('div');
  pop.className = 'confetti-pop';
  const img = document.createElement('img');
  img.src = freedomImg;
  img.alt = '';
  const label = document.createElement('span');
  label.textContent = text;
  pop.append(img, label);
  host.appendChild(pop);

  document.body.appendChild(host);
  setTimeout(() => host.remove(), 2200);
}
