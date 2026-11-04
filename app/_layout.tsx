import {Stack,useRouter,useSegments} from 'expo-router';
import {useEffect,useState} from 'react';
import {StatusBar} from 'expo-status-bar';
import {View,ActivityIndicator} from 'react-native';
import * as Notifications from 'expo-notifications';
import {needsOnboarding} from '../src/preferences';
import {initDB,reconcileReminders} from '../src/store';
import {setupNotifications,ensureNotificationPermission} from '../src/notifications';
import {handleNotificationResponse} from '../src/notification-actions';
import {ThemeProvider,useAppTheme} from '../src/theme';
function AppStack(){
  const {colors:theme,appearance}=useAppTheme();
  const router=useRouter();
  const segments=useSegments();
  const [ready,setReady]=useState(false);
  const [needsSetup,setNeedsSetup]=useState(false);
  useEffect(()=>{(async()=>{
    await initDB();
    await setupNotifications();
    // Usuários novos recebem o pedido de permissão ao concluir o onboarding.
    if(!(await needsOnboarding()))await ensureNotificationPermission();
    await reconcileReminders();
  })().catch(console.warn);},[]);
  // Toque na notificação abre a tarefa; botões com o app aberto também passam por aqui.
  const lastResponse=Notifications.useLastNotificationResponse();
  useEffect(()=>{
    if(!ready||needsSetup||!lastResponse)return;
    handleNotificationResponse(lastResponse).then(taskId=>{
      if(taskId!==null)router.push({pathname:'/edit',params:{id:String(taskId)}});
    }).catch(console.warn).finally(()=>{Notifications.clearLastNotificationResponseAsync().catch(()=>{});});
  },[ready,needsSetup,lastResponse,router]);
  useEffect(()=>{let active=true;initDB().then(needsOnboarding).then(needed=>{if(active){setNeedsSetup(needed);setReady(true);}}).catch(e=>{console.warn(e);if(active)setReady(true);});return()=>{active=false;};},[]);
  useEffect(()=>{if(!ready||segments[0]==='onboarding'||!needsSetup)return;let active=true;needsOnboarding().then(needed=>{if(!active)return;setNeedsSetup(needed);if(needed)router.replace('/onboarding');}).catch(console.warn);return()=>{active=false;};},[ready,needsSetup,segments,router]);
  if(!ready)return <View style={{flex:1,backgroundColor:theme.background,justifyContent:'center',alignItems:'center'}}><ActivityIndicator color={theme.accent}/></View>;
  return <><StatusBar style={appearance==='dark'?"light":"dark"}/><Stack screenOptions={{
    headerStyle:{backgroundColor:theme.background},headerTintColor:theme.text,
    headerShadowVisible:false,contentStyle:{backgroundColor:theme.background},
  }}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="onboarding" options={{headerShown:false,gestureEnabled:false}}/><Stack.Screen name="archive" options={{title:"Histórico"}}/><Stack.Screen name="edit" options={{title:'Detalhes da tarefa'}}/></Stack></>;
}
export default function Layout(){return <ThemeProvider><AppStack/></ThemeProvider>;}
