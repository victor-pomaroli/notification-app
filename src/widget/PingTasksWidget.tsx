import React from 'react';
import {FlexWidget,OverlapWidget,TextWidget} from 'react-native-android-widget';
import type {Task} from '../store';
import {categories} from '../templates';

const palette={background:'#111310',surface:'#1C201A',text:'#F4F1E7',muted:'#A4AA9A',accent:'#D7FC65',danger:'#FF887B',divider:'#353C30'} as const;
export const COMPLETE_ACTION='COMPLETE_TASK';
export const UNCOMPLETE_ACTION='UNCOMPLETE_TASK';
export type WidgetTask=Pick<Task,'id'|'title'|'due_at'|'category'>;

const TITLE_SIZE=16;
const META_SIZE=12;
// Alturas aproximadas em dp, usadas para decidir quantas tarefas cabem sem cortar o botão.
const PADDING=14;
const HEADER_H=34;      // "ping." 20sp + margem
const BUTTON_H=46;      // botão 13sp + padding + margem superior
const ROW_COMPACT_H=34; // uma linha: título + horário
const ROW_FULL_H=54;    // duas linhas: título + categoria/horário
const DONE_HEAD_H=26;   // rótulo "CONCLUÍDAS HOJE"
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

/**
 * Decide quantas pendentes e concluídas cabem. Se houver concluídas, reserva espaço
 * para o rótulo da seção e ao menos uma delas, para o risco ficar visível.
 */
export function widgetLayout(height:number|undefined,pendingCount:number,doneCount:number){
  // Sem informação de tamanho (ex.: pré-visualização), assume o alvo 4x4 (~280dp).
  const h=height&&height>0?height:280;
  const available=h-PADDING*2-HEADER_H-BUTTON_H;
  const p=Math.min(pendingCount,MAX_TASKS),d=Math.min(doneCount,MAX_TASKS);
  const doneSpace=(rows:number)=>rows?DONE_HEAD_H+rows*ROW_COMPACT_H:0;
  if(p*ROW_FULL_H+doneSpace(Math.min(d,1))<=available){
    const left=available-p*ROW_FULL_H;
    const doneRows=left>=DONE_HEAD_H+ROW_COMPACT_H?Math.min(d,Math.floor((left-DONE_HEAD_H)/ROW_COMPACT_H)):0;
    return {pendingRows:p,doneRows,compact:false};
  }
  const reserve=d&&available>=doneSpace(1)+ROW_COMPACT_H?doneSpace(1):0;
  const pendingRows=Math.max(0,Math.min(p,Math.floor((available-reserve)/ROW_COMPACT_H)));
  const left=available-pendingRows*ROW_COMPACT_H;
  const doneRows=d&&left>=doneSpace(1)?Math.min(d,Math.floor((left-DONE_HEAD_H)/ROW_COMPACT_H)):0;
  return {pendingRows,doneRows,compact:true};
}

function Checkbox({task,done,late}:{task:WidgetTask;done:boolean;late:boolean}){
  // Área de toque maior que a caixa; o toque aqui conclui/reabre em vez de abrir a tarefa.
  return <FlexWidget clickAction={done?UNCOMPLETE_ACTION:COMPLETE_ACTION} clickActionData={{id:task.id}} style={{width:34,height:26,justifyContent:'center',alignItems:'flex-start'}}>
    {done
      ?<FlexWidget style={{width:19,height:19,borderRadius:5,backgroundColor:palette.accent,justifyContent:'center',alignItems:'center'}}>
        <TextWidget text="✓" style={{color:palette.background,fontSize:12,fontWeight:'bold'}}/>
      </FlexWidget>
      :<FlexWidget style={{width:19,height:19,borderRadius:5,borderWidth:2,borderColor:late?palette.danger:palette.accent}}/>}
  </FlexWidget>;
}

/** Título riscado como no app: linha accent sobreposta, só na largura do texto. */
function StruckTitle({title}:{title:string}){
  return <OverlapWidget style={{width:'wrap_content'}}>
    <TextWidget text={title} style={{color:palette.muted,fontSize:TITLE_SIZE,fontWeight:'bold'}} maxLines={1} truncate="END"/>
    <FlexWidget style={{width:'match_parent',height:'match_parent',justifyContent:'center'}}>
      <FlexWidget style={{width:'match_parent',height:2,borderRadius:2,backgroundColor:palette.accent}}/>
    </FlexWidget>
  </OverlapWidget>;
}

