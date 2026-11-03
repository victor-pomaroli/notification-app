import React,{useEffect,useState} from 'react';
import {View,Text,Switch,Pressable,StyleSheet,Alert,Linking,TextInput} from 'react-native';
import * as Notifications from 'expo-notifications';
import {getPreferences,setPreference,Preferences,AddressStyle} from '../preferences';
import {rescheduleAllReminders,deleteAllTasks} from '../store';
import {testNotification} from '../notifications';
import {useAppTheme,ThemeColors,Appearance,palettes} from '../theme';

export function SettingsScreen({onDataDeleted}:{onDataDeleted:()=>void}){
 const {colors:c,appearance,changeAppearance}=useAppTheme();
 const s=React.useMemo(()=>createStyles(c),[c]);
 const [prefs,setPrefs]=useState<Preferences>({notifications:true,privatePreviews:false,appearance:'dark',displayName:'',addressStyle:'neutral'});
 const [busy,setBusy]=useState(false);
 const [permission,setPermission]=useState('Verificando...');
 const [themeBusy,setThemeBusy]=useState(false);
 const [scheduledCount,setScheduledCount]=useState<number|null>(null);
 const [testing,setTesting]=useState(false);
 const [nameDraft,setNameDraft]=useState('');
 useEffect(()=>{getPreferences().then(p=>setNameDraft(p.displayName)).catch(console.warn);},[]);
 async function saveProfile(){
   if(busy)return;
   setBusy(true);
   try{
     const name=nameDraft.trim().slice(0,32);
     await setPreference('displayName',name);
     setPrefs(prev=>({...prev,displayName:name}));
     await rescheduleAllReminders();
     Alert.alert('Salvo','As próximas notificações vão usar seu nome.');
   }catch(e){Alert.alert('Erro ao salvar perfil',String(e));}
   finally{setBusy(false);}
 }
 async function chooseAddressStyle(value:AddressStyle){
   if(busy)return;
   setBusy(true);
   try{await setPreference('addressStyle',value);setPrefs(prev=>({...prev,addressStyle:value}));await rescheduleAllReminders();}
   catch(e){Alert.alert('Erro ao salvar tratamento',String(e));}
   finally{setBusy(false);}
 }
 async function checkScheduled(){
   try{const entries=await Notifications.getAllScheduledNotificationsAsync();setScheduledCount(entries.filter(n=>n.content.data?.kind==='task_due').length);}
   catch(e){Alert.alert('Não foi possível consultar',String(e));}
 }
 async function sendTest(){
   if(testing)return;
   setTesting(true);
   try{await testNotification();Alert.alert('Teste agendado','O Ping programou uma notificação para daqui a 10 segundos. Bloqueie a tela ou feche o app para verificar.');}
   catch(e){Alert.alert('Teste não agendado',String(e));}
   finally{setTesting(false);}
 }
 async function chooseTheme(next:Appearance){
   if(themeBusy||next===appearance)return;
   setThemeBusy(true);
   try{await changeAppearance(next);}catch(e){Alert.alert('Não foi possível salvar o tema',String(e));}
   finally{setThemeBusy(false);}
 }
 useEffect(()=>{getPreferences().then(setPrefs).catch(console.warn);checkPermission();checkScheduled();},[]);
 async function checkPermission(){
   try{const result=await Notifications.getPermissionsAsync();setPermission(result.granted?'Permitidas':'Não permitidas');}
   catch{setPermission('Não foi possível verificar');}
 }
 async function change(key:keyof Preferences,value:boolean){
   if(busy)return;
   setBusy(true);
   try{
     await setPreference(key,value);
     setPrefs(prev=>({...prev,[key]:value}));
     await rescheduleAllReminders();
   }catch(e){Alert.alert('Não foi possível salvar',String(e));}
   finally{setBusy(false);}
 }
 function confirmDelete(){
   Alert.alert('Apagar todas as tarefas?','Essa ação exclui permanentemente todas as tarefas e cancela seus lembretes. Não é possível desfazer.',[
     {text:'Cancelar',style:'cancel'},
     {text:'Apagar tudo',style:'destructive',onPress:async()=>{
       if(busy)return;
       setBusy(true);
       try{await deleteAllTasks();onDataDeleted();Alert.alert('Pronto','Todas as tarefas foram apagadas.');}
       catch(e){Alert.alert('Não foi possível apagar',String(e));}
       finally{setBusy(false);}
     }}
   ]);
 }
 return <View>
   <Text style={s.kicker}>PING / CONTROLE</Text>
   <Text style={s.heading}>Do seu jeito.</Text>
   <Text style={s.subtitle}>Você decide o que aparece, o que toca e o que fica.</Text>
   <Text style={s.section}>APARÊNCIA</Text>
   <Text style={s.detail}>Escolha como o Ping aparece. A preferência fica salva neste aparelho.</Text>
   <View style={s.themeRow}>
     {(['dark','softLight'] as Appearance[]).map(key=>{
       const palette=palettes[key],selected=appearance===key;
       return <Pressable key={key} accessibilityRole="radio" accessibilityState={{checked:selected}}
         disabled={themeBusy} onPress={()=>chooseTheme(key)} style={[s.themeOption,selected&&s.themeOptionSelected]}>
         <View style={[s.themePreview,{backgroundColor:palette.background,borderColor:palette.border}]}>
           <View style={[s.previewHeader,{backgroundColor:palette.accent}]}/>
           <View style={[s.previewCard,{backgroundColor:palette.surface,borderColor:palette.border}]}>
             <View style={[s.previewLine,{backgroundColor:palette.text,width:'72%'}]}/>
             <View style={[s.previewLine,{backgroundColor:palette.muted,width:'50%',opacity:0.6}]}/>
           </View>
           <View style={[s.previewNav,{backgroundColor:palette.surface,borderColor:palette.border}]}>
             <View style={[s.previewDot,{backgroundColor:palette.accent}]}/>
             <View style={[s.previewDot,{backgroundColor:palette.muted}]}/>
             <View style={[s.previewDot,{backgroundColor:palette.muted}]}/>
           </View>
         </View>
         <Text style={s.themeName}>{key==='dark'?'Original escuro':'Claro suave'}</Text>
         <Text style={s.themeState}>{selected?'✓ SELECIONADO':'TOQUE PARA USAR'}</Text>
       </Pressable>;
     })}
   </View>
   <Text style={s.section}>SEU PERFIL</Text>
   <Text style={s.detail}>Personalize como o Ping fala com você. Tudo fica salvo neste aparelho.</Text>
   <View style={[s.panel,{marginTop:12,paddingVertical:14}]}>
     <Text style={s.title}>Como podemos te chamar?</Text>
     <TextInput accessibilityLabel="Nome para notificações" value={nameDraft} onChangeText={setNameDraft} maxLength={32} placeholder="Seu nome (opcional)" placeholderTextColor={c.muted} style={[s.nameInput,{color:c.text,borderColor:c.border,backgroundColor:c.background}]}/>
     <Pressable accessibilityRole="button" disabled={busy} onPress={saveProfile} style={[s.saveButton,{backgroundColor:c.accent}]}><Text style={{color:c.background,fontWeight:'900'}}>SALVAR NOME</Text></Pressable>
     <Text style={[s.title,{marginTop:18}]}>Como prefere ser tratado?</Text>
     <Text style={s.detail}>Escolha o tom das expressões. Não precisa informar seu gênero.</Text>
     <View style={s.addressRow}>
       {([['masculine','Masculino'],['feminine','Feminino'],['neutral','Neutro']] as [AddressStyle,string][]).map(([key,label])=><Pressable key={key} accessibilityRole="radio" accessibilityState={{checked:prefs.addressStyle===key}} disabled={busy} onPress={()=>chooseAddressStyle(key)} style={[s.addressOption,{borderColor:prefs.addressStyle===key?c.accent:c.border,backgroundColor:prefs.addressStyle===key?c.accentSoft:c.background}]}><Text style={{color:prefs.addressStyle===key?c.text:c.muted,fontWeight:'700',fontSize:11}}>{label}</Text></Pressable>)}
     </View>
   </View>
   <Text style={s.section}>NOTIFICAÇÕES</Text>
   <View style={s.panel}>
     <View style={s.row}><View style={s.copy}><Text style={s.title}>Lembretes ativos</Text><Text style={s.detail}>Ative ou pause os avisos de tarefas.</Text></View><Switch disabled={busy} value={prefs.notifications} onValueChange={v=>change('notifications',v)} trackColor={{false:c.border,true:c.accentSoft}} thumbColor={prefs.notifications?c.accent:c.muted}/></View>
     <View style={s.separator}/>
     <View style={s.row}><View style={s.copy}><Text style={s.title}>Ocultar detalhes</Text><Text style={s.detail}>Não mostrar o nome da tarefa no título ou corpo das novas notificações.</Text></View><Switch disabled={busy} value={prefs.privatePreviews} onValueChange={v=>change('privatePreviews',v)} trackColor={{false:c.border,true:c.accentSoft}} thumbColor={prefs.privatePreviews?c.accent:c.muted}/></View>
     <View style={s.separator}/>
     <Pressable accessibilityRole="button" style={s.row} onPress={checkScheduled}><View style={s.copy}><Text style={s.title}>Lembretes programados ↻</Text><Text style={s.detail}>{scheduledCount===null?'Toque para consultar':scheduledCount+' notificações de tarefas aguardando disparo. Toque para atualizar.'}</Text></View></Pressable>
     <View style={s.separator}/>
     <Pressable accessibilityRole="button" disabled={testing} style={s.row} onPress={sendTest}><View style={s.copy}><Text style={s.title}>Testar notificação em 10 segundos</Text><Text style={s.detail}>Agenda um aviso de teste para verificar a entrega pelo Android, inclusive com o aplicativo fechado.</Text></View></Pressable>
     <View style={s.separator}/>
     <Pressable style={s.row} onPress={()=>Linking.openSettings().catch(e=>Alert.alert('Erro',String(e)))}><View style={s.copy}><Text style={s.title}>Permissões do Android ↗</Text><Text style={s.detail}>Status: {permission}. Ajuste sons, alertas e permissões nas configurações do aparelho.</Text></View></Pressable>
   </View>
   <Text style={s.section}>PRIVACIDADE E DADOS</Text>
   <View style={s.panel}>
     <View style={s.row}><View style={s.copy}><Text style={s.title}>Armazenamento local</Text><Text style={s.detail}>As tarefas são salvas no banco SQLite deste dispositivo. Não há conta ou sincronização em nuvem implementada.</Text></View></View>
     <View style={s.separator}/>
     <Pressable disabled={busy} style={s.row} onPress={confirmDelete}><View style={s.copy}><Text style={[s.title,{color:c.danger}]}>Apagar todas as tarefas</Text><Text style={s.detail}>Exclui tarefas e lembretes associados. Não pode ser desfeito.</Text></View></Pressable>
   </View>
   <Text style={s.section}>SOBRE</Text>
   <View style={s.panel}><View style={s.row}><View style={s.copy}><Text style={s.title}>ping.</Text><Text style={s.detail}>Seus lembretes, suas regras. Versão 1.0.2.</Text></View></View></View>
 </View>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({
 nameInput:{borderWidth:1,borderRadius:9,paddingHorizontal:12,paddingVertical:12,marginTop:7},
 saveButton:{alignItems:'center',padding:13,borderRadius:9,marginTop:10},
 addressRow:{flexDirection:'row',gap:7,marginTop:12},
 addressOption:{flex:1,alignItems:'center',borderWidth:1,borderRadius:9,paddingVertical:12,paddingHorizontal:3},
 themeRow:{flexDirection:'row',gap:12,marginTop:14},
 themeOption:{flex:1,padding:9,borderRadius:13,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},
 themeOptionSelected:{borderColor:c.accent,borderWidth:2,padding:8},
 themePreview:{height:114,borderRadius:9,borderWidth:1,padding:12,justifyContent:'space-between'},
 previewHeader:{width:36,height:8,borderRadius:5},
 previewCard:{borderRadius:6,borderWidth:1,padding:10,gap:7},
 previewLine:{height:5,borderRadius:4},
 previewNav:{height:18,borderWidth:1,borderRadius:5,flexDirection:'row',justifyContent:'space-evenly',alignItems:'center'},
 previewDot:{height:5,width:13,borderRadius:3},
 themeName:{color:c.text,fontWeight:'800',fontSize:12,marginTop:10},
 themeState:{color:c.accent,fontWeight:'800',fontSize:9,marginTop:5,letterSpacing:0.5},
 kicker:{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:2,marginBottom:13},
 heading:{color:c.text,fontSize:38,fontWeight:'900',letterSpacing:-1.5,marginBottom:10},
 subtitle:{color:c.muted,fontSize:13,lineHeight:20,marginBottom:15},
 section:{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:1.5,marginTop:24,marginBottom:12},
 panel:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:12,paddingHorizontal:15},
 row:{flexDirection:'row',alignItems:'center',paddingVertical:17,gap:14},
 copy:{flex:1},title:{color:c.text,fontSize:14,fontWeight:'800',marginBottom:5},
 detail:{color:c.muted,fontSize:12,lineHeight:18},
 separator:{height:1,backgroundColor:c.border}
});
