import React from 'react';
import type {WidgetTaskHandlerProps} from 'react-native-android-widget';
import {PingTasksWidget,COMPLETE_ACTION,UNCOMPLETE_ACTION} from './PingTasksWidget';
import {listWidgetTasks,completeTask} from '../store';
export async function widgetTaskHandler(props:WidgetTaskHandlerProps){
 if(props.widgetInfo.widgetName!=='PingTasks')return;
 if(props.widgetAction==='WIDGET_DELETED')return;
 if(props.widgetAction==='WIDGET_CLICK'&&(props.clickAction===COMPLETE_ACTION||props.clickAction===UNCOMPLETE_ACTION)){
   const id=Number(props.clickActionData?.id);
   // Concluir cancela os lembretes seguintes e tira a notificação da bandeja;
   // reabrir (toque na caixa marcada) reagenda os lembretes futuros.
   if(Number.isFinite(id)&&id>0)await completeTask(id,props.clickAction===COMPLETE_ACTION).catch(e=>console.warn('[widget] toggle failed',e));
 }
 // WIDGET_RESIZED também cai aqui e re-renderiza com a nova altura.
 const {pending,done}=await listWidgetTasks();
 props.renderWidget(<PingTasksWidget tasks={pending} done={done} height={props.widgetInfo.height}/>);
}
