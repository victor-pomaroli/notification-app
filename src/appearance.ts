/** Temas do Ping. Arquivo separado para preferences.ts e theme.ts não se importarem em ciclo. */
export type Appearance='dark'|'softLight'|'rose'|'ocean';
/** Ordem em que os temas aparecem para escolher (os dois originais primeiro). */
export const appearances:Appearance[]=['dark','softLight','rose','ocean'];
export const appearanceNames:Record<Appearance,string>={dark:'Original escuro',softLight:'Claro suave',rose:'Rosa chiclete',ocean:'Azul noturno'};
/** Temas de fundo escuro (barra de status clara, papel de bloco na nota). */
export const isDarkAppearance=(a:Appearance)=>a==='dark'||a==='ocean';
export const normalizeAppearance=(v:unknown):Appearance=>appearances.includes(v as Appearance)?v as Appearance:'dark';
