import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, SectionList, TouchableOpacity, ScrollView, Modal, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../store';
import { scheduleReminder } from '../notify';
import { C, F, T, Screen, Header, Btn, Input, Err, Avatar, DateField, DatePickerModal, SwipeRow, palette, ask, parseDate, today, maskTime, fmtDate, fmtTime, daysUntil, THEMES } from '../ui';

const PRI = { 1: '#D1453B', 2: '#EB8909', 3: '#246FE0', 4: '#8A94A6' };
const PRI_NAME = { 1: 'Priority 1', 2: 'Priority 2', 3: 'Priority 3', 4: 'No priority' };
// every project gets its own icon + colour (known names first, then keywords, then a stable fallback)
const CAT_KNOWN = { work: ['briefcase', '#0EA5E9'], personal: ['person', '#EC4899'], study: ['school', '#8B5CF6'], shopping: ['cart', '#F59E0B'], health: ['fitness', '#10B981'] };
const CAT_WORDS = [[/home|house|family/, 'home', '#F97316'], [/gym|fit|sport|workout/, 'barbell', '#EF4444'], [/travel|trip|holiday|vacation/, 'airplane', '#06B6D4'], [/money|financ|bill|bank|budget/, 'cash', '#16A34A'], [/food|cook|meal|recipe/, 'restaurant', '#F59E0B'], [/book|read/, 'book', '#8B5CF6'], [/code|dev|tech|app/, 'code-slash', '#2563EB'], [/music|song/, 'musical-notes', '#D946EF'], [/game|play/, 'game-controller', '#7C3AED'], [/pet|dog|cat/, 'paw', '#B45309'], [/gift|birthday|party/, 'gift', '#EC4899'], [/car|drive/, 'car', '#64748B'], [/idea|goal/, 'bulb', '#EAB308']];
const CAT_FALLBACK = [['pricetag', '#126EED'], ['star', '#F59E0B'], ['flag', '#EF4444'], ['rocket', '#8B5CF6'], ['leaf', '#10B981'], ['heart', '#EC4899'], ['diamond', '#06B6D4']];
const catMeta = (c) => {
  const k = (c || '').toLowerCase().trim();
  if (CAT_KNOWN[k]) return { icon: CAT_KNOWN[k][0], color: CAT_KNOWN[k][1] };
  const w = CAT_WORDS.find((x) => x[0].test(k)); if (w) return { icon: w[1], color: w[2] };
  let h = 0; for (const ch of k) h += ch.charCodeAt(0);
  const f = CAT_FALLBACK[h % CAT_FALLBACK.length]; return { icon: f[0], color: f[1] };
};
const CatIcon = ({ name, size = 30, sel }) => { const m = catMeta(name); return (
  <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: sel ? 'rgba(255,255,255,0.25)' : m.color + '26', alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={m.icon} size={size * 0.58} color={sel ? '#fff' : m.color} />
  </View>); };
const dueLabel = (due) => {
  const d = daysUntil(due); if (d === null) return null;
  if (d < 0) return { t: `Overdue ${-d}d`, c: C.e };
  if (d === 0) return { t: 'Today', c: C.dark ? '#4ADE80' : '#058527' };
  if (d === 1) return { t: 'Tomorrow', c: '#EB8909' };
  return { t: due, c: C.m };
};
const dateTitle = (due) => { const d = daysUntil(due); return d === null ? 'No date' : d < 0 ? 'Overdue' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : due; };

