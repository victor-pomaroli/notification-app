import React from 'react';
import {FlexWidget,OverlapWidget,TextWidget} from 'react-native-android-widget';
import type {Task} from '../store';
import {categories} from '../templates';
import {palettes,categoryColors,priorityColors,type Appearance,type ThemeColors} from '../theme';

export const COMPLETE_ACTION='COMPLETE_TASK';
export const UNCOMPLETE_ACTION='UNCOMPLETE_TASK';
export type WidgetTask=Pick<Task,'id'|'title'|'due_at'|'category'|'priority'>&{no_due?:number;daily?:number;completed_at?:number|null};

const TITLE_SIZE=15;
const META_SIZE=12;
// Alturas aproximadas em dp, usadas para decidir quantas tarefas cabem sem cortar o botão.
const PADDING=16;
const HEADER_H=40;      // marca + "ping." + margem
const BUTTON_H=50;      // botão 13sp + padding + margem superior
const ROW_COMPACT_H=34; // uma linha: título + horário
const ROW_FULL_H=52;    // duas linhas: título + assunto/horário
const DONE_HEAD_H=28;   // rótulo "CONCLUÍDAS HOJE"
const MAX_TASKS=5;

const pad=(n:number)=>String(n).padStart(2,'0');
const hm=(d:Date)=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
function ago(ms:number,now:number){
  const min=Math.max(1,Math.floor((now-ms)/60000));
  if(min<60)return `há ${min} min`;
  const h=Math.floor(min/60);if(h<24)return `há ${h} h`;
  const d=Math.floor(h/24);return `há ${d} ${d===1?'dia':'dias'}`;
}
/** Mesmo texto de data dos cartões do app: "↻ 15:40", "18:30", "amanhã 09:00", "17:00 · há 21 min". */
function when(task:WidgetTask,now:number){
  if(task.daily)return task.no_due?'↻ diária':`↻ ${hm(new Date(task.due_at))}`;
  if(task.no_due)return 'sem data';
  const d=new Date(task.due_at),today=new Date(now);
  const day=(x:Date)=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
  const diff=Math.round((day(d)-day(today))/86400000);
  const label=diff===0?hm(d):diff===1?`amanhã ${hm(d)}`:`${pad(d.getDate())}/${pad(d.getMonth()+1)} ${hm(d)}`;
  return task.due_at<now?`${label} · ${ago(task.due_at,now)}`:label;
}
const isLate=(task:WidgetTask,now:number)=>!task.daily&&!task.no_due&&task.due_at<now;

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

function Checkbox({task,done,late,c}:{task:WidgetTask;done:boolean;late:boolean;c:ThemeColors}){
  // Área de toque maior que a caixa; o toque aqui conclui/reabre em vez de abrir o app.
  return <FlexWidget clickAction={done?UNCOMPLETE_ACTION:COMPLETE_ACTION} clickActionData={{id:task.id}} style={{width:36,height:30,justifyContent:'center',alignItems:'flex-start'}}>
    {done
      ?<FlexWidget style={{width:20,height:20,borderRadius:5,backgroundColor:c.accent as any,justifyContent:'center',alignItems:'center'}}>
        <TextWidget text="✓" style={{color:c.background as any,fontSize:12,fontWeight:'bold'}}/>
      </FlexWidget>
      :<FlexWidget style={{width:20,height:20,borderRadius:5,borderWidth:2,borderColor:(late?c.danger:c.muted) as any}}/>}
  </FlexWidget>;
}

/** Título riscado como no app: linha accent sobreposta, só na largura do texto. */
function StruckTitle({title,c}:{title:string;c:ThemeColors}){
  return <OverlapWidget style={{width:'wrap_content'}}>
    <TextWidget text={title} style={{color:c.muted as any,fontSize:TITLE_SIZE,fontWeight:'bold'}} maxLines={1} truncate="END"/>
    <FlexWidget style={{width:'match_parent',height:'match_parent',justifyContent:'center'}}>
      <FlexWidget style={{width:'match_parent',height:2,borderRadius:2,backgroundColor:c.accent as any}}/>
    </FlexWidget>
  </OverlapWidget>;
}

/**
 * Widget no visual atual do app: sem linhas divisórias, caixa cinza (vermelha se atrasada),
 * assunto colorido só quando não é "Geral", traço de urgência à direita e o tema do app.
 * Tocar numa linha abre o app na aba Hoje com a tarefa destacada.
 */
