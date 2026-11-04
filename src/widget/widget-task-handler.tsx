import React from 'react';
import type {WidgetTaskHandlerProps} from 'react-native-android-widget';
import {PingTasksWidget,COMPLETE_ACTION} from './PingTasksWidget';
import {listWidgetTasks,completeTask} from '../store';
export async function widgetTaskHandler(props:WidgetTaskHandlerProps){
 if(props.widgetInfo.widgetName!=='PingTasks')return;
 if(props.widgetAction==='WIDGET_DELETED')return;
 if(props.widgetAction==='WIDGET_CLICK'&&props.clickAction===COMPLETE_ACTION){
   const id=Number(props.clickActionData?.id);
   // Conclui, cancela os lembretes seguintes e tira a notificação da bandeja.
   if(Number.isFinite(id)&&id>0)await completeTask(id,true).catch(e=>console.warn('[widget] complete failed',e));
 }
 // WIDGET_RESIZED também cai aqui e re-renderiza com a nova altura.
 const tasks=await listWidgetTasks();
 props.renderWidget(<PingTasksWidget tasks={tasks} height={props.widgetInfo.height}/>);
}
