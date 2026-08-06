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
router.use((0, auth_1.authorize)('admin')); // Only Admin manages customers directly
const customerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(6).optional().nullable(),
    email: zod_1.z.string().email().optional().nullable(),
});
// GET /api/admin/customers
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [customers, total] = await Promise.all([
            prisma_1.default.customer.findMany({
                where: { restaurantId },
                orderBy: { totalSpent: 'desc' }, // VIPs first
                skip,
                take: limit,
            }),
            prisma_1.default.customer.count({ where: { restaurantId } })
        ]);
        res.json({
            success: true,
            data: customers,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/customers/:id
router.get('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const customer = await prisma_1.default.customer.findUnique({
            where: { id: req.params.id },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: { id: true, orderNumber: true, total: true, createdAt: true, status: true },
                },
            }
        });
        if (!customer || customer.restaurantId !== restaurantId) {
            throw new Error("Pelanggan tidak ditemukan");
        }
        res.json({ success: true, data: customer });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/customers/:id
router.put('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { name, phone, email } = customerSchema.parse(req.body);
        const customer = await prisma_1.default.customer.findUnique({ where: { id: req.params.id } });
        if (!customer || customer.restaurantId !== restaurantId) {
            throw new Error("Pelanggan tidak ditemukan");
        }
        if (phone && phone !== customer.phone) {
            const existing = await prisma_1.default.customer.findUnique({
                where: { restaurantId_phone: { restaurantId, phone } },
            });
            if (existing)
                throw new Error("Nomor HP sudah digunakan pelanggan lain");
        }
        const updated = await prisma_1.default.customer.update({
            where: { id: req.params.id },
            data: { name, phone, email },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/customers/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const customer = await prisma_1.default.customer.findUnique({ where: { id: req.params.id } });
        if (!customer || customer.restaurantId !== restaurantId) {
            throw new Error("Pelanggan tidak ditemukan");
        }
        await prisma_1.default.customer.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: "Pelanggan dihapus" });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map