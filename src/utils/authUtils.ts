import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const generateToken = (id: string, secret: string = process.env.JWT_SECRET || 'secret'): string => {
  return jwt.sign({ id }, secret, { expiresIn: '30d' });
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
