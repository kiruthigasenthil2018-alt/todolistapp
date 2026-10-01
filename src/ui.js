import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert, Image, Modal, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const C = { p: '#126EED', p2: '#126EED', s: '#FFFFFF', dark: false, in: '#EEF1F4', t: '#111418', m: '#64748B', b: '#E2E8F0', e: '#DC2626', ok: '#16A34A' };
export const F = { r: 'Lexend_400Regular', m: 'Lexend_500Medium', b: 'Lexend_700Bold' };

export const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
export const maskTime = (v) => { const x = v.replace(/\D/g, '').slice(0, 4); return x.length > 2 ? `${x.slice(0, 2)}:${x.slice(2)}` : x; };
export const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

// ---- colour themes: [name, accent, optional 2nd accent for "double shade" themes] ----
export const THEMES = [
  ['TaskMaster', '#126EED'], ['Todoist Red', '#DB4C3F'], ['Tangerine', '#EB8909'], ['Kale', '#299438'],
  ['Lavender', '#884DFF'], ['Raspberry', '#B8255F'], ['Teal', '#0E9AA7'], ['Moonstone', '#4B5563'],
  // double shade (two-tone) themes
  ['Sunset', '#F97316', '#DB2777'], ['Ocean', '#0EA5E9', '#6366F1'], ['Aurora', '#10B981', '#3B82F6'],
  ['Berry Blast', '#EC4899', '#8B5CF6'], ['Mango Tango', '#F59E0B', '#EF4444'], ['Forest Lake', '#16A34A', '#0E9AA7'],
];
// blend `hex` with `base` (default white): a = how much of hex to keep
const mix = (hex, a, base = '#FFFFFF') => {
  const n = parseInt(hex.slice(1), 16), k = parseInt(base.slice(1), 16);
  return '#' + [16, 8, 0].map((sh) => Math.round(((n >> sh) & 255) * a + ((k >> sh) & 255) * (1 - a)).toString(16).padStart(2, '0')).join('');
};
export const palette = (name, mode = 'light') => {
  const t = THEMES.find((x) => x[0] === name) || THEMES[0];
  const p = t[1], p2 = t[2] || t[1], mid = mix(p, 0.5, p2);
  if (mode === 'dark') {
    const B = '#0B0E14', S = '#1A1F2B';
    return { p, p2, dark: true, t: '#F1F5F9', m: '#A6B1C4', s: mix(p, 0.1, S), b: mix(p, 0.3, '#242B39'), in: mix(p, 0.22, S), tab: mix(p, 0.12, '#11151D'), d: mix(p, 0.1, '#12161F'),
      g: [mix(p, 0.34, B), mix(mid, 0.14, B), mix(p2, 0.28, B)] };
  }
  return { p, p2, dark: false, t: '#111418', m: '#475569', s: '#FFFFFF', b: mix(p, 0.3), in: mix(p, 0.15), tab: mix(p, 0.14), d: mix(p, 0.08),
    g: name === 'TaskMaster' ? ['#C4DCFF', '#E6F0FF', '#F9D2E1'] : t[2] ? [mix(p, 0.42), mix(mid, 0.18), mix(p2, 0.42)] : [mix(p, 0.4), mix(p, 0.2), mix(p, 0.32)] };
};
export const applyTheme = (name, mode = 'light') => Object.assign(C, palette(name, mode));
applyTheme('TaskMaster', 'light');

export const ask = (title, msg, onYes) => Platform.OS === 'web'
  ? (window.confirm(title + '\n' + msg) && onYes())
  : Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: onYes }]);

// ---- date helpers (DD/MM/YYYY) ----
export const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
export const parseDate = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ''); if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1] ? d : null;
};
export const maskDate = (v) => { const x = v.replace(/\D/g, '').slice(0, 8); return x.length > 4 ? `${x.slice(0, 2)}/${x.slice(2, 4)}/${x.slice(4)}` : x.length > 2 ? `${x.slice(0, 2)}/${x.slice(2)}` : x; };
export const daysUntil = (s) => { const d = parseDate(s); return d ? Math.round((d - today()) / 86400000) : null; };

