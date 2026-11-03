import React from 'react';
import {requestWidgetUpdate} from 'react-native-android-widget';
import {PingTasksWidget} from './PingTasksWidget';
import {listTasks} from '../store';
export async function refreshPingWidget(){
 const tasks=(await listTasks()).filter(t=>!t.completed).sort((a,b)=>b.id-a.id).slice(0,5);
 await requestWidgetUpdate({widgetName:'PingTasks',renderWidget:()=> <PingTasksWidget tasks={tasks}/>});
}
