import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    console.log(`[AUTH] Register attempt\nEmail: ${email}`);

    if (!name || !email || !password) {
      console.log(`Result: FAILED\nReason: Missing fields`);
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`Result: FAILED\nReason: Duplicate email`);
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    console.log(`Result: SUCCESS`);
    res.status(201).json({
      success: true,
      data: {
        token: generateToken(user.id),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error: any) {
    console.log(`Result: FAILED\nReason: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Login attempt\nEmail: ${email}`);

    if (!email || !password) {
      console.log(`Result: FAILED\nReason: Missing email or password`);
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password as string))) {
      console.log(`Result: SUCCESS\nRole: ${user.role}`);
      res.json({
        success: true,
        data: {
          token: generateToken(user.id),
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        }
      });
    } else {
      console.log(`Result: FAILED\nReason: Invalid credentials`);
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.log(`Result: FAILED\nReason: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req: any, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};