const Row = ({ item, sub, onCheck, onPress, showProject = true }) => {
  const pc = PRI[item.priority || 4];
  const dl = !item.done && dueLabel(item.due);
  return (
    <TouchableOpacity onPress={onPress} style={[s.row, s.rowCard, { backgroundColor: C.s }]}>
      <TouchableOpacity onPress={onCheck} style={[s.box, { borderColor: pc, backgroundColor: item.done ? pc : pc + '22' }]}>
        {item.done && <Ionicons name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <T style={[{ fontFamily: F.m, fontSize: 17 }, item.done && { textDecorationLine: 'line-through', color: C.m }]}>{item.title}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
          {sub ? <T style={{ color: C.m, fontSize: 13 }}>{sub}</T> : (dl || item.time) ? (
            <>
              <Ionicons name="calendar-outline" size={14} color={dl ? dl.c : C.m} style={{ marginRight: 4 }} />
              <T style={{ color: dl ? dl.c : C.m, fontSize: 13 }}>{[dl && dl.t, item.time && fmtTime(item.time)].filter(Boolean).join(' · ')}</T>
              {!!item.repeat && item.repeat !== 'none' && <Ionicons name="repeat" size={15} color={C.m} style={{ marginLeft: 6 }} />}
            </>
          ) : null}
        </View>
      </View>
      {showProject && <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name={catMeta(item.category).icon} size={14} color={catMeta(item.category).color} /><T style={{ color: catMeta(item.category).color, fontSize: 13, fontFamily: F.m, marginLeft: 4 }}>{item.category}</T></View>}
    </TouchableOpacity>
  );
};

const reminderCount = (tasks) => tasks.filter((t) => !t.done && daysUntil(t.due) !== null && daysUntil(t.due) <= 0).length;

function SideMenu({ visible, onClose, view, setView, nav, user, tasks, cats, logout, onAdd, onSearch }) {
  const open = tasks.filter((t) => !t.done);
  const cnt = { inbox: tasks.length, today: open.filter((t) => t.due && daysUntil(t.due) <= 0).length, upcoming: open.filter((t) => t.due && daysUntil(t.due) > 0).length };
  const Item = ({ icon, label, right, on, active, color }) => (
    <TouchableOpacity onPress={() => { onClose(); on(); }} style={[s.menuItem, active && { backgroundColor: C.p + '1A', borderRadius: 10 }]}>
      <View style={{ width: 30, alignItems: 'center' }}>{icon}</View>
      <T style={{ flex: 1, marginLeft: 12, fontFamily: active ? F.b : F.m, color: color || C.t }}>{label}</T>
      {!!right && <T style={{ color: C.m, fontSize: 13 }}>{right}</T>}
    </TouchableOpacity>
  );
  const ic = (n, c) => <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: c + '26', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={n} size={18} color={c} /></View>;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={[s.drawer, { backgroundColor: C.d }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingHorizontal: 10 }}>
            <Avatar type={user.avatar} size={40} />
            <View style={{ marginLeft: 12, flex: 1 }}><T style={{ fontFamily: F.b }}>{user.name}</T><T style={{ color: C.m, fontSize: 12 }}>{user.email}</T></View>
          </View>
          <ScrollView>
            <Item icon={ic('home', '#6366F1')} label="Home" active={view === 'home'} on={() => setView('home')} />
            <Item icon={ic('add-circle', C.p)} label="Add task" color={C.p} on={onAdd} />
            <Item icon={ic('search', '#0EA5E9')} label="Search" on={onSearch} />
            <Item icon={ic('file-tray-full', '#F97316')} label="Inbox" right={cnt.inbox || ''} active={view === 'inbox'} on={() => setView('inbox')} />
            <Item icon={ic('today', '#16A34A')} label="Today" right={cnt.today || ''} active={view === 'today'} on={() => setView('today')} />
            <Item icon={ic('calendar', '#8B5CF6')} label="Upcoming" right={cnt.upcoming || ''} active={view === 'upcoming'} on={() => setView('upcoming')} />
            <Item icon={ic('checkmark-done-circle', '#14B8A6')} label="Completed" on={() => nav.navigate('Completed')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, marginTop: 18, marginBottom: 4 }}>
              <T style={{ fontFamily: F.b, color: C.m, fontSize: 14 }}>My Projects</T>
              <TouchableOpacity onPress={() => { onClose(); nav.navigate('Categories'); }}><Ionicons name="add" size={22} color={C.m} /></TouchableOpacity>
            </View>
            {cats.map((c) => (
              <Item key={c} icon={<CatIcon name={c} />} label={c} right={open.filter((t) => t.category === c).length || ''} active={view === c} on={() => setView(c)} />
            ))}
            <View style={{ height: 1, backgroundColor: C.b, marginVertical: 14 }} />
            <Item icon={ic('notifications', '#F43F5E')} label="Reminders" on={() => nav.navigate('Reminders')} />
            <Item icon={ic('color-palette', '#D946EF')} label="Settings & Themes" on={() => nav.navigate('Settings')} />
            <Item icon={ic('person-circle', '#0EA5E9')} label="Profile & History" on={() => nav.navigate('Profile')} />
            <Item icon={ic('log-out', C.e)} label="Logout" color={C.e} on={() => ask('Logout', 'Do you want to log out?', logout)} />
          </ScrollView>
        </View>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      </View>
    </Modal>
  );
}

const DAYS_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FEATURES = [
  ['folder-open', '#0EA5E9', 'Projects', 'Group tasks into projects like Work, Study or Shopping, each with its own icon.'],
  ['flag', '#EF4444', 'Priorities', 'Mark tasks P1 to P4 so the important ones stand out.'],
  ['repeat', '#8B5CF6', 'Repeating tasks', 'Repeat daily, weekly, monthly or yearly. The next date is set when you finish.'],
  ['list', '#F59E0B', 'Subtasks', 'Break a big task into small steps and tick them off one by one.'],
  ['notifications', '#F43F5E', 'Reminders', 'See everything due today or overdue in one place.'],
  ['swap-horizontal', '#14B8A6', 'Swipe actions', 'Swipe right to complete, swipe left to reschedule or delete.'],
  ['color-palette', '#D946EF', 'Themes', 'Light and dark mode with single or double-shade colours.'],
];

