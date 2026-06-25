import { getDB, queryFirst } from '../../db';
import { generateJWT } from '../../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const password = body.password;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: CORS });
    }

    const db = getDB(context.env);
    const user = await queryFirst(db,
      'SELECT * FROM users WHERE email = ? AND password = ? AND active = 1',
      email, password
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: CORS });
    }

    await db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), user.id).run();

    const token = generateJWT({
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
    });

    return new Response(JSON.stringify({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
      },
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Login failed';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
