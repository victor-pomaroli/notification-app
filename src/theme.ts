import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {getPreferences,setPreference} from './preferences';
import {normalizeAppearance} from './appearance';

export const theme={
  background:'#111310',surface:'#1C201A',surfaceRaised:'#262C23',
  border:'#353C30',text:'#F4F1E7',muted:'#A4AA9A',
  accent:'#D7FC65',accentSoft:'#354326',danger:'#FF887B',
  success:'#D7FC65',warning:'#F7C66F',
  /** Cor dos eventos (bolinha no calendário), distinta do realce das tarefas. */
  event:'#7FB8FF',
};
export type ThemeColors={ [K in keyof typeof theme]: string };
export {appearances,appearanceNames,isDarkAppearance,normalizeAppearance,type Appearance} from './appearance';
import type {Appearance} from './appearance';
export const palettes:Record<Appearance,ThemeColors>={
  dark:theme,
  softLight:{
    background:'#E9EADF',surface:'#F5F4EB',surfaceRaised:'#FFFEF6',
    border:'#CACDBE',text:'#242A22',muted:'#656D60',
    accent:'#536D23',accentSoft:'#DFE8C7',danger:'#B54D45',
    success:'#536D23',warning:'#A46E1D',
    event:'#2F6DB5',
  },
  // Rosa: mesma lógica do claro suave (fundo de papel, realce escuro e saturado), puxado para o rosa.
  // O vermelho de atraso foi para o laranja-tijolo para não se confundir com o realce rosa.
  rose:{
    background:'#F6E6EC',surface:'#FCF2F5',surfaceRaised:'#FFF9FB',
    border:'#E4C6D2',text:'#3A2230',muted:'#7E6271',
    accent:'#B4306A',accentSoft:'#F8DDE8',danger:'#C24A1E',
    success:'#B4306A',warning:'#A2650E',
    event:'#3466B8',
  },
  // Azul: mesma lógica do escuro original (carvão + realce neon), em azul-marinho com realce ciano.
  // Evento vira lilás para não se confundir com o realce azul.
  ocean:{
    background:'#0D1424',surface:'#162036',surfaceRaised:'#1F2B45',
    border:'#2C3A58',text:'#EAF0FA',muted:'#98A6C0',
    accent:'#6FD6FF',accentSoft:'#1E3A55',danger:'#FF8A80',
    success:'#6FD6FF',warning:'#F7C66F',
    event:'#C7A6FF',
  },
};
type ThemeContextValue={colors:ThemeColors;appearance:Appearance;changeAppearance:(value:Appearance)=>Promise<void>};
const ThemeContext=createContext<ThemeContextValue>({
  colors:theme,appearance:'dark',changeAppearance:async()=>{},
});
export function ThemeProvider({children}:{children:React.ReactNode}){
  const [appearance,setAppearance]=useState<Appearance>('dark');
  useEffect(()=>{let active=true;getPreferences().then(p=>{if(active)setAppearance(normalizeAppearance(p.appearance));}).catch(console.warn);return()=>{active=false;};},[]);
  const changeAppearance=async(value:Appearance)=>{
    await setPreference('appearance',value);
    setAppearance(value);
    // O widget segue o tema do app.
    import('./widget/sync').then(m=>m.refreshPingWidget()).catch(()=>{});
  };
  const value=useMemo(()=>({colors:palettes[appearance]??theme,appearance,changeAppearance}),[appearance]);
  return React.createElement(ThemeContext.Provider,{value},children);
}
export const useAppTheme=()=>useContext(ThemeContext);

/** Cores características de cada assunto (texto/realce e fundo do chip), por aparência. */
export const categoryColors:Record<Appearance,Record<'study'|'work'|'finance'|'home'|'health'|'general',{text:string;surface:string}>>={
  dark:{study:{text:'#A9B8FF',surface:'#29314A'},work:{text:'#7DDCC7',surface:'#203C35'},finance:{text:'#F7CE7A',surface:'#44371F'},home:{text:'#FFAD91',surface:'#493026'},health:{text:'#A5E8A3',surface:'#28422A'},general:{text:'#D7FC65',surface:'#354326'}},
  softLight:{study:{text:'#394E9A',surface:'#E1E7FF'},work:{text:'#176F5A',surface:'#D9F2E8'},finance:{text:'#896018',surface:'#FFF0C9'},home:{text:'#A34F35',surface:'#FBE5DC'},health:{text:'#39763D',surface:'#E0F2DD'},general:{text:'#536D23',surface:'#DFE8C7'}},
  rose:{study:{text:'#394E9A',surface:'#E4E6FB'},work:{text:'#176F5A',surface:'#DCEFE8'},finance:{text:'#87600F',surface:'#FBEACB'},home:{text:'#A0482A',surface:'#F9E0D6'},health:{text:'#39763D',surface:'#E2EFDC'},general:{text:'#B4306A',surface:'#F8DDE8'}},
  ocean:{study:{text:'#9DB0FF',surface:'#25305A'},work:{text:'#7DDCC7',surface:'#1C3A3C'},finance:{text:'#F7CE7A',surface:'#3D3524'},home:{text:'#FFAD91',surface:'#45302E'},health:{text:'#A5E8A3',surface:'#24402F'},general:{text:'#6FD6FF',surface:'#1E3A55'}},
};
/** Cores da urgência, usadas no risco da lista e na criação. */
export const priorityColors={low:'#77CDA3',medium:'#F7C66F',high:'#FF887B'} as const;
