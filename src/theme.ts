import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {getPreferences,setPreference} from './preferences';

export const theme={
  background:'#111310',surface:'#1C201A',surfaceRaised:'#262C23',
  border:'#353C30',text:'#F4F1E7',muted:'#A4AA9A',
  accent:'#D7FC65',accentSoft:'#354326',danger:'#FF887B',
  success:'#D7FC65',warning:'#F7C66F',
};
export type ThemeColors=typeof theme;
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
