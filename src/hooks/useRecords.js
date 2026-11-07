import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RECORDS_KEY, loadRecords, saveRecords, upsert, removeById, restoreAt
} from '../logic/index.js';

/**
 * 记录状态：写回 localStorage + 监听 storage 事件做多标签同步。
 * 注意：storage 事件只在「别的标签页」触发，本页写入不会回流，不会死循环。
 */
export function useRecords() {
  const [records, setRecords] = useState(() => loadRecords());
  const ref = useRef(records);
  ref.current = records;

  const commit = useCallback((next) => {
    const value = typeof next === 'function' ? next(ref.current) : next;
    ref.current = value;
    saveRecords(value);
    setRecords(value);
    return value;
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== RECORDS_KEY && e.key !== null) return;
      const fresh = loadRecords();
      ref.current = fresh;
      setRecords(fresh);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const upsertRecord = useCallback((rec) => commit(prev => upsert(prev, rec)), [commit]);

  /** 删除并返回被删记录与原始下标，供撤销插回原位 */
  const remove = useCallback((id) => {
    let removed = null, index = -1;
    commit(prev => {
      const r = removeById(prev, id);
      removed = r.removed;
      index = r.index;
      return r.records;
    });
    return { removed, index };
  }, [commit]);

  const undo = useCallback((rec, index) => commit(prev => restoreAt(prev, rec, index)), [commit]);
  const replaceAll = useCallback((next) => commit(next), [commit]);

  return { records, upsertRecord, remove, undo, replaceAll };
}
