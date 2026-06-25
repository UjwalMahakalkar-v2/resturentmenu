/**
 * D1 database helper for Cloudflare Workers.
 * `env.DB` is injected by the Workers runtime via wrangler.toml binding.
 *
 * Usage:
 *   import { getDB } from '../db';
 *   const db = getDB(context.env);
 *   const row = await db.prepare('SELECT * FROM tenants WHERE slug = ?').bind(slug).first();
 */

export interface D1Env {
  DB: D1Database;
}

export function getDB(env: D1Env): D1Database {
  if (!env?.DB) throw new Error('D1 database binding "DB" is not available');
  return env.DB;
}

/** Tiny helper — runs a SELECT and returns all rows as plain objects */
export async function queryAll<T = any>(db: D1Database, sql: string, ...params: any[]): Promise<T[]> {
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const { results } = await bound.all<T>();
  return results ?? [];
}

/** Runs a SELECT and returns the first row or null */
export async function queryFirst<T = any>(db: D1Database, sql: string, ...params: any[]): Promise<T | null> {
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  return bound.first<T>();
}

/** Runs an INSERT / UPDATE / DELETE and returns meta */
export async function execute(db: D1Database, sql: string, ...params: any[]) {
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  return bound.run();
}

/** Convert snake_case DB row → camelCase JS object (shallow) */
export function toCamel(row: Record<string, any> | null): Record<string, any> | null {
  if (!row) return null;
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      v,
    ])
  );
}

/** Convert an array of rows to camelCase */
export function toCamelAll(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map(r => toCamel(r) as Record<string, any>);
}

/** Parse a stored JSON column — returns null if invalid */
export function parseJSON(value: string | null | undefined): any {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}
