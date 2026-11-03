import React from 'react';
import {Modal,View,Text,Pressable,StyleSheet,ActivityIndicator} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme,ThemeColors} from '../theme';

type Props={
  visible:boolean;
  eyebrow?:string;
  title:string;
  message?:string;
  confirmLabel?:string;
  cancelLabel?:string;
  destructive?:boolean;
  busy?:boolean;
  onConfirm:()=>void;
  onClose:()=>void;
};
export function PingDialog({visible,eyebrow='PING / ATENÇÃO',title,message,confirmLabel='ENTENDI',cancelLabel,onConfirm,onClose,destructive=false,busy=false}:Props){
  const insets=useSafeAreaInsets();
  const {colors:c}=useAppTheme();
  const s=React.useMemo(()=>createStyles(c),[c]);
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Fechar diálogo" onPress={busy?undefined:onClose}/>
      <View style={[s.sheet,{marginBottom:Math.max(insets.bottom,16)}]} accessibilityViewIsModal>
        <View style={s.handle}/>
        <Text style={s.eyebrow}>{eyebrow}</Text>
        <Text style={s.title}>{title}</Text>
        {message?<Text style={s.message}>{message}</Text>:null}
        <View style={s.actions}>
          {cancelLabel?<Pressable disabled={busy} accessibilityRole="button" onPress={onClose} style={s.cancel}><Text style={s.cancelText}>{cancelLabel}</Text></Pressable>:null}
          <Pressable disabled={busy} accessibilityRole="button" onPress={onConfirm} style={[s.confirm,destructive&&s.destructive,busy&&{opacity:.65}]}>
            {busy?<ActivityIndicator color={c.background}/>:<Text style={s.confirmText}>{confirmLabel}</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.72)',justifyContent:'flex-end',paddingHorizontal:12},
  sheet:{backgroundColor:c.surfaceRaised,borderRadius:15,paddingHorizontal:24,paddingTop:14,paddingBottom:24,borderWidth:1,borderColor:c.border},
  handle:{width:40,height:4,borderRadius:3,backgroundColor:c.border,alignSelf:'center',marginBottom:28},
  eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:2,color:c.accent,marginBottom:12},
  title:{fontSize:30,fontWeight:'900',letterSpacing:-1.1,color:c.text,lineHeight:34},
  message:{color:c.muted,fontSize:14,lineHeight:22,marginTop:13,marginBottom:8},
  actions:{flexDirection:'row',gap:10,marginTop:26},
  cancel:{flex:1,padding:17,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:c.border},
  cancelText:{color:c.text,fontSize:12,fontWeight:'900',letterSpacing:1},
  confirm:{flex:1,padding:17,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:c.accent},
  destructive:{backgroundColor:c.danger},
  confirmText:{color:c.background,fontSize:12,fontWeight:'900',letterSpacing:1},
});
