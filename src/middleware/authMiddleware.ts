import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.log(`[AUTHORIZATION]\nEndpoint: ${req.method} ${req.originalUrl}\nResult: DENIED\nReason: User not found`);
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      console.log(`[AUTHORIZATION]\nEndpoint: ${req.method} ${req.originalUrl}\nResult: DENIED\nReason: Invalid token`);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    console.log(`[AUTHORIZATION]\nEndpoint: ${req.method} ${req.originalUrl}\nResult: DENIED\nReason: No token provided`);
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};
