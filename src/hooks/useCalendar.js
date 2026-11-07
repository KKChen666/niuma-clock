import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { todayStr, solarToLunar, dayDetail } from '../logic/index.js';

// 农历换算有点耗时，按日期字符串做全局缓存
const lunarCache = new Map();
export function lunarOf(dateStr) {
  if (!lunarCache.has(dateStr)) {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      lunarCache.set(dateStr, solarToLunar(y, m, d));
    } catch (e) {
      lunarCache.set(dateStr, '');
    }
  }
  return lunarCache.get(dateStr);
}

export function useCalendar(records) {
  // 一个 selectedDate 同时驱动「显示月份」和「选中日」：
  // Calendar 的 value 就是它，切月时把选中日挪到该月 1 号即可。
  const [selectedDate, setSelectedDate] = useState(() => todayStr());
  const cursor = useMemo(() => dayjs(selectedDate), [selectedDate]);

  const dayMap = useMemo(() => {
    const map = new Map();
    for (const r of records) map.set(r.date, (map.get(r.date) || 0) + (r.duration || 0));
    return map;
  }, [records]);

  const detail = useMemo(() => dayDetail(records, selectedDate), [records, selectedDate]);

  const selectDate = useCallback((d) => {
    setSelectedDate(typeof d === 'string' ? d : d.format('YYYY-MM-DD'));
  }, []);
  const selectMonth = useCallback((d) => {
    if (d) setSelectedDate(d.startOf('month').format('YYYY-MM-DD'));
  }, []);
  const goToday = useCallback(() => setSelectedDate(todayStr()), []);

  return { selectedDate, cursor, dayMap, detail, selectDate, selectMonth, goToday };
}
