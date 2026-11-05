import React from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {Task,eventOffsets} from '../store';
import {ThemeColors,Appearance,categoryColors} from '../theme';
import {categories,eventAlertOptions} from '../templates';

const hhmm=(ms:number)=>new Date(ms).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
/** Sem horário de término, o evento conta como "acontecendo" durante a primeira hora. */
const DEFAULT_LENGTH=3600000;

/** Selo de estado: quanto falta, AGORA enquanto acontece, ENCERRADO depois. */
export function eventStatus(task:Pick<Task,'due_at'|'ends_at'>,now:number){
  const end=task.ends_at??task.due_at+DEFAULT_LENGTH;
  if(now>=end)return {label:'ENCERRADO',live:false,past:true};
  if(now>=task.due_at)return {label:'AGORA',live:true,past:false};
  const minutes=Math.ceil((task.due_at-now)/60000);
  if(minutes<60)return {label:`EM ${minutes} MIN`,live:false,past:false};
  const startDay=new Date(task.due_at);startDay.setHours(0,0,0,0);
  const today=new Date(now);today.setHours(0,0,0,0);
  const days=Math.round((startDay.getTime()-today.getTime())/86400000);
  if(days===0)return {label:`EM ${Math.round(minutes/60)}H`,live:false,past:false};
  if(days===1)return {label:'AMANHÃ',live:false,past:false};
  return {label:`EM ${days} DIAS`,live:false,past:false};
}
export function alertsLabel(task:Pick<Task,'alert_offsets'>){
  const offsets=eventOffsets(task);
  if(!offsets.length)return 'Sem aviso';
  return offsets.map(m=>eventAlertOptions.find(o=>o.minutes===m)?.label??`${m} min`).join(' · ');
}

/**
 * Evento: sem caixa de concluir e sem risco. Horário à esquerda com a barra azul (o único
 * sinal de "evento"), local/assunto/aviso numa linha só embaixo do título. O selo só aparece
 * quando é urgente (AGORA ou faltando menos de 1h); a data já vem no título da seção.
 */
export function EventCard({task,now,colors:c,appearance,onPress,onLongPress}:{task:Task;now:number;colors:ThemeColors;appearance:Appearance;onPress?:()=>void;onLongPress?:()=>void}){
  const status=eventStatus(task,now);
  const urgent=status.live||(!status.past&&task.due_at-now<3600000);
  const topic=categoryColors[appearance][task.category]??categoryColors[appearance].general;
  const offsets=eventOffsets(task);
  const meta=[task.location?.trim(),offsets.length?'aviso '+alertsLabel(task):null].filter(Boolean).join(' · ');
  return <Pressable accessibilityRole="button" accessibilityLabel={`Evento ${task.title}, ${hhmm(task.due_at)}, ${status.label.toLowerCase()}`} onPress={onPress} onLongPress={onLongPress}
    style={[styles.row,{opacity:status.past?0.5:1}]}>
    <View style={styles.time}>
      <Text style={[styles.start,{color:c.text}]}>{hhmm(task.due_at)}</Text>
      {task.ends_at?<Text style={[styles.end,{color:c.muted}]}>{hhmm(task.ends_at)}</Text>:null}
    </View>
    <View style={[styles.bar,{backgroundColor:c.event}]}/>
    <View style={{flex:1,minWidth:0,gap:4}}>
      <Text numberOfLines={2} style={[styles.title,{color:c.text}]}>{task.title}</Text>
      {meta||task.category!=='general'?<Text numberOfLines={1} style={[styles.meta,{color:c.muted}]}>
        {task.category!=='general'?<Text style={{color:topic.text,fontWeight:'700'}}>{categories[task.category]}{meta?' · ':''}</Text>:null}{meta}
      </Text>:null}
    </View>
    {urgent?<View style={[styles.badge,status.live?{backgroundColor:c.event}:{borderWidth:1,borderColor:c.event}]}>
      <Text style={[styles.badgeText,{color:status.live?c.background:c.event}]}>{status.label}</Text>
    </View>:null}
  </Pressable>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',alignItems:'center',gap:11,paddingVertical:13},
  time:{width:46,alignItems:'flex-start'},
  start:{fontSize:15,fontWeight:'800',letterSpacing:-0.3},
  end:{fontSize:12,fontWeight:'600',marginTop:3},
  bar:{width:3,alignSelf:'stretch',borderRadius:2},
  title:{fontSize:17,fontWeight:'700',letterSpacing:-0.3},
  meta:{fontSize:12},
  badge:{borderRadius:5,paddingHorizontal:7,paddingVertical:4},
  badgeText:{fontSize:10,fontWeight:'900',letterSpacing:0.5},
});
