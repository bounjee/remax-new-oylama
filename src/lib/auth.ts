import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'remax-best-secret-key-2024';

export function createToken(): string {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'remax2024';
}
