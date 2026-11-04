import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {getPreferences} from './preferences';
import {reminderMessage,reminderOffsets,TaskCategory,ReminderStage} from './templates';

Notifications.setNotificationHandler({
  handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false}),
});
const CHANNEL='tasks';
export const TASK_CATEGORY='task_due';
export const ACTION_COMPLETE='complete';
export const ACTION_SNOOZE='snooze';
export const SNOOZE_MINUTES=15;
/** Etapa usada para lembretes adiados pelo botão "Adiar". */
export const SNOOZE_STAGE=9;
export type ScheduledReminder={notification_id:string;stage:number;scheduled_at:number};
export type ReminderTask={id:number;title:string;due_at:number;category:TaskCategory};

/** Cria canal e botões de ação. Não pede permissão: isso acontece após o onboarding. */
export async function setupNotifications(){
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync(CHANNEL,{
    name:'Lembretes de tarefas',importance:Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY,[
    {identifier:ACTION_COMPLETE,buttonTitle:'Concluir',options:{opensAppToForeground:false}},
    {identifier:ACTION_SNOOZE,buttonTitle:`Adiar ${SNOOZE_MINUTES} min`,options:{opensAppToForeground:false}},
  ]);
}
/** Pede a permissão de notificações se ainda for possível perguntar. */
export async function ensureNotificationPermission(){
  const current=await Notifications.getPermissionsAsync();
  if(current.granted||!current.canAskAgain)return current.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function buildContent(task:ReminderTask,stage:ReminderStage,variant:number):Promise<Notifications.NotificationContentInput>{
  const prefs=await getPreferences();
  return {
    title:prefs.privatePreviews?'Ping · lembrete':task.title,
    body:prefs.privatePreviews?'Você tem uma tarefa esperando. Abra o Ping para conferir.':reminderMessage(task.category,stage,variant,prefs.displayName,prefs.addressStyle,prefs.personality),
    data:{kind:'task_due',taskId:task.id,stage},
    categoryIdentifier:TASK_CATEGORY,
  };
}
function dateTrigger(at:number):Notifications.NotificationTriggerInput{
  return {type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at),
    ...(Platform.OS==='android'?{channelId:CHANNEL}:{})};
}

export async function scheduleTaskReminders(task:ReminderTask):Promise<ScheduledReminder[]>{
  const prefs=await getPreferences();
  if(!prefs.notifications)return [];
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted){console.warn('[notifications] Permission not granted');return [];}
  const result:ScheduledReminder[]=[];
  try{
    const offsets=reminderOffsets(task.category);
    for(let stage=0;stage<offsets.length;stage++){
      const at=task.due_at+offsets[stage]*60000;
      if(at<=Date.now())continue;
      const id=await Notifications.scheduleNotificationAsync({
        content:await buildContent(task,stage as ReminderStage,task.id+stage),
        trigger:dateTrigger(at),
      });
      result.push({notification_id:id,stage,scheduled_at:at});
    }
    return result;
  }catch(e){await cancelTaskReminders(result.map(x=>x.notification_id));throw e;}
}
/** Agenda um único lembrete daqui a SNOOZE_MINUTES (botão "Adiar"). */
export async function scheduleSnoozeReminder(task:ReminderTask):Promise<ScheduledReminder|null>{
  const prefs=await getPreferences();
  if(!prefs.notifications)return null;
  const at=Date.now()+SNOOZE_MINUTES*60000;
  // Etapa 1 = mensagens de "ainda está pendente", adequadas para um adiamento.
  const id=await Notifications.scheduleNotificationAsync({content:await buildContent(task,1,task.id+1),trigger:dateTrigger(at)});
  return {notification_id:id,stage:SNOOZE_STAGE,scheduled_at:at};
}
export async function cancelTaskReminders(ids:string[]){
  await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(console.warn)));
}
/** Remove da bandeja as notificações já exibidas de uma tarefa. */
export async function dismissTaskNotifications(taskId:number){
  try{
    const presented=await Notifications.getPresentedNotificationsAsync();
    await Promise.all(presented
      .filter(n=>Number(n.request.content.data?.taskId)===taskId)
      .map(n=>Notifications.dismissNotificationAsync(n.request.identifier).catch(console.warn)));
  }catch(e){console.warn('[notifications] dismiss failed',e);}
}
export async function dismissAllTaskNotifications(){
  await Notifications.dismissAllNotificationsAsync().catch(console.warn);
}
export async function testNotification(){
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted)throw new Error('Permissão de notificações não concedida.');
  const prefs=await getPreferences();
  return Notifications.scheduleNotificationAsync({
    content:{title:prefs.privatePreviews?'Ping - lembrete':'Teste do Ping!',body:prefs.privatePreviews?'Abra o Ping para conferir seu lembrete.':reminderMessage('general',0,0,prefs.displayName,prefs.addressStyle,prefs.personality),data:{kind:'test'}},
    trigger:dateTrigger(Date.now()+10000),
  });
}
