import * as SQLite from 'expo-sqlite';

export type AddressStyle='masculine'|'feminine'|'neutral';
export type Preferences={notifications:boolean;privatePreviews:boolean;appearance:'dark'|'softLight';displayName:string;addressStyle:AddressStyle};
const defaults:Preferences={notifications:true,privatePreviews:false,appearance:'dark',displayName:'',addressStyle:'neutral'};
const db=SQLite.openDatabaseAsync('tasks.db');
export async function getPreferences():Promise<Preferences>{
  const conn=await db;
  await conn.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const rows=await conn.getAllAsync<{key:string;value:string}>('SELECT key,value FROM app_preferences');
  const values=Object.fromEntries(rows.map(row=>[row.key,row.value]));
  return {notifications:values.notifications===undefined?defaults.notifications:values.notifications==='true',privatePreviews:values.privatePreviews==='true',appearance:values.appearance==='softLight'?'softLight':'dark',displayName:values.displayName??'',addressStyle:values.addressStyle==='masculine'||values.addressStyle==='feminine'?values.addressStyle:'neutral'};
}
export async function setPreference<K extends keyof Preferences>(key:K,value:Preferences[K]){
  const conn=await db;
  await conn.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  await conn.runAsync('INSERT OR REPLACE INTO app_preferences(key,value) VALUES(?,?)',key,String(value));
}
