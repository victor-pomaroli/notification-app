import {Stack} from 'expo-router';
import {useEffect} from 'react';
import {StatusBar} from 'expo-status-bar';
import {initDB,reconcileReminders} from '../src/store';
import {setupNotifications} from '../src/notifications';
import {theme} from '../src/theme';
export default function Layout(){
  useEffect(()=>{initDB().then(setupNotifications).then(reconcileReminders).catch(console.warn);},[]);
  return <><StatusBar style="light"/><Stack screenOptions={{
    headerStyle:{backgroundColor:theme.background},headerTintColor:theme.text,
    headerShadowVisible:false,contentStyle:{backgroundColor:theme.background},
  }}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="edit" options={{title:'Detalhes da tarefa'}}/></Stack></>;
}