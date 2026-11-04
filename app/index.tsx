import React,{useCallback,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,AppState,StatusBar,Dimensions,Animated,TextStyle} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Task,listTasks,listTaskPage,archiveOldCompletedTasks,completeTask,deleteTask} from '../src/store';
import {categories,TaskCategory} from '../src/templates';
import {useAppTheme,ThemeColors} from '../src/theme';
import {PingDialog} from '../src/components/PingDialog';
import {SettingsScreen} from '../src/components/SettingsScreen';

type Tab='home'|'tasks'|'alerts'|'settings';
const categoryColors:Record<'dark'|'softLight',Record<TaskCategory,{text:string;surface:string}>>={
  dark:{study:{text:'#A9B8FF',surface:'#29314A'},work:{text:'#7DDCC7',surface:'#203C35'},finance:{text:'#F7CE7A',surface:'#44371F'},home:{text:'#FFAD91',surface:'#493026'},health:{text:'#A5E8A3',surface:'#28422A'},general:{text:'#D7FC65',surface:'#354326'}},
  softLight:{study:{text:'#394E9A',surface:'#E1E7FF'},work:{text:'#176F5A',surface:'#D9F2E8'},finance:{text:'#896018',surface:'#FFF0C9'},home:{text:'#A34F35',surface:'#FBE5DC'},health:{text:'#39763D',surface:'#E0F2DD'},general:{text:'#536D23',surface:'#DFE8C7'}}
};
const priorityLabel={low:'BAIXA',medium:'MÉDIA',high:'ALTA'};
const formatDate=(timestamp:number)=>new Date(timestamp).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
function TaskTitle({title,completed,colors,style}:{title:string;completed:boolean;colors:ThemeColors;style?:TextStyle}){
  const progress=useRef(new Animated.Value(completed?0:1)).current;
  const [width,setWidth]=useState(0);
  React.useEffect(()=>{
    const animation=Animated.timing(progress,{toValue:completed?1:0,duration:250,useNativeDriver:false});
    animation.start();
    return()=>animation.stop();
  },[completed,progress]);
  return <View style={{alignSelf:'flex-start',maxWidth:'100%'}}>
    <Text onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={[{color:completed?colors.muted:colors.text,fontSize:17,fontWeight:'700',letterSpacing:-0.3,opacity:completed?0.82:1},style]}>{title}</Text>
    {completed&&width>0?<Animated.View pointerEvents="none" style={{position:'absolute',left:0,top:'50%',height:2.5,borderRadius:2,backgroundColor:colors.accent,width:progress.interpolate({inputRange:[0,1],outputRange:[0,width]})}}/>:null}
  </View>;
}
const greetings=['SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO','DOMINGO'];
export default function Home(){
  const {colors:c,appearance}=useAppTheme();
  const s=React.useMemo(()=>createStyles(c),[c]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [loadingPage,setLoadingPage]=useState(false);
  const [tab,setTab]=useState<Tab>('home');
  const [taskCategoryFilter,setTaskCategoryFilter]=useState<'all'|TaskCategory>('all');
  const [visibleTaskCount,setVisibleTaskCount]=useState(50);
  const pager=useRef<React.ElementRef<typeof Animated.ScrollView>>(null);
  const horizontalX=useRef(new Animated.Value(0)).current;
  const verticalY=useRef({home:new Animated.Value(0),tasks:new Animated.Value(0),alerts:new Animated.Value(0),settings:new Animated.Value(0)}).current;
  const [pageWidth,setPageWidth]=useState(Dimensions.get('window').width);
  // Enquanto o dedo está na faixa de filtros, o swipe entre abas fica travado.
  const [filtersTouched,setFiltersTouched]=useState(false);
  const tabs:Tab[]=['home','tasks','alerts','settings'];
  const goToTab=(next:Tab)=>{setTab(next);pager.current?.scrollTo({x:tabs.indexOf(next)*pageWidth,animated:true});};
  const [now,setNow]=useState(Date.now());
  const [deleteTarget,setDeleteTarget]=useState<Task|null>(null);
  const [busyDelete,setBusyDelete]=useState(false);
  const [feedback,setFeedback]=useState<{title:string;message:string}|null>(null);
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const refresh=useCallback(async()=>{await archiveOldCompletedTasks();const all=await listTasks();setTasks(all);setVisibleTaskCount(50);setNow(Date.now());},[]);
  useFocusEffect(useCallback(()=>{
    refresh().catch(console.warn);
    const sub=AppState.addEventListener('change',state=>{if(state==='active')refresh().catch(console.warn);});
    const interval=setInterval(()=>setNow(Date.now()),30000);
    return ()=>{sub.remove();clearInterval(interval);};
  },[refresh]));
  const filteredTasks=taskCategoryFilter==='all'?tasks:tasks.filter(t=>t.category===taskCategoryFilter);
  const [filteredPage,setFilteredPage]=useState<Task[]>([]);
  React.useEffect(()=>{let active=true;listTaskPage(50,0,taskCategoryFilter==='all'?undefined:taskCategoryFilter).then(rows=>{if(active){setFilteredPage(rows);setVisibleTaskCount(50);}}).catch(console.warn);return()=>{active=false;};},[taskCategoryFilter,tasks]);
  async function loadMoreTasks(){if(loadingPage)return;setLoadingPage(true);try{const rows=await listTaskPage(50,filteredPage.length,taskCategoryFilter==='all'?undefined:taskCategoryFilter);setFilteredPage(old=>[...old,...rows]);setVisibleTaskCount(n=>n+rows.length);}catch(e){setFeedback({title:'Erro ao carregar tarefas',message:String(e)});}finally{setLoadingPage(false);}}
  const pending=tasks.filter(t=>!t.completed);
  const overdue=pending.filter(t=>t.due_at<now);
  const upcoming=pending.filter(t=>t.due_at>=now);
  const today=pending.filter(t=>new Date(t.due_at).toDateString()===new Date(now).toDateString());
  const completedToday=tasks.filter(t=>!!t.completed&&t.completed_at!=null&&new Date(t.completed_at).toDateString()===new Date(now).toDateString())
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
  function card(t:Task){
    const late=!t.completed&&t.due_at<now;
    const topic=categoryColors[appearance][t.category]??categoryColors[appearance].general;
    return <Pressable key={t.id} style={[s.task,late?{borderBottomColor:appearance==='dark'?'#A85850':'#CB8A7E'}:undefined]} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}>
      {late?<View pointerEvents="none" style={{position:'absolute',left:-12,right:-12,top:5,bottom:5,backgroundColor:appearance==='dark'?'#34201E':'#F8E2DC',borderRadius:10,borderWidth:1,borderColor:appearance==='dark'?'#77423D':'#E5B0A5'}}/>:null}
      <Pressable accessibilityRole="checkbox" accessibilityLabel={t.completed?'Marcar como pendente':'Concluir tarefa'} accessibilityState={{checked:!!t.completed}} onPress={()=>toggle(t)} style={[s.check,late?{borderColor:appearance==='dark'?'#FF887B':'#B83931'}:undefined,!!t.completed?s.checked:undefined]}>
        <Text style={s.checkText}>{t.completed?'✓':''}</Text>
      </Pressable>
      <View style={{flex:1,gap:7}}>
        <TaskTitle key={`${t.id}-${t.completed}`} title={t.title} completed={!!t.completed} colors={c} style={late?{color:appearance==='dark'?'#FFB5A9':'#A82F27',fontWeight:'900'}:undefined}/>
        {t.description?.trim()?<Text style={s.taskDescription} numberOfLines={2}>{t.description.trim()}</Text>:null}
        <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7}}><View style={{backgroundColor:topic.surface,borderRadius:5,paddingHorizontal:8,paddingVertical:4}}><Text style={{color:topic.text,fontSize:10,fontWeight:'800'}}>{categories[t.category]??'Geral'}</Text></View><Text style={s.meta}>{formatDate(t.due_at)}</Text></View>
      </View>
      <View style={s.priorityWrap}>
        {late?<View style={{backgroundColor:appearance==='dark'?'#FF887B':'#B83931',paddingHorizontal:7,paddingVertical:5,borderRadius:5}}><Text style={{color:appearance==='dark'?'#261412':'#FFFFFF',fontSize:10,fontWeight:'900'}}>⚠ ATRASADA</Text></View>:<Text style={s.priority}>{priorityLabel[t.priority]}</Text>}
        <View style={[s.priorityLine,{backgroundColor:late?(appearance==='dark'?'#FF887B':'#B83931'):({low:'#77CDA3',medium:'#F7C66F',high:'#FF887B'} as const)[t.priority]}]}/>
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
      onScroll={Animated.event([{nativeEvent:{contentOffset:{x:horizontalX}}}],{useNativeDriver:true})}
      onLayout={event=>{const width=event.nativeEvent.layout.width;if(width>0&&width!==pageWidth){setPageWidth(width);pager.current?.scrollTo({x:tabs.indexOf(tab)*width,animated:false});}}}
      onMomentumScrollEnd={event=>{const index=Math.max(0,Math.min(tabs.length-1,Math.round(event.nativeEvent.contentOffset.x/pageWidth)));setTab(tabs[index]);}}
    >
      {tabs.map((page,index)=><View key={page} style={{width:pageWidth,flex:1}}>
      <Animated.ScrollView style={{flex:1}} contentContainerStyle={[s.container,{paddingTop:insets.top+89}]} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
        onScroll={Animated.event([{nativeEvent:{contentOffset:{y:verticalY[page]}}}],{useNativeDriver:true})}>

      {page==='settings'?<><SettingsScreen onDataDeleted={()=>refresh().catch(console.warn)}/><Pressable accessibilityRole="button" onPress={()=>router.push('/archive')} style={{marginTop:22,padding:17,backgroundColor:c.surface,borderRadius:10,borderWidth:1,borderColor:c.border}}><Text style={{color:c.accent,fontWeight:'900'}}>HISTÓRICO DE TAREFAS ARQUIVADAS →</Text><Text style={{color:c.muted,fontSize:12,marginTop:6}}>Consulte e restaure tarefas concluídas há mais de 30 dias.</Text></Pressable></>:<>
      <Text style={s.eyebrow}>{greetings[(new Date(now).getDay()+6)%7]}  /  {new Date(now).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}).toUpperCase()}</Text>
      {page!=='tasks'?<Text style={s.heading}>{page==='home'?'Seu dia.\nSem desculpas.':'Olha o que\nficou pra trás.'}</Text>:null}
      {page==='home'?<>
        <View style={s.hero}>
          <View pointerEvents="none" style={s.postitCornerCut}/>
          <View pointerEvents="none" style={s.postitFold}/>
          <Text style={s.heroLabel}>O RESUMO DA ÓPERA</Text>
          <View style={s.heroNumbers}><Text style={s.heroNumber}>{pending.length.toString().padStart(2,'0')}</Text><View style={s.heroSide}><Text style={s.heroSideBig}>{overdue.length} atrasadas</Text><Text style={s.heroSideSmall}>{today.length} pra hoje</Text></View></View>
          <Text style={s.heroFooter}>{pending.length===0?'Tudo resolvido. Aproveita esse raro momento.':overdue.length?'Tem coisa te esperando. Você sabe o que fazer.':'Por enquanto, tudo sob controle.'}</Text>
        </View>
        <View style={s.sectionHead}><Text style={s.section}>PASSOU DA HORA</Text><Text style={s.sectionCount}>{String(overdue.length).padStart(2,'0')}</Text></View>
        {overdue.length?overdue.map(card):empty('Nada atrasado. Pode comemorar sem exagerar.')}
        <View style={s.sectionHead}><Text style={s.section}>NO RADAR</Text><Text style={s.sectionCount}>{String(upcoming.length).padStart(2,'0')}</Text></View>
        {upcoming.length?upcoming.slice(0,8).map(card):empty('Nenhuma tarefa futura. Que paz suspeita.')}
        <View style={s.sectionHead}><Text style={s.section}>CONCLUÍDAS HOJE</Text><Text style={s.sectionCount}>{String(completedToday.length).padStart(2,'0')}</Text></View>
        {completedToday.length?completedToday.map(card):empty('Nada concluído hoje. Ainda dá tempo.')}
      </>:<>
        <View style={s.sectionHead}><Text style={s.section}>{page==='tasks'?'TODAS AS TAREFAS':'PENDÊNCIAS ATRASADAS'}</Text><Text style={s.sectionCount}>{String(page==='tasks'?filteredTasks.length:overdue.length).padStart(2,'0')}</Text></View>
        {page==='tasks'?<View style={{marginBottom:14}}><ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection:'row',gap:7,paddingVertical:2,paddingRight:4}}
          onTouchStart={()=>setFiltersTouched(true)} onTouchEnd={()=>setFiltersTouched(false)} onTouchCancel={()=>setFiltersTouched(false)} onScrollEndDrag={()=>setFiltersTouched(false)}>{([{key:'all',label:'Todas'},...Object.entries(categories).map(([key,label])=>({key,label}))] as {key:'all'|TaskCategory;label:string}[]).map(item=>{const active=taskCategoryFilter===item.key;const topic=item.key==='all'?{text:c.accent,surface:c.accentSoft}:categoryColors[appearance][item.key];return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>{setTaskCategoryFilter(item.key);setVisibleTaskCount(50);}} style={{paddingHorizontal:13,paddingVertical:8,borderRadius:999,borderWidth:1,borderColor:active?topic.text:c.border,backgroundColor:active?topic.surface:c.surface}}><Text style={{color:active?topic.text:c.text,fontSize:12,fontWeight:'800'}}>{item.label}</Text></Pressable>;})}</ScrollView></View>:null}
        {page==='tasks'?(filteredTasks.length?filteredPage.map(card):empty(taskCategoryFilter==='all'?'Ainda não tem nada aqui. Crie sua primeira tarefa.':'Nenhuma tarefa neste tópico.')):(overdue.length?overdue.map(card):empty('Tudo em dia. Assim que a gente gosta.'))}
      </>}
      {page==='tasks'&&filteredTasks.length>visibleTaskCount?<Pressable accessibilityRole="button" onPress={loadMoreTasks} style={{backgroundColor:c.surface,borderRadius:9,padding:16,alignItems:'center',marginTop:20}}><Text style={{color:c.accent,fontWeight:'800'}}>{loadingPage?'CARREGANDO...':`CARREGAR MAIS (${filteredTasks.length-visibleTaskCount} RESTANTES)`}</Text></Pressable>:null}
      <Text style={s.tip}>TOQUE PARA EDITAR  ·  SEGURE PARA EXCLUIR</Text>
      </>}
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[s.sharedBrand,{
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
        <View style={s.brand}><View style={s.brandMark}><Text style={s.brandMarkText}>!</Text></View><Text style={s.brandName}>ping<Text style={{color:c.accent}}>.</Text></Text><Text style={s.brandCaption}>FAÇA ACONTECER</Text></View>
      </Animated.View>
      </View>)}
    </Animated.ScrollView>
    {tab!=='settings'&&<Pressable accessibilityLabel="Criar tarefa" style={[s.add,{bottom:91+insets.bottom}]} onPress={()=>router.push('/edit')}><Text style={s.plus}>+</Text></Pressable>}
    <View style={[s.nav,{paddingBottom:insets.bottom,height:75+insets.bottom}]}>{(['home','tasks','alerts','settings'] as const).map((key,i)=><Pressable key={key} style={[s.navItem,tab===key&&s.navSelected]} onPress={()=>goToTab(key)}>
      <Text style={[s.navText,tab===key&&s.navActive]}>{['HOJE','TAREFAS','ATRASOS','AJUSTES'][i]}</Text>
      {tab===key?<View style={s.dot}/>:null}
    </Pressable>)}</View>
  </View>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({
  root:{flex:1,backgroundColor:c.background},container:{paddingHorizontal:23,paddingTop:18,paddingBottom:140},
  sharedBrand:{position:'absolute',left:23,right:23,zIndex:2},
  brand:{flexDirection:'row',alignItems:'center',marginBottom:43,gap:9},brandMark:{width:28,height:28,borderRadius:7,backgroundColor:c.accent,alignItems:'center',justifyContent:'center',transform:[{rotate:'-9deg'}]},
  brandMarkText:{fontSize:21,fontWeight:'900',color:c.background},brandName:{color:c.text,fontSize:25,fontWeight:'900',letterSpacing:-1.5},
  brandCaption:{color:c.muted,fontSize:9,fontWeight:'800',letterSpacing:1.3,marginLeft:'auto'},
  eyebrow:{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:2.5,marginBottom:13},
  heading:{color:c.text,fontSize:40,fontWeight:'900',lineHeight:43,letterSpacing:-2,marginBottom:22},
  hero:{backgroundColor:c.accent,borderRadius:4,padding:23,marginBottom:33,transform:[{rotate:'-1deg'}],overflow:'visible',elevation:c.background==='#111310'?3:0,shadowColor:'#000000',shadowOffset:{width:0,height:3},shadowOpacity:c.background==='#111310'?0.12:0,shadowRadius:6},
  postitCornerCut:{position:'absolute',top:-1,right:-1,width:0,height:0,borderTopWidth:25,borderLeftWidth:25,borderTopColor:c.background,borderLeftColor:'transparent',zIndex:2},
  postitFold:{position:'absolute',top:0,right:0,width:0,height:0,borderBottomWidth:23,borderRightWidth:23,borderBottomColor:c.background==='#111310'?'#B5D653':'#77964A',borderRightColor:'transparent',zIndex:3,transform:[{translateX:-1},{translateY:1}]},
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
  taskTitle:{color:c.text,fontSize:17,fontWeight:'700',letterSpacing:-0.3},
  taskDescription:{color:c.muted,fontSize:13,lineHeight:18},
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

