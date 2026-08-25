import { generatePaymentHash, verifyPaymentSignature } from '../../src/utils/paymentUtils';

describe('Payment Utilities', () => {
  const merchantId = '123456';
  const orderId = 'TEST-ORDER-001';
  const amount = 1500;
  const currency = 'LKR';
  const merchantSecret = 'mysecret';

  it('should generate a valid payment hash', () => {
    const hash = generatePaymentHash(merchantId, orderId, amount, currency, merchantSecret);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(32); // MD5 hex string is 32 chars
  });

  it('should verify a valid payment signature for successful payment (status 2)', () => {
    const statusCode = 2;
    const md5sig = generatePaymentHash(merchantId, orderId, amount, currency + statusCode, merchantSecret);
    
    const isValid = verifyPaymentSignature(merchantId, orderId, amount, currency, statusCode, md5sig, merchantSecret);
    expect(isValid).toBe(true);
  });

  it('should reject an invalid payment signature', () => {
    const statusCode = 2;
    const invalidSig = 'INVALID_SIGNATURE';
    
    const isValid = verifyPaymentSignature(merchantId, orderId, amount, currency, statusCode, invalidSig, merchantSecret);
    expect(isValid).toBe(false);
  });

  it('should verify a signature even with string amounts and statuses', () => {
    const statusCode = '2';
    const amountStr = '1500.00';
    
    const md5sig = generatePaymentHash(merchantId, orderId, amountStr, currency + statusCode, merchantSecret);
    
    const isValid = verifyPaymentSignature(merchantId, orderId, amountStr, currency, statusCode, md5sig, merchantSecret);
    expect(isValid).toBe(true);
  });
});
