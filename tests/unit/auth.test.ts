import { generateToken, hashPassword, comparePassword } from '../../src/utils/authUtils';
import jwt from 'jsonwebtoken';

describe('Auth Utilities', () => {
  it('should generate a valid JWT token', () => {
    const id = '12345';
    const secret = 'testsecret';
    const token = generateToken(id, secret);
    
    expect(token).toBeDefined();
    
    const decoded = jwt.verify(token, secret) as { id: string };
    expect(decoded.id).toBe(id);
  });

  it('should hash a password and verify it correctly', async () => {
    const plainText = 'mysecurepassword123';
    const hashed = await hashPassword(plainText);
    
    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(plainText);
    
    const isValid = await comparePassword(plainText, hashed);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const plainText = 'mysecurepassword123';
    const hashed = await hashPassword(plainText);
    
    const isValid = await comparePassword('wrongpassword', hashed);
    expect(isValid).toBe(false);
  });
});
