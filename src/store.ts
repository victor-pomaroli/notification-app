import * as SQLite from 'expo-sqlite';
import {getPreferences} from './preferences';
import {reminderOffsets} from './templates';
import {TaskCategory} from './templates';
import {SNOOZE_STAGE,cancelTaskReminders,scheduleTaskReminders,scheduleSnoozeReminder,dismissTaskNotifications,dismissAllTaskNotifications,ScheduledReminder} from './notifications';
export type Task={id:number;title:string;description:string;due_at:number;priority:'low'|'medium'|'high';category:TaskCategory;completed:number;completed_at:number|null;archived_at:number|null;notification_id:string|null};
export type TaskInput=Pick<Task,'title'|'description'|'due_at'|'priority'|'category'>;
const dbPromise=SQLite.openDatabaseAsync('tasks.db');
const ready=(async()=>{
  const db=await dbPromise;
  await db.execAsync(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',due_at INTEGER NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',completed INTEGER NOT NULL DEFAULT 0,
    notification_id TEXT,category TEXT NOT NULL DEFAULT 'general'
  );
  CREATE TABLE IF NOT EXISTS task_notifications (
    notification_id TEXT PRIMARY KEY,task_id INTEGER NOT NULL,
    stage INTEGER NOT NULL,scheduled_at INTEGER NOT NULL,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_task_notifications_task ON task_notifications(task_id);`);
  const cols=await db.getAllAsync<{name:string}>('PRAGMA table_info(tasks)');
  if(!cols.some(c=>c.name==='category'))await db.execAsync("ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'general'");
  if(!cols.some(c=>c.name==='completed_at'))await db.execAsync('ALTER TABLE tasks ADD COLUMN completed_at INTEGER');
  if(!cols.some(c=>c.name==='archived_at'))await db.execAsync('ALTER TABLE tasks ADD COLUMN archived_at INTEGER');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(completed,due_at)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_archive ON tasks(archived_at,completed_at)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_active_category ON tasks(archived_at,category,completed,due_at,id)');
  await db.runAsync('UPDATE tasks SET completed_at=due_at WHERE completed=1 AND completed_at IS NULL');
  await db.runAsync('UPDATE tasks SET archived_at=completed_at+2592000000 WHERE completed=1 AND archived_at IS NULL AND completed_at<=?',Date.now()-2592000000);
  return db;
})();
export async function initDB(){await ready;}
async function refreshWidget(){try{const {Platform}=await import('react-native');if(Platform.OS==='android')await (await import('./widget/sync')).refreshPingWidget();}catch(e){console.warn('[widget] Refresh failed:',e);}}
export async function listTasks(){const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY completed ASC,due_at ASC');}
export async function listTaskPage(limit=50,offset=0,category?:TaskCategory){const db=await ready;return category?db.getAllAsync<Task>('SELECT * FROM tasks WHERE archived_at IS NULL AND category=? ORDER BY completed ASC,due_at ASC,id ASC LIMIT ? OFFSET ?',category,limit,offset):db.getAllAsync<Task>('SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY completed ASC,due_at ASC,id ASC LIMIT ? OFFSET ?',limit,offset);}
export async function listArchivedTasks(limit=50,offset=0){const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE archived_at IS NOT NULL ORDER BY archived_at DESC LIMIT ? OFFSET ?',limit,offset);}
export async function archiveTask(id:number){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=? WHERE id=? AND completed=1',Date.now(),id);await refreshWidget();}
export async function restoreArchivedTask(id:number){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=NULL WHERE id=?',id);await refreshWidget();}
export async function archiveOldCompletedTasks(){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=? WHERE completed=1 AND archived_at IS NULL AND completed_at IS NOT NULL AND completed_at<=?',Date.now(),Date.now()-2592000000);}
/** Pendentes (próximas 5) e concluídas hoje (mais recentes primeiro) para o widget. */
export async function listWidgetTasks(){
  const db=await ready;const startOfDay=new Date();startOfDay.setHours(0,0,0,0);
  const [pending,done]=await Promise.all([
    db.getAllAsync<Task>('SELECT * FROM tasks WHERE completed=0 AND archived_at IS NULL ORDER BY due_at ASC,id ASC LIMIT 5'),
    db.getAllAsync<Task>('SELECT * FROM tasks WHERE completed=1 AND archived_at IS NULL AND completed_at>=? ORDER BY completed_at DESC,id DESC LIMIT 5',startOfDay.getTime()),
  ]);
  return {pending,done};
}
export async function getTask(id:number){const db=await ready;return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id=?',id);}
async function reminderIds(id:number){
  const db=await ready;
  const rows=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications WHERE task_id=?',id);
  return rows.map(r=>r.notification_id);
}
async function replaceReminders(id:number,task:TaskInput,completed:boolean){
  const db=await ready;
  const old=await reminderIds(id);
  // Cancel first to avoid duplicated reminders; reconciliation restores any missing future ones.
  await cancelTaskReminders(old);
  await db.runAsync('DELETE FROM task_notifications WHERE task_id=?',id);
  await db.runAsync('UPDATE tasks SET notification_id=NULL WHERE id=?',id);
  if(completed)return;
  const scheduled=await scheduleTaskReminders({id,title:task.title,due_at:task.due_at,category:task.category});
  try{
    for(const item of scheduled)await db.runAsync(
      'INSERT INTO task_notifications(notification_id,task_id,stage,scheduled_at) VALUES(?,?,?,?)',
      item.notification_id,id,item.stage,item.scheduled_at);
    await db.runAsync('UPDATE tasks SET notification_id=? WHERE id=?',scheduled[0]?.notification_id??null,id);
  }catch(e){await cancelTaskReminders(scheduled.map(x=>x.notification_id));throw e;}
}
export async function saveTask(task:TaskInput,id?:number){
  const db=await ready;
  let taskId=id;
  if(id!==undefined){
    await db.runAsync('UPDATE tasks SET title=?,description=?,due_at=?,priority=?,category=? WHERE id=?',
      task.title,task.description,task.due_at,task.priority,task.category,id);
  }else{
    const result=await db.runAsync('INSERT INTO tasks(title,description,due_at,priority,category) VALUES(?,?,?,?,?)',
      task.title,task.description,task.due_at,task.priority,task.category);
    taskId=result.lastInsertRowId;
  }
  const current=await getTask(taskId!);
  let reminderError=false;
  try{await replaceReminders(taskId!,task,!!current?.completed);}catch(e){reminderError=true;console.warn(e);}
  await refreshWidget();
  return {id:taskId!,reminderError};
}
export async function completeTask(id:number,completed:boolean){
  const db=await ready;const task=await getTask(id);
  if(!task)return;
  await db.runAsync('UPDATE tasks SET completed=?,completed_at=?,archived_at=NULL WHERE id=?',completed?1:0,completed?Date.now():null,id);
  await replaceReminders(id,task,completed);
  if(completed)await dismissTaskNotifications(id);
  await refreshWidget();
}
/** Botão "Adiar": tira o aviso da bandeja e agenda um novo daqui a alguns minutos. */
export async function snoozeTask(id:number){
  const db=await ready;const task=await getTask(id);
  if(!task||task.completed)return;
  await dismissTaskNotifications(id);
  // Substitui um adiamento anterior em vez de acumular vários.
  const previous=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications WHERE task_id=? AND stage=?',id,SNOOZE_STAGE);
  await cancelTaskReminders(previous.map(r=>r.notification_id));
  await db.runAsync('DELETE FROM task_notifications WHERE task_id=? AND stage=?',id,SNOOZE_STAGE);
  const snoozed=await scheduleSnoozeReminder(task);
  if(snoozed)await db.runAsync('INSERT INTO task_notifications(notification_id,task_id,stage,scheduled_at) VALUES(?,?,?,?)',snoozed.notification_id,id,snoozed.stage,snoozed.scheduled_at);
}
export async function deleteTask(id:number){
  const db=await ready;
  await cancelTaskReminders(await reminderIds(id));
  await dismissTaskNotifications(id);
  await db.runAsync('DELETE FROM task_notifications WHERE task_id=?',id);
  await db.runAsync('DELETE FROM tasks WHERE id=?',id);
  await refreshWidget();
}
export async function reconcileReminders(){
  const db=await ready;
  await archiveOldCompletedTasks();
  const prefs=await getPreferences();
  if(!prefs.notifications){
    const rows=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications');
    await cancelTaskReminders(rows.map(row=>row.notification_id));
    await db.runAsync('DELETE FROM task_notifications');
    await db.runAsync('UPDATE tasks SET notification_id=NULL');
    return;
  }
  const pending=await (await import('expo-notifications')).getAllScheduledNotificationsAsync();
  const available=new Set(pending.map(n=>n.identifier));
  const tasks=await (await ready).getAllAsync<Task>('SELECT * FROM tasks WHERE completed=0 AND archived_at IS NULL ORDER BY due_at ASC');
  const notificationRows=await db.getAllAsync<{task_id:number;notification_id:string;scheduled_at:number}>('SELECT task_id,notification_id,scheduled_at FROM task_notifications');
  const byTask=new Map<number,typeof notificationRows>();
  for(const row of notificationRows){const group=byTask.get(row.task_id)??[];group.push(row);byTask.set(row.task_id,group);}
  const now=Date.now();
  for(const task of tasks){
    const rows=byTask.get(task.id)??[];
    // Rebuild only future occurrences when an expected scheduled ID disappeared.
    const hasFutureStage=reminderOffsets(task.category).some(minutes=>task.due_at+minutes*60000>now);
    if(rows.some(r=>r.scheduled_at>now&&!available.has(r.notification_id)) ||
       (!rows.length&&hasFutureStage)){
      await replaceReminders(task.id,task,false);
    }
  }
}

export async function rescheduleAllReminders(){
  const db=await ready;
  const tasks=await db.getAllAsync<Task>('SELECT * FROM tasks WHERE completed=0 AND archived_at IS NULL ORDER BY due_at ASC');
  for(const task of tasks)await replaceReminders(task.id,task,!!task.completed);
}
export async function deleteAllTasks(){
  const db=await ready;
  const rows=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications');
  await cancelTaskReminders(rows.map(row=>row.notification_id));
  await db.runAsync('DELETE FROM task_notifications');
  await db.runAsync('DELETE FROM tasks');
  await dismissAllTaskNotifications();
  await refreshWidget();
}
