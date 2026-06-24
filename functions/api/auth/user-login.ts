import { getCollection } from '../../db';
import { generateJWT } from '../../utils/jwt';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const password = body.password;
    const tenantId = body.tenantId;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const collection = await getCollection('users');

    // Find user by email and password
    let query: any = { email, password };
    if (tenantId) {
      query.tenantId = tenantId;
    }
    
    const user = await collection.findOne(query);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!user.active) {
      return new Response(JSON.stringify({ error: 'Account is inactive' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Update last login
    await collection.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    );
    
    const token = generateJWT(user);
    
    return new Response(JSON.stringify({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
