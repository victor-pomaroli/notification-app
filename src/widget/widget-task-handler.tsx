import React from 'react';
import {PingTasksWidget} from './PingTasksWidget';
import {listWidgetTasks} from '../store';
export async function widgetTaskHandler(props:any){
 if(props.widgetInfo?.widgetName!=='PingTasks')return;
 if(props.widgetAction==='WIDGET_DELETED')return;
 const tasks=await listWidgetTasks();
 props.renderWidget(<PingTasksWidget tasks={tasks}/>);
}
