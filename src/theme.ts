import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {getPreferences,setPreference} from './preferences';

export const theme={
  background:'#111310',surface:'#1C201A',surfaceRaised:'#262C23',
  border:'#353C30',text:'#F4F1E7',muted:'#A4AA9A',
  accent:'#D7FC65',accentSoft:'#354326',danger:'#FF887B',
  success:'#D7FC65',warning:'#F7C66F',
};
export type ThemeColors={ [K in keyof typeof theme]: string };
export type Appearance='dark'|'softLight';
export const palettes:Record<Appearance,ThemeColors>={
  dark:theme,
  softLight:{
    background:'#E9EADF',surface:'#F5F4EB',surfaceRaised:'#FFFEF6',
    border:'#CACDBE',text:'#242A22',muted:'#656D60',
    accent:'#536D23',accentSoft:'#DFE8C7',danger:'#B54D45',
    success:'#536D23',warning:'#A46E1D',
  },
};
type ThemeContextValue={colors:ThemeColors;appearance:Appearance;changeAppearance:(value:Appearance)=>Promise<void>};
const ThemeContext=createContext<ThemeContextValue>({
  colors:theme,appearance:'dark',changeAppearance:async()=>{},
});
export function ThemeProvider({children}:{children:React.ReactNode}){
  const [appearance,setAppearance]=useState<Appearance>('dark');
  useEffect(()=>{let active=true;getPreferences().then(p=>{if(active)setAppearance(p.appearance);}).catch(console.warn);return()=>{active=false;};},[]);
  const changeAppearance=async(value:Appearance)=>{
    await setPreference('appearance',value);
    setAppearance(value);
  };
  const value=useMemo(()=>({colors:palettes[appearance],appearance,changeAppearance}),[appearance]);
  return React.createElement(ThemeContext.Provider,{value},children);
}
export const useAppTheme=()=>useContext(ThemeContext);

/** Cores características de cada assunto (texto/realce e fundo do chip), por aparência. */
export const categoryColors:Record<Appearance,Record<'study'|'work'|'finance'|'home'|'health'|'general',{text:string;surface:string}>>={
  dark:{study:{text:'#A9B8FF',surface:'#29314A'},work:{text:'#7DDCC7',surface:'#203C35'},finance:{text:'#F7CE7A',surface:'#44371F'},home:{text:'#FFAD91',surface:'#493026'},health:{text:'#A5E8A3',surface:'#28422A'},general:{text:'#D7FC65',surface:'#354326'}},
  softLight:{study:{text:'#394E9A',surface:'#E1E7FF'},work:{text:'#176F5A',surface:'#D9F2E8'},finance:{text:'#896018',surface:'#FFF0C9'},home:{text:'#A34F35',surface:'#FBE5DC'},health:{text:'#39763D',surface:'#E0F2DD'},general:{text:'#536D23',surface:'#DFE8C7'}},
};
/** Cores da urgência, usadas no risco da lista e na criação. */
export const priorityColors={low:'#77CDA3',medium:'#F7C66F',high:'#FF887B'} as const;
