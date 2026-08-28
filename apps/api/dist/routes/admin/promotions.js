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
const promotionSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).toUpperCase(),
    discountType: zod_1.z.enum(['PERCENT', 'FIXED']),
    discountValue: zod_1.z.number().min(0.1),
    startDate: zod_1.z.string().datetime().optional().nullable(),
    endDate: zod_1.z.string().datetime().optional().nullable(),
    maxUsage: zod_1.z.number().int().min(1).optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
// GET /api/admin/promotions/active
router.get('/active', (0, auth_1.authorize)('admin', 'kasir'), async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const now = new Date();
        const promos = await prisma_1.default.promotion.findMany({
            where: {
                restaurantId,
                isActive: true,
                OR: [
                    { startDate: null },
                    { startDate: { lte: now } }
                ],
                AND: [
                    { OR: [{ endDate: null }, { endDate: { gte: now } }] }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: promos });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/promotions
router.get('/', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [promotions, total] = await Promise.all([
            prisma_1.default.promotion.findMany({
                where: { restaurantId },
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            orders: { where: { status: { not: 'cancelled' } } }
                        }
                    }
                },
                skip,
                take: limit,
            }),
            prisma_1.default.promotion.count({ where: { restaurantId } })
        ]);
        res.json({
            success: true,
            data: promotions,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/promotions
router.post('/', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const data = promotionSchema.parse(req.body);
        const existing = await prisma_1.default.promotion.findUnique({
            where: { restaurantId_code: { restaurantId, code: data.code } }
        });
        if (existing)
            throw new Error("Kode promo sudah digunakan");
        const promotion = await prisma_1.default.promotion.create({
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                restaurantId,
                name: `Promo ${data.code}`, // placeholder for required field
                description: "",
            }
        });
        res.status(201).json({ success: true, data: promotion });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/promotions/:id
router.put('/:id', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const data = promotionSchema.parse(req.body);
        const promotion = await prisma_1.default.promotion.findUnique({ where: { id: req.params.id } });
        if (!promotion || promotion.restaurantId !== restaurantId) {
            throw new Error("Promo tidak ditemukan");
        }
        if (data.code !== promotion.code) {
            const existing = await prisma_1.default.promotion.findUnique({
                where: { restaurantId_code: { restaurantId, code: data.code } }
            });
            if (existing)
                throw new Error("Kode promo sudah digunakan");
        }
        const updated = await prisma_1.default.promotion.update({
            where: { id: req.params.id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                name: `Promo ${data.code}`,
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/promotions/:id
router.delete('/:id', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const promotion = await prisma_1.default.promotion.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { orders: true } } }
        });
        if (!promotion || promotion.restaurantId !== restaurantId) {
            throw new Error("Promo tidak ditemukan");
        }
        if (promotion._count.orders > 0) {
            throw new Error("Promo sudah digunakan pada pesanan dan tidak dapat dihapus. Silakan nonaktifkan saja.");
        }
        await prisma_1.default.promotion.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: "Promo dihapus" });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=promotions.js.map