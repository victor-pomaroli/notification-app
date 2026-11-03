import {Stack} from 'expo-router';
import {useEffect} from 'react';
import {StatusBar} from 'expo-status-bar';
import {initDB,reconcileReminders} from '../src/store';
import {setupNotifications} from '../src/notifications';
import {ThemeProvider,useAppTheme} from '../src/theme';
function AppStack(){
  const {colors:theme,appearance}=useAppTheme();
  useEffect(()=>{initDB().then(setupNotifications).then(reconcileReminders).catch(console.warn);},[]);
  return <><StatusBar style={appearance==='dark'?"light":"dark"}/><Stack screenOptions={{
    headerStyle:{backgroundColor:theme.background},headerTintColor:theme.text,
    headerShadowVisible:false,contentStyle:{backgroundColor:theme.background},
  }}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="edit" options={{title:'Detalhes da tarefa'}}/></Stack></>;
}
export default function Layout(){return <ThemeProvider><AppStack/></ThemeProvider>;}
