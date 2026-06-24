import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://ayushmahakalkar_db_user:ByYnmRJvL25mQGaA@cluster0.5b7rkwg.mongodb.net/?appName=Cluster0';
const DB_NAME = 'restaurant_menu';

async function updateSocialData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const collection = db.collection('tenants');
    
    // Update Pizza Palace
    await collection.updateOne(
      { id: 'tenant_pizza_palace' },
      {
        $set: {
          socialMedia: {
            whatsapp: '+12125551234',
            whatsappMessage: "Hi! I'd like to order from Pizza Palace. Can you help me?",
            instagram: '@pizzapalace_ny',
            enableWhatsapp: true,
            enableInstagram: true,
          },
          socialAnalytics: {
            whatsappClicks: 0,
            instagramClicks: 0,
            facebookClicks: 0,
            twitterClicks: 0,
          }
        }
      }
    );
    console.log('✅ Updated Pizza Palace social data');
    
    // Update Burger Hub
    await collection.updateOne(
      { id: 'tenant_burger_hub' },
      {
        $set: {
          socialMedia: {
            whatsapp: '+13105559876',
            whatsappMessage: "Hello! I'm interested in Burger Hub's menu. What are your specials today?",
            instagram: 'https://instagram.com/burgerhub_la',
            enableWhatsapp: true,
            enableInstagram: true,
          },
          socialAnalytics: {
            whatsappClicks: 0,
            instagramClicks: 0,
            facebookClicks: 0,
            twitterClicks: 0,
          }
        }
      }
    );
    console.log('✅ Updated Burger Hub social data');
    
    // Update Sushi Spot
    await collection.updateOne(
      { id: 'tenant_sushi_spot' },
      {
        $set: {
          socialMedia: {
            whatsapp: '+13055552468',
            whatsappMessage: "Hi Sushi Spot! I'd like to make a reservation or place an order.",
            instagram: '@sushispot',
            enableWhatsapp: true,
            enableInstagram: true,
          },
          socialAnalytics: {
            whatsappClicks: 0,
            instagramClicks: 0,
            facebookClicks: 0,
            twitterClicks: 0,
          }
        }
      }
    );
    console.log('✅ Updated Sushi Spot social data');
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SOCIAL MEDIA DATA UPDATED!\n');
    console.log('Social Links Added:');
    console.log('  Pizza Palace:');
    console.log('    WhatsApp: +12125551234');
    console.log('    Instagram: @pizzapalace_ny\n');
    console.log('  Burger Hub:');
    console.log('    WhatsApp: +13105559876');
    console.log('    Instagram: https://instagram.com/burgerhub_la\n');
    console.log('  Sushi Spot:');
    console.log('    WhatsApp: +13055552468');
    console.log('    Instagram: @sushispot\n');
    console.log('🌐 Visit the menu pages to see floating social buttons!');
    console.log('  http://localhost:3000/pizza-palace');
    console.log('  http://localhost:3000/burger-hub');
    console.log('  http://localhost:3000/sushi-spot');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

updateSocialData();
