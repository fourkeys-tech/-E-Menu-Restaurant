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
router.use((0, auth_1.authorize)('admin')); // Only admin manages categories
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
});
// GET /api/admin/expenses/categories
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const categories = await prisma_1.default.expenseCategory.findMany({
            where: { restaurantId },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: categories });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/expenses/categories
router.post('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { name } = categorySchema.parse(req.body);
        const existing = await prisma_1.default.expenseCategory.findUnique({
            where: { restaurantId_name: { restaurantId, name } },
        });
        if (existing)
            throw new Error("Kategori sudah ada");
        const category = await prisma_1.default.expenseCategory.create({
            data: { restaurantId, name },
        });
        res.json({ success: true, data: category });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/expenses/categories/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const category = await prisma_1.default.expenseCategory.findUnique({
            where: { id: req.params.id },
        });
        if (!category || category.restaurantId !== restaurantId) {
            throw new Error("Kategori tidak ditemukan");
        }
        await prisma_1.default.expenseCategory.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true, message: "Kategori dihapus" });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/expenses/categories/:id
router.put('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { name } = categorySchema.parse(req.body);
        const category = await prisma_1.default.expenseCategory.findUnique({
            where: { id: req.params.id },
        });
        if (!category || category.restaurantId !== restaurantId) {
            throw new Error("Kategori tidak ditemukan");
        }
        const existing = await prisma_1.default.expenseCategory.findUnique({
            where: { restaurantId_name: { restaurantId, name } },
        });
        if (existing && existing.id !== req.params.id) {
            throw new Error("Nama kategori sudah digunakan");
        }
        const oldName = category.name;
        // Use transaction to update both category name and existing expenses
        const updatedCategory = await prisma_1.default.$transaction(async (tx) => {
            const updated = await tx.expenseCategory.update({
                where: { id: req.params.id },
                data: { name },
            });
            // Update all expenses that used the old category name
            await tx.expense.updateMany({
                where: { restaurantId, category: oldName },
                data: { category: name },
            });
            return updated;
        });
        res.json({ success: true, data: updatedCategory });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=expenseCategories.js.map