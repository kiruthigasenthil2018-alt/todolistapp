import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../store';
import { C, F, T, Screen, Header, Btn, Input, PasswordInput, Err, Logo, Avatar } from '../ui';

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function Splash() {
  return (
    <LinearGradient colors={['#E8ECEF', '#8A9097']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 270, height: 240 }}>
        <Ionicons name="clipboard-outline" size={220} color="#000" style={{ position: 'absolute', left: 0, top: 0 }} />
        <Ionicons name="star" size={125} color="#E8C81A" style={{ position: 'absolute', right: 0, bottom: 0 }} />
        <T style={{ position: 'absolute', left: 78, top: 112, fontFamily: F.b, fontSize: 26 }}>TaskMaster</T>
      </View>
      <T style={{ fontFamily: F.m, fontSize: 14, marginTop: 44, textAlign: 'center' }}>Organize your day, conquer your goals.</T>
    </LinearGradient>
  );
}

export function Welcome({ navigation }) {
  const { socialLogin } = useApp();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 44 }}>
          <Logo size={84} />
          <T style={{ fontFamily: F.b, fontSize: 28, marginTop: 16 }}>Create your account</T>
          <T style={{ color: C.m, textAlign: 'center', marginTop: 6 }}>Sign up to organize your day and conquer your goals.</T>
        </View>
        <Btn outline icon="logo-google" title="Continue with Google" style={{ borderColor: C.b, marginBottom: 12 }} onPress={() => socialLogin('Google')} />
        <Btn outline icon="logo-apple" title="Continue with Apple" style={{ borderColor: C.b, marginBottom: 12 }} onPress={() => socialLogin('Apple')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.b }} /><T style={{ color: C.m, marginHorizontal: 12 }}>or</T><View style={{ flex: 1, height: 1, backgroundColor: C.b }} />
        </View>
        <Btn icon="mail-outline" title="Sign up with Email" onPress={() => navigation.navigate('Register')} />
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 22, alignItems: 'center' }}>
          <T style={{ color: C.m }}>Already have an account? <T style={{ color: C.p, fontFamily: F.m }}>Login</T></T>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

export function Register({ navigation }) {
  const { register } = useApp();
  const [f, setF] = useState({ name: '', email: '', pw: '', pw2: '' });
  const [avatar, setAvatar] = useState('girl');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const up = (k) => (v) => setF({ ...f, [k]: v });
  const submit = async () => {
    if (!f.name.trim()) return setErr('Please enter your full name.');
    if (!emailOk(f.email.trim())) return setErr('Please enter a valid email address.');
    if (f.pw.length < 6) return setErr('Password must be at least 6 characters.');
    if (f.pw !== f.pw2) return setErr('Passwords do not match.');
    const e = await register(f.name.trim(), f.email.trim().toLowerCase(), f.pw, avatar);
    if (e) return setErr(e);
    navigation.replace('Login', { email: f.email.trim().toLowerCase(), msg: 'Account created! Please log in.' });
  };
  return (
    <Screen>
      <Header title="Sign Up" left="arrow-back" onLeft={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <T style={{ color: C.m, marginBottom: 10 }}>Choose your profile picture</T>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
          {['girl', 'boy'].map((a) => (
            <TouchableOpacity key={a} onPress={() => setAvatar(a)} style={{ alignItems: 'center', marginHorizontal: 16, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: avatar === a ? C.p : 'transparent', backgroundColor: avatar === a ? C.s : 'transparent' }}>
              <Avatar type={a} size={72} /><T style={{ marginTop: 4, fontSize: 14 }}>{a === 'girl' ? 'Girl' : 'Boy'}</T>
            </TouchableOpacity>
          ))}
        </View>
        <Input placeholder="Full Name" value={f.name} onChangeText={up('name')} />
        <Input placeholder="Email" value={f.email} onChangeText={up('email')} autoCapitalize="none" keyboardType="email-address" />
        <PasswordInput placeholder="Password" value={f.pw} onChangeText={up('pw')} />
        <PasswordInput placeholder="Confirm Password" value={f.pw2} onChangeText={up('pw2')} />
        <Err t={err} />
        <Btn title="Sign Up" onPress={submit} />
        <TouchableOpacity onPress={() => navigation.replace('Login')} style={{ marginTop: 20, alignItems: 'center' }}>
          <T style={{ color: C.m }}>Already have an account? <T style={{ color: C.p, fontFamily: F.m }}>Login</T></T>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

export function Login({ navigation, route }) {
  const { login } = useApp();
  const [email, setEmail] = useState(route.params?.email || '');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(route.params?.msg || '');
  const submit = async () => {
    setMsg('');
    if (!emailOk(email.trim())) return setErr('Please enter a valid email address.');
    if (!pw) return setErr('Please enter your password.');
    const e = await login(email.trim().toLowerCase(), pw);
    if (e) setErr(e); // on success the auth guard opens Home
  };
  return (
    <Screen>
      <Header title="Login" left="arrow-back" onLeft={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Welcome'))} />
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 24 }}><Logo size={72} /></View>
        <Err ok t={msg} />
        <Input placeholder="Email" value={email} onChangeText={(v) => { setEmail(v); setErr(''); }} autoCapitalize="none" keyboardType="email-address" />
        <PasswordInput placeholder="Password" value={pw} onChangeText={(v) => { setPw(v); setErr(''); }} onSubmitEditing={submit} />
        <Err t={err} />
        <Btn title="Login" onPress={submit} />
        <TouchableOpacity onPress={() => navigation.replace('Register')} style={{ marginTop: 20, alignItems: 'center' }}>
          <T style={{ color: C.m }}>Don't have an account? <T style={{ color: C.p, fontFamily: F.m }}>Sign Up</T></T>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
