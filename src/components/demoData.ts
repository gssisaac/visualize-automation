import { FunctionData } from "./types";

export const demoData: FunctionData[] = [
  {
    name: 'handler',
    parameters: [
      { name: 'req', type: 'VercelRequest' },
      { name: 'res', type: 'VercelResponse' }
    ],
    returnType: 'Promise<void>',
    lines: { start: 15, end: 53 },
    code: `export default async function handler(req: VercelRequest, res: VercelResponse) {
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
}`,
    innerFunctions: [
      {
        name: 'validatePaymentInput',
        parameters: [
          { name: 'input', type: 'PaymentInput' }
        ],
        returnType: '{ isValid: boolean; error?: string }',
        lines: { start: 65, end: 74 },
        code: `export function validatePaymentInput(input: PaymentInput): { isValid: boolean; error?: string } {
  if (!input.orderId || !input.amount || !input.currency || !input.paymentMethodId) {
    return { isValid: false, error: 'Missing required fields' };
  }
  if (input.amount <= 0) {
    return { isValid: false, error: 'Invalid amount' };
  }
  return { isValid: true };
}`
      },
      {
        name: 'findOrder',
        parameters: [
          { name: 'db', type: 'Db' },
          { name: 'orderId', type: 'string' }
        ],
        returnType: 'Promise<Order | null>',
        lines: { start: 76, end: 79 },
        code: `export async function findOrder(db: Db, orderId: string): Promise<Order | null> {
  const ordersCollection = db.collection<Order>('orders');
  return await ordersCollection.findOne({ _id: new ObjectId(orderId) });
}`
      },
      {
        name: 'createStripePaymentIntent',
        parameters: [
          { name: 'stripe', type: 'Stripe' },
          { name: 'input', type: 'PaymentInput' }
        ],
        returnType: 'Promise<Stripe.PaymentIntent>',
        lines: { start: 81, end: 90 },
        code: `export async function createStripePaymentIntent(stripe: Stripe, input: PaymentInput): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.create({
    amount: input.amount,
    currency: input.currency,
    payment_method: input.paymentMethodId,
    confirmation_method: 'manual',
    confirm: true,
  });
}`
      },
      {
        name: 'updateOrderStatus',
        parameters: [
          { name: 'db', type: 'Db' },
          { name: 'orderId', type: 'ObjectId' },
          { name: 'paymentIntentId', type: 'string' }
        ],
        returnType: 'Promise<void>',
        lines: { start: 92, end: 98 },
        code: `export async function updateOrderStatus(db: Db, orderId: ObjectId, paymentIntentId: string): Promise<void> {
  const ordersCollection = db.collection<Order>('orders');
  await ordersCollection.updateOne(
    { _id: orderId },
    { $set: { status: 'PAID', paymentIntentId: paymentIntentId } }
  );
}`
      },
      {
        name: 'createPaymentRecord',
        parameters: [
          { name: 'db', type: 'Db' },
          { name: 'orderId', type: 'ObjectId' },
          { name: 'input', type: 'PaymentInput' },
          { name: 'paymentIntentId', type: 'string' }
        ],
        returnType: 'Promise<Payment>',
        lines: { start: 100, end: 112 },
        code: `export async function createPaymentRecord(db: Db, orderId: ObjectId, input: PaymentInput, paymentIntentId: string): Promise<Payment> {
  const paymentsCollection = db.collection<Payment>('payments');
  const payment: Payment = {
    _id: new ObjectId(),
    orderId: orderId,
    amount: input.amount,
    currency: input.currency,
    paymentIntentId: paymentIntentId,
    status: 'succeeded',
    createdAt: new Date(),
  };
  await paymentsCollection.insertOne(payment);
  return payment;
}`
      }
    ]
  }
];
