import React,{useCallback,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,AppState,StatusBar,Dimensions,Animated,TextStyle} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {localDay,Task,listTasks,listTaskPage,archiveOldCompletedTasks,completeTask,deleteTask} from '../src/store';
import {categories,TaskCategory} from '../src/templates';
import {useAppTheme,ThemeColors,categoryColors,priorityColors} from '../src/theme';
import {PingDialog} from '../src/components/PingDialog';
import {CalendarScreen} from '../src/components/CalendarScreen';
import {SummaryNote} from '../src/components/SummaryNote';
import {TaskTitle} from '../src/components/TaskTitle';
import {sortTasks,sectionTasks} from '../src/task-order';
import {EventCard} from '../src/components/EventCard';

type Tab='home'|'tasks'|'calendar';
const priorityLabel={low:'BAIXA',medium:'MÉDIA',high:'ALTA'};
const formatDate=(timestamp:number)=>new Date(timestamp).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const greetings=['SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO','DOMINGO'];
export default function Home(){
  const {colors:c,appearance}=useAppTheme();
  const s=React.useMemo(()=>createStyles(c),[c]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [loadingPage,setLoadingPage]=useState(false);
  const [tab,setTab]=useState<Tab>('home');
  // 'event' = só eventos; as outras chaves filtram por assunto.
  const [taskCategoryFilter,setTaskCategoryFilter]=useState<'all'|'event'|TaskCategory>('all');
  const [visibleTaskCount,setVisibleTaskCount]=useState(50);
  const pager=useRef<React.ElementRef<typeof Animated.ScrollView>>(null);
  const horizontalX=useRef(new Animated.Value(0)).current;
  const verticalY=useRef({home:new Animated.Value(0),tasks:new Animated.Value(0),calendar:new Animated.Value(0)}).current;
  const [pageWidth,setPageWidth]=useState(Dimensions.get('window').width);
  // Enquanto o dedo está na faixa de filtros, o swipe entre abas fica travado.
  const [filtersTouched,setFiltersTouched]=useState(false);
  const tabs:Tab[]=['home','tasks','calendar'];
  // Dia escolhido no calendário; o botão + cria a tarefa nele quando a aba Calendário está na tela.
  const [calendarDay,setCalendarDay]=useState(()=>new Date());
  // Página real do pager (atualizada a cada frame de rolagem). `tab` só muda no fim do gesto,
  // então o + consulta isto para não criar no calendário estando em Tarefas, ou o contrário.
  const pageRef=useRef(0),pageWidthRef=useRef(Dimensions.get('window').width);
  const opening=useRef(false);
  const goToTab=(next:Tab)=>{setTab(next);pageRef.current=tabs.indexOf(next);pager.current?.scrollTo({x:tabs.indexOf(next)*pageWidth,animated:true});};
  const [now,setNow]=useState(Date.now());
  const [deleteTarget,setDeleteTarget]=useState<Task|null>(null);
  const [busyDelete,setBusyDelete]=useState(false);
  const [feedback,setFeedback]=useState<{title:string;message:string}|null>(null);
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const refresh=useCallback(async()=>{await archiveOldCompletedTasks();const all=await listTasks();setTasks(all);setVisibleTaskCount(50);setNow(Date.now());},[]);
  useFocusEffect(useCallback(()=>{
    opening.current=false;
    refresh().catch(console.warn);
    const sub=AppState.addEventListener('change',state=>{if(state==='active')refresh().catch(console.warn);});
    const interval=setInterval(()=>setNow(Date.now()),30000);
    return ()=>{sub.remove();clearInterval(interval);};
  },[refresh]));
  function openCreate(){
    // Um toque só: evita abrir duas telas de criação com toque duplo.
    if(opening.current)return;
    opening.current=true;
    if(tabs[pageRef.current]==='calendar')router.push({pathname:'/edit',params:{date:localDay(calendarDay)}});
    // Com o filtro "Eventos" ativo em Tarefas, o + já abre o editor em modo evento.
    else if(tabs[pageRef.current]==='tasks'&&taskCategoryFilter==='event')router.push({pathname:'/edit',params:{kind:'event'}});
    else router.push('/edit');
  }
  const filteredTasks=tasks.filter(t=>!t.parent_id&&(taskCategoryFilter==='all'||(taskCategoryFilter==='event'?t.kind==='event':t.category===taskCategoryFilter)));
  const pageArgs=():[TaskCategory|undefined,'event'|undefined]=>taskCategoryFilter==='all'?[undefined,undefined]:taskCategoryFilter==='event'?[undefined,'event']:[taskCategoryFilter,undefined];
  const [filteredPage,setFilteredPage]=useState<Task[]>([]);
  React.useEffect(()=>{let active=true;listTaskPage(50,0,...pageArgs()).then(rows=>{if(active){setFilteredPage(rows);setVisibleTaskCount(50);}}).catch(console.warn);return()=>{active=false;};},[taskCategoryFilter,tasks]);
  async function loadMoreTasks(){if(loadingPage)return;setLoadingPage(true);try{const rows=await listTaskPage(50,filteredPage.filter(t=>!t.parent_id).length,...pageArgs());setFilteredPage(old=>[...old,...rows]);setVisibleTaskCount(n=>n+rows.filter(t=>!t.parent_id).length);}catch(e){setFeedback({title:'Erro ao carregar tarefas',message:String(e)});}finally{setLoadingPage(false);}}
  // Eventos não entram nas contas de pendentes/atrasadas: ficam na AGENDA.
  const roots=tasks.filter(t=>!t.parent_id&&t.kind!=='event');
  const pending=roots.filter(t=>!t.completed);
  // Tarefas sem data nunca ficam atrasadas nem contam como "pra hoje"; aparecem no radar.
  const overdue=pending.filter(t=>!t.daily&&!t.no_due&&t.due_at<now).sort((a,b)=>a.due_at-b.due_at||a.id-b.id);
  // Radar = o que ainda vem hoje: rotinas, tarefas sem data e as que vencem mais tarde hoje.
  // Tarefas de outros dias ficam em Tarefas e no Calendário.
  const isToday=(ms:number)=>new Date(ms).toDateString()===new Date(now).toDateString();
  const upcoming=sortTasks(pending.filter(t=>t.daily||t.no_due||(t.due_at>=now&&isToday(t.due_at))));
  const agenda=tasks.filter(t=>!t.parent_id&&t.kind==='event'&&isToday(t.due_at)).sort((a,b)=>a.due_at-b.due_at||a.id-b.id);
  const today=pending.filter(t=>t.daily||(!t.no_due&&new Date(t.due_at).toDateString()===new Date(now).toDateString()));
  const todayAhead=today.filter(t=>!overdue.includes(t));
  const completedToday=roots.filter(t=>!!t.completed&&t.completed_at!=null&&new Date(t.completed_at).toDateString()===new Date(now).toDateString())
    .sort((a,b)=>(b.completed_at??0)-(a.completed_at??0));
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
  /** Cartões das tarefas principais na ordem dada, cada uma seguida das suas subtarefas (buscadas em `pool`). */
  function groupedCards(parents:Task[],pool:Task[]=tasks){return parents.filter(t=>!t.parent_id).flatMap(parent=>[card(parent),...pool.filter(child=>child.parent_id===parent.id).map(child=>card(child))]);}
  function card(t:Task){
    if(t.parent_id)return subCard(t);
    if(t.kind==='event')return <EventCard key={t.id} task={t} now={now} colors={c} appearance={appearance} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}/>;
    const late=!t.completed&&!t.daily&&!t.no_due&&t.due_at<now;
    const topic=categoryColors[appearance][t.category]??categoryColors[appearance].general;
    return <Pressable key={t.id} style={[s.task,t.parent_id?{marginLeft:28,paddingLeft:12,borderLeftWidth:2,borderLeftColor:c.accentSoft,backgroundColor:c.surface}:undefined,late?{borderBottomColor:appearance==='dark'?'#A85850':'#CB8A7E'}:undefined]} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}>
      {late?<View pointerEvents="none" style={{position:'absolute',left:-12,right:-12,top:5,bottom:5,backgroundColor:appearance==='dark'?'#34201E':'#F8E2DC',borderRadius:10,borderWidth:1,borderColor:appearance==='dark'?'#77423D':'#E5B0A5'}}/>:null}
      {t.parent_id?<Text style={{color:c.accent,fontSize:17}}>↳</Text>:null}
      <Pressable accessibilityRole="checkbox" accessibilityLabel={t.completed?'Marcar como pendente':'Concluir tarefa'} accessibilityState={{checked:!!t.completed}} onPress={()=>toggle(t)} style={[s.check,late?{borderColor:appearance==='dark'?'#FF887B':'#B83931'}:undefined,!!t.completed?s.checked:undefined]}>
        <Text style={s.checkText}>{t.completed?'✓':''}</Text>
      </Pressable>
      <View style={{flex:1,gap:7}}>
        <TaskTitle key={`${t.id}-${t.completed}`} title={t.title} completed={!!t.completed} colors={c} style={late?{color:appearance==='dark'?'#FFB5A9':'#A82F27',fontWeight:'900'}:undefined}/>
        {t.description?.trim()?<Text style={s.taskDescription} numberOfLines={2}>{t.description.trim()}</Text>:null}
        <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7}}><View style={{backgroundColor:topic.surface,borderRadius:5,paddingHorizontal:8,paddingVertical:4}}><Text style={{color:topic.text,fontSize:10,fontWeight:'800'}}>{categories[t.category]??'Geral'}</Text></View><Text style={s.meta}>{t.daily?(t.no_due?'↻ DIÁRIA':'↻ DIÁRIA · '+new Date(t.due_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})):t.no_due?'Sem data':formatDate(t.due_at)}</Text></View>
      </View>
      <View style={s.priorityWrap}>
        {late?<View style={{backgroundColor:appearance==='dark'?'#FF887B':'#B83931',paddingHorizontal:7,paddingVertical:5,borderRadius:5}}><Text style={{color:appearance==='dark'?'#261412':'#FFFFFF',fontSize:10,fontWeight:'900'}}>⚠ ATRASADA</Text></View>:<Text style={s.priority}>{priorityLabel[t.priority]}</Text>}
        <View style={[s.priorityLine,{backgroundColor:late?(appearance==='dark'?'#FF887B':'#B83931'):priorityColors[t.priority]}]}/>
      </View>
    </Pressable>;
  }
  /**
   * Subtarefa em linha compacta: herda assunto, data e urgência da principal, então
   * mostra só a caixa e o título, recuada e sem fundo próprio (antes ficava espremida).
   */
  function subCard(t:Task){
    return <Pressable key={t.id} style={s.subTask} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={t.completed?'Marcar como pendente':'Concluir tarefa'} accessibilityState={{checked:!!t.completed}} hitSlop={8} onPress={()=>toggle(t)} style={[s.check,s.subCheck,!!t.completed?s.checked:undefined]}>
        <Text style={[s.checkText,{fontSize:13}]}>{t.completed?'✓':''}</Text>
      </Pressable>
      <View style={{flex:1}}>
        <TaskTitle key={`${t.id}-${t.completed}`} title={t.title} completed={!!t.completed} colors={c} style={{fontSize:15,fontWeight:'600'}}/>
      </View>
    </Pressable>;
  }
  const empty=(message:string)=><Text style={s.empty}>{message}</Text>;
  return <View style={s.root}>
    <PingDialog visible={!!deleteTarget} eyebrow="PING / EXCLUSÃO" title="Vai apagar mesmo?" message={deleteTarget?`“${deleteTarget.title}” será excluída de vez. Essa ação não pode ser desfeita.`:undefined} confirmLabel="EXCLUIR" cancelLabel="MANTER" destructive busy={busyDelete} onClose={()=>{if(!busyDelete)setDeleteTarget(null);}} onConfirm={confirmDelete}/>
    <PingDialog visible={!!feedback} eyebrow="PING / OPS" title={feedback?.title??''} message={feedback?.message} confirmLabel="FECHAR" onClose={()=>setFeedback(null)} onConfirm={()=>setFeedback(null)}/>
    <StatusBar barStyle={c.background==='#111310'?"light-content":"dark-content"}/>
    <Animated.ScrollView ref={pager} horizontal pagingEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} scrollEnabled={!filtersTouched}
      style={{flex:1}} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
      onScroll={Animated.event([{nativeEvent:{contentOffset:{x:horizontalX}}}],{useNativeDriver:true,listener:(event:any)=>{const width=pageWidthRef.current;if(width>0)pageRef.current=Math.max(0,Math.min(tabs.length-1,Math.round(event.nativeEvent.contentOffset.x/width)));}})}
      onLayout={event=>{const width=event.nativeEvent.layout.width;if(width>0&&width!==pageWidth){setPageWidth(width);pageWidthRef.current=width;pager.current?.scrollTo({x:tabs.indexOf(tab)*width,animated:false});}}}
      onMomentumScrollEnd={event=>{const index=Math.max(0,Math.min(tabs.length-1,Math.round(event.nativeEvent.contentOffset.x/pageWidth)));pageRef.current=index;setTab(tabs[index]);}}
    >
      {tabs.map((page,index)=><View key={page} style={{width:pageWidth,flex:1}}>
      <Animated.ScrollView style={{flex:1}} contentContainerStyle={[s.container,{paddingTop:insets.top+89}]} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
        onScroll={Animated.event([{nativeEvent:{contentOffset:{y:verticalY[page]}}}],{useNativeDriver:true})}>

      <>
      <Text style={s.eyebrow}>{greetings[(new Date(now).getDay()+6)%7]}  /  {new Date(now).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}).toUpperCase()}</Text>
      {page==='home'?<Text style={s.heading}>{'Seu dia.\nSem desculpas.'}</Text>:page==='calendar'?<Text style={s.heading}>{'Seu tempo.\nSeu ritmo.'}</Text>:null}
      {page==='home'?<>
        <SummaryNote appearance={appearance} page={c.background} left={overdue.length+todayAhead.length} overdue={overdue.length} today={todayAhead.length} done={completedToday.length}/>
        {agenda.length?<>
          <View style={s.sectionHead}><Text style={[s.section,{color:c.event}]}>AGENDA DE HOJE</Text><Text style={[s.sectionCount,{color:c.event}]}>{String(agenda.length).padStart(2,'0')}</Text></View>
          {groupedCards(agenda)}
        </>:null}
        <View style={s.sectionHead}><Text style={s.section}>PASSOU DA HORA</Text><Text style={s.sectionCount}>{String(overdue.length).padStart(2,'0')}</Text></View>
        {overdue.length?groupedCards(overdue):empty('Nada atrasado. Pode comemorar sem exagerar.')}
        <View style={s.sectionHead}><Text style={s.section}>NO RADAR</Text><Text style={s.sectionCount}>{String(upcoming.length).padStart(2,'0')}</Text></View>
        {upcoming.length?groupedCards(upcoming.slice(0,8)):empty('Nada mais pra hoje. Que paz suspeita.')}
        <View style={s.sectionHead}><Text style={s.section}>CONCLUÍDAS HOJE</Text><Text style={s.sectionCount}>{String(completedToday.length).padStart(2,'0')}</Text></View>
        {completedToday.length?groupedCards(completedToday):empty('Nada concluído hoje. Ainda dá tempo.')}
      </>:page==='calendar'?<CalendarScreen active={tab==='calendar'} refreshKey={tasks} selected={calendarDay} onSelect={setCalendarDay}/>:<>
        <View style={s.tasksHead}>
          <Text style={s.section}>TODAS AS TAREFAS</Text>
          <Text style={[s.sectionCount,{marginLeft:9}]}>{String(filteredTasks.length).padStart(2,'0')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir minhas rotinas" hitSlop={10} onPress={()=>router.push('/routines')} style={s.routinesLink}>
            <Text style={s.routinesLinkText}>↻ ROTINAS ›</Text>
          </Pressable>
        </View>
        <View style={s.filters}><ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection:'row',gap:7,paddingVertical:2,paddingRight:4}}
          onTouchStart={()=>setFiltersTouched(true)} onTouchEnd={()=>setFiltersTouched(false)} onTouchCancel={()=>setFiltersTouched(false)} onScrollEndDrag={()=>setFiltersTouched(false)}>{([{key:'all',label:'Todas'},{key:'event',label:'Eventos'},...Object.entries(categories).map(([key,label])=>({key,label}))] as {key:'all'|'event'|TaskCategory;label:string}[]).map(item=>{const active=taskCategoryFilter===item.key;const topic=item.key==='all'?{text:c.accent,surface:c.accentSoft}:item.key==='event'?{text:c.event,surface:c.surfaceRaised}:categoryColors[appearance][item.key];return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>{setTaskCategoryFilter(item.key);setVisibleTaskCount(50);}} style={{paddingHorizontal:13,paddingVertical:8,borderRadius:999,borderWidth:1,borderColor:active?topic.text:c.border,backgroundColor:active?topic.surface:c.surface}}><Text style={{color:active?topic.text:c.text,fontSize:12,fontWeight:'800'}}>{item.label}</Text></Pressable>;})}</ScrollView></View>
        {filteredTasks.length?sectionTasks(filteredPage.filter(t=>!t.parent_id),now).map(section=><React.Fragment key={section.key}>
          <View style={s.sectionHead}><Text style={[s.section,section.key==='overdue'?{color:appearance==='dark'?'#FF887B':'#B83931'}:undefined]}>{section.label}</Text><Text style={s.sectionCount}>{String(section.tasks.length).padStart(2,'0')}</Text></View>
          {groupedCards(section.tasks,filteredPage)}
        </React.Fragment>):empty(taskCategoryFilter==='all'?'Ainda não tem nada aqui. Crie sua primeira tarefa.':taskCategoryFilter==='event'?'Nenhum evento marcado. Toque no + e escolha Evento.':'Nenhuma tarefa neste tópico.')}
      </>}
      {page==='tasks'&&filteredTasks.length>visibleTaskCount?<Pressable accessibilityRole="button" onPress={loadMoreTasks} style={{backgroundColor:c.surface,borderRadius:9,padding:16,alignItems:'center',marginTop:20}}><Text style={{color:c.accent,fontWeight:'800'}}>{loadingPage?'CARREGANDO...':`CARREGAR MAIS (${filteredTasks.length-visibleTaskCount} RESTANTES)`}</Text></Pressable>:null}
      {page!=='calendar'?<Text style={s.tip}>TOQUE PARA EDITAR  ·  SEGURE PARA EXCLUIR</Text>:null}
      </>
      </Animated.ScrollView>
      <Animated.View pointerEvents="box-none" style={[s.sharedBrand,{
        top:insets.top+18,
        transform:[
          {translateX:Animated.subtract(horizontalX,index*pageWidth)},
          {translateY:verticalY[page].interpolate({inputRange:[0,110],outputRange:[0,-110],extrapolate:'clamp'})}
        ],
        opacity:Animated.multiply(
          verticalY[page].interpolate({inputRange:[0,45,75],outputRange:[1,1,0],extrapolate:'clamp'}),
          horizontalX.interpolate({
            inputRange:[(index-1)*pageWidth,index*pageWidth,(index+1)*pageWidth],
            outputRange:[0,1,0],extrapolate:'clamp'
          })
        )
      }]}>
        <View style={s.brand}><View style={s.brandMark}><Text style={s.brandMarkText}>!</Text></View><Text style={s.brandName}>ping<Text style={{color:c.accent}}>.</Text></Text><View style={{flex:1}}/><Pressable accessibilityRole="button" accessibilityLabel="Abrir ajustes" onPress={()=>router.push("/settings")} style={s.settingsButton}><Text style={s.settingsIcon}>⚙</Text></Pressable>
          <View pointerEvents="none" style={s.brandCaptionWrap}><Text style={s.brandCaption}>FAÇA ACONTECER</Text></View>
        </View>
      </Animated.View>
      </View>)}
    </Animated.ScrollView>
    {<Pressable accessibilityLabel={tab==='calendar'?'Criar tarefa em '+calendarDay.toLocaleDateString('pt-BR',{day:'numeric',month:'long'}):'Criar tarefa'} style={[s.add,{bottom:91+insets.bottom}]} onPress={openCreate}><Text style={s.plus}>+</Text></Pressable>}
    <View style={[s.nav,{paddingBottom:insets.bottom,height:75+insets.bottom}]}>{(['home','tasks','calendar'] as const).map((key,i)=><Pressable key={key} style={[s.navItem,tab===key&&s.navSelected]} onPress={()=>goToTab(key)}>
      <Text style={[s.navText,tab===key&&s.navActive]}>{['HOJE','TAREFAS','CALENDÁRIO'][i]}</Text>
      {tab===key?<View style={s.dot}/>:null}
    </Pressable>)}</View>
  </View>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({
  root:{flex:1,backgroundColor:c.background},container:{paddingHorizontal:23,paddingTop:18,paddingBottom:140},
  sharedBrand:{position:'absolute',left:23,right:23,zIndex:2},
  brand:{flexDirection:'row',alignItems:'center',marginBottom:43,gap:9},brandMark:{width:28,height:28,borderRadius:7,backgroundColor:c.accent,alignItems:'center',justifyContent:'center',transform:[{rotate:'-9deg'}]},
  brandMarkText:{fontSize:21,fontWeight:'900',color:c.background},brandName:{color:c.text,fontSize:25,fontWeight:'900',letterSpacing:-1.5},
  brandCaptionWrap:{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center'},
  brandCaption:{color:c.muted,fontSize:9,fontWeight:'800',letterSpacing:1.3},
  settingsButton:{width:38,height:38,borderRadius:10,backgroundColor:c.surface,alignItems:'center',justifyContent:'center',marginLeft:5},
  settingsIcon:{color:c.accent,fontSize:23,fontWeight:'700'},
  eyebrow:{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:2.5,marginBottom:13},
  heading:{color:c.text,fontSize:40,fontWeight:'900',lineHeight:43,letterSpacing:-2,marginBottom:22},
  sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:c.border,paddingBottom:12,marginTop:12,marginBottom:5},
  section:{color:c.text,fontSize:12,fontWeight:'900',letterSpacing:1.5},sectionCount:{color:c.accent,fontSize:14,fontWeight:'900'},
  task:{paddingVertical:19,flexDirection:'row',alignItems:'center',gap:14,borderBottomWidth:1,borderBottomColor:c.border},
  check:{width:27,height:27,borderRadius:6,borderWidth:2,borderColor:c.muted,alignItems:'center',justifyContent:'center'},
  subTask:{flexDirection:'row',alignItems:'center',gap:12,marginLeft:13,paddingLeft:28,paddingRight:4,paddingVertical:11,borderLeftWidth:2,borderLeftColor:c.accentSoft,borderBottomWidth:1,borderBottomColor:c.border},
  subCheck:{width:22,height:22,borderRadius:5},
  checked:{backgroundColor:c.accent,borderColor:c.accent},checkText:{color:c.background,fontWeight:'900',fontSize:16},
  taskTitle:{color:c.text,fontSize:17,fontWeight:'700',letterSpacing:-0.3},
  taskDescription:{color:c.muted,fontSize:13,lineHeight:18},
  meta:{color:c.muted,fontSize:11},late:{color:c.danger,fontSize:10,fontWeight:'900',letterSpacing:0.8},
  priority:{color:c.muted,fontSize:9,fontWeight:'800'},
  priorityWrap:{alignItems:'center',justifyContent:'center',gap:6},
  priorityLine:{width:34,height:5,borderRadius:3},empty:{color:c.muted,paddingVertical:23,fontSize:13,lineHeight:20},
  tasksHead:{flexDirection:'row',alignItems:'center',marginTop:12,marginBottom:14},
  routinesLink:{marginLeft:'auto',borderWidth:1,borderColor:c.border,borderRadius:999,paddingHorizontal:11,paddingVertical:6},
  routinesLinkText:{color:c.accent,fontSize:11,fontWeight:'900',letterSpacing:0.8},
  filters:{borderBottomWidth:1,borderBottomColor:c.border,paddingBottom:12,marginBottom:5},
  tip:{color:c.muted,fontSize:9,letterSpacing:1.1,marginTop:35,textAlign:'center'},
  add:{position:'absolute',bottom:91,right:23,backgroundColor:c.accent,height:61,width:61,borderRadius:12,alignItems:'center',justifyContent:'center',elevation:7},
  plus:{color:c.background,fontSize:38,fontWeight:'500',lineHeight:47},
  nav:{height:75,backgroundColor:c.surface,flexDirection:'row',borderTopWidth:1,borderTopColor:c.border,paddingHorizontal:12},
  navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:7},navSelected:{},navText:{color:c.muted,fontSize:9,fontWeight:'900',letterSpacing:0.7},
  navActive:{color:c.accent},dot:{width:16,height:3,borderRadius:3,backgroundColor:c.accent},
});

