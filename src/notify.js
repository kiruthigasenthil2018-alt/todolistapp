import { Platform } from 'react-native';
// Local reminder at 9:00 AM on the due date (Android/iOS in Expo Go; web uses the in-app bell instead)
export async function scheduleReminder(title, date, time) {
  if (Platform.OS === 'web') return;
  try {
    const N = require('expo-notifications');
    N.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }) });
    const p = await N.requestPermissionsAsync();
    if (!p.granted) return;
    let at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), ...(time ? time.split(':').map(Number) : [9, 0]), 0);
    if (at <= new Date()) at = new Date(Date.now() + 5000); // due today & past 9 AM: remind shortly
    await N.scheduleNotificationAsync({ content: { title: 'TaskMaster reminder', body: `"${title}" is due today` }, trigger: at });
  } catch (e) { /* notifications unavailable */ }
}
