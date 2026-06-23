import { MongoClient } from 'mongodb';
import { sampleCategories, sampleMenuItems } from '../src/data/sampleData';

const MONGODB_URI = 'mongodb+srv://ayushmahakalkar_db_user:ByYnmRJvL25mQGaA@cluster0.5b7rkwg.mongodb.net/?appName=Cluster0';
const DB_NAME = 'restaurant_menu';

async function initializeDatabase() {
  console.log('🔄 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Initialize Categories
    console.log('\n📁 Initializing categories...');
    const categoriesCollection = db.collection('categories');
    await categoriesCollection.deleteMany({});
    await categoriesCollection.insertMany(sampleCategories);
    console.log(`✅ Inserted ${sampleCategories.length} categories`);
    
    // Initialize Menu Items
    console.log('\n🍽️  Initializing menu items...');
    const menuCollection = db.collection('menu_items');
    await menuCollection.deleteMany({});
    await menuCollection.insertMany(sampleMenuItems);
    console.log(`✅ Inserted ${sampleMenuItems.length} menu items`);
    
    // Initialize Admin User
    console.log('\n👤 Initializing admin user...');
    const adminsCollection = db.collection('admins');
    await adminsCollection.deleteMany({});
    await adminsCollection.insertOne({
      username: 'admin',
      password: 'admin123', // Change this in production!
      createdAt: new Date(),
    });
    console.log('✅ Created admin user (username: admin, password: admin123)');
    
    // Create indexes
    console.log('\n🔍 Creating indexes...');
    await categoriesCollection.createIndex({ id: 1 }, { unique: true });
    await menuCollection.createIndex({ id: 1 }, { unique: true });
    await menuCollection.createIndex({ category: 1 });
    await adminsCollection.createIndex({ username: 1 }, { unique: true });
    console.log('✅ Indexes created');
    
    console.log('\n🎉 Database initialization complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Categories: ${sampleCategories.length}`);
    console.log(`   - Menu Items: ${sampleMenuItems.length}`);
    console.log(`   - Admin Users: 1`);
    console.log('\n🔐 Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n⚠️  Remember to change the admin password in production!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

initializeDatabase();
