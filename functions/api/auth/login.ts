import { getCollection } from '../../db';

// Simple JWT-like token generation (for demo purposes)
function generateToken(username: string): string {
  const payload = {
    username,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  return btoa(JSON.stringify(payload));
}

export async function onRequestPost(context: any) {
  try {
    const { username, password } = await context.request.json();
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const collection = await getCollection('admins');
    const admin = await collection.findOne({ username });
    
    if (!admin || admin.password !== password) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const token = generateToken(username);
    
    return new Response(JSON.stringify({
      token,
      admin: {
        username: admin.username,
        _id: admin._id,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
