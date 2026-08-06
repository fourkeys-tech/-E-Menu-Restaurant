"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errorHandler_1 = require("../../middlewares/errorHandler");
const auth_1 = require("../../middlewares/auth");
const socket_1 = require("../../socket");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('admin', 'kasir', 'chef'));
// GET /api/admin/orders
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { status, paymentStatus, page = '1', limit = '20', date } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = { restaurantId };
        if (status)
            where.status = status;
        if (paymentStatus)
            where.paymentStatus = paymentStatus;
        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            where.createdAt = { gte: start, lt: end };
        }
        const [orders, total] = await Promise.all([
            prisma_1.default.order.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    orderItems: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
                    table: { select: { tableNumber: true, label: true } },
                    payment: true,
                    cashier: { select: { name: true } },
                    chef: { select: { name: true } },
                    customer: { select: { phone: true } },
                },
            }),
            prisma_1.default.order.count({ where }),
        ]);
        const parsedOrders = orders.map(order => ({
            ...order,
            orderItems: order.orderItems.map(item => ({
                ...item,
                variantSelected: item.variantSelected ? JSON.parse(item.variantSelected) : null
            }))
        }));
        res.json({
            success: true,
            data: parsedOrders,
            meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
        });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/admin/orders/:id/status
router.patch('/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'cooking', 'ready', 'served', 'completed', 'cancelled'];
        if (!validStatuses.includes(status))
            throw new errorHandler_1.AppError('Status tidak valid.', 400);
        const updateData = { status };
        if (req.user?.role === 'chef') {
            updateData.chefId = req.user.id;
        }
        const order = await prisma_1.default.order.update({
            where: { id: req.params.id },
            data: updateData,
        });
        (0, socket_1.emitOrderStatusUpdate)(order.restaurantId, order.id, {
            orderId: order.id,
            status: order.status,
            updatedAt: order.updatedAt,
        });
        res.json({ success: true, data: order });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/orders/:id - Cancel order
router.delete('/:id', (0, auth_1.authorize)('admin', 'kasir'), async (req, res, next) => {
    try {
        const order = await prisma_1.default.order.update({
            where: { id: req.params.id },
            data: { status: 'cancelled', paymentStatus: 'cancelled' },
        });
        (0, socket_1.emitOrderStatusUpdate)(order.restaurantId, order.id, {
            orderId: order.id,
            status: 'cancelled',
        });
        await prisma_1.default.activityLog.create({
            data: {
                restaurantId: order.restaurantId,
                userId: req.user?.id,
                action: 'Membatalkan Pesanan',
                details: `Pesanan #${order.orderNumber} dibatalkan`,
            }
        });
        res.json({ success: true, message: 'Pesanan dibatalkan.' });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/orders/:id/pay - Process cashier payment
router.put('/:id/pay', (0, auth_1.authorize)('admin', 'kasir'), async (req, res, next) => {
    try {
        const { amountReceived } = req.body;
        const order = await prisma_1.default.order.findUnique({ where: { id: req.params.id } });
        if (!order)
            throw new errorHandler_1.AppError('Pesanan tidak ditemukan.', 404);
        if (order.status !== 'awaiting_payment')
            throw new errorHandler_1.AppError('Pesanan ini tidak menunggu pembayaran.', 400);
        // Create payment record if it doesn't exist
        const paymentRecord = await prisma_1.default.payment.findUnique({ where: { orderId: order.id } });
        if (!paymentRecord) {
            await prisma_1.default.payment.create({
                data: {
                    orderId: order.id,
                    method: 'cashier',
                    status: 'paid',
                    amount: order.total,
                }
            });
        }
        else {
            await prisma_1.default.payment.update({
                where: { orderId: order.id },
                data: { status: 'paid' }
            });
        }
        const updatedOrder = await prisma_1.default.order.update({
            where: { id: req.params.id },
            data: {
                status: 'pending',
                paymentStatus: 'paid',
                cashierId: req.user?.id
            },
        });
        if (updatedOrder.customerId) {
            await prisma_1.default.customer.update({
                where: { id: updatedOrder.customerId },
                data: {
                    totalSpent: { increment: updatedOrder.total },
                    totalVisits: { increment: 1 },
                    lastVisitAt: new Date().toISOString(),
                }
            });
        }
        (0, socket_1.emitOrderStatusUpdate)(updatedOrder.restaurantId, updatedOrder.id, {
            orderId: updatedOrder.id,
            status: 'pending', // Now it's pending for the kitchen
            updatedAt: updatedOrder.updatedAt,
        });
        await prisma_1.default.activityLog.create({
            data: {
                restaurantId: updatedOrder.restaurantId,
                userId: req.user?.id,
                action: 'Menerima Pembayaran',
                details: `Pembayaran Rp ${order.total} diterima untuk Pesanan #${updatedOrder.orderNumber}`,
            }
        });
        res.json({ success: true, data: updatedOrder, changeAmount: amountReceived ? amountReceived - order.total : 0 });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map