import React from 'react';
import {View,Text,ScrollView,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SettingsScreen} from '../src/components/SettingsScreen';
import {useAppTheme} from '../src/theme';

export default function SettingsPage(){
  const {colors:c}=useAppTheme();
  const router=useRouter();
  const insets=useSafeAreaInsets();
  return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{paddingHorizontal:23,paddingTop:20,paddingBottom:insets.bottom+50}}>
    <SettingsScreen onDataDeleted={()=>router.back()}/>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/archive')} style={{marginTop:22,padding:17,backgroundColor:c.surface,borderRadius:10,borderWidth:1,borderColor:c.border}}>
      <Text style={{color:c.accent,fontWeight:'900'}}>HISTÓRICO DE TAREFAS ARQUIVADAS →</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:6}}>Consulte e restaure tarefas concluídas há mais de 30 dias.</Text>
    </Pressable>
  </ScrollView>;
}
