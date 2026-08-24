import { Request, Response, NextFunction } from 'express';

const redactSensitive = (body: any) => {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  const sensitiveKeys = ['password', 'token', 'secret', 'merchant_secret'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = redactSensitive(sanitized[key]);
    }
  }
  return sanitized;
};

export const apiLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const hasToken = !!req.headers.authorization;

  console.log(`\n[API REQUEST] ${timestamp}`);
  console.log(`${req.method} ${req.originalUrl}`);
  console.log(`Auth: ${hasToken ? 'Yes' : 'No'}`);
  
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && Object.keys(req.body).length > 0) {
    const safeBody = redactSensitive(req.body);
    console.log('Body:');
    console.log(JSON.stringify(safeBody, null, 2));
  }

  // Hook into response finish to log duration and status
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`\n[API RESPONSE] ${req.method} ${req.originalUrl}`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Duration: ${duration}ms`);
  });

  next();
};
