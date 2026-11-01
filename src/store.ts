import * as SQLite from 'expo-sqlite';
export type Task = {id:number;title:string;description:string;due_at:number;priority:'low'|'medium'|'high';completed:number;notification_id:string|null};
const dbPromise=SQLite.openDatabaseAsync('tasks.db');
const ready=(async()=>{
  const db=await dbPromise;
  await db.execAsync(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_at INTEGER NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    completed INTEGER NOT NULL DEFAULT 0,
    notification_id TEXT
  );`);
  return db;
})();
export async function initDB(){await ready;}
export async function listTasks(){const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks ORDER BY completed ASC,due_at ASC');}
export async function getTask(id:number){const db=await ready;return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id=?',id);}
export async function saveTask(task:Omit<Task,'id'|'completed'|'notification_id'>,id?:number,notificationId?:string|null){
  const db=await ready;
  if(id!==undefined){await db.runAsync('UPDATE tasks SET title=?,description=?,due_at=?,priority=?,notification_id=? WHERE id=?',task.title,task.description,task.due_at,task.priority,notificationId??null,id);return id;}
  const result=await db.runAsync('INSERT INTO tasks(title,description,due_at,priority,notification_id) VALUES(?,?,?,?,?)',task.title,task.description,task.due_at,task.priority,notificationId??null);
  return result.lastInsertRowId;
}
export async function completeTask(id:number,completed:boolean,notificationId:string|null){
  const db=await ready;
  await db.runAsync('UPDATE tasks SET completed=?,notification_id=? WHERE id=?',completed?1:0,notificationId,id);
}
export async function deleteTask(id:number){const db=await ready;await db.runAsync('DELETE FROM tasks WHERE id=?',id);}