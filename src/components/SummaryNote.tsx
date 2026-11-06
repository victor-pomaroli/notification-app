import React,{useEffect,useRef} from 'react';
import {View,Text,StyleSheet,Animated,Easing} from 'react-native';
import {isDarkAppearance,type Appearance} from '../theme';

/**
 * "O resumo da ópera" da aba Hoje. Cada tema tem um papel diferente, desenhado só com Views:
 * - temas escuros (original e azul): folha de bloco arrancada (faixa da espiral com furos) presa por fita;
 * - temas claros (suave e rosa): post-it quadrado clássico com tachinha e a ponta de baixo levantando.
 * As cores de cada tema ficam em `binderColors`/`postitColors`; o desenho e a animação são os mesmos.
 */
type Props={appearance:Appearance;page:string;left:number;overdue:number;today:number;done:number;celebrateKey?:number};

const pad=(n:number)=>String(n).padStart(2,'0');
const plural=(n:number,one:string,many:string)=>`${n} ${n===1?one:many}`;
/** Rótulo que muda com o estado do dia, em vez de um título fixo. */
function moodLabel(left:number,overdue:number,done:number){
  if(overdue>0)return 'TÁ DEVENDO';
  if(left>0)return done>0&&left<=2?'FALTA POUCO':'AINDA HOJE';
  return done>0?'MISSÃO CUMPRIDA':'DIA EM BRANCO';
}

export function SummaryNote({appearance,page,left,overdue,today,done,celebrateKey=0}:Props){
  const binder=isDarkAppearance(appearance);
  const bc=binderColors[appearance]??binderColors.dark;
  const pc=postitColors[appearance]??postitColors.softLight;
  const look=binder?{...dark,...bc}:{...light,...pc};
  const total=left+done;
  // Comemoração: o papel dá um pulinho e balança preso na fita/tachinha, amortecendo até parar.
  const wobble=useRef(new Animated.Value(0)).current;
  const lift=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(celebrateKey<=0)return;
    wobble.setValue(0);lift.setValue(0);
    const swing=(to:number,duration:number)=>Animated.timing(wobble,{toValue:to,duration,easing:Easing.inOut(Easing.sin),useNativeDriver:true});
    const animation=Animated.parallel([
      Animated.sequence([
        Animated.timing(lift,{toValue:1,duration:160,easing:Easing.out(Easing.quad),useNativeDriver:true}),
        Animated.spring(lift,{toValue:0,friction:4,tension:120,useNativeDriver:true}),
      ]),
      Animated.sequence([swing(1,140),swing(-0.85,180),swing(0.6,170),swing(-0.4,160),swing(0.2,150),swing(0,140)]),
    ]);
    animation.start();
    return()=>animation.stop();
  },[celebrateKey]);
  const motion={transform:[
    {translateY:lift.interpolate({inputRange:[0,1],outputRange:[0,-10]})},
    {scale:lift.interpolate({inputRange:[0,1],outputRange:[1,1.04]})},
    {rotate:wobble.interpolate({inputRange:[-1,1],outputRange:['-5deg','5deg']})},
  ]};
  return <Animated.View style={[look.wrap,motion]}>
    {binder?<View pointerEvents="none" style={[dark.tape,{backgroundColor:bc.tape}]}/>:null}
    <View style={[look.sheet,binder&&{backgroundColor:look.paper}]}>
      {binder
        ?<View style={[dark.binding,{backgroundColor:bc.binding}]}><View style={dark.holes}>{[0,1,2,3,4].map(i=><View key={i} style={[dark.hole,{backgroundColor:page}]}><View style={[dark.ring,{backgroundColor:page}]}/></View>)}</View></View>
        :<LiftedPaper colors={pc}/>}
      <Text style={[base.label,{color:look.ink}]}>{moodLabel(left,overdue,done)}</Text>
      <View style={base.numbers}>
        <Text style={[base.big,{color:look.ink}]}>{pad(left)}</Text>
        <View style={base.side}>
          <Text style={[base.sideBig,{color:look.ink}]}>{plural(overdue,'atrasada','atrasadas')}</Text>
          <Text style={[base.sideSmall,{color:look.ink}]}>{today} pra hoje</Text>
        </View>
      </View>
      <View style={[base.done,{borderTopColor:look.rule}]}>
        <View style={[base.stamp,{borderColor:look.ink}]}><Text style={[base.stampText,{color:look.ink}]}>✓ {pad(done)} {done===1?'FEITA':'FEITAS'}</Text></View>
        <Progress done={done} total={total} ink={look.ink} empty={look.rule}/>
        <Text style={[base.frac,{color:look.ink}]}>{done}/{total}</Text>
      </View>
      {!binder?<View pointerEvents="none" style={[light.pin,{backgroundColor:pc.pin}]}><View style={light.pinShine}/></View>:null}
    </View>
  </Animated.View>;
}

/**
 * Papel do tema claro sem o canto de baixo: corpo + faixa inferior (sem o quadrado do canto),
 * cada um com sua sombra. Assim nem a sombra nem o papel aparecem atrás da ponta levantada;
 * no canto fica só a aba dobrada e a sombrinha que ela projeta.
 */
