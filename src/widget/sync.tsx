import React from 'react';
import {requestWidgetUpdate} from 'react-native-android-widget';
import {PingTasksWidget} from './PingTasksWidget';
import {listWidgetTasks} from '../store';
export async function refreshPingWidget(){
 const tasks=await listWidgetTasks();
 await requestWidgetUpdate({widgetName:'PingTasks',renderWidget:()=> <PingTasksWidget tasks={tasks}/>});
}