export function PingTasksWidget({tasks=[],done=[],height}:{tasks?:WidgetTask[];done?:WidgetTask[];height?:number}){
  const {pendingRows,doneRows,compact}=widgetLayout(height,tasks.length,done.length);
  const visible=tasks.slice(0,pendingRows);
  const visibleDone=done.slice(0,doneRows);
  const hidden=Math.min(tasks.length,MAX_TASKS)-visible.length;
  const now=Date.now();
  const rowLink=(task:WidgetTask)=>({clickAction:'OPEN_URI',clickActionData:{uri:`ping://edit?id=${task.id}`}});
  return <FlexWidget style={{backgroundColor:palette.background,padding:PADDING,borderRadius:18,flexDirection:'column',width:'match_parent',height:'match_parent'}}>
    <FlexWidget style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8,width:'match_parent'}}>
      <TextWidget text="ping." style={{color:palette.accent,fontSize:20,fontWeight:'bold'}} clickAction="OPEN_APP"/>
      <TextWidget text={hidden>0?`+${hidden} NO APP`:'PRÓXIMAS'} style={{color:palette.muted,fontSize:11,fontWeight:'bold'}} clickAction="OPEN_APP"/>
    </FlexWidget>
    {tasks.length===0?<FlexWidget style={{paddingTop:6,paddingBottom:6,flexDirection:'column',width:'match_parent'}} clickAction="OPEN_APP">
      <TextWidget text="Tudo em dia." style={{color:palette.text,fontSize:17,fontWeight:'bold'}} maxLines={1} truncate="END"/>
      {visibleDone.length?null:<TextWidget text="Crie uma tarefa no Ping para começar." style={{color:palette.muted,fontSize:13,marginTop:4}} maxLines={2} truncate="END"/>}
    </FlexWidget>:visible.map((task,i)=>{
      const late=task.due_at<now;
      return <FlexWidget key={task.id} {...rowLink(task)} style={{flexDirection:'row',alignItems:'center',width:'match_parent',paddingTop:compact?5:7,paddingBottom:compact?5:7,borderTopWidth:i?1:0,borderColor:palette.divider}}>
        <Checkbox task={task} done={false} late={late}/>
        {compact?<FlexWidget style={{flex:1,flexDirection:'row',alignItems:'center'}}>
          <FlexWidget style={{flex:1}}>
            <TextWidget text={task.title} style={{color:palette.text,fontSize:TITLE_SIZE,fontWeight:'bold'}} maxLines={1} truncate="END"/>
          </FlexWidget>
          <TextWidget text={when(task.due_at)} style={{color:late?palette.danger:palette.muted,fontSize:META_SIZE,marginLeft:8}} maxLines={1}/>
        </FlexWidget>:<FlexWidget style={{flex:1,flexDirection:'column'}}>
          <TextWidget text={task.title} style={{color:palette.text,fontSize:TITLE_SIZE,fontWeight:'bold'}} maxLines={1} truncate="END"/>
          <TextWidget text={`${categories[task.category]??'Geral'} · ${when(task.due_at)}`} style={{color:late?palette.danger:palette.muted,fontSize:META_SIZE,marginTop:3}} maxLines={1} truncate="END"/>
        </FlexWidget>}
      </FlexWidget>;
    })}
    {visibleDone.length?<FlexWidget style={{flexDirection:'column',width:'match_parent'}}>
      <TextWidget text={`CONCLUÍDAS HOJE · ${pad(done.length)}`} style={{color:palette.muted,fontSize:11,fontWeight:'bold',marginTop:10,marginBottom:2}}/>
      {visibleDone.map((task,i)=><FlexWidget key={task.id} {...rowLink(task)} style={{flexDirection:'row',alignItems:'center',width:'match_parent',paddingTop:5,paddingBottom:5,borderTopWidth:i?1:0,borderColor:palette.divider}}>
        <Checkbox task={task} done late={false}/>
        <FlexWidget style={{flex:1,flexDirection:'row',alignItems:'center'}}>
          <StruckTitle title={task.title}/>
        </FlexWidget>
      </FlexWidget>)}
    </FlexWidget>:null}
    <FlexWidget style={{flex:1}}/>
    <FlexWidget clickAction="OPEN_URI" clickActionData={{uri:'ping://edit'}} style={{backgroundColor:palette.accent,borderRadius:8,paddingTop:9,paddingBottom:9,alignItems:'center',justifyContent:'center',marginTop:8,width:'match_parent'}}>
      <TextWidget text="+ NOVA TAREFA" style={{color:palette.background,fontSize:13,fontWeight:'bold'}}/>
    </FlexWidget>
  </FlexWidget>;
}
