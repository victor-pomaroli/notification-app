import React,{useRef,useState} from 'react';
import {View,Text,Animated,TextStyle} from 'react-native';
import {ThemeColors} from '../theme';
/** Título com o risco animado de tarefa concluída (mesmo estilo em Home, Tarefas e Calendário). */
export function TaskTitle({title,completed,colors,style,numberOfLines}:{title:string;completed:boolean;colors:ThemeColors;style?:TextStyle;numberOfLines?:number}){
  const progress=useRef(new Animated.Value(completed?0:1)).current;
  const [width,setWidth]=useState(0);
  React.useEffect(()=>{
    const animation=Animated.timing(progress,{toValue:completed?1:0,duration:250,useNativeDriver:false});
    animation.start();
    return()=>animation.stop();
  },[completed,progress]);
  return <View style={{alignSelf:'flex-start',maxWidth:'100%'}}>
    <Text numberOfLines={numberOfLines} onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={[{color:completed?colors.muted:colors.text,fontSize:17,fontWeight:'700',letterSpacing:-0.3,opacity:completed?0.82:1},style]}>{title}</Text>
    {completed&&width>0?<Animated.View pointerEvents="none" style={{position:'absolute',left:0,top:'50%',height:2.5,borderRadius:2,backgroundColor:colors.accent,width:progress.interpolate({inputRange:[0,1],outputRange:[0,width]})}}/>:null}
  </View>;
}
