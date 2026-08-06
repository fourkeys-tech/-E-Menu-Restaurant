"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_1 = require("../../middlewares/auth");
const errorHandler_1 = require("../../middlewares/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/admin/activity - Get activity logs for the restaurant
router.get('/', (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const restaurantId = req.user?.restaurantId;
        if (!restaurantId)
            throw new errorHandler_1.AppError('Akses ditolak.', 403);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            prisma_1.default.activityLog.findMany({
                where: { restaurantId },
                include: {
                    user: { select: { name: true, role: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.default.activityLog.count({ where: { restaurantId } })
        ]);
        res.json({
            success: true,
            data: logs,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=activity.js.map