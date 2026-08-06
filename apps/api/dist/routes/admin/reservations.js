"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_1 = require("../../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('admin', 'kasir'));
const reservationSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1),
    phone: zod_1.z.string().optional().nullable(),
    tableId: zod_1.z.string().optional().nullable(),
    reservationDate: zod_1.z.string().datetime(),
    guestCount: zod_1.z.number().min(1).default(1),
    notes: zod_1.z.string().optional().nullable(),
});
const statusSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
});
// GET /api/admin/reservations
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const where = { restaurantId };
        if (status && status !== 'all') {
            const statuses = String(status).split(',');
            where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
        }
        const [reservations, total] = await Promise.all([
            prisma_1.default.reservation.findMany({
                where,
                orderBy: { reservationDate: 'asc' },
                include: {
                    table: { select: { tableNumber: true, label: true } }
                },
                skip,
                take: limit,
            }),
            prisma_1.default.reservation.count({ where })
        ]);
        res.json({
            success: true,
            data: reservations,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/reservations
router.post('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const data = reservationSchema.parse(req.body);
        const reservation = await prisma_1.default.reservation.create({
            data: {
                ...data,
                restaurantId,
            }
        });
        res.status(201).json({ success: true, data: reservation });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/reservations/:id
router.put('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const data = reservationSchema.parse(req.body);
        const reservation = await prisma_1.default.reservation.findUnique({ where: { id: req.params.id } });
        if (!reservation || reservation.restaurantId !== restaurantId) {
            throw new Error("Reservasi tidak ditemukan");
        }
        const updated = await prisma_1.default.reservation.update({
            where: { id: req.params.id },
            data,
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/reservations/:id/status
router.put('/:id/status', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { status } = statusSchema.parse(req.body);
        const reservation = await prisma_1.default.reservation.findUnique({ where: { id: req.params.id } });
        if (!reservation || reservation.restaurantId !== restaurantId) {
            throw new Error("Reservasi tidak ditemukan");
        }
        const updated = await prisma_1.default.reservation.update({
            where: { id: req.params.id },
            data: { status },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/reservations/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const reservation = await prisma_1.default.reservation.findUnique({ where: { id: req.params.id } });
        if (!reservation || reservation.restaurantId !== restaurantId) {
            throw new Error("Reservasi tidak ditemukan");
        }
        await prisma_1.default.reservation.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: "Reservasi dihapus" });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=reservations.js.map