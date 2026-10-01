import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTheme, parseDate, today, fmtDate } from './ui';

const Ctx = createContext();
export const useApp = () => useContext(Ctx);
const DEFAULT_CATS = ['Work', 'Personal', 'Study', 'Shopping', 'Health'];
// next occurrence of a repeating task (month/year steps clamp the day, e.g. 31 Jan -> 28 Feb, 29 Feb -> 28 Feb)
const nextDue = (base, rep) => {
  const n = new Date(base);
  if (rep === 'daily') n.setDate(n.getDate() + 1);
  else if (rep === 'weekly') n.setDate(n.getDate() + 7);
  else {
    const day = n.getDate(); n.setDate(1);
    if (rep === 'yearly') n.setFullYear(n.getFullYear() + 1); else n.setMonth(n.getMonth() + 1);
    n.setDate(Math.min(day, new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()));
  }
  return n;
};
const get = async (k, d) => { try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const put = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v));

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [cats, setCats] = useState(DEFAULT_CATS);
  const [hist, setHist] = useState([]);
  const [theme, setThemeName] = useState('TaskMaster');
  const [mode, setModeName] = useState('light');
  applyTheme(theme, mode);
  const setTheme = (n) => { setThemeName(n); put('theme', n); };
  const setMode = (m) => { setModeName(m); put('mode', m); };
  const setLook = (n, m) => { setTheme(n); setMode(m); };

  const log = (text) => setHist((p) => [{ id: Date.now() + Math.random() + '', text, at: new Date().toISOString() }, ...p].slice(0, 100));
  const loadData = async (u) => {
    setTasks(await get('tasks_' + u.email, [])); setCats(await get('cats_' + u.email, DEFAULT_CATS)); setHist(await get('hist_' + u.email, []));
  };
  const startSession = async (u) => {
    const s = { name: u.name, email: u.email, avatar: u.avatar || 'girl' };
    await put('session', s); await loadData(s); setUser(s); log('Logged in');
  };

  useEffect(() => { (async () => { // restore saved login
    const u = await get('session', null);
    if (u) { await loadData(u); setUser(u); }
    setThemeName(await get('theme', 'TaskMaster')); setModeName(await get('mode', 'light'));
    setReady(true);
  })(); }, []);
  useEffect(() => { if (ready && user) put('tasks_' + user.email, tasks); }, [tasks]);
  useEffect(() => { if (ready && user) put('cats_' + user.email, cats); }, [cats]);
  useEffect(() => { if (ready && user) put('hist_' + user.email, hist); }, [hist]);

  const register = async (name, email, password, avatar) => {
    const users = await get('users', []);
    if (users.some((u) => u.email === email)) return 'An account with this email already exists.';
    await put('users', [...users, { name, email, password, avatar }]);
    return null;
  };
  const login = async (email, password) => {
    const u = (await get('users', [])).find((x) => x.email === email && x.password === password);
    if (!u) return 'Invalid email or password.';
    await startSession(u); return null;
  };
  // DEMO social sign-in (real Google/Apple OAuth needs your own client IDs)
  const socialLogin = async (provider) => {
    const email = provider.toLowerCase() + '@demo.app';
    const users = await get('users', []);
    let u = users.find((x) => x.email === email);
    if (!u) { u = { name: provider + ' User', email, password: '', avatar: 'girl' }; await put('users', [...users, u]); }
    await startSession(u);
  };
  const logout = async () => { await AsyncStorage.removeItem('session'); setUser(null); setTasks([]); setHist([]); setCats(DEFAULT_CATS); };
  const setAvatar = async (avatar) => {
    const s = { ...user, avatar }; setUser(s); await put('session', s);
    await put('users', (await get('users', [])).map((u) => (u.email === s.email ? { ...u, avatar } : u)));
    log('Changed profile picture');
  };

  const saveTask = (t) => { log((tasks.some((x) => x.id === t.id) ? 'Updated task "' : 'Added task "') + t.title + '"'); setTasks((p) => (p.some((x) => x.id === t.id) ? p.map((x) => (x.id === t.id ? t : x)) : [t, ...p])); };
  const removeTask = (id) => { log('Deleted task "' + tasks.find((t) => t.id === id)?.title + '"'); setTasks((p) => p.filter((t) => t.id !== id)); };
  const toggle = (id) => {
    const t = tasks.find((x) => x.id === id); if (!t) return;
    if (t.repeat && t.repeat !== 'none' && !t.done) { // repeating task: reschedule instead of completing
      const b0 = parseDate(t.due); const n = nextDue(b0 && b0 >= today() ? b0 : today(), t.repeat);
      log('Completed "' + t.title + '" (repeats, next ' + fmtDate(n) + ')');
      setTasks((p) => p.map((x) => (x.id === id ? { ...x, due: fmtDate(n), subtasks: (x.subtasks || []).map((z) => ({ ...z, done: false })) } : x)));
      return;
    }
    log((t.done ? 'Marked pending: "' : 'Completed task "') + t.title + '"');
    setTasks((p) => p.map((x) => (x.id === id ? { ...x, done: !x.done, doneAt: !x.done ? new Date().toISOString().slice(0, 10) : null } : x)));
  };
  const reschedule = (id, due) => {
    const t = tasks.find((x) => x.id === id); if (!t) return;
    log('Rescheduled \"' + t.title + '\" to ' + (due || 'no date'));
    setTasks((p) => p.map((x) => (x.id === id ? { ...x, due } : x)));
  };
  const toggleSub = (id, sid) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, subtasks: t.subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done } : s)) } : t)));
  const addCat = (n) => { log('Added category "' + n + '"'); setCats((p) => (p.includes(n) ? p : [...p, n])); };
  const renameCat = (o, n) => { log('Renamed category "' + o + '" to "' + n + '"'); setCats((p) => p.map((c) => (c === o ? n : c))); setTasks((p) => p.map((t) => (t.category === o ? { ...t, category: n } : t))); };

  return <Ctx.Provider value={{ theme, setTheme, mode, setMode, setLook, ready, user, tasks, cats, hist, register, login, socialLogin, logout, setAvatar, saveTask, removeTask, toggle, reschedule, toggleSub, addCat, renameCat }}>{children}</Ctx.Provider>;
}
