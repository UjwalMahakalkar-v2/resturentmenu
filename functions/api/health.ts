import { connectToDatabase } from '../db';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestGet(context: any) {
  const result: Record<string, any> = { timestamp: new Date().toISOString() };

  // Test DNS: can we resolve MongoDB Atlas SRV records via Google DNS-over-HTTPS?
  try {
    const res = await fetch(
      'https://dns.google/resolve?name=_mongodb._tcp.cluster0.5b7rkwg.mongodb.net&type=SRV',
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json() as any;
    result.srv_dns = {
      status: data.Status,   // 0 = NOERROR
      answers: (data.Answer ?? []).map((a: any) => a.data),
    };
  } catch (e: any) {
    result.srv_dns = { error: e.message };
  }

  // Test MongoDB connection (uses db.ts — no credentials in this file)
  try {
    const db = await connectToDatabase();
    const collections = await db.listCollections().toArray();
    result.mongo = {
      connected: true,
      database: db.databaseName,
      collections: collections.map((c: any) => c.name),
    };
  } catch (e: any) {
    result.mongo = {
      connected: false,
      error: e.message,
      name: e.name,
      code: (e as any).code ?? null,
    };
  }

  return new Response(JSON.stringify(result, null, 2), { headers: CORS });
}
