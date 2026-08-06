"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middlewares/errorHandler");
const auth_1 = require("../middlewares/auth");
const socket_1 = require("../socket");
const router = (0, express_1.Router)();
// All payment routes require auth
router.use(auth_1.authenticate);
// POST /api/payments/midtrans/create - Generate Snap token
router.post('/midtrans/create', async (req, res, next) => {
    try {
        const { orderId } = req.body;
        const order = await prisma_1.default.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: { include: { menuItem: true } },
                payment: true,
                restaurant: true,
            },
        });
        if (!order)
            throw new errorHandler_1.AppError('Pesanan tidak ditemukan.', 404);
        if (order.paymentMethod !== 'midtrans')
            throw new errorHandler_1.AppError('Metode pembayaran bukan Midtrans.', 400);
        if (order.paymentStatus === 'paid')
            throw new errorHandler_1.AppError('Pesanan sudah dibayar.', 400);
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
            item_details: order.orderItems.map((oi) => ({
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
        await prisma_1.default.payment.update({
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
    }
    catch (err) {
        next(err);
    }
});
// POST /api/payments/midtrans/webhook - Midtrans callback
router.post('/midtrans/webhook', async (req, res, next) => {
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
        const order = await prisma_1.default.order.findUnique({
            where: { orderNumber },
            include: { payment: true },
        });
        if (!order)
            return res.status(200).json({ message: 'Order not found' });
        let paymentStatus = 'pending';
        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'accept' || !fraudStatus) {
                paymentStatus = 'settlement';
            }
        }
        else if (transactionStatus === 'expire') {
            paymentStatus = 'expired';
        }
        else if (transactionStatus === 'cancel' || transactionStatus === 'deny') {
            paymentStatus = 'cancelled';
        }
        const orderPaymentStatus = paymentStatus === 'settlement' ? 'paid' :
            paymentStatus === 'expired' ? 'expired' :
                paymentStatus === 'cancelled' ? 'cancelled' : 'unpaid';
        const paymentUpdate = prisma_1.default.payment.update({
            where: { orderId: order.id },
            data: {
                status: paymentStatus,
                gatewayTransactionId: statusResponse.transaction_id,
                midtransPaymentType: paymentType,
                paidAt: paymentStatus === 'settlement' ? new Date() : undefined,
            },
        });
        const orderUpdate = prisma_1.default.order.update({
            where: { id: order.id },
            data: { paymentStatus: orderPaymentStatus },
        });
        const [updatedPayment, updatedOrder] = await prisma_1.default.$transaction([paymentUpdate, orderUpdate]);
        if (orderPaymentStatus === 'paid' && updatedOrder.customerId) {
            await prisma_1.default.customer.update({
                where: { id: updatedOrder.customerId },
                data: {
                    totalSpent: { increment: updatedOrder.total },
                    totalVisits: { increment: 1 },
                    lastVisitAt: new Date(),
                },
            });
        }
        // Emit status update
        (0, socket_1.emitOrderStatusUpdate)(order.restaurantId, order.id, {
            orderId: order.id,
            paymentStatus: orderPaymentStatus,
            paymentType,
        });
        res.status(200).json({ message: 'OK' });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/payments/:orderId/confirm-cashier - Kasir konfirmasi bayar cash
router.post('/:orderId/confirm-cashier', (0, auth_1.authorize)('admin', 'kasir'), async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const order = await prisma_1.default.order.findUnique({
            where: { id: orderId },
            include: { payment: true },
        });
        if (!order)
            throw new errorHandler_1.AppError('Pesanan tidak ditemukan.', 404);
        if (order.paymentMethod !== 'cashier')
            throw new errorHandler_1.AppError('Bukan pesanan kasir.', 400);
        if (order.paymentStatus === 'paid')
            throw new errorHandler_1.AppError('Sudah dikonfirmasi sebelumnya.', 400);
        await prisma_1.default.$transaction([
            prisma_1.default.order.update({
                where: { id: orderId },
                data: { paymentStatus: 'paid', status: 'completed' },
            }),
            prisma_1.default.payment.update({
                where: { orderId },
                data: {
                    status: 'paid_manual',
                    confirmedByUserId: req.user.id,
                    paidAt: new Date(),
                },
            }),
        ]);
        (0, socket_1.emitOrderStatusUpdate)(order.restaurantId, orderId, {
            orderId,
            status: 'completed',
            paymentStatus: 'paid',
        });
        res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map