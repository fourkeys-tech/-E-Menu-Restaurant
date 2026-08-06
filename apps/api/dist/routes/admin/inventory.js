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
router.use((0, auth_1.authorize)('admin', 'chef')); // Admin and Chef can manage inventory
const itemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    unit: zod_1.z.string().min(1),
    minStock: zod_1.z.number().min(0).default(0),
});
const transactionSchema = zod_1.z.object({
    type: zod_1.z.enum(['IN', 'OUT']),
    quantity: zod_1.z.number().min(0.01),
    note: zod_1.z.string().optional(),
});
// GET /api/admin/inventory
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            prisma_1.default.inventoryItem.findMany({
                where: { restaurantId },
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            prisma_1.default.inventoryItem.count({ where: { restaurantId } })
        ]);
        res.json({
            success: true,
            data: items,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/inventory
router.post('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { name, unit, minStock } = itemSchema.parse(req.body);
        const existing = await prisma_1.default.inventoryItem.findUnique({
            where: { restaurantId_name: { restaurantId, name } },
        });
        if (existing)
            throw new Error("Barang sudah ada di inventory");
        const item = await prisma_1.default.inventoryItem.create({
            data: { restaurantId, name, unit, minStock },
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/inventory/:id
router.put('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { name, unit, minStock } = itemSchema.parse(req.body);
        const item = await prisma_1.default.inventoryItem.findUnique({ where: { id: req.params.id } });
        if (!item || item.restaurantId !== restaurantId)
            throw new Error("Barang tidak ditemukan");
        const updated = await prisma_1.default.inventoryItem.update({
            where: { id: req.params.id },
            data: { name, unit, minStock },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/inventory/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const item = await prisma_1.default.inventoryItem.findUnique({ where: { id: req.params.id } });
        if (!item || item.restaurantId !== restaurantId)
            throw new Error("Barang tidak ditemukan");
        await prisma_1.default.inventoryItem.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: "Barang dihapus" });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/inventory/:id/transaction
router.post('/:id/transaction', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const userId = req.user.id;
        const { type, quantity, note } = transactionSchema.parse(req.body);
        const item = await prisma_1.default.inventoryItem.findUnique({ where: { id: req.params.id } });
        if (!item || item.restaurantId !== restaurantId)
            throw new Error("Barang tidak ditemukan");
        if (type === 'OUT' && item.currentStock < quantity) {
            throw new Error(`Stok tidak cukup. Sisa stok: ${item.currentStock} ${item.unit}`);
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Create transaction record
            const trx = await tx.inventoryTransaction.create({
                data: {
                    itemId: item.id,
                    type,
                    quantity,
                    note,
                    userId,
                },
            });
            // Update current stock
            const newStock = type === 'IN' ? item.currentStock + quantity : item.currentStock - quantity;
            const updatedItem = await tx.inventoryItem.update({
                where: { id: item.id },
                data: { currentStock: newStock },
            });
            return { transaction: trx, item: updatedItem };
        });
        res.status(201).json({ success: true, data: result.item });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/inventory/:id/transactions
router.get('/:id/transactions', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const item = await prisma_1.default.inventoryItem.findUnique({ where: { id: req.params.id } });
        if (!item || item.restaurantId !== restaurantId)
            throw new Error("Barang tidak ditemukan");
        const transactions = await prisma_1.default.inventoryTransaction.findMany({
            where: { itemId: req.params.id },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, role: true } } },
            take: 50,
        });
        res.json({ success: true, data: transactions });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=inventory.js.map