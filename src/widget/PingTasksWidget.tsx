import React from 'react';
import {FlexWidget,TextWidget} from 'react-native-android-widget';
import type {Task} from '../store';
import {categories} from '../templates';

const palette={background:'#111310',surface:'#1C201A',text:'#F4F1E7',muted:'#A4AA9A',accent:'#D7FC65',danger:'#FF887B'} as const;
export type WidgetTask=Pick<Task,'id'|'title'|'due_at'|'category'>;
const time=(ms:number)=>new Date(ms).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
export function PingTasksWidget({tasks=[]}:{tasks?:WidgetTask[]}){
  return <FlexWidget style={{backgroundColor:palette.background,padding:16,borderRadius:18,flexDirection:'column',width:'match_parent',height:'match_parent'}}>
    <FlexWidget style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
      <TextWidget text="ping." style={{color:palette.accent,fontSize:23,fontWeight:'bold'}} clickAction="OPEN_APP"/>
      <TextWidget text="SUAS 5 TAREFAS" style={{color:palette.muted,fontSize:10,fontWeight:'bold'}}/>
    </FlexWidget>
    {tasks.length===0?<FlexWidget style={{paddingTop:20,paddingBottom:20}} clickAction="OPEN_APP">
      <TextWidget text="Tudo em dia." style={{color:palette.text,fontSize:18,fontWeight:'bold'}}/>
      <TextWidget text="Crie uma tarefa no Ping para começar." style={{color:palette.muted,fontSize:12,marginTop:7}}/>
    </FlexWidget>:tasks.slice(0,5).map((task,i)=><FlexWidget key={task.id} clickAction="OPEN_URI" clickActionData={{uri:`ping://edit?id=${task.id}`}} style={{flexDirection:'row',alignItems:'center',paddingTop:8,paddingBottom:8,borderTopWidth:i?1:0,borderColor:'#353C30'}}>
      <FlexWidget style={{width:7,height:7,borderRadius:4,backgroundColor:task.due_at<Date.now()?palette.danger:palette.accent,marginRight:10}}/>
      <FlexWidget style={{flex:1,flexDirection:'column'}}>
        <TextWidget text={task.title.length>45?task.title.slice(0,44)+'…':task.title} style={{color:palette.text,fontSize:13,fontWeight:'bold'}} maxLines={1}/>
        <TextWidget text={`${categories[task.category]??'Geral'} · ${time(task.due_at)}`} style={{color:palette.muted,fontSize:10,marginTop:3}} maxLines={1}/>
      </FlexWidget>
    </FlexWidget>)}
    <FlexWidget style={{flex:1}}/>
    <FlexWidget clickAction="OPEN_URI" clickActionData={{uri:'ping://edit'}} style={{backgroundColor:palette.accent,borderRadius:8,padding:10,alignItems:'center',justifyContent:'center',marginTop:10}}>
      <TextWidget text="+ NOVA TAREFA" style={{color:palette.background,fontSize:12,fontWeight:'bold'}}/>
    </FlexWidget>
  </FlexWidget>;
}
