import { parseTypeScriptCode } from './parseTypeScriptCode';

const testCode = `
// File: api/payments.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/mongodb';
import { authenticateToken } from '../lib/auth';
import {
  validatePaymentInput,
  findOrder,
  createStripePaymentIntent,
  updateOrderStatus,
  createPaymentRecord,
  PaymentInput,
  Order,
  Payment
} from '../services/paymentService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await authenticateToken(req, res, async () => {
      const { db } = await connectToDatabase();
      const paymentInput = req.body as PaymentInput;

      // Step 1: Validate input
      const validationResult = validatePaymentInput(paymentInput);
      if (!validationResult.isValid) {
        return res.status(400).json({ error: validationResult.error });
      }

      // Step 2: Find order
      const order = await findOrder(db, paymentInput.orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Step 3: Create Stripe PaymentIntent
      const paymentIntent = await createStripePaymentIntent(stripe, paymentInput);

      if (paymentIntent.status === 'succeeded') {
        // Step 4: Update order status
        await updateOrderStatus(db, order._id, paymentIntent.id);

        // Step 5: Create payment record
        const payment = await createPaymentRecord(db, order._id, paymentInput, paymentIntent.id);

        res.status(200).json({
          success: true,
          paymentIntentId: paymentIntent.id,
          message: 'Payment processed successfully',
          payment: payment
        });
      } else {
        res.status(200).json({
          success: false,
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          message: 'Payment requires additional action'
        });
      }
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'An error occurred while processing the payment' });
  }
}
`;

describe('parseTypeScriptCode', () => {
  it('should correctly parse the handler function', () => {
    const result = parseTypeScriptCode(testCode);
    
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('handler');
    expect(result[0].parameters.length).toBe(2);
    expect(result[0].parameters[0]).toEqual({ name: 'req', type: 'VercelRequest' });
    expect(result[0].parameters[1]).toEqual({ name: 'res', type: 'VercelResponse' });
    expect(result[0].returnType).toBe('void');
    expect(result[0].lines.start).toBeGreaterThan(0);
    expect(result[0].lines.end).toBeGreaterThan(result[0].lines.start);
    expect(result[0].code).toContain('export default async function handler');
    expect(result[0].calledFunctions).toEqual(expect.arrayContaining([
      'authenticateToken',
      'connectToDatabase',
      'validatePaymentInput',
      'findOrder',
      'createStripePaymentIntent',
      'updateOrderStatus',
      'createPaymentRecord'
    ]));
  });

  it('should correctly identify inner functions', () => {
    const result = parseTypeScriptCode(testCode);
    
    expect(result[0].innerFunctions.length).toBe(1);
    const innerFunction = result[0].innerFunctions[0];
    expect(innerFunction.name).toBe('anonymous');
    expect(innerFunction.parameters.length).toBe(0);
    expect(innerFunction.returnType).toBe('void');
    expect(innerFunction.calledFunctions).toEqual(expect.arrayContaining([
      'connectToDatabase',
      'validatePaymentInput',
      'findOrder',
      'createStripePaymentIntent',
      'updateOrderStatus',
      'createPaymentRecord'
    ]));
  });

  it('should not include imported functions as inner functions', () => {
    const result = parseTypeScriptCode(testCode);
    console.log(JSON.stringify(result, null, 2))
    
    const innerFunctionNames = result[0].innerFunctions.map(f => f.name);
    expect(innerFunctionNames).not.toContain('validatePaymentInput');
    expect(innerFunctionNames).not.toContain('findOrder');
    expect(innerFunctionNames).not.toContain('createStripePaymentIntent');
    expect(innerFunctionNames).not.toContain('updateOrderStatus');
    expect(innerFunctionNames).not.toContain('createPaymentRecord');
  });
});