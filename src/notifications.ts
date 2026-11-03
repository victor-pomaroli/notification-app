import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {getPreferences} from './preferences';
import {reminderMessage,reminderOffsets,TaskCategory,ReminderStage} from './templates';

Notifications.setNotificationHandler({
  handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false}),
});
const CHANNEL='tasks';
export type ScheduledReminder={notification_id:string;stage:number;scheduled_at:number};
export type ReminderTask={id:number;title:string;due_at:number;category:TaskCategory};
export async function setupNotifications(){
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync(CHANNEL,{
    name:'Lembretes de tarefas',importance:Notifications.AndroidImportance.HIGH,
  });
  const current=await Notifications.getPermissionsAsync();
  if(!current.granted && current.canAskAgain) await Notifications.requestPermissionsAsync();
}
function allowedTime(timestamp:number){
  // Silêncio das 22h às 7h: desloca para 7h da manhã local.
  const date=new Date(timestamp);
  if(date.getHours()>=22){date.setDate(date.getDate()+1);date.setHours(7,0,0,0);}
  else if(date.getHours()<7) date.setHours(7,0,0,0);
  return date.getTime();
}
export async function scheduleTaskReminders(task:ReminderTask):Promise<ScheduledReminder[]>{
  const prefs=await getPreferences();
  if(!prefs.notifications)return [];
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted){console.warn('[notifications] Permission not granted');return [];}
  const result:ScheduledReminder[]=[];
  try{
    const offsets=reminderOffsets(task.category);
    const used=new Set<number>();
    for(let stage=0;stage<offsets.length;stage++){
      const at=allowedTime(task.due_at+offsets[stage]*60000);
      if(at<=Date.now()||used.has(at))continue;
      used.add(at);
      const id=await Notifications.scheduleNotificationAsync({
        content:{
          title:prefs.privatePreviews?'Ping · lembrete':task.title,
          body:prefs.privatePreviews?'Você tem uma tarefa esperando. Abra o Ping para conferir.':reminderMessage(task.category,stage as ReminderStage,task.id+stage,prefs.displayName,prefs.addressStyle),
          data:{kind:'task_due',taskId:task.id,stage},
        },
        trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at),
          ...(Platform.OS==='android'?{channelId:CHANNEL}:{})},
      });
      result.push({notification_id:id,stage,scheduled_at:at});
    }
    return result;
  }catch(e){await cancelTaskReminders(result.map(x=>x.notification_id));throw e;}
}
export async function cancelTaskReminders(ids:string[]){
  await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(console.warn)));
}
export async function testNotification(){
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted)throw new Error('Permissão de notificações não concedida.');
  return Notifications.scheduleNotificationAsync({
    content:{title:'Teste do Ping! 👀',body:'Ô, criatura, seu lembrete de teste chegou!',data:{kind:'test'}},
    trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(Date.now()+10000),
      ...(Platform.OS==='android'?{channelId:CHANNEL}:{})},
  });
}
