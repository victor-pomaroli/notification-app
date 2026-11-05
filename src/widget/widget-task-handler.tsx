import React from 'react';
import type {WidgetTaskHandlerProps} from 'react-native-android-widget';
import {PingTasksWidget,COMPLETE_ACTION,UNCOMPLETE_ACTION} from './PingTasksWidget';
import {listWidgetTasks,setTaskCompleted,syncTaskCompletion} from '../store';
import {getPreferences} from '../preferences';
import {getWidgetSnapshot,setWidgetSnapshot,toggleInSnapshot,sameIds,type WidgetSnapshot} from './cache';

/** Lê tarefas e tema do banco e guarda no cache. */
export async function loadWidgetSnapshot():Promise<WidgetSnapshot>{
 const [{pending,done},prefs]=await Promise.all([listWidgetTasks(),getPreferences().catch(()=>null)]);
 const snap:WidgetSnapshot={pending,done,appearance:prefs?.appearance??getWidgetSnapshot()?.appearance??'dark'};
 setWidgetSnapshot(snap);
 return snap;
}
function draw(props:WidgetTaskHandlerProps,snap:WidgetSnapshot){
 props.renderWidget(<PingTasksWidget tasks={snap.pending} done={snap.done} appearance={snap.appearance} height={props.widgetInfo.height}/>);
}

export async function widgetTaskHandler(props:WidgetTaskHandlerProps){
 if(props.widgetInfo.widgetName!=='PingTasks')return;
 if(props.widgetAction==='WIDGET_DELETED')return;
 if(props.widgetAction==='WIDGET_CLICK'&&(props.clickAction===COMPLETE_ACTION||props.clickAction===UNCOMPLETE_ACTION)){
   const id=Number(props.clickActionData?.id);
   const completed=props.clickAction===COMPLETE_ACTION;
   if(!Number.isFinite(id)||id<=0)return draw(props,await loadWidgetSnapshot());
   // 1) Resposta imediata: redesenha a partir do cache, antes de qualquer acesso ao banco.
   const cached=getWidgetSnapshot();
   const optimistic=cached?toggleInSnapshot(cached,id,completed):null;
   if(optimistic){setWidgetSnapshot(optimistic);draw(props,optimistic);}
   // 2) Grava. Sem cache (processo novo), desenha uma vez só, depois de gravar.
   const task=await setTaskCompleted(id,completed).catch(e=>{console.warn('[widget] toggle failed',e);return null;});
   const fresh=await loadWidgetSnapshot();
   // 3) Só redesenha de novo se o banco mostrar algo diferente (ex.: entrou uma 6ª tarefa).
   if(!optimistic||!sameIds(fresh.pending,optimistic.pending)||!sameIds(fresh.done,optimistic.done)||fresh.appearance!==optimistic.appearance)draw(props,fresh);
   // Concluir cancela os lembretes seguintes e tira a notificação da bandeja;
   // reabrir reagenda os lembretes futuros. Nada disso muda o que o widget mostra.
   if(task)await syncTaskCompletion(task,completed).catch(e=>console.warn('[widget] reminders sync failed',e));
   return;
 }
 // WIDGET_ADDED/UPDATE/RESIZED: só redesenha com a altura atual.
 draw(props,await loadWidgetSnapshot());
}
