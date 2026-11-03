import React,{useCallback,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,AppState,StatusBar,Dimensions} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Task,listTasks,completeTask,deleteTask} from '../src/store';
import {categories} from '../src/templates';
import {theme as c} from '../src/theme';
import {PingDialog} from '../src/components/PingDialog';
import {SettingsScreen} from '../src/components/SettingsScreen';

type Tab='home'|'tasks'|'alerts'|'settings';
const priorityLabel={low:'BAIXA',medium:'MÉDIA',high:'ALTA'};
const formatDate=(timestamp:number)=>new Date(timestamp).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const greetings=['SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO','DOMINGO'];
export default function Home(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [tab,setTab]=useState<Tab>('home');
  const pager=useRef<ScrollView>(null);
  const verticalOffsets=useRef<Record<Tab,number>>({home:0,tasks:0,alerts:0,settings:0});
  const [headerShift,setHeaderShift]=useState(0);
  const syncHeader=(x:number)=>{
    const position=Math.max(0,Math.min(3,x/pageWidth));
    const left=Math.floor(position),right=Math.min(3,left+1),fraction=position-left;
    const offsets=verticalOffsets.current;
    const distance=offsets[tabs[left]]*(1-fraction)+offsets[tabs[right]]*fraction;
    setHeaderShift(Math.min(71,Math.max(0,distance)));
  };
  const [pageWidth,setPageWidth]=useState(Dimensions.get('window').width);
  const tabs:Tab[]=['home','tasks','alerts','settings'];
  const goToTab=(next:Tab)=>{setTab(next);pager.current?.scrollTo({x:tabs.indexOf(next)*pageWidth,animated:true});};
  const [now,setNow]=useState(Date.now());
  const [deleteTarget,setDeleteTarget]=useState<Task|null>(null);
  const [busyDelete,setBusyDelete]=useState(false);
  const [feedback,setFeedback]=useState<{title:string;message:string}|null>(null);
  const router=useRouter();
  const insets=useSafeAreaInsets();
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
    try{await completeTask(t.id,!t.completed);await refresh();}
    catch(e){setFeedback({title:'Não deu certo.',message:String(e)});}
  }
  function remove(t:Task){setDeleteTarget(t);}
  async function confirmDelete(){
    if(!deleteTarget||busyDelete)return;
    setBusyDelete(true);
    try{await deleteTask(deleteTarget.id);setDeleteTarget(null);await refresh();}
    catch(e){setDeleteTarget(null);setFeedback({title:'Não foi possível excluir.',message:String(e)});}
    finally{setBusyDelete(false);}
  }
  function card(t:Task){
    const late=!t.completed&&t.due_at<now;
    return <Pressable key={t.id} style={s.task} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={t.completed?'Marcar como pendente':'Concluir tarefa'} accessibilityState={{checked:!!t.completed}} onPress={()=>toggle(t)} style={[s.check,t.completed&&s.checked]}>
        <Text style={s.checkText}>{t.completed?'✓':''}</Text>
      </Pressable>
      <View style={{flex:1,gap:7}}>
        <Text style={[s.taskTitle,t.completed&&s.completed]}>{t.title}</Text>
        <Text style={s.meta}>{categories[t.category]??'Geral'}  /  {formatDate(t.due_at)}</Text>
      </View>
      <View style={s.priorityWrap}>
        {late?<Text style={s.late}>ATRASOU</Text>:<Text style={s.priority}>{priorityLabel[t.priority]}</Text>}
        <View style={[s.priorityLine,{backgroundColor:({low:'#77CDA3',medium:'#F7C66F',high:'#FF887B'} as const)[t.priority]}]}/>
      </View>
    </Pressable>;
  }
  const empty=(message:string)=><Text style={s.empty}>{message}</Text>;
  return <View style={s.root}>
    <PingDialog visible={!!deleteTarget} eyebrow="PING / EXCLUSÃO" title="Vai apagar mesmo?" message={deleteTarget?`“${deleteTarget.title}” será excluída de vez. Essa ação não pode ser desfeita.`:undefined} confirmLabel="EXCLUIR" cancelLabel="MANTER" destructive busy={busyDelete} onClose={()=>{if(!busyDelete)setDeleteTarget(null);}} onConfirm={confirmDelete}/>
    <PingDialog visible={!!feedback} eyebrow="PING / OPS" title={feedback?.title??''} message={feedback?.message} confirmLabel="FECHAR" onClose={()=>setFeedback(null)} onConfirm={()=>setFeedback(null)}/>
    <StatusBar barStyle="light-content"/>
    <ScrollView ref={pager} horizontal pagingEnabled directionalLockEnabled showsHorizontalScrollIndicator={false}
      style={{flex:1}} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
      onScroll={event=>syncHeader(event.nativeEvent.contentOffset.x)}
      onLayout={event=>{const width=event.nativeEvent.layout.width;if(width>0&&width!==pageWidth){setPageWidth(width);pager.current?.scrollTo({x:tabs.indexOf(tab)*width,animated:false});}}}
      onMomentumScrollEnd={event=>{const index=Math.max(0,Math.min(tabs.length-1,Math.round(event.nativeEvent.contentOffset.x/pageWidth)));setTab(tabs[index]);}}
    >
      {tabs.map(page=><ScrollView key={page} style={{width:pageWidth}} contentContainerStyle={[s.container,{paddingTop:insets.top+89}]} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
        onScroll={event=>{verticalOffsets.current[page]=event.nativeEvent.contentOffset.y;if(page===tab)setHeaderShift(Math.min(71,Math.max(0,event.nativeEvent.contentOffset.y)));}}>

      {page==='settings'?<SettingsScreen onDataDeleted={()=>refresh().catch(console.warn)}/>:<>
      <Text style={s.eyebrow}>{greetings[(new Date(now).getDay()+6)%7]}  /  {new Date(now).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}).toUpperCase()}</Text>
      <Text style={s.heading}>{page==='home'?'Seu dia.\nSem desculpas.':page==='tasks'?'Tudo na\nmesma lista.':'Olha o que\nficou pra trás.'}</Text>
      {page==='home'?<>
        <View style={s.hero}>
          <Text style={s.heroLabel}>O RESUMO DA ÓPERA</Text>
          <View style={s.heroNumbers}><Text style={s.heroNumber}>{pending.length.toString().padStart(2,'0')}</Text><View style={s.heroSide}><Text style={s.heroSideBig}>{overdue.length} atrasadas</Text><Text style={s.heroSideSmall}>{today.length} pra hoje</Text></View></View>
          <Text style={s.heroFooter}>{pending.length===0?'Tudo resolvido. Aproveita esse raro momento.':overdue.length?'Tem coisa te esperando. Você sabe o que fazer.':'Por enquanto, tudo sob controle.'}</Text>
        </View>
        <View style={s.sectionHead}><Text style={s.section}>PASSOU DA HORA</Text><Text style={s.sectionCount}>{String(overdue.length).padStart(2,'0')}</Text></View>
        {overdue.length?overdue.map(card):empty('Nada atrasado. Pode comemorar sem exagerar.')}
        <View style={s.sectionHead}><Text style={s.section}>NO RADAR</Text><Text style={s.sectionCount}>{String(upcoming.length).padStart(2,'0')}</Text></View>
        {upcoming.length?upcoming.slice(0,8).map(card):empty('Nenhuma tarefa futura. Que paz suspeita.')}
      </>:<>
        <View style={s.sectionHead}><Text style={s.section}>{page==='tasks'?'TODAS AS TAREFAS':'PENDÊNCIAS ATRASADAS'}</Text><Text style={s.sectionCount}>{String(page==='tasks'?tasks.length:overdue.length).padStart(2,'0')}</Text></View>
        {page==='tasks'?(tasks.length?tasks.map(card):empty('Ainda não tem nada aqui. Crie sua primeira tarefa.')):(overdue.length?overdue.map(card):empty('Tudo em dia. Assim que a gente gosta.'))}
      </>}
      <Text style={s.tip}>TOQUE PARA EDITAR  ·  SEGURE PARA EXCLUIR</Text>
      </>}
      </ScrollView>)}
    </ScrollView>
    <View pointerEvents="none" style={[s.sharedBrand,{top:insets.top+18-headerShift}]}>
      <View style={s.brand}><View style={s.brandMark}><Text style={s.brandMarkText}>!</Text></View><Text style={s.brandName}>ping<Text style={{color:c.accent}}>.</Text></Text><Text style={s.brandCaption}>FAÇA ACONTECER</Text></View>
    </View>
    {tab!=='settings'&&<Pressable accessibilityLabel="Criar tarefa" style={[s.add,{bottom:91+insets.bottom}]} onPress={()=>router.push('/edit')}><Text style={s.plus}>+</Text></Pressable>}
    <View style={[s.nav,{paddingBottom:insets.bottom,height:75+insets.bottom}]}>{(['home','tasks','alerts','settings'] as const).map((key,i)=><Pressable key={key} style={[s.navItem,tab===key&&s.navSelected]} onPress={()=>goToTab(key)}>
      <Text style={[s.navText,tab===key&&s.navActive]}>{['HOJE','TAREFAS','ATRASOS','AJUSTES'][i]}</Text>
      {tab===key?<View style={s.dot}/>:null}
    </Pressable>)}</View>
  </View>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.background},container:{paddingHorizontal:23,paddingTop:18,paddingBottom:140},
  sharedBrand:{position:'absolute',left:23,right:23,zIndex:2},
  brand:{flexDirection:'row',alignItems:'center',marginBottom:43,gap:9},brandMark:{width:28,height:28,borderRadius:7,backgroundColor:c.accent,alignItems:'center',justifyContent:'center',transform:[{rotate:'-9deg'}]},
  brandMarkText:{fontSize:21,fontWeight:'900',color:c.background},brandName:{color:c.text,fontSize:25,fontWeight:'900',letterSpacing:-1.5},
  brandCaption:{color:c.muted,fontSize:9,fontWeight:'800',letterSpacing:1.3,marginLeft:'auto'},
  eyebrow:{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:2.5,marginBottom:13},
  heading:{color:c.text,fontSize:40,fontWeight:'900',lineHeight:43,letterSpacing:-2,marginBottom:22},
  hero:{backgroundColor:c.accent,borderRadius:8,padding:23,marginBottom:33,transform:[{rotate:'-1deg'}]},
  heroLabel:{color:c.background,fontWeight:'900',letterSpacing:2,fontSize:10},
  heroNumbers:{flexDirection:'row',alignItems:'center',gap:20,marginTop:6},
  heroNumber:{color:c.background,fontSize:89,fontWeight:'900',letterSpacing:-7},
  heroSide:{gap:7},heroSideBig:{color:c.background,fontWeight:'900',fontSize:17},heroSideSmall:{color:c.background,fontWeight:'600',fontSize:14},
  heroFooter:{color:c.background,fontWeight:'700',fontSize:12,marginTop:5,lineHeight:19},
  sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:c.border,paddingBottom:12,marginTop:12,marginBottom:5},
  section:{color:c.text,fontSize:12,fontWeight:'900',letterSpacing:1.5},sectionCount:{color:c.accent,fontSize:14,fontWeight:'900'},
  task:{paddingVertical:19,flexDirection:'row',alignItems:'center',gap:14,borderBottomWidth:1,borderBottomColor:c.border},
  check:{width:27,height:27,borderRadius:6,borderWidth:2,borderColor:c.muted,alignItems:'center',justifyContent:'center'},
  checked:{backgroundColor:c.accent,borderColor:c.accent},checkText:{color:c.background,fontWeight:'900',fontSize:16},
  taskTitle:{color:c.text,fontSize:17,fontWeight:'700',letterSpacing:-0.3},completed:{textDecorationLine:'line-through',color:c.muted},
  meta:{color:c.muted,fontSize:11},late:{color:c.danger,fontSize:10,fontWeight:'900',letterSpacing:0.8},
  priority:{color:c.muted,fontSize:9,fontWeight:'800'},
  priorityWrap:{alignItems:'center',justifyContent:'center',gap:6},
  priorityLine:{width:28,height:3,borderRadius:3},empty:{color:c.muted,paddingVertical:23,fontSize:13,lineHeight:20},
  tip:{color:c.muted,fontSize:9,letterSpacing:1.1,marginTop:35,textAlign:'center'},
  add:{position:'absolute',bottom:91,right:23,backgroundColor:c.accent,height:61,width:61,borderRadius:12,alignItems:'center',justifyContent:'center',elevation:7},
  plus:{color:c.background,fontSize:38,fontWeight:'500',lineHeight:47},
  nav:{height:75,backgroundColor:c.surface,flexDirection:'row',borderTopWidth:1,borderTopColor:c.border,paddingHorizontal:12},
  navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:7},navSelected:{},navText:{color:c.muted,fontSize:10,fontWeight:'900',letterSpacing:1.4},
  navActive:{color:c.accent},dot:{width:16,height:3,borderRadius:3,backgroundColor:c.accent},
});
