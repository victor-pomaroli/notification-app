import React from 'react';
import {requestWidgetUpdate} from 'react-native-android-widget';
import {PingTasksWidget} from './PingTasksWidget';
import {loadWidgetSnapshot} from './widget-task-handler';
export async function refreshPingWidget(){
 const snap=await loadWidgetSnapshot();
 // Cada instância do widget recebe o próprio tamanho para ajustar quantas tarefas cabem.
 await requestWidgetUpdate({widgetName:'PingTasks',renderWidget:info=> <PingTasksWidget tasks={snap.pending} done={snap.done} appearance={snap.appearance} height={info.height}/>});
}
