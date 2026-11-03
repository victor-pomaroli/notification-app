import React,{useCallback,useState} from 'react';
import {View,Text,FlatList,Pressable,Alert} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Task,listArchivedTasks,restoreArchivedTask} from '../src/store';
import {useAppTheme} from '../src/theme';
import {categories} from '../src/templates';

const PAGE=40;
export default function Archive(){
 const {colors:c}=useAppTheme();
 const router=useRouter();
 const [tasks,setTasks]=useState<Task[]>([]);
 const [loading,setLoading]=useState(false);
 const [hasMore,setHasMore]=useState(true);
 const load=useCallback(async(reset=false)=>{
   if(loading&&!reset)return;
   setLoading(true);
   try{
     const rows=await listArchivedTasks(PAGE,reset?0:tasks.length);
     setTasks(old=>reset?rows:[...old,...rows.filter(t=>!old.some(x=>x.id===t.id))]);
     setHasMore(rows.length===PAGE);
   }catch(e){Alert.alert('Erro ao carregar histórico',String(e));}
   finally{setLoading(false);}
 },[loading,tasks.length]);
 useFocusEffect(useCallback(()=>{listArchivedTasks(PAGE,0).then(rows=>{setTasks(rows);setHasMore(rows.length===PAGE);}).catch(e=>Alert.alert('Erro',String(e)));},[]));
 async function restore(task:Task){
   try{await restoreArchivedTask(task.id);setTasks(old=>old.filter(t=>t.id!==task.id));}
   catch(e){Alert.alert('Não foi possível restaurar',String(e));}
 }
 return <View style={{flex:1,backgroundColor:c.background,paddingHorizontal:22,paddingTop:18}}>
   <Text style={{fontSize:31,fontWeight:'900',color:c.text,marginBottom:6}}>Histórico.</Text>
   <Text style={{color:c.muted,marginBottom:18}}>Tarefas concluídas há mais de 30 dias são arquivadas automaticamente. Toque para restaurar à lista.</Text>
   <FlatList data={tasks} keyExtractor={t=>String(t.id)} onEndReached={()=>{if(hasMore&&!loading)load();}} onEndReachedThreshold={0.4}
    ListEmptyComponent={<Text style={{color:c.muted,paddingVertical:20}}>Nenhuma tarefa arquivada.</Text>}
    ListFooterComponent={hasMore?<Pressable disabled={loading} onPress={()=>load()} style={{padding:18,alignItems:'center'}}><Text style={{color:c.accent}}>{loading?'Carregando...':'Carregar mais'}</Text></Pressable>:undefined}
    renderItem={({item})=><Pressable onPress={()=>restore(item)} style={{borderBottomWidth:1,borderColor:c.border,paddingVertical:17,gap:5}}>
      <Text style={{color:c.text,fontSize:16,fontWeight:'800'}} numberOfLines={2}>{item.title}</Text>
      <Text style={{color:c.muted,fontSize:12}}>{categories[item.category]??'Geral'} · Concluída {new Date(item.completed_at??item.due_at).toLocaleDateString('pt-BR')}</Text>
      <Text style={{color:c.accent,fontSize:11,fontWeight:'800'}}>RESTAURAR À LISTA</Text>
    </Pressable>}/>
 </View>;
}