function HomeView({ user, tasks, cats, go, nav, onAdd }) {
  const open = tasks.filter((t) => !t.done);
  const todayN = open.filter((t) => t.due && daysUntil(t.due) <= 0).length;
  const upN = open.filter((t) => t.due && daysUntil(t.due) > 0).length;
  const d = new Date(), hr = d.getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const stat = (n, label, color, onPress) => (
    <TouchableOpacity key={label} onPress={onPress} style={{ flex: 1, backgroundColor: C.s, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginHorizontal: 4 }}>
      <T style={{ fontFamily: F.b, fontSize: 22, color }}>{n}</T><T style={{ fontSize: 12, color: C.m }}>{label}</T>
    </TouchableOpacity>
  );
  const tile = (icon, color, label, onPress) => (
    <TouchableOpacity key={label} onPress={onPress} style={{ width: '33.33%', padding: 4 }}>
      <View style={{ backgroundColor: C.s, borderRadius: 14, alignItems: 'center', paddingVertical: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color + '26', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}><Ionicons name={icon} size={24} color={color} /></View>
        <T style={{ fontSize: 13, fontFamily: F.m }}>{label}</T>
      </View>
    </TouchableOpacity>
  );
  const h = (t) => <T style={{ fontFamily: F.b, fontSize: 18, marginTop: 22, marginBottom: 10 }}>{t}</T>;
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 110 }}>
      <T style={{ fontFamily: F.b, fontSize: 24 }}>{greet}, {(user.name || '').split(' ')[0]}!</T>
      <T style={{ color: C.m, marginTop: 2 }}>{DAYS_L[d.getDay()]}, {d.getDate()} {MONTHS_L[d.getMonth()]} {d.getFullYear()}</T>

      <View style={{ backgroundColor: C.s, borderRadius: 16, padding: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 54, height: 54, borderRadius: 14, marginRight: 14 }} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.b, fontSize: 17 }}>Welcome to TaskMaster</T>
          <T style={{ color: C.m, fontSize: 14, marginTop: 2 }}>Plan your day, organise work into projects and never miss a deadline, all in one simple app.</T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 16, marginHorizontal: -4 }}>
        {stat(todayN, 'Today', '#16A34A', () => go('today'))}
        {stat(upN, 'Upcoming', '#8B5CF6', () => go('upcoming'))}
        {stat(open.length, 'Pending', '#F97316', () => go('inbox'))}
        {stat(tasks.length - open.length, 'Done', '#14B8A6', () => nav.navigate('Completed'))}
      </View>

      {h('Menu')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {tile('add-circle', C.p, 'Add task', onAdd)}
        {tile('file-tray-full', '#F97316', 'Inbox', () => go('inbox'))}
        {tile('today', '#16A34A', 'Today', () => go('today'))}
        {tile('calendar', '#8B5CF6', 'Upcoming', () => go('upcoming'))}
        {tile('checkmark-done-circle', '#14B8A6', 'Completed', () => nav.navigate('Completed'))}
        {tile('folder', '#F59E0B', 'Projects', () => nav.navigate('Categories'))}
        {tile('notifications', '#F43F5E', 'Reminders', () => nav.navigate('Reminders'))}
        {tile('color-palette', '#D946EF', 'Themes', () => nav.navigate('Settings'))}
        {tile('person-circle', '#0EA5E9', 'Profile', () => nav.navigate('Profile'))}
      </View>

      {h('My projects')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cats.map((c) => (
          <TouchableOpacity key={c} onPress={() => go(c)} style={[s.chip, { borderColor: C.b, backgroundColor: C.s, flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}>
            <CatIcon name={c} size={24} /><T style={{ marginLeft: 8 }}>{c}</T><T style={{ color: C.m, marginLeft: 8, fontSize: 13 }}>{open.filter((t) => t.category === c).length}</T>
          </TouchableOpacity>
        ))}
      </View>

      {h('What TaskMaster helps you with')}
      {FEATURES.map(([icon, color, title, text]) => (
        <View key={title} style={{ backgroundColor: C.s, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color + '26', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Ionicons name={icon} size={22} color={color} /></View>
          <View style={{ flex: 1 }}><T style={{ fontFamily: F.m }}>{title}</T><T style={{ color: C.m, fontSize: 13 }}>{text}</T></View>
        </View>
      ))}
    </ScrollView>
  );
}

const SORTS = [['date', 'Date'], ['priority', 'Priority'], ['name', 'Name'], ['new', 'Newest']];
const GROUPS = [['auto', 'Default'], ['none', 'None'], ['project', 'Project'], ['date', 'Date'], ['priority', 'Priority']];

export function TaskList({ navigation }) {
  const { tasks, cats, toggle, reschedule, removeTask, user, logout } = useApp();
  const [resch, setResch] = useState(null);
  // menu history: lets the back / forward arrows walk through the menus you visited
  const [hist, setHist] = useState({ stack: ['home'], i: 0 });
  const view = hist.stack[hist.i];
  const go = (v) => setHist((h) => { if (h.stack[h.i] === v) return h; const st = [...h.stack.slice(0, h.i + 1), v].slice(-30); return { stack: st, i: st.length - 1 }; });
  const canBack = hist.i > 0, canFwd = hist.i < hist.stack.length - 1;
  const goBack = () => canBack && setHist((h) => ({ ...h, i: h.i - 1 })), goFwd = () => canFwd && setHist((h) => ({ ...h, i: h.i + 1 }));
  const [menu, setMenu] = useState(false);
  const [opts, setOpts] = useState(false);
  const [sort, setSort] = useState('date');
  const [group, setGroup] = useState('auto');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState(false);
  const [msg, setMsg] = useState('');
  const showHome = view === 'home' && !q.trim();
  const check = (t) => { toggle(t.id); setMsg(t.done ? 'Moved back to pending' : t.repeat && t.repeat !== 'none' ? '✓ Done. Rescheduled to next date' : '✓ Task completed'); setTimeout(() => setMsg(''), 1800); };
  const addTask = () => navigation.navigate('AddTask', { due: view === 'today' ? fmtDate(today()) : '', category: cats.includes(view) ? view : undefined });

  const term = q.trim().toLowerCase();
  let data = view === 'inbox' && !term ? tasks : tasks.filter((t) => !t.done); // Inbox = ALL tasks (pending + completed)
  if (term) data = data.filter((t) => t.title.toLowerCase().includes(term) || t.category.toLowerCase().includes(term));
  else if (view === 'inbox' || view === 'home') { /* inbox shows every task; home has its own screen */ }
  else if (view === 'today') data = data.filter((t) => t.due && daysUntil(t.due) <= 0);
  else if (view === 'upcoming') data = data.filter((t) => t.due && daysUntil(t.due) > 0);
  else data = data.filter((t) => t.category === view);

  const key = (t) => { const d = parseDate(t.due); return d ? d.getTime() : Infinity; };
  const byDate = (a, b) => (key(a) === key(b) ? 0 : key(a) === Infinity ? 1 : key(b) === Infinity ? -1 : key(a) - key(b));
  const cmp = { date: byDate, priority: (a, b) => (a.priority || 4) - (b.priority || 4) || byDate(a, b), name: (a, b) => a.title.localeCompare(b.title), new: (a, b) => Number(b.id) - Number(a.id) }[sort];
  data = [...data].sort(cmp);

  const g = group === 'auto' ? (view === 'today' ? 'project' : view === 'upcoming' ? 'date' : 'none') : group;
  let sections = [];
  if (data.length) {
    if (view === 'inbox' && !term && (group === 'auto' || group === 'none')) {
      const pend = data.filter((t) => !t.done), dn = data.filter((t) => t.done);
      sections = [pend.length && { title: dn.length ? 'Pending' : null, data: pend }, dn.length && { title: 'Completed', data: dn }].filter(Boolean);
    } else if (g === 'none') sections = [{ title: null, data }];
    else if (g === 'priority') sections = [1, 2, 3, 4].map((p) => ({ title: PRI_NAME[p], data: data.filter((t) => (t.priority || 4) === p) })).filter((x) => x.data.length);
    else {
      const kf = g === 'project' ? (t) => t.category : (t) => dateTitle(t.due);
      const order = [], map = {};
      data.forEach((t) => { const k = kf(t); if (!map[k]) { map[k] = []; order.push(k); } map[k].push(t); });
      sections = order.map((k) => ({ title: k, data: map[k] }));
    }
  }
  const title = term ? 'Search' : view === 'home' ? 'Home' : view === 'inbox' ? 'Inbox' : view === 'today' ? 'Today' : view === 'upcoming' ? 'Upcoming' : view;
  const pills = (list, val, set) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
      {list.map(([k, l]) => <TouchableOpacity key={k} onPress={() => set(k)} style={[s.pill, { borderColor: C.b }, val === k && { backgroundColor: C.p, borderColor: C.p }]}><T style={{ fontSize: 14, color: val === k ? '#fff' : C.t }}>{l}</T></TouchableOpacity>)}
    </View>
  );

  return (
    <Screen>
      <Header title={title}
        leftNode={<View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} onPress={() => setMenu(true)}><Ionicons name="menu" size={28} color={C.t} /></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}><Avatar type={user.avatar} size={32} /></TouchableOpacity>
        </View>}
        actions={[{ icon: 'search', onPress: () => { setSearch(!search); if (search) setQ(''); } }, { icon: 'notifications-outline', badge: reminderCount(tasks), onPress: () => navigation.navigate('Reminders') }, { icon: 'options-outline', onPress: () => setOpts(true) }]} />
      {search && <View style={{ paddingHorizontal: 20 }}><Input autoFocus placeholder="Search tasks or projects" value={q} onChangeText={setQ} style={{ height: 46, marginBottom: 6 }} /></View>}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 }}>
        {[['arrow-back', canBack, goBack], ['arrow-forward', canFwd, goFwd]].map(([ic, ok, fn]) => (
          <TouchableOpacity key={ic} disabled={!ok} onPress={fn} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.s, alignItems: 'center', justifyContent: 'center', marginRight: 8, opacity: ok ? 1 : 0.35 }}>
            <Ionicons name={ic} size={20} color={C.t} />
          </TouchableOpacity>
        ))}
        {showHome ? <T style={{ color: C.m, marginLeft: 4, fontSize: 14 }}>Home</T> : (
          <><Ionicons name="checkmark-circle-outline" size={18} color={C.m} style={{ marginLeft: 4 }} /><T style={{ color: C.m, marginLeft: 6, fontSize: 14 }}>{data.length} task{data.length === 1 ? '' : 's'}{view === 'inbox' && !term ? ' · ' + data.filter((t) => !t.done).length + ' pending' : ''}</T></>
        )}
      </View>
      {showHome ? <HomeView user={user} tasks={tasks} cats={cats} go={(v) => { go(v); setQ(''); }} nav={navigation} onAdd={addTask} onSearch={() => setSearch(true)} /> : <SectionList sections={sections} keyExtractor={(t) => t.id} stickySectionHeadersEnabled={false} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 110 }}
        renderSectionHeader={({ section }) => (section.title ? <T style={{ fontFamily: F.b, fontSize: 15, marginTop: 8, marginBottom: 8 }}>{section.title} <T style={{ color: C.m, fontSize: 13 }}>{section.data.length}</T></T> : null)}
        ListEmptyComponent={<T style={{ color: C.m, textAlign: 'center', marginTop: 40 }}>{view === 'today' && !term ? 'Nothing due today. Check Upcoming or tap + to add a task.' : 'No tasks here yet. Tap + to add one.'}</T>}
        renderItem={({ item }) => (
          <SwipeRow right={item.done ? { label: 'Pending', icon: 'refresh-circle', color: C.p, onPress: () => check(item) } : { label: 'Done', icon: 'checkmark-circle', color: '#16A34A', onPress: () => check(item) }}
            left={[...(item.done ? [] : [{ label: 'Reschedule', icon: 'calendar', color: C.p, onPress: () => setResch(item) }]), { label: 'Delete', icon: 'trash', color: '#DC2626', onPress: () => ask('Delete', 'Delete "' + item.title + '"?', () => removeTask(item.id)) }]}>
            <Row item={item} showProject={g !== 'project' && view !== item.category} onCheck={() => check(item)} onPress={() => navigation.navigate('Details', { id: item.id })} />
          </SwipeRow>
        )} />}
      <DatePickerModal visible={!!resch} value={resch?.due} onChange={(d) => { reschedule(resch.id, d); setMsg('✓ Rescheduled'); setTimeout(() => setMsg(''), 1800); }} onClose={() => setResch(null)} />
      {!!msg && <View style={s.toast}><T style={{ color: '#fff', fontSize: 14 }}>{msg}</T></View>}
      <TouchableOpacity style={[s.fab, { backgroundColor: C.p, overflow: 'hidden' }]} onPress={addTask}>{C.p2 !== C.p ? <LinearGradient colors={[C.p, C.p2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}<Ionicons name="add" size={34} color="#fff" /></TouchableOpacity>
      <SideMenu visible={menu} onClose={() => setMenu(false)} view={view} setView={(v) => { go(v); setQ(''); }} nav={navigation} user={user} tasks={tasks} cats={cats} logout={logout} onAdd={addTask} onSearch={() => setSearch(true)} />
      <Modal transparent visible={opts} animationType="fade" onRequestClose={() => setOpts(false)}>
        <View style={s.overlay}><View style={[s.card, { backgroundColor: C.s }]}>
          <T style={{ fontFamily: F.b, fontSize: 20, marginBottom: 14 }}>View</T>
          <T style={{ color: C.m, marginBottom: 6 }}>Sort by</T>{pills(SORTS, sort, setSort)}
          <T style={{ color: C.m, marginBottom: 6 }}>Group by</T>{pills(GROUPS, group, setGroup)}
          <Btn title="Done" onPress={() => setOpts(false)} />
        </View></View>
      </Modal>
    </Screen>
  );
}

