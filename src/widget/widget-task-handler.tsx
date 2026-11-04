import React from 'react';
import type {WidgetTaskHandlerProps} from 'react-native-android-widget';
import {PingTasksWidget,COMPLETE_ACTION,UNCOMPLETE_ACTION} from './PingTasksWidget';
import {listWidgetTasks,setTaskCompleted,syncTaskCompletion} from '../store';

async function render(props:WidgetTaskHandlerProps){
 const {pending,done}=await listWidgetTasks();
 props.renderWidget(<PingTasksWidget tasks={pending} done={done} height={props.widgetInfo.height}/>);
}

export async function widgetTaskHandler(props:WidgetTaskHandlerProps){
 if(props.widgetInfo.widgetName!=='PingTasks')return;
 if(props.widgetAction==='WIDGET_DELETED')return;
 if(props.widgetAction==='WIDGET_CLICK'&&(props.clickAction===COMPLETE_ACTION||props.clickAction===UNCOMPLETE_ACTION)){
   const id=Number(props.clickActionData?.id);
   const completed=props.clickAction===COMPLETE_ACTION;
   if(!Number.isFinite(id)||id<=0)return render(props);
   // Grava o estado e redesenha uma única vez antes do trabalho lento, para o toque
   // ter resposta imediata. Não usar completeTask aqui: ele chama requestWidgetUpdate,
   // o que redesenharia o widget uma segunda vez (e a troca da imagem causa o "pisca").
   const task=await setTaskCompleted(id,completed).catch(e=>{console.warn('[widget] toggle failed',e);return null;});
   await render(props);
   // Concluir cancela os lembretes seguintes e tira a notificação da bandeja;
   // reabrir reagenda os lembretes futuros. Nada disso muda o que o widget mostra.
   if(task)await syncTaskCompletion(task,completed).catch(e=>console.warn('[widget] reminders sync failed',e));
   return;
 }
 // WIDGET_ADDED/UPDATE/RESIZED: só redesenha com a altura atual.
 await render(props);
}
