"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errorHandler_1 = require("../../middlewares/errorHandler");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/admin/shifts/current
// Get the currently open shift for the logged-in user
router.get('/current', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const userId = req.user.id;
        const shift = await prisma_1.default.shift.findFirst({
            where: {
                restaurantId,
                userId,
                status: 'open',
            }
        });
        res.json({ success: true, data: shift });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/shifts/open
router.post('/open', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const userId = req.user.id;
        const { openingCash } = req.body;
        // Check if there's already an open shift
        const existing = await prisma_1.default.shift.findFirst({
            where: { restaurantId, userId, status: 'open' }
        });
        if (existing) {
            throw new errorHandler_1.AppError('Anda masih memiliki shift yang belum ditutup.', 400);
        }
        const shift = await prisma_1.default.shift.create({
            data: {
                restaurantId,
                userId,
                openingCash: Number(openingCash) || 0,
                status: 'open',
                openTime: new Date()
            }
        });
        res.status(201).json({ success: true, data: shift });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/shifts/close
router.post('/close', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const userId = req.user.id;
        const { closingCash, notes } = req.body;
        const shift = await prisma_1.default.shift.findFirst({
            where: { restaurantId, userId, status: 'open' }
        });
        if (!shift) {
            throw new errorHandler_1.AppError('Tidak ada shift aktif yang bisa ditutup.', 400);
        }
        // Calculate expected cash based on orders completed during the shift
        // For MVP, we can assume expectedCash is openingCash + total payments processed by this user during the shift timeframe
        const payments = await prisma_1.default.payment.findMany({
            where: {
                confirmedByUserId: userId,
                status: 'paid',
                paidAt: { gte: shift.openTime }
            }
        });
        const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
        const expectedCash = shift.openingCash + totalRevenue;
        const actualClosingCash = Number(closingCash) || 0;
        const diff = actualClosingCash - expectedCash;
        const closedShift = await prisma_1.default.shift.update({
            where: { id: shift.id },
            data: {
                closeTime: new Date(),
                closingCash: actualClosingCash,
                expectedCash,
                diff,
                status: 'closed',
                notes
            }
        });
        res.json({ success: true, data: closedShift });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/shifts
// Admin only: view all shifts history
router.get('/', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [shifts, total] = await Promise.all([
            prisma_1.default.shift.findMany({
                where: { restaurantId },
                include: {
                    user: { select: { name: true, role: true } }
                },
                orderBy: { openTime: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.default.shift.count({ where: { restaurantId } })
        ]);
        res.json({
            success: true,
            data: shifts,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=shifts.js.map