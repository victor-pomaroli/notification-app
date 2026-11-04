import React from 'react';
import type {WidgetTaskHandlerProps} from 'react-native-android-widget';
import {PingTasksWidget} from './PingTasksWidget';
import {listWidgetTasks} from '../store';
export async function widgetTaskHandler(props:WidgetTaskHandlerProps){
 if(props.widgetInfo.widgetName!=='PingTasks')return;
 if(props.widgetAction==='WIDGET_DELETED')return;
 // WIDGET_RESIZED também cai aqui e re-renderiza com a nova altura.
 const tasks=await listWidgetTasks();
 props.renderWidget(<PingTasksWidget tasks={tasks} height={props.widgetInfo.height}/>);
}
