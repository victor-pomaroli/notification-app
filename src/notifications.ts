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
  if(!current.granted && current.canAskAgain) await Notifications.requestPermissionsAsync();
}

export async function scheduleTask(title:string,dueAt:number){
  if(dueAt<=Date.now()) return null;
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted) return null;
  return Notifications.scheduleNotificationAsync({
    content:{title:'Prazo da tarefa chegou',body:title,data:{kind:'task_due'}},
    trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(dueAt),
      ...(Platform.OS==='android'?{channelId:'tasks'}:{})},
  });
}

export async function cancelTaskNotification(id:string|null){
  if(id) await Notifications.cancelScheduledNotificationAsync(id).catch(()=>{});
}