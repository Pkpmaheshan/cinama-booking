import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'ADMIN') {
    console.log(`[AUTHORIZATION]\nUser: ${req.user._id}\nRole: ADMIN\nEndpoint: ${req.method} ${req.originalUrl}\nResult: ALLOWED`);
    next();
  } else {
    console.log(`[AUTHORIZATION]\nUser: ${req.user?._id || 'Unknown'}\nRole: ${req.user?.role || 'Unknown'}\nEndpoint: ${req.method} ${req.originalUrl}\nResult: DENIED\nReason: ADMIN required`);
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};
