import React,{useEffect,useState} from 'react';
import {Text,TextInput,Pressable,ScrollView,StyleSheet,Platform,View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {getTask,saveTask} from '../src/store';
import {categories,TaskCategory} from '../src/templates';
import {testNotification} from '../src/notifications';
import {theme as c} from '../src/theme';
import {PingDialog} from '../src/components/PingDialog';
export default function Edit(){
  const {id}=useLocalSearchParams<{id?:string}>();
  const router=useRouter();
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [due,setDue]=useState(new Date(Date.now()+3600000));
  const [priority,setPriority]=useState<'low'|'medium'|'high'>('medium');
  const [category,setCategory]=useState<TaskCategory>('general');
  const [completed,setCompleted]=useState(false);
  const [picker,setPicker]=useState<'date'|'time'|null>(null);
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
    <View style={s.row}>
      <Pressable style={s.choice} onPress={()=>setPicker('date')}><Text style={s.choiceText}>{due.toLocaleDateString('pt-BR')}</Text></Pressable>
      <Pressable style={s.choice} onPress={()=>setPicker('time')}><Text style={s.choiceText}>{due.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</Text></Pressable>
    </View>
    {picker&&<DateTimePicker value={due} mode={picker} themeVariant="dark" display={Platform.OS==='ios'?'spinner':'default'} onChange={(_,value)=>{
      if(value)setDue(prev=>{const next=new Date(prev);if(picker==='date')next.setFullYear(value.getFullYear(),value.getMonth(),value.getDate());else next.setHours(value.getHours(),value.getMinutes(),0,0);return next;});
      setPicker(null);
    }}/>}
    <Text style={s.helper}>Lembretes contextuais no horário e, para tarefas comuns, após 15 min, 1h e 3h. Silêncio entre 22h e 7h. Saúde recebe um aviso único.</Text>
    <Text style={s.label}>04 / QUAL O ASSUNTO?</Text>
    <View style={[s.row,{flexWrap:'wrap'}]}>{(Object.keys(categories) as TaskCategory[]).map(key=><Pressable key={key} style={[s.choice,{flexBasis:'29%'},category===key&&s.selected]} onPress={()=>setCategory(key)}><Text style={[s.choiceText,category===key&&s.selectedText]}>{categories[key]}</Text></Pressable>)}</View>
    <Text style={s.label}>05 / QUAL A URGÊNCIA?</Text>
    <View style={s.row}>{(['low','medium','high'] as const).map((p,i)=><Pressable key={p} style={[s.choice,priority===p&&s.selected]} onPress={()=>setPriority(p)}><Text style={[s.choiceText,priority===p&&s.selectedText]}>{['Baixa','Média','Alta'][i]}</Text></Pressable>)}</View>
    {completed?<Text style={s.helper}>Esta tarefa já está concluída. Não será agendada uma nova notificação.</Text>:null}
    <Pressable style={[s.choice,{marginTop:20}]} onPress={async()=>{try{await testNotification();setFeedback({title:'Ping a caminho.',message:'O teste foi agendado para daqui a 10 segundos. Confira as notificações do aparelho.'});}catch(e){setFeedback({title:'O teste falhou.',message:String(e)});}}}><Text style={s.choiceText}>TESTAR PING · 10 SEG</Text></Pressable>
    <Pressable style={[s.button,saving&&{opacity:0.6}]} disabled={saving} onPress={save}><Text style={s.buttonText}>{saving?'SALVANDO...':id?'SALVAR ALTERAÇÕES →':'CRIAR TAREFA →'}</Text></Pressable>
  </ScrollView></>;
}
const s=StyleSheet.create({
  container:{paddingHorizontal:23,paddingTop:28,paddingBottom:80,backgroundColor:c.background,flexGrow:1},
  kicker:{color:c.accent,fontWeight:'900',fontSize:10,letterSpacing:2.5,marginBottom:15},
  heading:{color:c.text,fontSize:47,fontWeight:'900',lineHeight:49,letterSpacing:-2,marginBottom:8},
  subtitle:{color:c.muted,fontSize:14,marginBottom:22},
  label:{color:c.accent,fontWeight:'900',marginBottom:12,marginTop:27,fontSize:10,letterSpacing:1.5},
  input:{backgroundColor:c.surface,color:c.text,padding:17,borderRadius:8,fontSize:16,borderWidth:1,borderColor:c.border},
  row:{flexDirection:'row',gap:8},
  choice:{backgroundColor:c.surface,paddingVertical:15,paddingHorizontal:10,borderRadius:7,flex:1,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.border},
  choiceText:{color:c.text,fontWeight:'700',fontSize:12},
  selected:{backgroundColor:c.accentSoft,borderColor:c.accent},selectedText:{color:c.accent},
  helper:{color:c.muted,fontSize:12,marginTop:12,lineHeight:19},
  button:{backgroundColor:c.accent,alignItems:'center',padding:20,borderRadius:8,marginTop:32},
  buttonText:{color:c.background,fontWeight:'900',fontSize:14,letterSpacing:1.2},
});
