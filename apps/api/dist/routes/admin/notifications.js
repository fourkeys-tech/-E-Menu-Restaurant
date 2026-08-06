"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_1 = require("../../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// All authenticated staff can view notifications
// GET /api/admin/notifications
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const notifications = await prisma_1.default.notification.findMany({
            where: { restaurantId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const unreadCount = await prisma_1.default.notification.count({
            where: { restaurantId, isRead: false }
        });
        res.json({ success: true, data: notifications, unreadCount });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/notifications/read-all
router.put('/read-all', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        await prisma_1.default.notification.updateMany({
            where: { restaurantId, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true, message: "Semua notifikasi ditandai sudah dibaca" });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/notifications/:id/read
router.put('/:id/read', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const notif = await prisma_1.default.notification.findUnique({ where: { id: req.params.id } });
        if (!notif || notif.restaurantId !== restaurantId) {
            throw new Error("Notifikasi tidak ditemukan");
        }
        const updated = await prisma_1.default.notification.update({
            where: { id: req.params.id },
            data: { isRead: true },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map