export function PingTasksWidget({tasks=[],done=[],height,appearance='dark'}:{tasks?:WidgetTask[];done?:WidgetTask[];height?:number;appearance?:Appearance}){
  const c=palettes[appearance]??palettes.dark;
  const topics=categoryColors[appearance]??categoryColors.dark;
  const {pendingRows,doneRows,compact}=widgetLayout(height,tasks.length,done.length);
  const visible=tasks.slice(0,pendingRows);
  const visibleDone=done.slice(0,doneRows);
  const hidden=Math.min(tasks.length,MAX_TASKS)-visible.length;
  const now=Date.now();
  const lateCount=tasks.filter(t=>isLate(t,now)).length;
  const rowLink=(task:WidgetTask)=>({clickAction:'OPEN_URI',clickActionData:{uri:`ping://highlight/${task.id}`}});
  const headerRight=lateCount?`${lateCount} ${lateCount===1?'ATRASADA':'ATRASADAS'}`:hidden>0?`+${hidden} NO APP`:tasks.length?'PRÓXIMAS':'';
  const col=(value:string)=>value as any;
  return <FlexWidget style={{backgroundColor:col(c.background),padding:PADDING,borderRadius:22,flexDirection:'column',width:'match_parent',height:'match_parent'}}>
    <FlexWidget clickAction="OPEN_APP" style={{flexDirection:'row',alignItems:'center',marginBottom:10,width:'match_parent'}}>
      <FlexWidget style={{width:22,height:22,borderRadius:6,backgroundColor:col(c.accent),justifyContent:'center',alignItems:'center',marginRight:8}}>
        <TextWidget text="!" style={{color:col(c.background),fontSize:15,fontWeight:'bold'}}/>
      </FlexWidget>
      <TextWidget text="ping" style={{color:col(c.text),fontSize:19,fontWeight:'bold'}}/>
      <TextWidget text="." style={{color:col(c.accent),fontSize:19,fontWeight:'bold'}}/>
      <FlexWidget style={{flex:1}}/>
      {headerRight?<TextWidget text={headerRight} style={{color:col(lateCount?c.danger:c.muted),fontSize:10,fontWeight:'bold'}}/>:null}
    </FlexWidget>
    {tasks.length===0?<FlexWidget style={{paddingTop:4,paddingBottom:6,flexDirection:'column',width:'match_parent'}} clickAction="OPEN_APP">
      <TextWidget text={done.length?'Missão cumprida.':'Dia em branco.'} style={{color:col(c.text),fontSize:17,fontWeight:'bold'}} maxLines={1} truncate="END"/>
      <TextWidget text={done.length?'Tudo feito por hoje.':'Crie uma tarefa no Ping para começar.'} style={{color:col(c.muted),fontSize:13,marginTop:3}} maxLines={2} truncate="END"/>
    </FlexWidget>:visible.map(task=>{
      const late=isLate(task,now);
      const topic=task.category!=='general'&&categories[task.category]?topics[task.category]:null;
      const meta=when(task,now);
      return <FlexWidget key={task.id} {...rowLink(task)} style={{flexDirection:'row',alignItems:'center',width:'match_parent',paddingTop:compact?4:6,paddingBottom:compact?4:6}}>
        <Checkbox task={task} done={false} late={late} c={c}/>
        {compact?<FlexWidget style={{flex:1,flexDirection:'row',alignItems:'center'}}>
          <FlexWidget style={{flex:1}}>
            <TextWidget text={task.title} style={{color:col(c.text),fontSize:TITLE_SIZE,fontWeight:'bold'}} maxLines={1} truncate="END"/>
          </FlexWidget>
          <TextWidget text={meta} style={{color:col(late?c.danger:c.muted),fontSize:META_SIZE,marginLeft:8}} maxLines={1}/>
        </FlexWidget>:<FlexWidget style={{flex:1,flexDirection:'column'}}>
          <TextWidget text={task.title} style={{color:col(c.text),fontSize:TITLE_SIZE,fontWeight:'bold'}} maxLines={1} truncate="END"/>
          <FlexWidget style={{flexDirection:'row',alignItems:'center',marginTop:3}}>
            {topic?<TextWidget text={`${categories[task.category]} · `} style={{color:col(topic.text),fontSize:META_SIZE,fontWeight:'bold'}} maxLines={1}/>:null}
            <TextWidget text={meta} style={{color:col(late?c.danger:c.muted),fontSize:META_SIZE,fontWeight:late?'bold':'normal'}} maxLines={1} truncate="END"/>
          </FlexWidget>
        </FlexWidget>}
        <FlexWidget style={{width:22,height:4,borderRadius:2,backgroundColor:col(priorityColors[task.priority]??priorityColors.medium),marginLeft:10}}/>
      </FlexWidget>;
    })}
    {visibleDone.length?<FlexWidget style={{flexDirection:'column',width:'match_parent'}}>
      <TextWidget text={`CONCLUÍDAS HOJE  ·  ${done.length}`} style={{color:col(c.muted),fontSize:10,fontWeight:'bold',marginTop:10,marginBottom:2}}/>
      {visibleDone.map(task=><FlexWidget key={task.id} {...rowLink(task)} style={{flexDirection:'row',alignItems:'center',width:'match_parent',paddingTop:3,paddingBottom:3}}>
        <Checkbox task={task} done late={false} c={c}/>
        <FlexWidget style={{flex:1,flexDirection:'row',alignItems:'center'}}>
          <StruckTitle title={task.title} c={c}/>
        </FlexWidget>
      </FlexWidget>)}
    </FlexWidget>:null}
    <FlexWidget style={{flex:1}}/>
    <FlexWidget clickAction="OPEN_URI" clickActionData={{uri:'ping://edit'}} style={{backgroundColor:col(c.accent),borderRadius:12,paddingTop:10,paddingBottom:10,alignItems:'center',justifyContent:'center',marginTop:8,width:'match_parent'}}>
      <TextWidget text="+  NOVA TAREFA" style={{color:col(c.background),fontSize:13,fontWeight:'bold'}}/>
    </FlexWidget>
  </FlexWidget>;
}
