"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middlewares/errorHandler");
const socket_1 = require("../socket");
const router = (0, express_1.Router)();
const createOrderSchema = zod_1.z.object({
    restaurantSlug: zod_1.z.string(),
    tableId: zod_1.z.string().optional().nullable(),
    customerName: zod_1.z.string().optional().nullable(),
    customerPhone: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    paymentMethod: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(zod_1.z.object({
        menuItemId: zod_1.z.string(),
        quantity: zod_1.z.number().min(1),
        notes: zod_1.z.string().optional(),
        variantSelected: zod_1.z.any().optional(),
    })).min(1, 'Minimal satu item'),
    promoCode: zod_1.z.string().optional().nullable(),
});
// POST /api/orders - Create order (customer)
router.post('/', async (req, res, next) => {
    try {
        const body = createOrderSchema.parse(req.body);
        const restaurant = await prisma_1.default.restaurant.findUnique({
            where: { slug: body.restaurantSlug },
        });
        if (!restaurant)
            throw new errorHandler_1.AppError('Restoran tidak ditemukan.', 404);
        // Validate table
        let tableRecord = null;
        if (body.tableId) {
            tableRecord = await prisma_1.default.table.findFirst({
                where: { id: body.tableId, restaurantId: restaurant.id, isActive: true },
            });
            if (!tableRecord)
                throw new errorHandler_1.AppError('Meja tidak ditemukan.', 404);
        }
        // Validate & calculate items
        let subtotal = 0;
        const orderItemsData = [];
        for (const item of body.items) {
            const menuItem = await prisma_1.default.menuItem.findFirst({
                where: { id: item.menuItemId, restaurantId: restaurant.id },
            });
            if (!menuItem)
                throw new errorHandler_1.AppError(`Menu item ${item.menuItemId} tidak ditemukan.`, 404);
            if (!menuItem.isAvailable)
                throw new errorHandler_1.AppError(`${menuItem.name} sedang tidak tersedia.`, 400);
            let itemPrice = menuItem.price;
            // Calculate additional prices from variants if it's an array
            if (Array.isArray(item.variantSelected)) {
                for (const variant of item.variantSelected) {
                    if (variant.additionalPrice) {
                        itemPrice += Number(variant.additionalPrice);
                    }
                }
            }
            else if (item.variantSelected?.selectedOption?.additionalPrice) {
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
            const promo = await prisma_1.default.promotion.findUnique({
                where: { restaurantId_code: { restaurantId: restaurant.id, code: body.promoCode.toUpperCase() } }
            });
            if (promo && promo.isActive) {
                const now = new Date();
                const validStart = promo.startDate ? now >= promo.startDate : true;
                const validEnd = promo.endDate ? now <= promo.endDate : true;
                if (validStart && validEnd) {
                    promotionId = promo.id;
                    if (promo.discountType === 'PERCENT') {
                        discountAmount = subtotal * (promo.discountValue / 100);
                    }
                    else if (promo.discountType === 'FIXED') {
                        discountAmount = promo.discountValue;
                    }
                    if (discountAmount > subtotal)
                        discountAmount = subtotal; // Don't discount more than subtotal
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
            const customer = await prisma_1.default.customer.upsert({
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
        const order = await prisma_1.default.order.create({
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
            orderItems: order.orderItems.map((item) => ({
                ...item,
                variantSelected: item.variantSelected ? JSON.parse(item.variantSelected) : null
            }))
        };
        // Create Notification
        const notif = await prisma_1.default.notification.create({
            data: {
                restaurantId: restaurant.id,
                title: "Pesanan Baru",
                message: `Pesanan ${orderNumber} baru saja masuk. (${body.paymentMethod === 'cashier' ? 'Bayar Kasir' : 'Menunggu Pembayaran'})`,
                type: "ORDER",
            }
        });
        // Emit real-time event
        (0, socket_1.emitNewOrder)(restaurant.id, parsedOrder);
        (0, socket_1.emitNotification)(restaurant.id, notif);
        res.status(201).json({ success: true, data: parsedOrder });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            next(new errorHandler_1.AppError(err.errors[0].message, 400));
        }
        else {
            next(err);
        }
    }
});
// GET /api/orders/:id/status - Order tracking
router.get('/:id/status', async (req, res, next) => {
    try {
        const order = await prisma_1.default.order.findUnique({
            where: { id: req.params.id },
            include: {
                orderItems: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
                table: { select: { tableNumber: true, label: true } },
                restaurant: { select: { name: true, logoUrl: true, primaryColor: true, accentColor: true } },
                payment: true,
            },
        });
        if (!order)
            throw new errorHandler_1.AppError('Pesanan tidak ditemukan.', 404);
        const parsedOrder = {
            ...order,
            orderItems: order.orderItems.map(item => ({
                ...item,
                variantSelected: item.variantSelected ? JSON.parse(item.variantSelected) : null
            }))
        };
        res.json({ success: true, data: parsedOrder });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map