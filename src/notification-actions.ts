import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import {ACTION_COMPLETE,ACTION_SNOOZE} from './notifications';
import {getMeta,setMeta} from './preferences';

export const BACKGROUND_NOTIFICATION_TASK='ping-notification-actions';

function taskIdOf(response:Notifications.NotificationResponse){
  const id=Number(response.notification.request.content.data?.taskId);
  return Number.isFinite(id)&&id>0?id:null;
}

/**
 * Executa os botões "Concluir" / "Adiar". Retorna o id da tarefa quando a
 * notificação foi tocada (ação padrão), para a tela abrir os detalhes.
 * A mesma resposta pode chegar pela tarefa em segundo plano e pelo listener;
 * a chave salva evita executar a ação duas vezes.
 */
export async function handleNotificationResponse(response:Notifications.NotificationResponse):Promise<number|null>{
  const taskId=taskIdOf(response);
  if(taskId===null)return null;
  const action=response.actionIdentifier;
  if(action===Notifications.DEFAULT_ACTION_IDENTIFIER)return taskId;
  const key=response.notification.request.identifier+':'+action;
  if(await getMeta('lastNotificationResponse')===key)return null;
  await setMeta('lastNotificationResponse',key);
  const store=await import('./store');
  if(action===ACTION_COMPLETE)await store.completeTask(taskId,true);
  else if(action===ACTION_SNOOZE)await store.snoozeTask(taskId);
  return null;
}

// Android executa esta tarefa quando um botão é tocado com o app em segundo plano ou fechado.
TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_NOTIFICATION_TASK,async({data,error})=>{
  if(error||!data||!('actionIdentifier' in data))return;
  try{await handleNotificationResponse(data as Notifications.NotificationResponse);}
  catch(e){console.warn('[notifications] background action failed',e);}
});
export function registerNotificationActions(){
  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(e=>console.warn('[notifications] registerTask failed',e));
}
