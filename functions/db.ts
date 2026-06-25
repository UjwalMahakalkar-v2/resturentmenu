import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://ayushmahakalkar_db_user:ByYnmRJvL25mQGaA@cluster0.5b7rkwg.mongodb.net/restaurant_menu?retryWrites=true&w=majority';
const DB_NAME = 'restaurant_menu';

// Cloudflare Workers: keep one client per isolate, but reconnect if the
// underlying socket was closed by the runtime between requests.
let cachedClient: MongoClient | null = null;

export async function connectToDatabase() {
  if (cachedClient) {
    try {
      // Ping to verify the connection is still alive
      await cachedClient.db('admin').command({ ping: 1 });
      return cachedClient.db(DB_NAME);
    } catch {
      // Connection died — fall through and create a new one
      cachedClient = null;
    }
  }

  const client = new MongoClient(MONGODB_URI, {
    // Critical for Cloudflare Workers: single connection per isolate
    maxPoolSize: 1,
    minPoolSize: 0,
    // Fail fast so Workers don't hit the 30-second wall-clock limit
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 20000,
    // Workers clean up idle sockets; match that with a short idle timeout
    maxIdleTimeMS: 10000,
    // Force IPv4 — Workers can be inconsistent with IPv6 for TCP
    family: 4,
  });

  await client.connect();
  cachedClient = client;
  return client.db(DB_NAME);
}

export async function getCollection(collectionName: string) {
  const db = await connectToDatabase();
  return db.collection(collectionName);
}
