import crypto from 'crypto';

export const generatePaymentHash = (
  merchantId: string,
  orderId: string,
  amount: number | string,
  currency: string,
  merchantSecret: string
): string => {
  const amountFormatted = parseFloat(amount.toString()).toFixed(2);
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  return crypto.createHash('md5').update(merchantId + orderId + amountFormatted + currency + hashedSecret).digest('hex').toUpperCase();
};

export const verifyPaymentSignature = (
  merchantId: string,
  orderId: string,
  amount: number | string,
  currency: string,
  statusCode: string | number,
  md5sig: string,
  merchantSecret: string
): boolean => {
  const amountFormatted = parseFloat(amount.toString()).toFixed(2);
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  
  const localSig = crypto.createHash('md5').update(
    merchantId + orderId + amountFormatted + currency + statusCode + hashedSecret
  ).digest('hex').toUpperCase();

  return localSig === md5sig || localSig === md5sig.toUpperCase();
};
