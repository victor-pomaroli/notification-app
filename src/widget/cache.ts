import type {Appearance} from '../theme';
import type {WidgetTask} from './PingTasksWidget';

/**
 * Último conteúdo desenhado no widget. O toque na caixa redesenha na hora a partir
 * daqui (resposta otimista) e só depois grava no banco. O processo JS do app e o da
 * tarefa do widget costumam ser o mesmo, então o cache vale para os dois.
 */
export type WidgetSnapshot={pending:WidgetTask[];done:WidgetTask[];appearance:Appearance};
let snapshot:WidgetSnapshot|null=null;
export const getWidgetSnapshot=()=>snapshot;
export function setWidgetSnapshot(next:WidgetSnapshot){snapshot=next;}

const order=(a:WidgetTask,b:WidgetTask)=>(a.no_due??0)-(b.no_due??0)||a.due_at-b.due_at||a.id-b.id;
/** Move a tarefa entre pendentes e concluídas sem ir ao banco. null = não está no cache. */
export function toggleInSnapshot(base:WidgetSnapshot,id:number,completed:boolean):WidgetSnapshot|null{
  const from=completed?base.pending:base.done;
  const task=from.find(t=>t.id===id);
  if(!task)return null;
  const moved={...task,completed_at:completed?Date.now():null};
  const pending=completed?base.pending.filter(t=>t.id!==id):[...base.pending,moved].sort(order);
  const done=completed?[moved,...base.done]:base.done.filter(t=>t.id!==id);
  return {...base,pending,done};
}
export const sameIds=(a:WidgetTask[],b:WidgetTask[])=>a.length===b.length&&a.every((t,i)=>t.id===b[i].id);
