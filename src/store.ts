import * as SQLite from 'expo-sqlite';
import {TaskCategory} from './templates';
import {cancelTaskReminders,scheduleTaskReminders,ScheduledReminder} from './notifications';
export type Task={id:number;title:string;description:string;due_at:number;priority:'low'|'medium'|'high';category:TaskCategory;completed:number;notification_id:string|null};
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
  return db;
})();
export async function initDB(){await ready;}
async function refreshWidget(){try{const {Platform}=await import('react-native');if(Platform.OS==='android')await (await import('./widget/sync')).refreshPingWidget();}catch(e){console.warn('[widget] Refresh failed:',e);}}
export async function listTasks(){const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks ORDER BY completed ASC,due_at ASC');}
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
  await replaceReminders(taskId!,task,!!current?.completed);
  await refreshWidget();
  return taskId!;
}
export async function completeTask(id:number,completed:boolean){
  const db=await ready;const task=await getTask(id);
  if(!task)return;
  await db.runAsync('UPDATE tasks SET completed=? WHERE id=?',completed?1:0,id);
  await replaceReminders(id,task,completed);
  await refreshWidget();
}
export async function deleteTask(id:number){
  const db=await ready;
  await cancelTaskReminders(await reminderIds(id));
  await db.runAsync('DELETE FROM task_notifications WHERE task_id=?',id);
  await db.runAsync('DELETE FROM tasks WHERE id=?',id);
  await refreshWidget();
}
export async function reconcileReminders(){
  const db=await ready;
  const pending=await (await import('expo-notifications')).getAllScheduledNotificationsAsync();
  const available=new Set(pending.map(n=>n.identifier));
  const tasks=await listTasks();
  for(const task of tasks){
    const ids=await reminderIds(task.id);
    if(task.completed){
      if(ids.length)await replaceReminders(task.id,task,true);
      continue;
    }
    // Rebuild only future occurrences when an expected scheduled ID disappeared.
    const rows=await db.getAllAsync<{notification_id:string;scheduled_at:number}>(
      'SELECT notification_id,scheduled_at FROM task_notifications WHERE task_id=?',task.id);
    if(rows.some(r=>r.scheduled_at>Date.now()&&!available.has(r.notification_id)) ||
       (!rows.length&&task.due_at>Date.now())){
      await replaceReminders(task.id,task,false);
    }
  }
}
