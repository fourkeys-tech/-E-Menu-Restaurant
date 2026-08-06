"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errorHandler_1 = require("../../middlewares/errorHandler");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('admin'));
const userSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['admin', 'kasir', 'chef']),
});
// GET /api/admin/users
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where: { restaurantId },
                select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit,
            }),
            prisma_1.default.user.count({ where: { restaurantId } })
        ]);
        res.json({
            success: true,
            data: users,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/users
router.post('/', async (req, res, next) => {
    try {
        const { name, email, password, role } = userSchema.parse(req.body);
        const restaurantId = req.user.restaurantId;
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.default.user.create({
            data: { restaurantId, name, email, passwordHash, role },
            select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        });
        res.status(201).json({ success: true, data: user });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError)
            next(new errorHandler_1.AppError(err.errors[0].message, 400));
        else
            next(err);
    }
});
// PUT /api/admin/users/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { name, role, isActive, password } = req.body;
        const updateData = { name, role, isActive };
        if (password)
            updateData.passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.default.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, isActive: true },
        });
        res.json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/users/:id
router.delete('/:id', async (req, res, next) => {
    try {
        if (req.params.id === req.user.id)
            throw new errorHandler_1.AppError('Tidak bisa menghapus akun sendiri.', 400);
        await prisma_1.default.user.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'User dihapus.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map