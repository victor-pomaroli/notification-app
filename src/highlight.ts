/**
 * Pedido de "destacar tarefa" vindo de fora da tela (toque na notificação ou numa linha
 * do widget). Fica guardado até a aba Hoje montar e consumir, então funciona também
 * com o app abrindo do zero.
 */
let pending:number|null=null;
const listeners=new Set<()=>void>();
export function requestHighlight(id:number){
  if(!Number.isFinite(id)||id<=0)return;
  pending=id;
  listeners.forEach(listener=>listener());
}
export function takePendingHighlight(){const id=pending;pending=null;return id;}
export function onHighlightRequest(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
