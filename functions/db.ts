import { MongoClient } from 'mongodb';

// Direct connection string — bypasses SRV DNS lookup which fails in Cloudflare Workers.
// Hosts are the 3 Atlas replica set members discovered from the SRV record.
// The driver will auto-discover the replicaSet name via the hello command.
const MONGODB_URI =
  'mongodb://ayushmahakalkar_db_user:ByYnmRJvL25mQGaA@' +
  'ac-s79adqq-shard-00-00.5b7rkwg.mongodb.net:27017,' +
  'ac-s79adqq-shard-00-01.5b7rkwg.mongodb.net:27017,' +
  'ac-s79adqq-shard-00-02.5b7rkwg.mongodb.net:27017' +
  '/restaurant_menu?tls=true&authSource=admin&retryWrites=true&w=majority';
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
