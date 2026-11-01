import React,{useEffect,useState} from 'react';
import {Text,TextInput,Pressable,ScrollView,StyleSheet,Alert,Platform,View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {getTask,saveTask} from '../src/store';
import {cancelTaskNotification,scheduleTask} from '../src/notifications';
import {theme as c} from '../src/theme';
export default function Edit(){
  const {id}=useLocalSearchParams<{id?:string}>();
  const router=useRouter();
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [due,setDue]=useState(new Date(Date.now()+3600000));
  const [priority,setPriority]=useState<'low'|'medium'|'high'>('medium');
  const [oldNotification,setOldNotification]=useState<string|null>(null);
  const [completed,setCompleted]=useState(false);
  const [picker,setPicker]=useState<'date'|'time'|null>(null);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{if(id)getTask(Number(id)).then(t=>{if(t){setTitle(t.title);setDescription(t.description);setDue(new Date(t.due_at));setPriority(t.priority);setOldNotification(t.notification_id);setCompleted(!!t.completed);}}).catch(console.warn);},[id]);
  async function save(){
    if(!title.trim())return Alert.alert('Informe um título');
    if(saving)return;
    setSaving(true);
    try{
      const notificationId=completed?null:await scheduleTask(title.trim(),due.getTime());
      try{await saveTask({title:title.trim(),description,due_at:due.getTime(),priority},id?Number(id):undefined,notificationId);}
      catch(e){await cancelTaskNotification(notificationId);throw e;}
      await cancelTaskNotification(oldNotification);
      router.back();
    }catch(e){Alert.alert('Erro ao salvar',String(e));}
    finally{setSaving(false);}
  }
  return <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
    <Text style={s.heading}>{id?'Editar tarefa':'Nova tarefa'}</Text>
    <Text style={s.label}>Título</Text>
    <TextInput style={s.input} placeholderTextColor={c.muted} value={title} onChangeText={setTitle} placeholder="Ex.: Entregar relatório" maxLength={120}/>
    <Text style={s.label}>Descrição</Text>
    <TextInput style={[s.input,{height:105,textAlignVertical:'top'}]} placeholderTextColor={c.muted} multiline value={description} onChangeText={setDescription} placeholder="Detalhes opcionais"/>
    <Text style={s.label}>Data e horário do vencimento</Text>
    <View style={s.row}>
      <Pressable style={s.choice} onPress={()=>setPicker('date')}><Text style={s.choiceText}>{due.toLocaleDateString('pt-BR')}</Text></Pressable>
      <Pressable style={s.choice} onPress={()=>setPicker('time')}><Text style={s.choiceText}>{due.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</Text></Pressable>
    </View>
    {picker&&<DateTimePicker value={due} mode={picker} themeVariant="dark" display={Platform.OS==='ios'?'spinner':'default'} onChange={(_,value)=>{
      if(value)setDue(prev=>{const next=new Date(prev);if(picker==='date')next.setFullYear(value.getFullYear(),value.getMonth(),value.getDate());else next.setHours(value.getHours(),value.getMinutes(),0,0);return next;});
      setPicker(null);
    }}/>}
    <Text style={s.helper}>O aviso será enviado somente no horário do vencimento, se as notificações estiverem autorizadas.</Text>
    <Text style={s.label}>Prioridade</Text>
    <View style={s.row}>{(['low','medium','high'] as const).map((p,i)=><Pressable key={p} style={[s.choice,priority===p&&s.selected]} onPress={()=>setPriority(p)}><Text style={[s.choiceText,priority===p&&s.selectedText]}>{['Baixa','Média','Alta'][i]}</Text></Pressable>)}</View>
    {completed?<Text style={s.helper}>Esta tarefa já está concluída. Não será agendada uma nova notificação.</Text>:null}
    <Pressable style={[s.button,saving&&{opacity:0.6}]} disabled={saving} onPress={save}><Text style={s.buttonText}>{saving?'Salvando...':'Salvar tarefa'}</Text></Pressable>
  </ScrollView>;
}
const s=StyleSheet.create({
  container:{padding:20,paddingBottom:60,backgroundColor:c.background,flexGrow:1},heading:{color:c.text,fontSize:28,fontWeight:'800',marginBottom:10},
  label:{color:c.text,fontWeight:'700',marginBottom:9,marginTop:21,fontSize:15},
  input:{backgroundColor:c.surface,color:c.text,padding:15,borderRadius:13,fontSize:16,borderWidth:1,borderColor:c.border},
  row:{flexDirection:'row',gap:10},choice:{backgroundColor:c.surface,padding:15,borderRadius:13,flex:1,alignItems:'center',borderWidth:1,borderColor:c.border},
  choiceText:{color:c.text,fontWeight:'600'},selected:{backgroundColor:c.accentSoft,borderColor:c.accent},selectedText:{color:'#C7D2FE'},
  helper:{color:c.muted,fontSize:12,marginTop:11,lineHeight:18},button:{backgroundColor:c.accent,alignItems:'center',padding:18,borderRadius:15,marginTop:36},
  buttonText:{color:c.background,fontWeight:'800',fontSize:16},
});