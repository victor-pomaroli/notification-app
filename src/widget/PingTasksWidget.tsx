import React from 'react';
import {FlexWidget,TextWidget} from 'react-native-android-widget';
import type {Task} from '../store';
import {categories} from '../templates';

const palette={background:'#111310',surface:'#1C201A',text:'#F4F1E7',muted:'#A4AA9A',accent:'#D7FC65',danger:'#FF887B',divider:'#353C30'} as const;
export const COMPLETE_ACTION='COMPLETE_TASK';
export type WidgetTask=Pick<Task,'id'|'title'|'due_at'|'category'>;

// Alturas aproximadas em dp, usadas para decidir quantas tarefas cabem sem cortar o botão.
const PADDING=14;
const HEADER_H=34;   // título 20sp + margem
const BUTTON_H=42;   // botão 12sp + padding + margem superior
const ROW_COMPACT_H=31;  // uma linha: título + horário
const ROW_FULL_H=47;     // duas linhas: título + categoria/horário
const MAX_TASKS=5;

const pad=(n:number)=>String(n).padStart(2,'0');
function when(ms:number){
  const d=new Date(ms);const now=new Date();
  const day=(x:Date)=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
  const diff=Math.round((day(d)-day(now))/86400000);
  const hm=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if(diff===0)return `hoje ${hm}`;
  if(diff===1)return `amanhã ${hm}`;
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${hm}`;
}

export function widgetLayout(height?:number){
  // Sem informação de tamanho (ex.: pré-visualização), assume o alvo 4x4 (~280dp).
  const h=height&&height>0?height:280;
  const available=h-PADDING*2-HEADER_H-BUTTON_H;
  if(available>=ROW_FULL_H*MAX_TASKS)return {rows:MAX_TASKS,compact:false};
  return {rows:Math.max(0,Math.min(MAX_TASKS,Math.floor(available/ROW_COMPACT_H))),compact:true};
}

export function PingTasksWidget({tasks=[],height}:{tasks?:WidgetTask[];height?:number}){
  const {rows,compact}=widgetLayout(height);
  const visible=tasks.slice(0,rows);
  const hidden=Math.min(tasks.length,MAX_TASKS)-visible.length;
  const now=Date.now();
  return <FlexWidget style={{backgroundColor:palette.background,padding:PADDING,borderRadius:18,flexDirection:'column',width:'match_parent',height:'match_parent'}}>
    <FlexWidget style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8,width:'match_parent'}}>
      <TextWidget text="ping." style={{color:palette.accent,fontSize:20,fontWeight:'bold'}} clickAction="OPEN_APP"/>
      <TextWidget text={hidden>0?`+${hidden} NO APP`:'PRÓXIMAS'} style={{color:palette.muted,fontSize:10,fontWeight:'bold'}} clickAction="OPEN_APP"/>
    </FlexWidget>
    {tasks.length===0?<FlexWidget style={{paddingTop:8,paddingBottom:8,flexDirection:'column',width:'match_parent'}} clickAction="OPEN_APP">
      <TextWidget text="Tudo em dia." style={{color:palette.text,fontSize:16,fontWeight:'bold'}} maxLines={1} truncate="END"/>
      <TextWidget text="Crie uma tarefa no Ping para começar." style={{color:palette.muted,fontSize:12,marginTop:4}} maxLines={2} truncate="END"/>
    </FlexWidget>:visible.map((task,i)=><FlexWidget key={task.id} clickAction="OPEN_URI" clickActionData={{uri:`ping://edit?id=${task.id}`}} style={{flexDirection:'row',alignItems:'center',width:'match_parent',paddingTop:compact?4:7,paddingBottom:compact?4:7,borderTopWidth:i?1:0,borderColor:palette.divider}}>
      {/* Área de toque maior que a caixa; o toque aqui conclui em vez de abrir a tarefa. */}
      <FlexWidget clickAction={COMPLETE_ACTION} clickActionData={{id:task.id}} style={{width:30,height:22,justifyContent:'center',alignItems:'flex-start'}}>
        <FlexWidget style={{width:16,height:16,borderRadius:4,borderWidth:2,borderColor:task.due_at<now?palette.danger:palette.accent}}/>
      </FlexWidget>
      {compact?<FlexWidget style={{flex:1,flexDirection:'row',alignItems:'center'}}>
        <FlexWidget style={{flex:1}}>
          <TextWidget text={task.title} style={{color:palette.text,fontSize:13,fontWeight:'bold'}} maxLines={1} truncate="END"/>
        </FlexWidget>
        <TextWidget text={when(task.due_at)} style={{color:task.due_at<now?palette.danger:palette.muted,fontSize:10,marginLeft:8}} maxLines={1}/>
      </FlexWidget>:<FlexWidget style={{flex:1,flexDirection:'column'}}>
        <TextWidget text={task.title} style={{color:palette.text,fontSize:13,fontWeight:'bold'}} maxLines={1} truncate="END"/>
        <TextWidget text={`${categories[task.category]??'Geral'} · ${when(task.due_at)}`} style={{color:task.due_at<now?palette.danger:palette.muted,fontSize:10,marginTop:3}} maxLines={1} truncate="END"/>
      </FlexWidget>}
    </FlexWidget>)}
    <FlexWidget style={{flex:1}}/>
    <FlexWidget clickAction="OPEN_URI" clickActionData={{uri:'ping://edit'}} style={{backgroundColor:palette.accent,borderRadius:8,paddingTop:8,paddingBottom:8,alignItems:'center',justifyContent:'center',marginTop:8,width:'match_parent'}}>
      <TextWidget text="+ NOVA TAREFA" style={{color:palette.background,fontSize:12,fontWeight:'bold'}}/>
    </FlexWidget>
  </FlexWidget>;
}
