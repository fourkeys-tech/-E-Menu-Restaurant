import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { authenticate, AuthRequest, authorize } from '../middlewares/auth';
import { emitOrderStatusUpdate } from '../socket';

const router = Router();
// All payment routes require auth
router.use(authenticate);

// POST /api/payments/midtrans/create - Generate Snap token
router.post('/midtrans/create', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { menuItem: true } },
        payment: true,
        restaurant: true,
      },
    });

    if (!order) throw new AppError('Pesanan tidak ditemukan.', 404);
    if (order.paymentMethod !== 'midtrans') throw new AppError('Metode pembayaran bukan Midtrans.', 400);
    if (order.paymentStatus === 'paid') throw new AppError('Pesanan sudah dibayar.', 400);

    // Midtrans Snap SDK
    const midtransClient = require('midtrans-client');
    const snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    const parameter = {
      transaction_details: {
        order_id: order.orderNumber,
        gross_amount: Math.round(order.total),
      },
      item_details: order.orderItems.map((oi: any) => ({
        id: oi.menuItemId,
        price: Math.round(oi.priceAtOrder),
        quantity: oi.quantity,
        name: oi.menuItem.name,
      })),
      customer_details: {
        first_name: order.customerName || 'Pelanggan',
      },
      enabled_payments: ['qris', 'gopay', 'shopeepay', 'dana', 'ovo', 'bca_va', 'bni_va', 'bri_va'],
    };

    const transaction = await snap.createTransaction(parameter);

    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        snapToken: transaction.token,
        snapRedirectUrl: transaction.redirect_url,
      },
    });

    res.json({
      success: true,
      data: {
        snapToken: transaction.token,
        snapRedirectUrl: transaction.redirect_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/midtrans/webhook - Midtrans callback
router.post('/midtrans/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = req.body;
    const midtransClient = require('midtrans-client');
    const apiClient = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    const statusResponse = await apiClient.transaction.notification(notification);
    const orderNumber = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    const paymentType = statusResponse.payment_type;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });

    if (!order) return res.status(200).json({ message: 'Order not found' });

    let paymentStatus: any = 'pending';
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        paymentStatus = 'settlement';
      }
    } else if (transactionStatus === 'expire') {
      paymentStatus = 'expired';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny') {
      paymentStatus = 'cancelled';
    }

    const orderPaymentStatus = paymentStatus === 'settlement' ? 'paid' : 
      paymentStatus === 'expired' ? 'expired' : 
      paymentStatus === 'cancelled' ? 'cancelled' : 'unpaid';

    const paymentUpdate = prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status: paymentStatus,
        gatewayTransactionId: statusResponse.transaction_id,
        midtransPaymentType: paymentType,
        paidAt: paymentStatus === 'settlement' ? new Date() : undefined,
      },
    });

    const orderUpdate = prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: orderPaymentStatus as any },
    });

    const [updatedPayment, updatedOrder] = await prisma.$transaction([paymentUpdate, orderUpdate]);

    if (orderPaymentStatus === 'paid' && updatedOrder.customerId) {
      await prisma.customer.update({
        where: { id: updatedOrder.customerId },
        data: {
          totalSpent: { increment: updatedOrder.total },
          totalVisits: { increment: 1 },
          lastVisitAt: new Date(),
        },
      });
    }

    // Emit status update
    emitOrderStatusUpdate(order.restaurantId, order.id, {
      orderId: order.id,
      paymentStatus: orderPaymentStatus,
      paymentType,
    });

    res.status(200).json({ message: 'OK' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/payments/:orderId/confirm-cashier - Kasir konfirmasi bayar cash
router.post('/:orderId/confirm-cashier', authorize('admin', 'kasir'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) throw new AppError('Pesanan tidak ditemukan.', 404);
    if (order.paymentMethod !== 'cashier') throw new AppError('Bukan pesanan kasir.', 400);
    if (order.paymentStatus === 'paid') throw new AppError('Sudah dikonfirmasi sebelumnya.', 400);

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'paid', status: 'completed' },
      }),
      prisma.payment.update({
        where: { orderId },
        data: {
          status: 'paid_manual',
          confirmedByUserId: req.user!.id,
          paidAt: new Date(),
        },
      }),
    ]);

    emitOrderStatusUpdate(order.restaurantId, orderId, {
      orderId,
      status: 'completed',
      paymentStatus: 'paid',
    });

    res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi.' });
  } catch (err) {
    next(err);
  }
});

export default router;
