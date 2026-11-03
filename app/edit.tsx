import React,{useEffect,useState} from 'react';
import {Text,TextInput,Pressable,ScrollView,StyleSheet,View,Modal} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {getTask,saveTask} from '../src/store';
import {categories,TaskCategory} from '../src/templates';
import {useAppTheme,ThemeColors} from '../src/theme';
import {PingDialog} from '../src/components/PingDialog';
export default function Edit(){
  const {colors:c}=useAppTheme();
  const s=React.useMemo(()=>createStyles(c),[c]);
  const {id}=useLocalSearchParams<{id?:string}>();
  const router=useRouter();
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [due,setDue]=useState(new Date(Date.now()+3600000));
  const [priority,setPriority]=useState<'low'|'medium'|'high'>('medium');
  const [category,setCategory]=useState<TaskCategory>('general');
  const [completed,setCompleted]=useState(false);
  const [picker,setPicker]=useState<'date'|'time'|null>(null);
  const [month,setMonth]=useState(new Date());
  const [hour,setHour]=useState('00');
  const [minute,setMinute]=useState('00');
  function openPicker(mode:'date'|'time'){
    setMonth(new Date(due.getFullYear(),due.getMonth(),1));
    setHour(String(due.getHours()).padStart(2,'0'));
    setMinute(String(due.getMinutes()).padStart(2,'0'));
    setPicker(mode);
  }
  function confirmTime(){
    const h=Number(hour),m=Number(minute);
    if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||h>23||m>59){
      setFeedback({title:'Horário inválido.',message:'Informe hora de 00 a 23 e minutos de 00 a 59.'});return;
    }
    setDue(prev=>{const next=new Date(prev);next.setHours(h,m,0,0);return next;});
    setPicker(null);
  }
  const [saving,setSaving]=useState(false);
  const [feedback,setFeedback]=useState<{title:string;message:string}|null>(null);
  useEffect(()=>{if(id)getTask(Number(id)).then(t=>{if(t){setTitle(t.title);setDescription(t.description);setDue(new Date(t.due_at));setPriority(t.priority);setCategory(t.category??'general');setCompleted(!!t.completed);}}).catch(console.warn);},[id]);
  async function save(){
    if(!title.trim()){setFeedback({title:'Faltou o principal.',message:'Dá um nome para essa tarefa antes de continuar.'});return;}
    if(saving)return;
    setSaving(true);
    try{
      await saveTask({title:title.trim(),description,due_at:due.getTime(),priority,category},id?Number(id):undefined);
      router.back();
    }catch(e){setFeedback({title:'Não deu para salvar.',message:String(e)});}
    finally{setSaving(false);}
  }
  return <>
  <PingDialog visible={!!feedback} eyebrow="PING / RECADO" title={feedback?.title??''} message={feedback?.message} confirmLabel="ENTENDI" onClose={()=>setFeedback(null)} onConfirm={()=>setFeedback(null)}/>
  <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
    <Text style={s.kicker}>PING / ORGANIZAÇÃO</Text>
    <Text style={s.heading}>{id?'Muda os\nplanos.':'Qual é a\nmissão?'}</Text>
    <Text style={s.subtitle}>Anota agora. A gente te cobra depois.</Text>
    <Text style={s.label}>01 / O QUE PRECISA SER FEITO?</Text>
    <TextInput style={s.input} placeholderTextColor={c.muted} value={title} onChangeText={setTitle} placeholder="Ex.: Entregar relatório" maxLength={120}/>
    <Text style={s.label}>02 / ALGUM DETALHE?</Text>
    <TextInput style={[s.input,{height:105,textAlignVertical:'top'}]} placeholderTextColor={c.muted} multiline value={description} onChangeText={setDescription} placeholder="Detalhes opcionais"/>
    <Text style={s.label}>03 / QUANDO?</Text>
    <View style={s.scheduleCard}>
      <Pressable style={s.scheduleRow} onPress={()=>openPicker('date')}>
        <Text style={s.scheduleSymbol}>▦</Text>
        <View style={{flex:1}}><Text style={s.scheduleCaption}>DATA DO LEMBRETE</Text><Text style={s.scheduleValue}>{due.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</Text></View>
        <Text style={s.scheduleArrow}>›</Text>
      </Pressable>
      <View style={s.scheduleDivider}/>
      <Pressable style={s.scheduleRow} onPress={()=>openPicker('time')}>
        <Text style={s.scheduleSymbol}>◷</Text>
        <View style={{flex:1}}><Text style={s.scheduleCaption}>HORÁRIO</Text><Text style={s.scheduleValue}>{due.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</Text></View>
        <Text style={s.scheduleArrow}>›</Text>
      </Pressable>
    </View>
    <Text style={s.scheduleCaptionQuick}>ATALHOS RÁPIDOS</Text>
    <View style={s.row}>{([{label:'Hoje',days:0},{label:'Amanhã',days:1},{label:'+7 dias',days:7}] as const).map(item=><Pressable key={item.label} style={s.quickChip} onPress={()=>{const next=new Date();next.setDate(next.getDate()+item.days);next.setHours(due.getHours(),due.getMinutes(),0,0);setDue(next);}}><Text style={s.quickText}>{item.label}</Text></Pressable>)}</View>
    <Modal visible={picker!==null} transparent animationType="fade" onRequestClose={()=>setPicker(null)}>
      <View style={s.modalOverlay}><View style={s.modalCard}>
        <Text style={s.modalTitle}>{picker==='date'?'ESCOLHA O DIA':'ESCOLHA A HORA'}</Text>
        {picker==='date'?<>
          <View style={s.monthRow}>
            <Pressable style={s.monthArrow} onPress={()=>setMonth(v=>new Date(v.getFullYear(),v.getMonth()-1,1))}><Text style={s.choiceText}>‹</Text></Pressable>
            <Text style={s.monthText}>{month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase()}</Text>
            <Pressable style={s.monthArrow} onPress={()=>setMonth(v=>new Date(v.getFullYear(),v.getMonth()+1,1))}><Text style={s.choiceText}>›</Text></Pressable>
          </View>
          <View style={s.calendar}>
            {['D','S','T','Q','Q','S','S'].map((d,i)=><Text key={i} style={s.weekday}>{d}</Text>)}
            {Array.from({length:new Date(month.getFullYear(),month.getMonth(),1).getDay()},(_,i)=><View key={'blank'+i} style={s.dayCell}/>)}
            {Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,i)=>{
              const day=i+1,selected=due.getFullYear()===month.getFullYear()&&due.getMonth()===month.getMonth()&&due.getDate()===day;
              return <Pressable key={day} style={[s.dayCell,selected&&s.daySelected]} onPress={()=>{setDue(prev=>{const next=new Date(prev);next.setFullYear(month.getFullYear(),month.getMonth(),day);return next;});setPicker(null);}}><Text style={[s.dayText,selected&&s.daySelectedText]}>{day}</Text></Pressable>;
            })}
          </View>
        </>:<>
          <View style={s.timeRow}>
            <View style={s.timeField}><Text style={s.timeLabel}>HORA</Text><TextInput value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={s.timeInput}/></View>
            <Text style={s.timeColon}>:</Text>
            <View style={s.timeField}><Text style={s.timeLabel}>MINUTO</Text><TextInput value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={s.timeInput}/></View>
          </View>
          <Pressable style={s.button} onPress={confirmTime}><Text style={s.buttonText}>CONFIRMAR HORÁRIO</Text></Pressable>
        </>}
        <Pressable style={s.modalCancel} onPress={()=>setPicker(null)}><Text style={s.choiceText}>CANCELAR</Text></Pressable>
      </View></View>
    </Modal>
    <Text style={s.helper}>Lembretes contextuais no horário e, para tarefas comuns, após 15 min, 1h e 3h. Silêncio entre 22h e 7h. Saúde recebe um aviso único.</Text>
    <Text style={s.label}>04 / QUAL O ASSUNTO?</Text>
    <View style={[s.row,{flexWrap:'wrap'}]}>{(Object.keys(categories) as TaskCategory[]).map(key=><Pressable key={key} style={[s.choice,{flexBasis:'29%'},category===key&&s.selected]} onPress={()=>setCategory(key)}><Text style={[s.choiceText,category===key&&s.selectedText]}>{({study:'📚',work:'💼',finance:'💸',home:'🏠',health:'💚',general:'✨'} as const)[key]} {categories[key]}</Text></Pressable>)}</View>
    <Text style={s.label}>05 / QUAL A URGÊNCIA?</Text>
    <View style={s.row}>{(['low','medium','high'] as const).map((p,i)=>{
      const color=({low:'#77CDA3',medium:'#F7C66F',high:'#FF887B'} as const)[p];
      return <Pressable key={p} style={[s.choice,priority===p&&{borderColor:c.muted}]} onPress={()=>setPriority(p)}>
        <Text style={s.choiceText}>{['Baixa','Média','Alta'][i]}</Text>
        <View style={[s.urgencyLine,{backgroundColor:color,opacity:priority===p?1:0.55,width:priority===p?38:25}]}/>
      </Pressable>;
    })}</View>
    {completed?<Text style={s.helper}>Esta tarefa já está concluída. Não será agendada uma nova notificação.</Text>:null}
    <Pressable style={[s.button,saving&&{opacity:0.6}]} disabled={saving} onPress={save}><Text style={s.buttonText}>{saving?'SALVANDO...':id?'SALVAR ALTERAÇÕES →':'CRIAR TAREFA →'}</Text></Pressable>
  </ScrollView></>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({
  container:{paddingHorizontal:23,paddingTop:28,paddingBottom:80,backgroundColor:c.background,flexGrow:1},
  kicker:{color:c.accent,fontWeight:'900',fontSize:10,letterSpacing:2.5,marginBottom:15},
  heading:{color:c.text,fontSize:47,fontWeight:'900',lineHeight:49,letterSpacing:-2,marginBottom:8},
  subtitle:{color:c.muted,fontSize:14,marginBottom:22},
  label:{color:c.accent,fontWeight:'900',marginBottom:12,marginTop:27,fontSize:10,letterSpacing:1.5},
  input:{backgroundColor:c.surface,color:c.text,padding:17,borderRadius:8,fontSize:16,borderWidth:1,borderColor:c.border},
  row:{flexDirection:'row',gap:8},
  choice:{backgroundColor:c.surface,paddingVertical:15,paddingHorizontal:10,borderRadius:7,flex:1,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.border},
  choiceText:{color:c.text,fontWeight:'700',fontSize:12},
  urgencyLine:{height:3,borderRadius:3,marginTop:8},
  selected:{backgroundColor:c.accentSoft,borderColor:c.accent},selectedText:{color:c.accent},
  helper:{color:c.muted,fontSize:12,marginTop:12,lineHeight:19},
  button:{backgroundColor:c.accent,alignItems:'center',padding:20,borderRadius:8,marginTop:32},
  buttonText:{color:c.background,fontWeight:'900',fontSize:14,letterSpacing:1.2},
  scheduleCard:{backgroundColor:c.surface,borderRadius:12,borderWidth:1,borderColor:c.border,padding:15},
  scheduleRow:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:8},
  scheduleSymbol:{fontSize:27,color:c.accent,backgroundColor:c.accentSoft,overflow:'hidden',borderRadius:9,textAlign:'center',textAlignVertical:'center',width:43,height:43},
  scheduleCaption:{color:c.muted,fontSize:10,fontWeight:'800',letterSpacing:1,marginBottom:5},
  scheduleValue:{color:c.text,fontSize:16,fontWeight:'800',textTransform:'capitalize'},
  scheduleArrow:{color:c.accent,fontSize:26},
  scheduleDivider:{height:1,backgroundColor:c.border,marginVertical:10},
  scheduleCaptionQuick:{color:c.muted,fontSize:10,fontWeight:'800',letterSpacing:1,marginTop:17,marginBottom:10},
  quickChip:{backgroundColor:c.surfaceRaised,borderWidth:1,borderColor:c.border,borderRadius:99,paddingHorizontal:14,paddingVertical:11,flex:1,alignItems:'center'},
  quickText:{color:c.text,fontWeight:'800',fontSize:12},
  modalOverlay:{flex:1,backgroundColor:'#000000B8',justifyContent:'center',padding:20},
  modalCard:{backgroundColor:c.surfaceRaised,borderRadius:16,padding:20,borderWidth:1,borderColor:c.border},
  modalTitle:{color:c.accent,fontSize:12,fontWeight:'900',letterSpacing:2,marginBottom:22},
  monthRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},
  monthArrow:{padding:12,backgroundColor:c.surface,borderRadius:8},
  monthText:{color:c.text,fontSize:13,fontWeight:'900'},
  calendar:{flexDirection:'row',flexWrap:'wrap'},
  weekday:{width:'14.2857%',textAlign:'center',color:c.muted,fontSize:11,marginBottom:12},
  dayCell:{width:'14.2857%',height:43,alignItems:'center',justifyContent:'center',borderRadius:8},
  daySelected:{backgroundColor:c.accent},
  dayText:{color:c.text,fontWeight:'700',fontSize:14},
  daySelectedText:{color:c.background},
  timeRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12,marginVertical:15},
  timeField:{flex:1},
  timeLabel:{color:c.muted,fontSize:11,textAlign:'center',marginBottom:9},
  timeInput:{backgroundColor:c.surface,color:c.text,fontSize:30,fontWeight:'900',textAlign:'center',borderRadius:10,borderWidth:1,borderColor:c.border,padding:12},
  timeColon:{color:c.accent,fontSize:30,marginTop:16},
  modalCancel:{alignItems:'center',padding:15,marginTop:10},
});
