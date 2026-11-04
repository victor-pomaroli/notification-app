import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,Pressable,ActivityIndicator} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {CalendarDaySummary,CalendarEntry,listCalendarDay,listCalendarMonth,completeTask} from '../store';
import {useAppTheme} from '../theme';

const key=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const bounds=(d:Date)=>{const start=new Date(d.getFullYear(),d.getMonth(),d.getDate());const end=new Date(start);end.setDate(end.getDate()+1);return [start.getTime(),end.getTime()] as const;};
export function CalendarScreen({active}:{active:boolean}){
 const {colors:c}=useAppTheme();const router=useRouter();
 const [selected,setSelected]=useState(()=>new Date());const [revision,setRevision]=useState(0);
 const [summaries,setSummaries]=useState<CalendarDaySummary[]>([]);
 const [entries,setEntries]=useState<CalendarEntry[]>([]);
 const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 const monthCache=useRef(new Map<string,CalendarDaySummary[]>());
 const dayCache=useRef(new Map<string,CalendarEntry[]>());
 const monthRequest=useRef(0),dayRequest=useRef(0);
 const monthId=`${selected.getFullYear()}-${selected.getMonth()}`;
 const dayId=key(selected);
 const monthStart=useMemo(()=>new Date(selected.getFullYear(),selected.getMonth(),1),[monthId]);
 const monthEnd=useMemo(()=>new Date(selected.getFullYear(),selected.getMonth()+1,1),[monthId]);
 const invalidate=useCallback(()=>{monthCache.current.clear();dayCache.current.clear();setRevision(x=>x+1);},[]);
 useFocusEffect(useCallback(()=>{if(active)invalidate();},[active,invalidate]));
 useEffect(()=>{
  if(!active)return;
  let alive=true;const request=++monthRequest.current;const cached=monthCache.current.get(monthId);
  if(cached){setSummaries(cached);return;}
  setSummaries([]);
  listCalendarMonth(monthStart.getTime(),monthEnd.getTime()).then(rows=>{
   if(!alive||request!==monthRequest.current)return;
   monthCache.current.set(monthId,rows);
   if(monthCache.current.size>3)monthCache.current.delete(monthCache.current.keys().next().value!);
   setSummaries(rows);
  }).catch(e=>{if(alive)setError(String(e));});
  return()=>{alive=false;};
 },[active,monthId,revision]);
 useEffect(()=>{
  if(!active)return;
  let alive=true;const request=++dayRequest.current;const cached=dayCache.current.get(dayId);
  if(cached){setEntries(cached);setLoading(false);return;}
  setEntries([]);setLoading(true);
  const [start,end]=bounds(selected);
  listCalendarDay(start,end).then(rows=>{
   if(!alive||request!==dayRequest.current)return;
   dayCache.current.set(dayId,rows);
   if(dayCache.current.size>10)dayCache.current.delete(dayCache.current.keys().next().value!);
   setEntries(rows);
  }).catch(e=>{if(alive)setError(String(e));}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[active,dayId,revision]);
 const changeMonth=(step:number)=>setSelected(d=>new Date(d.getFullYear(),d.getMonth()+step,1));
 const today=new Date();
 const first=monthStart.getDay(),count=new Date(selected.getFullYear(),selected.getMonth()+1,0).getDate();
 const cells=Array.from({length:Math.ceil((first+count)/7)*7},(_,i)=>i-first+1);
 const summary=new Map(summaries.map(x=>[x.day,x]));
 async function toggle(entry:CalendarEntry){
  if(entry.routine&&dayId!==key(new Date()))return;
  try{await completeTask(entry.task.id,!entry.completed);invalidate();}catch(e){setError(String(e));}
 }
 return <View style={{paddingHorizontal:0,paddingTop:0,paddingBottom:24}}> 
  <Text style={{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:2,marginBottom:12}}>PING / CALENDÁRIO</Text>
  <Text style={{color:c.text,fontSize:37,fontWeight:'900',lineHeight:43,marginBottom:24}}>Seu tempo.\nSeu ritmo.</Text>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
   <Pressable accessibilityLabel="Mês anterior" onPress={()=>changeMonth(-1)} style={{padding:12}}><Text style={{color:c.accent,fontSize:26}}>‹</Text></Pressable>
   <Text style={{color:c.text,fontWeight:'900',fontSize:16,textTransform:'capitalize'}}>{monthStart.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</Text>
   <Pressable accessibilityLabel="Próximo mês" onPress={()=>changeMonth(1)} style={{padding:12}}><Text style={{color:c.accent,fontSize:26}}>›</Text></Pressable>
  </View>
  <Pressable onPress={()=>setSelected(new Date())} style={{alignSelf:'flex-end',marginBottom:12}}><Text style={{color:c.accent,fontWeight:'800',fontSize:11}}>VOLTAR PARA HOJE</Text></Pressable>
  <View style={{flexDirection:'row',flexWrap:'wrap',backgroundColor:c.surface,borderRadius:12,paddingVertical:12,paddingHorizontal:4}}>
   {['D','S','T','Q','Q','S','S'].map((label,i)=><View key={'w'+i} style={{width:'14.2857%',alignItems:'center',paddingVertical:8}}><Text style={{color:c.muted,fontWeight:'800',fontSize:11}}>{label}</Text></View>)}
   {cells.map((d,i)=>{const valid=d>0&&d<=count;const date=new Date(selected.getFullYear(),selected.getMonth(),d);const k=key(date);const selectedDay=valid&&k===dayId;const isToday=valid&&k===key(today);const n=summary.get(k)?.total??0;return <Pressable key={i} disabled={!valid} accessibilityLabel={valid?`${d} de ${monthStart.toLocaleDateString('pt-BR',{month:'long'})}, ${n} tarefas`:undefined} onPress={()=>setSelected(date)} style={{width:'14.2857%',height:49,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:selectedDay?c.accentSoft:'transparent',borderWidth:selectedDay?1:0,borderColor:c.accent}}>
    <Text style={{color:selectedDay?c.accent:isToday?c.accent:c.text,fontWeight:selectedDay||isToday?'900':'500',fontSize:14}}>{valid?d:''}</Text>
    {valid&&n>0?<View style={{width:5,height:5,borderRadius:3,backgroundColor:c.accent,marginTop:3}}/>:<View style={{height:8}}/>}
   </Pressable>;})}
  </View>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:26,marginBottom:15}}>
   <View style={{flex:1}}><Text style={{color:c.text,fontSize:18,fontWeight:'900',textTransform:'capitalize'}}>{selected.toLocaleDateString('pt-BR',{day:'numeric',month:'long'})}</Text><Text style={{color:c.muted,fontSize:12,marginTop:4}}>{entries.length} tarefa(s)</Text></View>
   <Pressable onPress={()=>router.push({pathname:'/edit',params:{date:dayId}})} style={{backgroundColor:c.accent,paddingVertical:12,paddingHorizontal:15,borderRadius:9}}><Text style={{color:c.background,fontWeight:'900'}}>+ NOVA</Text></Pressable>
  </View>
  {error?<Text style={{color:c.danger,marginBottom:12}}>{error}</Text>:null}
  {loading?<ActivityIndicator color={c.accent}/>:entries.length===0?<Text style={{color:c.muted,paddingVertical:20}}>Nada marcado por aqui. Quer colocar algo no radar?</Text>:entries.map(entry=><Pressable key={entry.task.id} onPress={()=>router.push({pathname:'/edit',params:{id:String(entry.task.id)}})} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:17,borderBottomWidth:1,borderBottomColor:c.border}}>
   <Pressable accessibilityRole="checkbox" accessibilityState={{checked:entry.completed}} onPress={()=>toggle(entry)} style={{width:25,height:25,borderWidth:2,borderColor:c.accent,borderRadius:6,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.accent}}>{entry.completed?'✓':''}</Text></Pressable>
   <View style={{flex:1}}><Text style={{color:entry.completed?c.muted:c.text,fontSize:15,fontWeight:'700'}}>{entry.task.title}</Text><Text style={{color:c.muted,fontSize:11,marginTop:5}}>{new Date(entry.task.due_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}{entry.routine?' · ROTINA DIÁRIA':''}</Text></View>
  </Pressable>)}
 </View>;
}
