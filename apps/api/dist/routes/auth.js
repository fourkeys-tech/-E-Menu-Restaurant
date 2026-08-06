"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middlewares/auth");
const errorHandler_1 = require("../middlewares/errorHandler");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email tidak valid'),
    password: zod_1.z.string().min(1, 'Password wajib diisi'),
});
// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            include: { restaurant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
        });
        if (!user || !user.isActive) {
            throw new errorHandler_1.AppError('Email atau password salah.', 401);
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch)
            throw new errorHandler_1.AppError('Email atau password salah.', 401);
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    restaurant: user.restaurant,
                },
            },
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            next(new errorHandler_1.AppError(err.errors[0].message, 400));
        }
        else {
            next(err);
        }
    }
});
// GET /api/auth/me
router.get('/me', auth_1.authenticate, async (req, res, next) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                restaurant: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, accentColor: true } },
            },
        });
        res.json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/auth/logout
router.post('/logout', auth_1.authenticate, (req, res) => {
    res.json({ success: true, message: 'Logout berhasil.' });
});
exports.default = router;
//# sourceMappingURL=auth.js.map