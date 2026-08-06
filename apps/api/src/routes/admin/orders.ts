import { Router, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';
import { emitOrderStatusUpdate } from '../../socket';

const router = Router();
router.use(authenticate, authorize('admin', 'kasir', 'chef'));

// GET /api/admin/orders
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { status, paymentStatus, page = '1', limit = '20', date } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { restaurantId };
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (date) {
      const start = new Date(date as string);
      const end = new Date(date as string);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
          table: { select: { tableNumber: true, label: true } },
          payment: true,
          cashier: { select: { name: true } },
          chef: { select: { name: true } },
          customer: { select: { phone: true } },
          promotion: { select: { name: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const parsedOrders = orders.map(order => ({
      ...order,
      orderItems: order.orderItems.map(item => ({
        ...item,
        variantSelected: item.variantSelected ? JSON.parse(item.variantSelected as string) : null
      }))
    }));

    res.json({
      success: true,
      data: parsedOrders,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (err) { next(err); }
});

// PATCH /api/admin/orders/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'cooking', 'ready', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) throw new AppError('Status tidak valid.', 400);

    const updateData: any = { status };
    if (req.user?.role === 'chef') {
      updateData.chefId = req.user.id;
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
    });

    emitOrderStatusUpdate(order.restaurantId, order.id, {
      orderId: order.id,
      status: order.status,
      updatedAt: order.updatedAt,
    });

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// DELETE /api/admin/orders/:id - Cancel order
router.delete('/:id', authorize('admin', 'kasir'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'cancelled', paymentStatus: 'cancelled' },
    });

    emitOrderStatusUpdate(order.restaurantId, order.id, {
      orderId: order.id,
      status: 'cancelled',
    });

    await prisma.activityLog.create({
      data: {
        restaurantId: order.restaurantId,
        userId: req.user?.id,
        action: 'Membatalkan Pesanan',
        details: `Pesanan #${order.orderNumber} dibatalkan`,
      }
    });

    res.json({ success: true, message: 'Pesanan dibatalkan.' });
  } catch (err) { next(err); }
});

// PATCH /api/admin/orders/:id/promo - Apply or remove promo
router.patch('/:id/promo', authorize('admin', 'kasir'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { promotionId } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new AppError('Pesanan tidak ditemukan.', 404);
    if (order.paymentStatus === 'paid') throw new AppError('Pesanan sudah dibayar.', 400);

    let discountAmount = 0;
    if (promotionId) {
      const promo = await prisma.promotion.findUnique({ where: { id: promotionId } });
      if (!promo || !promo.isActive) throw new AppError('Promo tidak valid atau sudah tidak aktif', 400);
      if (promo.restaurantId !== order.restaurantId) throw new AppError('Promo tidak valid', 400);
      if (promo.minOrderAmount && order.subtotal < promo.minOrderAmount) {
        throw new AppError(`Minimal pesanan untuk promo ini adalah Rp ${promo.minOrderAmount}`, 400);
      }
      
      const now = new Date();
      if (promo.startDate && now < promo.startDate) throw new AppError('Promo belum dimulai', 400);
      if (promo.endDate && now > promo.endDate) throw new AppError('Promo sudah kadaluarsa', 400);
      
      if (promo.maxUsage && order.promotionId !== promo.id) {
        const usageCount = await prisma.order.count({
          where: { promotionId: promo.id, status: { not: 'cancelled' } }
        });
        if (usageCount >= promo.maxUsage) {
          throw new AppError('Batas penggunaan kode promo telah habis', 400);
        }
      }
      
      if (promo.discountType === 'PERCENT') {
        discountAmount = order.subtotal * (promo.discountValue / 100);
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
          discountAmount = promo.maxDiscount;
        }
      } else {
        discountAmount = promo.discountValue;
      }
    }
    
    const amountAfterDiscount = Math.max(0, order.subtotal - discountAmount);
    const taxAmount = amountAfterDiscount * 0.11;
    const total = amountAfterDiscount + taxAmount + order.serviceCharge;

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { promotionId: promotionId || null, discountAmount, taxAmount, total },
      include: {
        orderItems: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
        table: { select: { tableNumber: true, label: true } },
        payment: true,
        cashier: { select: { name: true } },
        chef: { select: { name: true } },
        customer: { select: { phone: true } },
        promotion: true,
      }
    });

    res.json({ success: true, data: updatedOrder, message: promotionId ? 'Promo berhasil dipasang' : 'Promo dihapus' });
  } catch (err) { next(err); }
});

// PUT /api/admin/orders/:id/pay - Process cashier payment
router.put('/:id/pay', authorize('admin', 'kasir'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amountReceived } = req.body;
    
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new AppError('Pesanan tidak ditemukan.', 404);
    if (order.status !== 'awaiting_payment') throw new AppError('Pesanan ini tidak menunggu pembayaran.', 400);
    
    // Create payment record if it doesn't exist
    const paymentRecord = await prisma.payment.findUnique({ where: { orderId: order.id } });
    if (!paymentRecord) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'cashier',
          status: 'paid',
          amount: order.total,
        }
      });
    } else {
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { status: 'paid' }
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { 
        status: 'pending',
        paymentStatus: 'paid',
        cashierId: req.user?.id
      },
    });

    if (updatedOrder.customerId) {
      await prisma.customer.update({
        where: { id: updatedOrder.customerId },
        data: {
          totalSpent: { increment: updatedOrder.total },
          totalVisits: { increment: 1 },
          lastVisitAt: new Date().toISOString(),
        }
      });
    }

    emitOrderStatusUpdate(updatedOrder.restaurantId, updatedOrder.id, {
      orderId: updatedOrder.id,
      status: 'pending', // Now it's pending for the kitchen
      updatedAt: updatedOrder.updatedAt,
    });

    await prisma.activityLog.create({
      data: {
        restaurantId: updatedOrder.restaurantId,
        userId: req.user?.id,
        action: 'Menerima Pembayaran',
        details: `Pembayaran Rp ${order.total} diterima untuk Pesanan #${updatedOrder.orderNumber}`,
      }
    });

    res.json({ success: true, data: updatedOrder, changeAmount: amountReceived ? amountReceived - order.total : 0 });
  } catch (err) { next(err); }
});

export default router;
