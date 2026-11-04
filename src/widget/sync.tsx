import React from 'react';
import {requestWidgetUpdate} from 'react-native-android-widget';
import {PingTasksWidget} from './PingTasksWidget';
import {listWidgetTasks} from '../store';
export async function refreshPingWidget(){
 const tasks=await listWidgetTasks();
 // Cada instância do widget recebe o próprio tamanho para ajustar quantas tarefas cabem.
 await requestWidgetUpdate({widgetName:'PingTasks',renderWidget:info=> <PingTasksWidget tasks={tasks} height={info.height}/>});
}
