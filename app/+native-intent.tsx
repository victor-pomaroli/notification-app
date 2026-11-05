import {requestHighlight} from '../src/highlight';

/**
 * Links do widget no formato ping://highlight/<id>: em vez de abrir uma rota, guardam o
 * pedido de destaque e levam para a tela inicial (aba Hoje), que rola até a tarefa e pisca.
 */
export function redirectSystemPath({path}:{path:string;initial:boolean}){
  try{
    const match=/highlight\/(\d+)/.exec(path);
    if(match){requestHighlight(Number(match[1]));return '/';}
  }catch(e){console.warn('[intent]',e);}
  return path;
}
