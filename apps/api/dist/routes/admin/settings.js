"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const errorHandler_1 = require("../../middlewares/errorHandler");
const auth_1 = require("../../middlewares/auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// Middleware: all routes require authentication
router.use(auth_1.authenticate);
// Middleware: admin only routes
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return next(new errorHandler_1.AppError('Unauthorized', 403));
    }
    next();
};
// ==================== PROFILE ====================
// GET /api/admin/settings/profile
router.get('/profile', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true }
        });
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404);
        res.json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/settings/profile
router.put('/profile', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        // Check email uniqueness if email changed
        if (email && email !== req.user.email) {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing)
                throw new errorHandler_1.AppError('Email sudah terdaftar.', 400);
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (password) {
            const salt = await bcryptjs_1.default.genSalt(10);
            updateData.passwordHash = await bcryptjs_1.default.hash(password, salt);
        }
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true }
        });
        res.json({ success: true, data: updated, message: 'Profil berhasil diperbarui' });
    }
    catch (err) {
        next(err);
    }
});
// ==================== RESTAURANT ====================
// GET /api/admin/settings/restaurant
router.get('/restaurant', requireAdmin, async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        if (!restaurantId)
            throw new errorHandler_1.AppError('Restoran tidak ditemukan', 404);
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId }
        });
        if (!restaurant)
            throw new errorHandler_1.AppError('Restoran tidak ditemukan', 404);
        res.json({ success: true, data: restaurant });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/settings/restaurant
router.put('/restaurant', requireAdmin, async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        if (!restaurantId)
            throw new errorHandler_1.AppError('Restoran tidak ditemukan', 404);
        const { name, address, phone, email, logoUrl, description, taxPercentage, serviceCharge, primaryColor, accentColor } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (address !== undefined)
            updateData.address = address;
        if (phone !== undefined)
            updateData.phone = phone;
        if (email !== undefined)
            updateData.email = email;
        if (logoUrl !== undefined)
            updateData.logoUrl = logoUrl;
        if (description !== undefined)
            updateData.description = description;
        if (taxPercentage !== undefined) {
            updateData.taxPercentage = parseFloat(taxPercentage) || 0;
        }
        if (serviceCharge !== undefined) {
            updateData.serviceCharge = parseFloat(serviceCharge) || 0;
        }
        if (primaryColor !== undefined)
            updateData.primaryColor = primaryColor;
        if (accentColor !== undefined)
            updateData.accentColor = accentColor;
        const updated = await prisma.restaurant.update({
            where: { id: restaurantId },
            data: updateData
        });
        res.json({ success: true, data: updated, message: 'Pengaturan restoran berhasil diperbarui' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map