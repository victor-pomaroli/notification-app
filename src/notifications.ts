import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';

Notifications.setNotificationHandler({
  handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false}),
});

export async function setupNotifications(){
  if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync('tasks',{
      name:'Vencimento de tarefas',importance:Notifications.AndroidImportance.HIGH,
    });
  }
  const current=await Notifications.getPermissionsAsync();
  if(!current.granted && current.canAskAgain) {
    const requested=await Notifications.requestPermissionsAsync();
    console.log('[notifications] permission after request:',requested.status);
  } else {
    console.log('[notifications] permission:',current.status);
  }
}

export async function scheduleTask(title:string,dueAt:number){
  if(dueAt<=Date.now()) {
    console.warn('[notifications] Due date is in the past:',new Date(dueAt).toISOString());
    return null;
  }
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted) {
    console.warn('[notifications] Permission not granted:',permission.status);
    return null;
  }
  const id=await Notifications.scheduleNotificationAsync({
    content:{title:'Prazo da tarefa chegou',body:title,data:{kind:'task_due'}},
    trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(dueAt),
      ...(Platform.OS==='android'?{channelId:'tasks'}:{})},
  });
  const pending=await Notifications.getAllScheduledNotificationsAsync();
  console.log('[notifications] scheduled:',id,'pending count:',pending.length,'due:',new Date(dueAt).toISOString());
  return id;
}

export async function testNotification(){
  const dueAt=Date.now()+10000;
  const id=await scheduleTask('Teste de notificação em 10 segundos',dueAt);
  if(!id) throw new Error('Notificações não autorizadas ou horário inválido.');
  return id;
}

export async function cancelTaskNotification(id:string|null){
  if(id) await Notifications.cancelScheduledNotificationAsync(id).catch(()=>{});
}