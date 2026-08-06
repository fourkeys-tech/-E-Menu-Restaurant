"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errorHandler_1 = require("../../middlewares/errorHandler");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('admin', 'kasir')); // Kasir can also add expenses if authorized, but usually admin/manager
const expenseSchema = zod_1.z.object({
    amount: zod_1.z.number().min(0),
    category: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
});
// GET /api/admin/expenses
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { month, year } = req.query;
        let dateFilter = {};
        if (month && year) {
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
            dateFilter = {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            };
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const where = {
            restaurantId,
            ...dateFilter,
        };
        const [expenses, totalCount, aggregate] = await Promise.all([
            prisma_1.default.expense.findMany({
                where,
                include: {
                    user: { select: { name: true, role: true } }
                },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.default.expense.count({ where }),
            prisma_1.default.expense.aggregate({
                where,
                _sum: { amount: true }
            })
        ]);
        const total = aggregate._sum.amount || 0;
        res.json({
            success: true,
            data: {
                expenses,
                total,
                meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }
            }
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/expenses
router.post('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const parsed = expenseSchema.parse(req.body);
        const expense = await prisma_1.default.expense.create({
            data: {
                restaurantId,
                userId: req.user.id,
                amount: parsed.amount,
                category: parsed.category,
                description: parsed.description,
                date: parsed.date ? new Date(parsed.date) : new Date(),
            }
        });
        res.status(201).json({ success: true, data: expense });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/expenses/:id
router.delete('/:id', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        const expense = await prisma_1.default.expense.findFirst({
            where: { id, restaurantId }
        });
        if (!expense)
            throw new errorHandler_1.AppError('Pengeluaran tidak ditemukan', 404);
        await prisma_1.default.expense.delete({ where: { id } });
        res.json({ success: true, message: 'Pengeluaran berhasil dihapus' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=expenses.js.map