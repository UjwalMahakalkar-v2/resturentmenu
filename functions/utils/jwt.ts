export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  exp: number;
}

export function generateJWT(user: any): string {
  const payload: JWTPayload = {
    userId: user.id,
    tenantId: user.tenantId || '',
    email: user.email,
    role: user.role || 'owner',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  return btoa(JSON.stringify(payload));
}

export function validateJWT(token: string): JWTPayload {
  try {
    const payload = JSON.parse(atob(token)) as JWTPayload;
    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function getTenantIdFromRequest(request: Request): string {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Unauthorized - No token provided');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const payload = validateJWT(token);
  
  if (!payload.tenantId) {
    throw new Error('Invalid token - No tenant ID');
  }
  
  return payload.tenantId;
}

export function getUserFromRequest(request: Request): JWTPayload {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Unauthorized - No token provided');
  }
  
  const token = authHeader.replace('Bearer ', '');
  return validateJWT(token);
}
