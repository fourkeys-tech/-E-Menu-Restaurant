import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { emitNewOrder, emitNotification } from '../socket';

const router = Router();

const createOrderSchema = z.object({
  restaurantSlug: z.string(),
  tableId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().min(1),
    notes: z.string().optional(),
    variantSelected: z.any().optional(),
  })).min(1, 'Minimal satu item'),
  promoCode: z.string().optional().nullable(),
});

// POST /api/orders - Create order (customer)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createOrderSchema.parse(req.body);

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: body.restaurantSlug },
    });
    if (!restaurant) throw new AppError('Restoran tidak ditemukan.', 404);

    // Validate table
    let tableRecord = null;
    if (body.tableId) {
      tableRecord = await prisma.table.findFirst({
        where: { id: body.tableId, restaurantId: restaurant.id, isActive: true },
      });
      if (!tableRecord) throw new AppError('Meja tidak ditemukan.', 404);
    }

    // Validate & calculate items
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of body.items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: { id: item.menuItemId, restaurantId: restaurant.id },
      });
      if (!menuItem) throw new AppError(`Menu item ${item.menuItemId} tidak ditemukan.`, 404);
      if (!menuItem.isAvailable) throw new AppError(`${menuItem.name} sedang tidak tersedia.`, 400);

      let itemPrice = menuItem.price;
      
      // Calculate additional prices from variants if it's an array
      if (Array.isArray(item.variantSelected)) {
        for (const variant of item.variantSelected) {
          if (variant.additionalPrice) {
            itemPrice += Number(variant.additionalPrice);
          }
        }
      } else if (item.variantSelected?.selectedOption?.additionalPrice) {
        // Fallback for old data structure
        itemPrice += item.variantSelected.selectedOption.additionalPrice;
      }

      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;

      orderItemsData.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes,
        priceAtOrder: itemPrice,
        variantSelected: item.variantSelected ? JSON.stringify(item.variantSelected) : null,
        subtotal: itemSubtotal,
      });
    }

    // Handle Promo Code
    let promotionId = null;
    let discountAmount = 0;
    if (body.promoCode) {
      const promo = await prisma.promotion.findUnique({
        where: { restaurantId_code: { restaurantId: restaurant.id, code: body.promoCode.toUpperCase() } }
      });
      if (promo && promo.isActive) {
        const now = new Date();
        const validStart = promo.startDate ? now >= promo.startDate : true;
        const validEnd = promo.endDate ? now <= promo.endDate : true;
        if (validStart && validEnd) {
          if (promo.maxUsage) {
            const usageCount = await prisma.order.count({
              where: { promotionId: promo.id, status: { not: 'cancelled' } }
            });
            if (usageCount >= promo.maxUsage) {
              throw new AppError('Batas penggunaan kode promo telah habis', 400);
            }
          }
          promotionId = promo.id;
          if (promo.discountType === 'PERCENT') {
            discountAmount = subtotal * (promo.discountValue / 100);
          } else if (promo.discountType === 'FIXED') {
            discountAmount = promo.discountValue;
          }
          if (discountAmount > subtotal) discountAmount = subtotal; // Don't discount more than subtotal
        }
      }
    }

    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = subtotalAfterDiscount * (restaurant.taxPercentage / 100);
    const serviceChargeAmount = subtotalAfterDiscount * (restaurant.serviceCharge / 100);
    const total = subtotalAfterDiscount + taxAmount + serviceChargeAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

    // Determine payment status
    const paymentStatus = body.paymentMethod === 'cashier' ? 'waiting_at_cashier' : 'unpaid';
    const initialStatus = body.paymentMethod === 'cashier' ? 'awaiting_payment' : 'pending';

    // Handle Customer Linking/Creation
    let customerId = null;
    if (body.customerPhone) {
      const customer = await prisma.customer.upsert({
        where: { restaurantId_phone: { restaurantId: restaurant.id, phone: body.customerPhone } },
        update: { 
          name: body.customerName || "Tanpa Nama" 
        },
        create: {
          restaurantId: restaurant.id,
          phone: body.customerPhone,
          name: body.customerName || "Tanpa Nama",
        }
      });
      customerId = customer.id;
    }

    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: body.tableId || null,
        orderNumber,
        customerName: body.customerName,
        customerId,
        notes: body.notes,
        status: initialStatus,
        paymentStatus,
        paymentMethod: body.paymentMethod,
        promotionId,
        subtotal,
        discountAmount,
        taxAmount,
        serviceCharge: serviceChargeAmount,
        total,
        orderItems: {
          create: orderItemsData,
        },
        payment: {
          create: {
            method: body.paymentMethod || 'cashier',
            amount: total,
            status: body.paymentMethod === 'cashier' ? 'pending' : 'pending',
          },
        },
      },
      include: {
        orderItems: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
        table: true,
        restaurant: { select: { name: true, primaryColor: true } },
        payment: true,
      },
    });

    const parsedOrder = {
      ...order,
      orderItems: (order as any).orderItems.map((item: any) => ({
        ...item,
        variantSelected: item.variantSelected ? JSON.parse(item.variantSelected as string) : null
      }))
    };

    // Create Notification
    const notif = await prisma.notification.create({
      data: {
        restaurantId: restaurant.id,
        title: "Pesanan Baru",
        message: `Pesanan ${orderNumber} baru saja masuk. (${body.paymentMethod === 'cashier' ? 'Bayar Kasir' : 'Menunggu Pembayaran'})`,
        type: "ORDER",
      }
    });

    // Emit real-time event
    emitNewOrder(restaurant.id, parsedOrder as any);
    emitNotification(restaurant.id, notif);

    res.status(201).json({ success: true, data: parsedOrder });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(err.errors[0].message, 400));
    } else {
      next(err);
    }
  }
});

// GET /api/orders/:id/status - Order tracking
router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        orderItems: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
        table: { select: { tableNumber: true, label: true } },
        restaurant: { select: { name: true, logoUrl: true, primaryColor: true, accentColor: true } },
        payment: true,
        promotion: { select: { name: true } },
      },
    });

    if (!order) throw new AppError('Pesanan tidak ditemukan.', 404);

    const parsedOrder = {
      ...order,
      orderItems: order.orderItems.map(item => ({
        ...item,
        variantSelected: item.variantSelected ? JSON.parse(item.variantSelected as string) : null
      }))
    };

    res.json({ success: true, data: parsedOrder });
  } catch (err) {
    next(err);
  }
});

export default router;
