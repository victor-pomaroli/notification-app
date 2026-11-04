import * as SQLite from 'expo-sqlite';
import {getPreferences} from './preferences';
import {reminderOffsets} from './templates';
import {TaskCategory} from './templates';
import {cancelTaskReminders,scheduleTaskReminders,ScheduledReminder} from './notifications';
export type Task={id:number;title:string;description:string;due_at:number;priority:'low'|'medium'|'high';category:TaskCategory;completed:number;completed_at:number|null;archived_at:number|null;notification_id:string|null;parent_id:number|null;daily:number;daily_active:number;daily_day:string|null};
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
  if(!cols.some(c=>c.name==='parent_id'))await db.execAsync('ALTER TABLE tasks ADD COLUMN parent_id INTEGER');
  if(!cols.some(c=>c.name==='archived_at'))await db.execAsync('ALTER TABLE tasks ADD COLUMN archived_at INTEGER');
  if(!cols.some(c=>c.name==='daily'))await db.execAsync('ALTER TABLE tasks ADD COLUMN daily INTEGER NOT NULL DEFAULT 0');
  if(!cols.some(c=>c.name==='daily_active'))await db.execAsync('ALTER TABLE tasks ADD COLUMN daily_active INTEGER NOT NULL DEFAULT 1');
  if(!cols.some(c=>c.name==='daily_day'))await db.execAsync('ALTER TABLE tasks ADD COLUMN daily_day TEXT');
  await db.execAsync('CREATE TABLE IF NOT EXISTS daily_history(task_id INTEGER NOT NULL,day TEXT NOT NULL,completed INTEGER NOT NULL,PRIMARY KEY(task_id,day))');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(completed,due_at)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_archive ON tasks(archived_at,completed_at)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_active_category ON tasks(archived_at,category,completed,due_at,id)');
  await db.runAsync('UPDATE tasks SET completed_at=due_at WHERE completed=1 AND completed_at IS NULL');
  await db.runAsync('UPDATE tasks SET archived_at=completed_at+2592000000 WHERE completed=1 AND archived_at IS NULL AND completed_at<=?',Date.now()-2592000000);
  return db;
})();
export async function initDB(){await ready;}
async function refreshWidget(){try{const {Platform}=await import('react-native');if(Platform.OS==='android')await (await import('./widget/sync')).refreshPingWidget();}catch(e){console.warn('[widget] Refresh failed:',e);}}
export async function listTasks(){await syncDailyTasks();const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE archived_at IS NULL AND (daily=0 OR daily_active=1) ORDER BY completed ASC,due_at ASC');}
export async function listTaskPage(limit=50,offset=0,category?:TaskCategory){await syncDailyTasks();const db=await ready;return category?db.getAllAsync<Task>('SELECT * FROM tasks WHERE archived_at IS NULL AND (daily=0 OR daily_active=1) AND category=? ORDER BY completed ASC,due_at ASC,id ASC LIMIT ? OFFSET ?',category,limit,offset):db.getAllAsync<Task>('SELECT * FROM tasks WHERE archived_at IS NULL AND (daily=0 OR daily_active=1) ORDER BY completed ASC,due_at ASC,id ASC LIMIT ? OFFSET ?',limit,offset);}
export async function listArchivedTasks(limit=50,offset=0){const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id IS NULL AND archived_at IS NOT NULL ORDER BY archived_at DESC LIMIT ? OFFSET ?',limit,offset);}
export async function archiveTask(id:number){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=? WHERE (id=? OR parent_id=?) AND completed=1',Date.now(),id,id);await refreshWidget();}
export async function restoreArchivedTask(id:number){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=NULL WHERE id=? OR parent_id=?',id,id);await refreshWidget();}
export async function archiveOldCompletedTasks(){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=? WHERE daily=0 AND completed=1 AND archived_at IS NULL AND completed_at IS NOT NULL AND completed_at<=?',Date.now(),Date.now()-2592000000);}
export async function listWidgetTasks(){await syncDailyTasks();const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id IS NULL AND completed=0 AND (daily=0 OR daily_active=1) AND archived_at IS NULL ORDER BY due_at ASC,id ASC LIMIT 5');}
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
  const current=await getTask(id);
  if(current?.parent_id || (current?.daily && !current.daily_active) || (completed && !current?.daily))return;
  const scheduled=await scheduleTaskReminders({id,title:task.title,due_at:task.due_at,category:task.category,daily:!!current?.daily});
  try{
    for(const item of scheduled)await db.runAsync(
      'INSERT INTO task_notifications(notification_id,task_id,stage,scheduled_at) VALUES(?,?,?,?)',
      item.notification_id,id,item.stage,item.scheduled_at);
    await db.runAsync('UPDATE tasks SET notification_id=? WHERE id=?',scheduled[0]?.notification_id??null,id);
  }catch(e){await cancelTaskReminders(scheduled.map(x=>x.notification_id));throw e;}
}
export async function listChildren(parentId:number){const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id=? ORDER BY id ASC',parentId);}
export async function saveTaskGroup(task:TaskInput,children:string[],id?:number,daily=false){
  const parent=await saveTask(task,id);
  const db=await ready;
  await db.runAsync('UPDATE tasks SET daily=?,daily_active=1,daily_day=? WHERE id=?',daily?1:0,daily?localDay():null,parent.id);
  const existing=id?await listChildren(parent.id):[];
  const clean=children.map(x=>x.trim()).filter(Boolean);
  for(let i=0;i<clean.length;i++){
    if(existing[i])await db.runAsync('UPDATE tasks SET title=? WHERE id=?',clean[i],existing[i].id);
    else await db.runAsync('INSERT INTO tasks(title,description,due_at,priority,category,parent_id,completed,completed_at) VALUES(?,?,?,?,?,?,?,?)',clean[i],'',task.due_at,task.priority,task.category,parent.id,(await getTask(parent.id))?.completed?1:0,(await getTask(parent.id))?.completed?Date.now():null);
  }
  for(const old of existing.slice(clean.length))await deleteTask(old.id);
  await refreshWidget();
  return parent;
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
  await syncDailyTasks();
  const db=await ready;const task=await getTask(id);
  if(!task)return;
  await db.runAsync('UPDATE tasks SET completed=?,completed_at=?,archived_at=NULL WHERE id=?',completed?1:0,completed?Date.now():null,id);
  if(task.daily)await db.runAsync('INSERT OR REPLACE INTO daily_history(task_id,day,completed) VALUES(?,?,?)',id,localDay(),completed?1:0);
  await replaceReminders(id,task,completed);
  if(!task.parent_id){
    const children=await listChildren(id);
    for(const child of children){
      await db.runAsync('UPDATE tasks SET completed=?,completed_at=?,archived_at=NULL WHERE id=?',completed?1:0,completed?Date.now():null,child.id);
    }
  }
  await refreshWidget();
}
export async function deleteTask(id:number){
  const db=await ready;
  await cancelTaskReminders(await reminderIds(id));
  await db.runAsync('DELETE FROM task_notifications WHERE task_id=?',id);
  const children=await listChildren(id);
  for(const child of children)await deleteTask(child.id);
  await db.runAsync('DELETE FROM daily_history WHERE task_id=?',id);
  await db.runAsync('DELETE FROM tasks WHERE id=?',id);
  await refreshWidget();
}
export async function reconcileReminders(){
  await syncDailyTasks();
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
  const tasks=await (await ready).getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id IS NULL AND (completed=0 OR daily=1) AND (daily=0 OR daily_active=1) AND archived_at IS NULL ORDER BY due_at ASC');
  const notificationRows=await db.getAllAsync<{task_id:number;notification_id:string;scheduled_at:number}>('SELECT task_id,notification_id,scheduled_at FROM task_notifications');
  const byTask=new Map<number,typeof notificationRows>();
  for(const row of notificationRows){const group=byTask.get(row.task_id)??[];group.push(row);byTask.set(row.task_id,group);}
  const now=Date.now();
  for(const task of tasks){
    const rows=byTask.get(task.id)??[];
    const ids=rows.map(r=>r.notification_id);
    if(task.completed && !task.daily){
      if(ids.length)await replaceReminders(task.id,task,true);
      continue;
    }
    // Rebuild only future occurrences when an expected scheduled ID disappeared.
    const hasFutureStage=task.daily || reminderOffsets(task.category).some(minutes=>task.due_at+minutes*60000>now);
    if(rows.some(r=>r.scheduled_at>now&&!available.has(r.notification_id)) ||
       (!rows.length&&hasFutureStage)){
      await replaceReminders(task.id,task,false);
    }
  }
}

export async function rescheduleAllReminders(){
  await syncDailyTasks();
  const db=await ready;
  const tasks=await db.getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id IS NULL AND (completed=0 OR daily=1) AND (daily=0 OR daily_active=1) AND archived_at IS NULL ORDER BY due_at ASC');
  for(const task of tasks)await replaceReminders(task.id,task,!!task.completed);
}
export async function deleteAllTasks(){
  const db=await ready;
  const rows=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications');
  await cancelTaskReminders(rows.map(row=>row.notification_id));
  await db.runAsync('DELETE FROM task_notifications');
  await db.runAsync('DELETE FROM daily_history');
  await db.runAsync('DELETE FROM tasks');
  await refreshWidget();
}

export const localDay=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
export async function syncDailyTasks(){
  const db=await ready;
  const today=localDay();
  const roots=await db.getAllAsync<Task>('SELECT * FROM tasks WHERE daily=1 AND daily_active=1 AND parent_id IS NULL AND (daily_day IS NULL OR daily_day<>?)',today);
  for(const task of roots){
    if(task.daily_day)await db.runAsync('INSERT OR IGNORE INTO daily_history(task_id,day,completed) VALUES(?,?,?)',task.id,task.daily_day,task.completed?1:0);
    await db.runAsync('UPDATE tasks SET daily_day=?,completed=0,completed_at=NULL WHERE id=?',today,task.id);
    await db.runAsync('UPDATE tasks SET completed=0,completed_at=NULL WHERE parent_id=?',task.id);
  }
  // Keep at most 90 days of lightweight completion records.
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
  await db.runAsync('DELETE FROM daily_history WHERE day<?',localDay(cutoff));
}
export async function listRoutines(){
  const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE daily=1 AND parent_id IS NULL ORDER BY daily_active DESC,id DESC');
}
export async function setRoutineActive(id:number,active:boolean){
  const db=await ready;const task=await getTask(id);
  if(!task?.daily)return;
  await db.runAsync('UPDATE tasks SET daily_active=?,daily_day=? WHERE id=?',active?1:0,active?localDay():task.daily_day,id);
  if(active){await db.runAsync('UPDATE tasks SET completed=0,completed_at=NULL WHERE id=? OR parent_id=?',id,id);}
  await replaceReminders(id,task,false);
  await refreshWidget();
}
export async function routineHistory(id:number,limit=30){
  const db=await ready;return db.getAllAsync<{day:string;completed:number}>('SELECT day,completed FROM daily_history WHERE task_id=? ORDER BY day DESC LIMIT ?',id,limit);
}
