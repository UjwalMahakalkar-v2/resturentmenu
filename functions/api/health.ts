import { getDB, queryAll } from '../db';
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
export async function onRequestGet(context: any) {
  const result: Record<string, any> = { timestamp: new Date().toISOString() };
  try {
    const db = getDB(context.env);
    const tables = await queryAll(db, "SELECT name FROM sqlite_master WHERE type='table'");
    result.d1 = { connected: true, tables: tables.map((r: any) => r.name) };
  } catch (e: any) { result.d1 = { connected: false, error: e.message }; }
  return new Response(JSON.stringify(result, null, 2), { headers: CORS });
}
