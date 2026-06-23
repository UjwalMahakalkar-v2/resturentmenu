import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://ayushmahakalkar_db_user:ByYnmRJvL25mQGaA@cluster0.5b7rkwg.mongodb.net/?appName=Cluster0';
const DB_NAME = 'restaurant_menu';

let cachedClient: MongoClient | null = null;

export async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient.db(DB_NAME);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  
  return client.db(DB_NAME);
}

export async function getCollection(collectionName: string) {
  const db = await connectToDatabase();
  return db.collection(collectionName);
}
