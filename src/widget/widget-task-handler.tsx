import React from 'react';
import {PingTasksWidget} from './PingTasksWidget';
import {listTasks} from '../store';
export async function widgetTaskHandler(props:any){
 if(props.widgetInfo?.widgetName!=='PingTasks')return;
 if(props.widgetAction==='WIDGET_DELETED')return;
 const tasks=(await listTasks()).filter(t=>!t.completed).sort((a,b)=>b.id-a.id).slice(0,5);
 props.renderWidget(<PingTasksWidget tasks={tasks}/>);
}
