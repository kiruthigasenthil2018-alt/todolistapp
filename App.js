import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Lexend_400Regular, Lexend_500Medium, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useApp } from './src/store';
import { C, F } from './src/ui';
import { Splash, Welcome, Login, Register } from './src/screens/Auth';
import { TaskList, AddTask, Details, Reminders, Profile, Settings, Categories, Completed } from './src/screens/Main';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.innerHTML = 'input::-ms-reveal, input::-ms-clear { display: none !important; }';
  document.head.appendChild(st);
}

const SPLASH_MS = 10000; // splash duration in milliseconds (10 seconds)

const Auth = createNativeStackNavigator();
const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const opts = { headerShown: false };

function TasksStack() {
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="TaskList" component={TaskList} />
      <Stack.Screen name="AddTask" component={AddTask} />
      <Stack.Screen name="Details" component={Details} />
      <Stack.Screen name="Reminders" component={Reminders} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  useApp(); // re-render tab bar when the theme changes
  const icons = { Tasks: 'list', Categories: 'folder-outline', Completed: 'checkmark' };
  return (
    <Tabs.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: C.t,
      tabBarInactiveTintColor: C.m,
      tabBarStyle: { backgroundColor: C.tab, borderTopColor: C.b },
      tabBarLabelStyle: { fontFamily: F.m, fontSize: 12 },
      tabBarIcon: ({ color }) => <Ionicons name={icons[route.name]} size={24} color={color} />,
    })}>
      <Tabs.Screen name="Tasks" component={TasksStack} />
      <Tabs.Screen name="Categories" component={Categories} />
      <Tabs.Screen name="Completed" component={Completed} />
    </Tabs.Navigator>
  );
}

function Nav() {
  useApp(); // rebuild the navigation theme when the look changes
  const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.g[1], card: C.tab, border: C.b, text: C.t } };
  return <NavigationContainer theme={theme} documentTitle={{ formatter: () => 'TaskMaster' }}><Root /></NavigationContainer>;
}
const Bar = () => { useApp(); return <StatusBar style={C.dark ? 'light' : 'dark'} />; };

function Root() {
  const { ready, user } = useApp();
  const [splash, setSplash] = useState(true);
  useEffect(() => { const t = setTimeout(() => setSplash(false), SPLASH_MS); return () => clearTimeout(t); }, []);
  if (!ready || splash) return <Splash />;
  // Auth guard: main screens only exist in the tree when logged in
  return user ? <MainTabs /> : (
    <Auth.Navigator screenOptions={opts}>
      <Auth.Screen name="Welcome" component={Welcome} />
      <Auth.Screen name="Login" component={Login} />
      <Auth.Screen name="Register" component={Register} />
    </Auth.Navigator>
  );
}

export default function App() {
  const [loaded] = useFonts({ Lexend_400Regular, Lexend_500Medium, Lexend_700Bold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Nav />
        <Bar />
      </AppProvider>
    </SafeAreaProvider>
  );
}