export const T = ({ style, ...p }) => <Text {...p} style={[{ fontFamily: F.r, color: C.t, fontSize: 16 }, style]} />;
export const Logo = ({ size = 96 }) => <Image source={require('../assets/icon.png')} style={{ width: size, height: size, borderRadius: size * 0.24 }} />;
const AV = {
  girl: { g: ['#FF6FB5', '#B06AFF'], emoji: '👧', icon: 'female', badge: '#EC4899' },
  boy: { g: ['#38BDF8', '#22D3A5'], emoji: '👦', icon: 'male', badge: '#2563EB' },
};
export const Avatar = ({ type, size = 40 }) => {
  const a = AV[type === 'boy' ? 'boy' : 'girl'];
  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient colors={a.g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: size >= 44 ? 3 : 2, borderColor: '#fff', elevation: 3, shadowColor: a.g[0], shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}>
        <Text style={{ fontSize: size * 0.5 }}>{a.emoji}</Text>
      </LinearGradient>
      {size >= 44 && (
        <View style={{ position: 'absolute', right: -2, bottom: -2, width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17, backgroundColor: a.badge, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={a.icon} size={size * 0.2} color="#fff" />
        </View>
      )}
    </View>
  );
};
export const Screen = ({ children }) => (
  <LinearGradient colors={C.g} style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }}>{children}</View>
    </SafeAreaView>
  </LinearGradient>
);
export const Header = ({ title, left, onLeft, leftNode, actions = [] }) => (
  <View style={s.header}>
    <View style={s.side}>{leftNode || (left ? <TouchableOpacity style={s.hb} onPress={onLeft}><Ionicons name={left} size={26} color={C.t} /></TouchableOpacity> : null)}</View>
    <T style={{ fontFamily: F.b, fontSize: 20 }}>{title}</T>
    <View style={[s.side, { justifyContent: 'flex-end' }]}>
      {actions.map((a, i) => (
        <TouchableOpacity key={i} style={s.hb} onPress={a.onPress}>
          <Ionicons name={a.icon} size={26} color={C.t} />
          {!!a.badge && <View style={s.badge}><Text style={{ color: '#fff', fontSize: 10, fontFamily: F.b }}>{a.badge}</Text></View>}
        </TouchableOpacity>
      ))}
    </View>
  </View>
);
export const Btn = ({ title, onPress, style, outline, icon, colors }) => {
  const cs = outline ? null : colors || (C.p2 !== C.p ? [C.p, C.p2] : null); // two-tone themes -> gradient buttons
  return (
    <TouchableOpacity onPress={onPress} style={[s.btn, { backgroundColor: cs ? cs[0] : C.p, overflow: 'hidden' }, outline && { backgroundColor: C.s, borderWidth: 1.5, borderColor: C.p }, style]}>
      {cs ? <LinearGradient colors={cs} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
      {icon ? <Ionicons name={icon} size={22} color={outline ? C.t : '#fff'} style={{ marginRight: 10 }} /> : null}
      <T style={{ fontFamily: F.b, color: outline ? C.p : '#fff' }}>{title}</T>
    </TouchableOpacity>
  );
};
export const Input = ({ style, ...p }) => <TextInput placeholderTextColor={C.m} {...p} style={[s.input, { borderColor: C.b, backgroundColor: C.s, color: C.t }, style]} />;

export const PasswordInput = ({ style, ...p }) => {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Input {...p} secureTextEntry={!show} style={[{ paddingRight: 54 }, style]} />
      <TouchableOpacity onPress={() => setShow(!show)} style={{ position: 'absolute', right: 16, top: 16 }}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={24} color={C.m} />
      </TouchableOpacity>
    </View>
  );
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function DatePickerModal({ visible, value, onChange, onClose, allowClear = true }) {
  const t = today();
  const sel = parseDate(value);
  const [y, setY] = useState(t.getFullYear());
  const [m, setM] = useState(t.getMonth());
  useEffect(() => { if (visible) { const b = sel && sel >= t ? sel : t; setY(b.getFullYear()); setM(b.getMonth()); } }, [visible]);
  const cells = [...Array(new Date(y, m, 1).getDay()).fill(null), ...Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const canPrev = y > t.getFullYear() || (y === t.getFullYear() && m > t.getMonth());
  const move = (d) => { let nm = m + d, ny = y; if (nm < 0) { nm = 11; ny--; } if (nm > 11) { nm = 0; ny++; } setM(nm); setY(ny); };
  const pick = (d) => { onChange(`${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`); onClose(); };
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: C.s }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity disabled={!canPrev} onPress={() => move(-1)} style={{ opacity: canPrev ? 1 : 0.25, padding: 6 }}><Ionicons name="chevron-back" size={24} color={C.t} /></TouchableOpacity>
            <T style={{ fontFamily: F.b, fontSize: 18 }}>{MONTHS[m]} {y}</T>
            <TouchableOpacity onPress={() => move(1)} style={{ padding: 6 }}><Ionicons name="chevron-forward" size={24} color={C.t} /></TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <View key={i} style={s.cell}><T style={{ color: C.m, fontSize: 13 }}>{d}</T></View>)}</View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((d, i) => {
              const dt = d ? new Date(y, m, d) : null;
              const past = dt && dt < t, isSel = dt && sel && dt.getTime() === sel.getTime(), isToday = dt && dt.getTime() === t.getTime();
              return (
                <View key={i} style={s.cell}>
                  {d ? (
                    <TouchableOpacity disabled={past} onPress={() => pick(d)} style={[s.day, isToday && { borderWidth: 1.5, borderColor: C.p }, isSel && { backgroundColor: C.p }]}>
                      <T style={{ fontSize: 15, color: isSel ? '#fff' : past ? (C.dark ? '#475569' : '#CBD5E1') : C.t }}>{d}</T>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            {allowClear && <Btn outline title="No date" onPress={() => { onChange(''); onClose(); }} style={{ flex: 1, marginRight: 8 }} />}
            <Btn outline title="Cancel" onPress={onClose} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
export function DateField({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={[s.input, { borderColor: C.b, backgroundColor: C.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <T style={{ color: value ? C.t : C.m }}>{value || placeholder}</T>
        <Ionicons name="calendar-outline" size={24} color={C.m} />
      </TouchableOpacity>
      <DatePickerModal visible={open} value={value} onChange={onChange} onClose={() => setOpen(false)} />
    </>
  );
}

// ---- swipeable row ----
// right: { label, icon, color, onPress }  -> swipe RIGHT past ~100px to trigger
// left:  [{ label, icon, color, onPress }] -> swipe LEFT to reveal buttons
const ACT_W = 84, GAP = 10; // GAP = bottom margin of the row card underneath
export function SwipeRow({ children, right, left = [] }) {
  const x = useRef(new Animated.Value(0)).current;
  const cur = useRef(0);
  const P = useRef({}); P.current = { right, left };
  const leftW = () => P.current.left.length * ACT_W;
  const snap = (to) => { cur.current = to; Animated.spring(x, { toValue: to, useNativeDriver: false, bounciness: 0 }).start(); };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => x.setValue(Math.min(P.current.right ? 140 : 0, Math.max(-leftW(), cur.current + g.dx))),
    onPanResponderRelease: (_, g) => {
      const v = cur.current + g.dx;
      if (P.current.right && v > 100) { snap(0); P.current.right.onPress(); }
      else if (leftW() && v < -leftW() / 2) snap(-leftW());
      else snap(0);
    },
    onPanResponderTerminate: () => snap(0),
  })).current;
  const web = Platform.OS === 'web' ? { touchAction: 'pan-y', userSelect: 'none' } : null;
  return (
    <View>
      {right ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: GAP, backgroundColor: right.color, borderRadius: 14, justifyContent: 'center', paddingLeft: 22 }}>
          <Ionicons name={right.icon} size={26} color="#fff" />
          <T style={{ color: '#fff', fontSize: 12, fontFamily: F.m }}>{right.label}</T>
        </View>
      ) : null}
      {left.length ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: GAP, flexDirection: 'row', borderRadius: 14, overflow: 'hidden' }}>
          {left.map((a, i) => (
            <TouchableOpacity key={i} onPress={() => { snap(0); a.onPress(); }} style={{ width: ACT_W, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={a.icon} size={24} color="#fff" />
              <T style={{ color: '#fff', fontSize: 12, fontFamily: F.m, marginTop: 2 }}>{a.label}</T>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <Animated.View {...pan.panHandlers} style={[{ transform: [{ translateX: x }] }, web]}>{children}</Animated.View>
    </View>
  );
}
export const Err = ({ t, ok }) => (t ? <T style={{ color: ok ? C.ok : C.e, fontSize: 14, marginBottom: 10 }}>{t}</T> : null);

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 380, alignSelf: 'center' },
  cell: { width: '14.285%', height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  side: { width: 128, flexDirection: 'row', alignItems: 'center' },
  hb: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.e, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  btn: { flexDirection: 'row', backgroundColor: C.p, borderRadius: 10, height: 54, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DCE6F7', borderRadius: 14, height: 56, paddingHorizontal: 18, fontFamily: F.r, fontSize: 16, color: C.t, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
});
