import React,{useCallback,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,Alert,AppState} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Task,listTasks,completeTask,deleteTask} from '../src/store';
import {categories} from '../src/templates';

import {theme as c} from '../src/theme';
type Tab='home'|'tasks'|'alerts';
const priorityLabel={low:'Baixa',medium:'Média',high:'Alta'};
const formatDate=(timestamp:number)=>new Date(timestamp).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
export default function Home(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [tab,setTab]=useState<Tab>('home');
  const [now,setNow]=useState(Date.now());
  const router=useRouter();
  const refresh=useCallback(async()=>{setTasks(await listTasks());setNow(Date.now());},[]);
  useFocusEffect(useCallback(()=>{
    refresh().catch(console.warn);
    const sub=AppState.addEventListener('change',state=>{if(state==='active')refresh().catch(console.warn);});
    const interval=setInterval(()=>setNow(Date.now()),30000);
    return ()=>{sub.remove();clearInterval(interval);};
  },[refresh]));
  const pending=tasks.filter(t=>!t.completed);
  const overdue=pending.filter(t=>t.due_at<now);
  const upcoming=pending.filter(t=>t.due_at>=now);
  const today=pending.filter(t=>new Date(t.due_at).toDateString()===new Date(now).toDateString());
  async function toggle(t:Task){
    try{
      await completeTask(t.id,!t.completed);
      await refresh();
    }catch(e){Alert.alert('Erro ao atualizar',String(e));}
  }
  function remove(t:Task){
    Alert.alert('Excluir tarefa?',t.title,[{text:'Cancelar',style:'cancel'},{text:'Excluir',style:'destructive',onPress:async()=>{
      try{await deleteTask(t.id);await refresh();}
      catch(e){Alert.alert('Erro ao excluir',String(e));}
    }}]);
  }
  function card(t:Task){
    const late=!t.completed&&t.due_at<now;
    return <Pressable key={t.id} style={s.card} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:!!t.completed}} onPress={()=>toggle(t)} style={[s.check,t.completed&&s.checked]}>
        <Text style={s.checkText}>{t.completed?'✓':''}</Text>
      </Pressable>
      <View style={{flex:1,gap:5}}><Text style={[s.taskTitle,t.completed&&s.completed]}>{t.title}</Text>
        <Text style={s.muted}>{formatDate(t.due_at)} · {categories[t.category]??'Geral'} · {priorityLabel[t.priority]}</Text>
      </View>
      {late?<Text style={s.late}>Atrasada</Text>:null}
    </Pressable>;
  }
  const empty=(message:string)=><Text style={s.empty}>{message}</Text>;
  return <View style={s.root}>
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.eyebrow}>ORGANIZE SEU DIA</Text>
      <Text style={s.heading}>{tab==='home'?'Seu dia':tab==='tasks'?'Todas as tarefas':'Alertas'}</Text>
      {tab==='home'?<>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNumber}>{today.length}</Text><Text style={s.statLabel}>Hoje</Text></View>
          <View style={s.stat}><Text style={[s.statNumber,{color:c.danger}]}>{overdue.length}</Text><Text style={s.statLabel}>Atrasadas</Text></View>
          <View style={s.stat}><Text style={s.statNumber}>{pending.length}</Text><Text style={s.statLabel}>Pendentes</Text></View>
        </View>
        <Text style={s.section}>Precisam de atenção</Text>
        {overdue.length?overdue.map(card):empty('Nenhuma tarefa atrasada. Tudo em dia!')}
        <Text style={s.section}>Próximas tarefas</Text>
        {upcoming.length?upcoming.slice(0,8).map(card):empty('Nenhuma tarefa futura cadastrada.')}
      </>:tab==='tasks'?<>
        <Text style={s.description}>Toque para editar · segure para excluir</Text>
        {tasks.length?tasks.map(card):empty('Você ainda não cadastrou tarefas.')}
      </>:<>
        <Text style={s.description}>Tarefas com prazo expirado e ainda não concluídas.</Text>
        {overdue.length?overdue.map(card):empty('Nenhum alerta pendente.')}
      </>}
    </ScrollView>
    <Pressable accessibilityLabel="Criar tarefa" style={s.add} onPress={()=>router.push('/edit')}><Text style={s.plus}>+</Text></Pressable>
    <View style={s.nav}>{(['home','tasks','alerts'] as const).map((key,i)=><Pressable key={key} style={s.navItem} onPress={()=>setTab(key)}>
      <Text style={[s.navText,tab===key&&s.navActive]}>{['Início','Tarefas','Alertas'][i]}</Text>
      {tab===key?<View style={s.dot}/>:null}
    </Pressable>)}</View>
  </View>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.background},container:{padding:20,paddingBottom:120},
  eyebrow:{color:c.accent,fontSize:11,fontWeight:'800',letterSpacing:2,marginTop:10},
  heading:{color:c.text,fontSize:32,fontWeight:'800',marginTop:6,marginBottom:24},
  stats:{flexDirection:'row',gap:10,marginBottom:20},stat:{flex:1,backgroundColor:c.surface,padding:14,borderRadius:18,borderWidth:1,borderColor:c.border},
  statNumber:{color:c.text,fontSize:27,fontWeight:'800'},statLabel:{color:c.muted,fontSize:12,marginTop:5},
  section:{color:c.text,fontSize:18,fontWeight:'700',marginTop:18,marginBottom:12},
  card:{backgroundColor:c.surface,padding:15,borderRadius:16,marginBottom:10,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:c.border},
  check:{width:28,height:28,borderRadius:9,borderWidth:2,borderColor:c.accent,alignItems:'center',justifyContent:'center'},
  checked:{backgroundColor:c.success,borderColor:c.success},checkText:{color:c.background,fontWeight:'900',fontSize:17},
  taskTitle:{color:c.text,fontSize:15,fontWeight:'700'},completed:{textDecorationLine:'line-through',color:c.muted},
  muted:{color:c.muted,fontSize:12},late:{color:c.danger,fontSize:11,fontWeight:'800'},
  empty:{color:c.muted,backgroundColor:c.surface,padding:18,borderRadius:14,overflow:'hidden'},
  description:{color:c.muted,marginBottom:16,fontSize:13},
  add:{position:'absolute',bottom:87,right:20,backgroundColor:c.accent,height:58,width:58,borderRadius:19,alignItems:'center',justifyContent:'center',elevation:6},
  plus:{color:c.background,fontSize:32,fontWeight:'500',lineHeight:39},
  nav:{height:72,backgroundColor:c.surface,flexDirection:'row',borderTopWidth:1,borderTopColor:c.border},
  navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:7},navText:{color:c.muted,fontSize:13,fontWeight:'700'},
  navActive:{color:c.accent},dot:{width:5,height:5,borderRadius:3,backgroundColor:c.accent},
});