export function AddTask({ navigation, route }) {
  const { tasks, cats, saveTask } = useApp();
  const p = route.params || {};
  const old = tasks.find((t) => t.id === p.id);
  const [title, setTitle] = useState(old?.title || '');
  const [cat, setCat] = useState(p.category || old?.category || cats[0]);
  const [due, setDue] = useState(old ? old.due || '' : p.due || '');
  const [time, setTime] = useState(old?.time || '');
  const [pri, setPri] = useState(old?.priority || 4);
  const [rep, setRep] = useState(old?.repeat || 'none');
  const [subs, setSubs] = useState(old?.subtasks || []);
  const [sub, setSub] = useState('');
  const [err, setErr] = useState('');
  const chipRef = useRef(null), chipX = useRef(0);
  const slide = (d) => chipRef.current?.scrollTo({ x: Math.max(0, chipX.current + d), animated: true });
  useEffect(() => { if (p.category) setCat(p.category); }, [p.category]);
  useEffect(() => { const i = cats.indexOf(cat); setTimeout(() => chipRef.current?.scrollTo({ x: Math.max(0, i * 125 - 60), animated: true }), 150); }, [cat]);
  const addSub = () => { if (sub.trim()) { setSubs([...subs, { id: Date.now() + '', title: sub.trim(), done: false }]); setSub(''); } };
  const save = () => {
    if (!title.trim()) return setErr('Please enter a task title.');
    let d = null;
    if (due) {
      d = parseDate(due);
      if (!d) return setErr('Enter a valid date in DD/MM/YYYY format.');
      if (d < today() && due !== old?.due) return setErr('Due date cannot be before today.');
    }
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return setErr('Enter time as HH:MM (24-hour), e.g. 08:30.');
    if (rep !== 'none' && !due) return setErr('Choose a due date for a repeating task.');
    saveTask({ ...(old || { id: Date.now() + '', done: false }), title: title.trim(), category: cat, due, time, priority: pri, repeat: rep, subtasks: subs });
    if (d && d >= today()) scheduleReminder(title.trim(), d, time);
    navigation.goBack();
  };
  const pill = (on, onPress, label, extra) => (
    <TouchableOpacity onPress={onPress} style={[s.pill, { borderColor: C.b }, on && { backgroundColor: C.p, borderColor: C.p }, { flexDirection: 'row', alignItems: 'center' }]}>{extra}<T style={{ color: on ? '#fff' : C.t, fontSize: 14 }}>{label}</T></TouchableOpacity>
  );
  return (
    <Screen>
      <Header title={old ? 'Edit Task' : 'Add Task'} left="arrow-back" onLeft={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Input placeholder="Task title" value={title} onChangeText={(v) => { setTitle(v); setErr(''); }} />
        <T style={{ color: C.m, marginBottom: 8 }}>Project</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => slide(-160)} style={[s.arrow, { backgroundColor: C.in }]}><Ionicons name="chevron-back" size={20} color={C.t} /></TouchableOpacity>
          <ScrollView ref={chipRef} horizontal showsHorizontalScrollIndicator scrollEventThrottle={16} onScroll={(e) => { chipX.current = e.nativeEvent.contentOffset.x; }} style={{ flex: 1 }} contentContainerStyle={{ paddingRight: 12, paddingBottom: 8 }}>
            {cats.map((c) => (
              <TouchableOpacity key={c} onPress={() => setCat(c)} style={[s.chip, { borderColor: C.b, flexDirection: 'row', alignItems: 'center' }, cat === c && { backgroundColor: C.p, borderColor: C.p }]}><CatIcon name={c} size={24} sel={cat === c} /><T style={{ color: cat === c ? '#fff' : C.t, marginLeft: 8 }}>{c}</T></TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => slide(160)} style={[s.arrow, { backgroundColor: C.in }]}><Ionicons name="chevron-forward" size={20} color={C.t} /></TouchableOpacity>
        </View>
        <DateField placeholder="Due date (optional)" value={due} onChange={(v) => { setDue(v); setErr(''); }} />
        <Input placeholder="Time (optional, HH:MM 24-hour)" value={time} onChangeText={(v) => { setTime(maskTime(v)); setErr(''); }} keyboardType="number-pad" maxLength={5} />
        <T style={{ color: C.m, marginBottom: 8 }}>Priority</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
          {[1, 2, 3, 4].map((n) => pill(pri === n, () => setPri(n), 'P' + n, <Ionicons name="flag" size={15} color={pri === n ? '#fff' : PRI[n]} style={{ marginRight: 5 }} />))}
        </View>
        <T style={{ color: C.m, marginBottom: 8 }}>Repeat</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
          {[['none', 'Never'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']].map(([k, l]) => pill(rep === k, () => setRep(k), l))}
        </View>
        <T style={{ fontFamily: F.b, fontSize: 20, marginVertical: 8 }}>Subtasks</T>
        {subs.map((x) => (
          <View key={x.id} style={s.subRow}><T>{x.title}</T><TouchableOpacity onPress={() => setSubs(subs.filter((y) => y.id !== x.id))}><Ionicons name="close" size={22} color={C.m} /></TouchableOpacity></View>
        ))}
        <View style={s.subRow}>
          <Input style={{ flex: 1, marginBottom: 0, height: 48 }} placeholder="Add Subtask" value={sub} onChangeText={setSub} onSubmitEditing={addSub} />
          <TouchableOpacity onPress={addSub} style={{ marginLeft: 12 }}><Ionicons name="add" size={30} color={C.t} /></TouchableOpacity>
        </View>
        <Err t={err} />
        <Btn title="Save Task" onPress={save} style={{ marginTop: 20 }} />
      </ScrollView>
    </Screen>
  );
}

export function Settings({ navigation }) {
  const { theme, mode, setLook } = useApp();
  const [selT, setSelT] = useState(theme);
  const [selM, setSelM] = useState(mode);
  const [done, setDone] = useState(false);
  const pv = palette(selT, selM); // live preview of the *selected* look (applied only on "Apply Themes")
  const changed = selT !== theme || selM !== mode;
  const apply = () => { setLook(selT, selM); setDone(true); setTimeout(() => setDone(false), 2000); };
  const single = THEMES.filter((x) => !x[2]), duo = THEMES.filter((x) => x[2]);
  const swatch = ([n, c, c2]) => (
    <TouchableOpacity key={n} onPress={() => { setSelT(n); setDone(false); }} style={{ width: '25%', alignItems: 'center', marginBottom: 18 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: selT === n ? 3 : 0, borderColor: C.t, alignItems: 'center', justifyContent: 'center', backgroundColor: c }}>
        {c2 ? <LinearGradient colors={[c, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        {selT === n && <Ionicons name="checkmark" size={28} color="#fff" />}
      </View>
      <T style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>{n}</T>
    </TouchableOpacity>
  );
  const modeBtn = (k, label, icon) => (
    <TouchableOpacity key={k} onPress={() => { setSelM(k); setDone(false); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 14, marginHorizontal: 4, backgroundColor: selM === k ? C.p : C.s, borderWidth: 1.5, borderColor: selM === k ? C.p : C.b }}>
      <Ionicons name={icon} size={20} color={selM === k ? '#fff' : C.m} style={{ marginRight: 8 }} />
      <T style={{ fontFamily: F.m, color: selM === k ? '#fff' : C.t }}>{label}</T>
    </TouchableOpacity>
  );
  return (
    <Screen>
      <Header title="Settings" left="arrow-back" onLeft={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <T style={{ fontFamily: F.b, fontSize: 20, marginBottom: 10 }}>Appearance</T>
        <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: 22 }}>{modeBtn('light', 'Light', 'sunny')}{modeBtn('dark', 'Dark', 'moon')}</View>
        <T style={{ fontFamily: F.b, fontSize: 20, marginBottom: 4 }}>Theme</T>
        <T style={{ color: C.m, marginBottom: 16 }}>Pick a colour, then tap Apply Themes. It changes buttons, icons, tabs, borders and the background across the whole app.</T>
        <T style={{ fontFamily: F.m, color: C.m, marginBottom: 10 }}>Single colour</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{single.map(swatch)}</View>
        <T style={{ fontFamily: F.m, color: C.m, marginBottom: 10, marginTop: 4 }}>Double shade</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{duo.map(swatch)}</View>
        <T style={{ fontFamily: F.m, color: C.m, marginBottom: 8 }}>Preview</T>
        <LinearGradient colors={pv.g} style={{ borderRadius: 16, padding: 14 }}>
          <View style={{ backgroundColor: pv.s, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: pv.p, marginRight: 12 }} />
            <T style={{ flex: 1, color: pv.t, fontFamily: F.m }}>Sample task</T>
            <T style={{ color: pv.m, fontSize: 13 }}>Today</T>
          </View>
          <LinearGradient colors={[pv.p, pv.p2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: '#fff', fontFamily: F.b, fontSize: 15 }}>{selT} · {selM === 'dark' ? 'Dark' : 'Light'}</T>
          </LinearGradient>
        </LinearGradient>
        <Btn icon={done ? 'checkmark-circle' : 'color-wand'} title={done ? 'Applied!' : 'Apply Themes'} onPress={apply} style={{ marginTop: 22, opacity: changed || done ? 1 : 0.6 }} />
      </ScrollView>
    </Screen>
  );
}

export function Details({ navigation, route }) {
  const { tasks, toggle, toggleSub, removeTask } = useApp();
  const t = tasks.find((x) => x.id === route.params.id);
  if (!t) return null;
  return (
    <Screen>
      <Header title="Task Details" left="arrow-back" onLeft={() => navigation.goBack()} actions={[{ icon: 'create-outline', onPress: () => navigation.navigate('AddTask', { id: t.id }) }]} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <T style={{ fontFamily: F.b, fontSize: 24 }}>{t.title}</T>
        <T style={{ color: C.m, marginTop: 6 }}>Category: {t.category}</T>
        {!!t.due && <T style={{ color: C.m, marginTop: 4 }}>Due: {t.due}{t.time ? '  ' + fmtTime(t.time) : ''}</T>}
        <T style={{ color: PRI[t.priority || 4], marginTop: 4 }}>{PRI_NAME[t.priority || 4]}</T>
        {!!t.repeat && t.repeat !== 'none' && <T style={{ color: C.m, marginTop: 4 }}>Repeats {t.repeat}</T>}
        {t.done && <T style={{ color: C.ok, marginTop: 4 }}>✓ Completed on {t.doneAt}</T>}
        <T style={{ fontFamily: F.b, fontSize: 20, marginTop: 24, marginBottom: 8 }}>Subtasks</T>
        {t.subtasks?.length ? t.subtasks.map((x) => (
          <TouchableOpacity key={x.id} onPress={() => toggleSub(t.id, x.id)} style={[s.row, { paddingVertical: 8 }]}>
            <Ionicons name={x.done ? 'checkbox' : 'square-outline'} size={24} color={x.done ? C.p : C.m} style={{ marginRight: 12 }} />
            <T style={x.done && { textDecorationLine: 'line-through', color: C.m }}>{x.title}</T>
          </TouchableOpacity>
        )) : <T style={{ color: C.m }}>No subtasks.</T>}
        <Btn icon={t.done ? 'refresh' : 'checkmark-circle-outline'} title={t.done ? 'Mark as Pending' : 'Mark as Completed'} onPress={() => { toggle(t.id); navigation.goBack(); }} style={{ marginTop: 28 }} />
        <Btn outline title="Delete Task" style={{ marginTop: 12, borderColor: C.e }} onPress={() => ask('Delete', 'Delete this task?', () => { removeTask(t.id); navigation.goBack(); })} />
      </ScrollView>
    </Screen>
  );
}

export function Reminders({ navigation }) {
  const { tasks } = useApp();
  const open = tasks.filter((t) => !t.done && daysUntil(t.due) !== null);
  const groups = [
    ['Overdue', open.filter((t) => daysUntil(t.due) < 0), C.e],
    ['Due today', open.filter((t) => daysUntil(t.due) === 0), C.p],
    ['Upcoming (next 3 days)', open.filter((t) => daysUntil(t.due) > 0 && daysUntil(t.due) <= 3), C.m],
  ];
  const none = groups.every((g) => !g[1].length);
  return (
    <Screen>
      <Header title="Reminders" left="arrow-back" onLeft={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {none && <View style={{ alignItems: 'center', marginTop: 50 }}><Ionicons name="notifications-off-outline" size={48} color={C.m} /><T style={{ color: C.m, marginTop: 10 }}>You're all caught up. No reminders!</T></View>}
        {groups.map(([name, list, color]) => !list.length ? null : (
          <View key={name} style={{ marginBottom: 20 }}>
            <T style={{ fontFamily: F.b, color, marginBottom: 6 }}>{name} ({list.length})</T>
            {list.map((t) => <Row key={t.id} item={t} onCheck={() => navigation.navigate('Details', { id: t.id })} onPress={() => navigation.navigate('Details', { id: t.id })} />)}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

export function Profile({ navigation }) {
  const { user, tasks, hist, setAvatar, logout } = useApp();
  const done = tasks.filter((t) => t.done).length;
  const stat = (n, l) => <View style={{ alignItems: 'center', flex: 1 }}><T style={{ fontFamily: F.b, fontSize: 22 }}>{n}</T><T style={{ color: C.m, fontSize: 13 }}>{l}</T></View>;
  return (
    <Screen>
      <Header title="Profile" left="arrow-back" onLeft={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ alignItems: 'center' }}>
          <Avatar type={user.avatar} size={96} />
          <T style={{ fontFamily: F.b, fontSize: 22, marginTop: 10 }}>{user.name}</T>
          <T style={{ color: C.m }}>{user.email}</T>
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            {['girl', 'boy'].map((a) => (
              <TouchableOpacity key={a} onPress={() => setAvatar(a)} style={{ marginHorizontal: 10, padding: 6, borderRadius: 14, borderWidth: 2, borderColor: user.avatar === a ? C.p : 'transparent' }}><Avatar type={a} size={48} /></TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginVertical: 24 }}>{stat(tasks.length, 'Total')}{stat(done, 'Completed')}{stat(tasks.length - done, 'Pending')}</View>
        <T style={{ fontFamily: F.b, fontSize: 20, marginBottom: 8 }}>History</T>
        {hist.length ? hist.slice(0, 50).map((h) => (
          <View key={h.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: C.b }}>
            <T style={{ fontSize: 15 }}>{h.text}</T>
            <T style={{ color: C.m, fontSize: 12 }}>{new Date(h.at).toLocaleString()}</T>
          </View>
        )) : <T style={{ color: C.m }}>No activity yet.</T>}
        <Btn outline title="Logout" icon="log-out-outline" style={{ marginTop: 28, borderColor: C.e }} onPress={() => ask('Logout', 'Do you want to log out?', logout)} />
      </ScrollView>
    </Screen>
  );
}

export function Categories({ navigation }) {
  const { cats, addCat, renameCat } = useApp();
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const open = (old) => { setName(old || ''); setModal({ old }); };
  const done = () => { const n = name.trim(); if (n) modal.old ? renameCat(modal.old, n) : addCat(n); setModal(null); };
  return (
    <Screen>
      <Header title="Categories" />
      <FlatList data={cats} keyExtractor={(c) => c} contentContainerStyle={{ padding: 20 }} renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('Tasks', { screen: 'AddTask', params: { category: item } })} style={[s.row, { justifyContent: 'space-between', paddingVertical: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><CatIcon name={item} size={36} /><T style={{ fontFamily: F.m, fontSize: 18, marginLeft: 12 }}>{item}</T></View>
          <TouchableOpacity onPress={() => open(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="pencil-outline" size={24} color={C.t} /></TouchableOpacity>
        </TouchableOpacity>
      )} />
      <View style={{ padding: 20 }}><Btn title="Add category" onPress={() => open(null)} /></View>
      <Modal transparent visible={!!modal} animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={s.overlay}><View style={[s.card, { backgroundColor: C.s }]}>
          <T style={{ fontFamily: F.b, fontSize: 20, marginBottom: 14 }}>{modal?.old ? 'Edit Category' : 'Add Category'}</T>
          <Input placeholder="Category name" value={name} onChangeText={setName} autoFocus />
          <Btn title="Save" onPress={done} />
          <Btn outline title="Cancel" onPress={() => setModal(null)} style={{ marginTop: 10 }} />
        </View></View>
      </Modal>
    </Screen>
  );
}

export function Completed({ navigation }) {
  const { tasks, toggle, removeTask } = useApp();
  return (
    <Screen>
      <Header title="Completed" />
      <FlatList data={tasks.filter((t) => t.done)} keyExtractor={(t) => t.id} contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<T style={{ color: C.m, textAlign: 'center', marginTop: 40 }}>No completed tasks yet.</T>}
        renderItem={({ item }) => (
          <SwipeRow right={{ label: 'Pending', icon: 'refresh-circle', color: C.p, onPress: () => toggle(item.id) }}
            left={[{ label: 'Delete', icon: 'trash', color: '#DC2626', onPress: () => ask('Delete', 'Delete "' + item.title + '"?', () => removeTask(item.id)) }]}>
            <Row item={item} sub={'Completed on ' + (item.doneAt || '')} onCheck={() => toggle(item.id)} onPress={() => navigation.navigate('Tasks', { screen: 'Details', params: { id: item.id } })} />
          </SwipeRow>
        )} />
    </Screen>
  );
}

const s = StyleSheet.create({
  rowCard: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  drawer: { width: 300, backgroundColor: '#fff', paddingTop: 50, paddingHorizontal: 14, paddingBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 10 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5, borderColor: C.b, marginRight: 8, marginBottom: 8 },
  arrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.in, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  box: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 68, height: 68, borderRadius: 16, backgroundColor: C.p, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 108, backgroundColor: '#111418', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: C.b, marginRight: 8 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 440, alignSelf: 'center' },
});
