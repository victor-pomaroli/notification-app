import React,{useEffect,useState} from 'react';
import {Animated,Dimensions,Easing,StyleSheet,View} from 'react-native';

type Piece={x:number;drift:number;size:number;color:string;round:boolean;spin:number;delay:number;duration:number;progress:Animated.Value};
const COUNT=42;

/**
 * Chuva de confete de recompensa. Cada mudança de `fireKey` (> 0) dispara uma rodada;
 * tudo roda no driver nativo e some sozinho, sem bloquear toques.
 */
export function Confetti({fireKey,colors}:{fireKey:number;colors:string[]}){
  const [pieces,setPieces]=useState<Piece[]>([]);
  useEffect(()=>{
    if(fireKey<=0)return;
    const {width}=Dimensions.get('window');
    const next=Array.from({length:COUNT},(_,i):Piece=>({
      x:Math.random()*width,
      drift:(Math.random()-0.5)*140,
      size:7+Math.random()*7,
      color:colors[i%colors.length],
      round:Math.random()<0.3,
      spin:(Math.random()<0.5?-1:1)*(360+Math.random()*540),
      delay:Math.random()*350,
      duration:1700+Math.random()*1100,
      progress:new Animated.Value(0),
    }));
    setPieces(next);
    const animation=Animated.parallel(next.map(p=>Animated.timing(p.progress,{toValue:1,duration:p.duration,delay:p.delay,easing:Easing.out(Easing.quad),useNativeDriver:true})));
    animation.start(({finished})=>{if(finished)setPieces([]);});
    return()=>animation.stop();
  },[fireKey]);
  if(!pieces.length)return null;
  const {height}=Dimensions.get('window');
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{zIndex:50,elevation:50}]}>
    {pieces.map((p,i)=><Animated.View key={i} style={{
      position:'absolute',left:p.x,top:-20,width:p.size,height:p.round?p.size:p.size*0.45,borderRadius:p.round?p.size/2:1.5,backgroundColor:p.color,
      opacity:p.progress.interpolate({inputRange:[0,0.8,1],outputRange:[1,1,0]}),
      transform:[
        {translateY:p.progress.interpolate({inputRange:[0,1],outputRange:[0,height*0.85]})},
        {translateX:p.progress.interpolate({inputRange:[0,0.5,1],outputRange:[0,p.drift,p.drift*0.4]})},
        {rotate:p.progress.interpolate({inputRange:[0,1],outputRange:['0deg',`${p.spin}deg`]})},
      ],
    }}/>)}
  </View>;
}
