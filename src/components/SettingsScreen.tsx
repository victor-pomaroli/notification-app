import React,{useEffect,useState} from 'react';
import {View,Text,Switch,Pressable,StyleSheet,Alert,Linking} from 'react-native';
import * as Notifications from 'expo-notifications';
import {getPreferences,setPreference,Preferences} from '../preferences';
import {rescheduleAllReminders,deleteAllTasks} from '../store';
import {useAppTheme,ThemeColors} from '../theme';

export function SettingsScreen({onDataDeleted}:{onDataDeleted:()=>void}){
 const {colors:c}=useAppTheme();
 const s=React.useMemo(()=>createStyles(c),[c]);
 const [prefs,setPrefs]=useState<Preferences>({notifications:true,privatePreviews:false});
 const [busy,setBusy]=useState(false);
 const [permission,setPermission]=useState('Verificando...');
 useEffect(()=>{getPreferences().then(setPrefs).catch(console.warn);checkPermission();},[]);
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
   <Text style={s.section}>NOTIFICAÇÕES</Text>
   <View style={s.panel}>
     <View style={s.row}><View style={s.copy}><Text style={s.title}>Lembretes ativos</Text><Text style={s.detail}>Ative ou pause os avisos de tarefas.</Text></View><Switch disabled={busy} value={prefs.notifications} onValueChange={v=>change('notifications',v)} trackColor={{false:c.border,true:c.accentSoft}} thumbColor={prefs.notifications?c.accent:c.muted}/></View>
     <View style={s.separator}/>
     <View style={s.row}><View style={s.copy}><Text style={s.title}>Ocultar detalhes</Text><Text style={s.detail}>Não mostrar o nome da tarefa no título ou corpo das novas notificações.</Text></View><Switch disabled={busy} value={prefs.privatePreviews} onValueChange={v=>change('privatePreviews',v)} trackColor={{false:c.border,true:c.accentSoft}} thumbColor={prefs.privatePreviews?c.accent:c.muted}/></View>
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
