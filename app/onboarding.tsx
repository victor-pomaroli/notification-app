import React,{useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,StyleSheet,ActivityIndicator} from 'react-native';
import {useRouter} from 'expo-router';
import {useAppTheme,ThemeColors} from '../src/theme';
import {AddressStyle,NotificationPersonality,completeOnboarding} from '../src/preferences';
import {rescheduleAllReminders} from '../src/store';

const personalities:[NotificationPersonality,string,string,string][]=[
  ['debochado','😏 Debochado','Ironia na medida certa.','A responsabilidade bateu de novo. Vai atender?'],
  ['semPaciencia','🔥 Sem Paciência','Direto e sem enrolação.','A tarefa ainda está aí. Bora resolver!'],
  ['deBoa','🌿 De Boa','Leve e tranquilo.','Um lembrete gentil da sua tarefa.'],
];
export default function Onboarding(){
  const {colors:c}=useAppTheme();
  const s=React.useMemo(()=>styles(c),[c]);
  const router=useRouter();
  const [step,setStep]=useState(0);
  const [name,setName]=useState('');
  const [address,setAddress]=useState<AddressStyle>('neutral');
  const [personality,setPersonality]=useState<NotificationPersonality>('debochado');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function finish(){
    if(busy)return;
    setBusy(true);setError('');
    try{
      await completeOnboarding(name,address,personality);
      await rescheduleAllReminders().catch(console.warn);
      router.replace('/');
    }catch(e){setError('Não foi possível salvar. Tente novamente.');console.warn(e);}
    finally{setBusy(false);}
  }
  return <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
    <Text style={s.brand}>ping<Text style={{color:c.accent}}>.</Text></Text>
    <Text style={s.eyebrow}>BEM-VINDO / {String(step+1).padStart(2,'0')} DE 03</Text>
    <View style={s.progress}>{[0,1,2].map(i=><View key={i} style={[s.progressPart,{backgroundColor:i<=step?c.accent:c.border}]}/>)}</View>
    <Text style={s.heading}>{['Primeiro,\nquem é você?','Como posso\nte chamar?','Qual é a\nsua vibe?'][step]}</Text>
    <Text style={s.subtitle}>{['Vamos deixar os lembretes com a sua cara.','Escolha como o Ping deve se dirigir a você.','Escolha o jeito que o Ping vai cobrar suas tarefas.'][step]}</Text>
    {step===0?<View style={s.panel}>
      <Text style={s.label}>SEU NOME (OPCIONAL)</Text>
      <TextInput accessibilityLabel="Seu nome" value={name} onChangeText={setName} maxLength={32} placeholder="Como quer ser chamado?" placeholderTextColor={c.muted} style={s.input}/>
      <Text style={s.note}>Seu nome aparece nos lembretes. Você pode deixar em branco.</Text>
    </View>:null}
    {step===1?<View style={s.panel}>
      <Text style={s.label}>FORMA DE TRATAMENTO</Text>
      <Text style={s.note}>Isso ajusta as expressões dos lembretes, não define seu gênero.</Text>
      {([['masculine','Masculino'],['feminine','Feminino'],['neutral','Neutro']] as [AddressStyle,string][]).map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:address===value}} style={[s.option,address===value&&s.selected]} onPress={()=>setAddress(value)}><Text style={[s.optionText,address===value&&{color:c.accent}]}>{label}</Text><Text style={{color:c.accent}}>{address===value?'✓':'○'}</Text></Pressable>)}
    </View>:null}
    {step===2?<View style={{gap:10}}>{personalities.map(([value,label,description,preview])=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:personality===value}} style={[s.option,{display:'flex',flexDirection:'column',alignItems:'stretch',gap:7},personality===value&&s.selected]} onPress={()=>setPersonality(value)}>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={[s.optionText,personality===value&&{color:c.accent}]}>{label}</Text><Text style={{color:c.accent}}>{personality===value?'✓':'○'}</Text></View>
      <Text style={s.note}>{description}</Text>
      <Text style={[s.note,{backgroundColor:c.background,padding:10,borderRadius:7}]}>{preview}</Text>
    </Pressable>)}</View>:null}
    {error?<Text style={{color:c.danger,marginTop:16}}>{error}</Text>:null}
    <View style={s.actions}>
      {step>0?<Pressable disabled={busy} style={s.back} onPress={()=>setStep(v=>v-1)}><Text style={{color:c.text,fontWeight:'800'}}>VOLTAR</Text></Pressable>:null}
      <Pressable disabled={busy} style={[s.next,busy&&{opacity:0.6}]} onPress={()=>step===2?finish():setStep(v=>v+1)}>
        {busy?<ActivityIndicator color={c.background}/>:<Text style={{color:c.background,fontWeight:'900'}}>{step===2?'COMEÇAR A USAR →':'CONTINUAR →'}</Text>}
      </Pressable>
    </View>
    <Text style={s.footer}>Você pode mudar tudo isso depois em Ajustes.</Text>
  </ScrollView>;
}
const styles=(c:ThemeColors)=>StyleSheet.create({
  container:{flexGrow:1,backgroundColor:c.background,paddingHorizontal:24,paddingTop:55,paddingBottom:45},
  brand:{color:c.text,fontSize:34,fontWeight:'900',letterSpacing:-2,marginBottom:48},
  eyebrow:{color:c.accent,fontWeight:'900',fontSize:11,letterSpacing:2},
  progress:{flexDirection:'row',gap:7,marginTop:16,marginBottom:35},
  progressPart:{height:5,borderRadius:5,flex:1},
  heading:{color:c.text,fontSize:43,lineHeight:47,fontWeight:'900',letterSpacing:-2,marginBottom:13},
  subtitle:{color:c.muted,fontSize:15,lineHeight:23,marginBottom:28},
  panel:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:13,padding:16},
  label:{color:c.accent,fontSize:11,fontWeight:'900',letterSpacing:1,marginBottom:13},
  input:{backgroundColor:c.background,borderWidth:1,borderColor:c.border,color:c.text,padding:15,borderRadius:9,fontSize:17},
  note:{color:c.muted,fontSize:12,lineHeight:19},
  option:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:11,padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:9},
  selected:{borderColor:c.accent,backgroundColor:c.accentSoft},
  optionText:{color:c.text,fontSize:16,fontWeight:'800'},
  actions:{flexDirection:'row',gap:10,marginTop:32},
  back:{padding:18,borderRadius:9,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},
  next:{flex:1,padding:18,borderRadius:9,backgroundColor:c.accent,alignItems:'center'},
  footer:{color:c.muted,textAlign:'center',fontSize:12,marginTop:20}
});