function LiftedPaper({colors}:{colors:PostitColors}){
  const C=light.corner;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={[light.piece,{top:4,left:2,right:-2,bottom:C-4,backgroundColor:colors.shadow}]}/>
    <View style={[light.piece,{left:2,bottom:-4,height:C,right:C-2,backgroundColor:colors.shadow}]}/>
    <View style={[light.piece,{top:0,left:0,right:0,bottom:C,backgroundColor:colors.paper,borderTopLeftRadius:2,borderTopRightRadius:2}]}/>
    <View style={[light.piece,{left:0,bottom:0,height:C,right:C,backgroundColor:colors.paper,borderBottomLeftRadius:2}]}/>
    <View style={[light.flap,{right:-3,bottom:-3,borderTopColor:colors.shadow}]}/>
    <View style={[light.flap,{right:0,bottom:0,borderTopColor:colors.curlColor}]}/>
  </View>;
}

/** Segmentos quando cabem (até 8); acima disso, uma barra contínua. */
function Progress({done,total,ink,empty}:{done:number;total:number;ink:string;empty:string}){
  if(total>0&&total<=8)return <View style={base.track}>{Array.from({length:total},(_,i)=><View key={i} style={[base.segment,{backgroundColor:i<done?ink:empty}]}/>)}</View>;
  return <View style={[base.track,base.bar,{backgroundColor:empty}]}><View style={[base.fill,{backgroundColor:ink,width:`${total?Math.round(done/total*100):0}%`}]}/></View>;
}

const base=StyleSheet.create({
  label:{fontWeight:'900',letterSpacing:2,fontSize:10},
  numbers:{flexDirection:'row',alignItems:'center',gap:18,marginTop:4},
  big:{fontSize:58,fontWeight:'900',letterSpacing:-4,includeFontPadding:false},
  side:{gap:6},
  sideBig:{fontWeight:'900',fontSize:17},
  sideSmall:{fontWeight:'600',fontSize:14},
  done:{flexDirection:'row',alignItems:'center',gap:10,marginTop:12,paddingTop:12,borderTopWidth:1.5,borderStyle:'dashed'},
  stamp:{borderWidth:2,borderRadius:6,paddingHorizontal:7,paddingVertical:3,transform:[{rotate:'-3deg'}]},
  stampText:{fontSize:11,fontWeight:'900',letterSpacing:1},
  track:{flex:1,flexDirection:'row',gap:4},
  segment:{flex:1,height:7,borderRadius:4},
  bar:{height:7,borderRadius:4,overflow:'hidden'},
  fill:{height:7,borderRadius:4},
  frac:{fontSize:12,fontWeight:'700',fontVariant:['tabular-nums']},
});

type BinderColors={paper:string;ink:string;rule:string;binding:string;tape:string};
type PostitColors={paper:string;ink:string;rule:string;curlColor:string;shadow:string;pin:string};
/** Folha de bloco: papel no tom do realce, faixa um pouco mais escura e fita de cor contrastante. */
const binderColors:Partial<Record<Appearance,BinderColors>>&{dark:BinderColors}={
  dark:{paper:'#D7FC65',ink:'#111310',rule:'rgba(17,19,16,0.25)',binding:'#B5D653',tape:'rgba(125,220,199,0.78)'},
  ocean:{paper:'#6FD6FF',ink:'#0D1424',rule:'rgba(13,20,36,0.25)',binding:'#4DB4E0',tape:'rgba(255,170,214,0.8)'},
};
/** Post-it: papel claro mas destacado do fundo, dobra um tom abaixo e tachinha contrastante. */
const postitColors:Partial<Record<Appearance,PostitColors>>&{softLight:PostitColors}={
  softLight:{paper:'#F3F1A6',ink:'#2B3020',rule:'rgba(43,48,32,0.22)',curlColor:'#D9D681',shadow:'rgba(91,90,42,0.16)',pin:'#D9574A'},
  rose:{paper:'#FFC2DA',ink:'#3A1B2B',rule:'rgba(58,27,43,0.22)',curlColor:'#EC9DBE',shadow:'rgba(120,40,80,0.18)',pin:'#2F8F89'},
};

const dark={
  ...StyleSheet.create({
    wrap:{marginTop:4,marginBottom:12,marginHorizontal:4},
    sheet:{borderRadius:3,paddingHorizontal:22,paddingBottom:20,transform:[{rotate:'-1.4deg'}],elevation:3,shadowColor:'#000',shadowOffset:{width:0,height:3},shadowOpacity:0.2,shadowRadius:6},
    binding:{height:24,marginHorizontal:-22,marginBottom:12,borderTopLeftRadius:3,borderTopRightRadius:3},
    holes:{position:'absolute',top:-7,right:22,flexDirection:'row',gap:16},
    hole:{width:13,height:17,borderRadius:7},
    ring:{position:'absolute',left:5,top:13,width:3,height:9,borderRadius:2},
    tape:{position:'absolute',left:-14,top:-10,width:92,height:28,borderRadius:2,transform:[{rotate:'-24deg'}],zIndex:5,elevation:5},
  }),
};

const light={
  corner:30,
  ...StyleSheet.create({
    wrap:{marginTop:10,marginBottom:12,marginHorizontal:6},
    sheet:{padding:20,paddingTop:22,paddingBottom:24,transform:[{rotate:'1.2deg'}]},
    piece:{position:'absolute'},
    // Aba dobrada: metade de cima-esquerda do quadrado do canto.
    flap:{position:'absolute',width:0,height:0,borderTopWidth:30,borderRightWidth:30,borderRightColor:'transparent'},
    pin:{position:'absolute',top:-9,alignSelf:'center',width:20,height:20,borderRadius:10,elevation:6,shadowColor:'#000',shadowOffset:{width:1,height:2},shadowOpacity:0.3,shadowRadius:2,zIndex:5},
    pinShine:{position:'absolute',top:4,left:5,width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.55)'},
  }),
};
