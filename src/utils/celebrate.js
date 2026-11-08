/** 下班打卡 / 补录保存的庆祝反馈：彩带 + 牛马探头。纯 DOM，动画结束自动销毁。 */
import { horseImg } from '../assets/brand.js';

const COLORS = ['#2F4A6B', '#B5764A', '#C98A3C', '#8FAFC7', '#E4C7A8', '#4F8A6D'];

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
  img.src = horseImg;
  img.alt = '';
  const label = document.createElement('span');
  label.textContent = text;
  pop.append(img, label);
  host.appendChild(pop);

  document.body.appendChild(host);
  setTimeout(() => host.remove(), 2200);
}
