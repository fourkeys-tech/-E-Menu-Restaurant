"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errorHandler_1 = require("../../middlewares/errorHandler");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('admin'));
const tableSchema = zod_1.z.object({
    tableNumber: zod_1.z.string().min(1),
    label: zod_1.z.string().optional(),
    capacity: zod_1.z.number().min(1).optional(),
});
// GET /api/admin/tables
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [tables, total] = await Promise.all([
            prisma_1.default.table.findMany({
                where: { restaurantId },
                orderBy: { tableNumber: 'asc' },
                include: { _count: { select: { orders: true } } },
                skip,
                take: limit,
            }),
            prisma_1.default.table.count({ where: { restaurantId } })
        ]);
        res.json({
            success: true,
            data: tables,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/tables
router.post('/', async (req, res, next) => {
    try {
        const data = tableSchema.parse(req.body);
        const restaurantId = req.user.restaurantId;
        const restaurant = await prisma_1.default.restaurant.findUnique({
            where: { id: restaurantId },
            select: { slug: true },
        });
        const table = await prisma_1.default.table.create({
            data: { restaurantId, ...data },
        });
        // Generate QR Code URL
        const menuUrl = `${process.env.FRONTEND_CUSTOMER_URL}/menu/${restaurant.slug}?table=${table.id}`;
        const qrDataUrl = await qrcode_1.default.toDataURL(menuUrl, {
            width: 400,
            margin: 2,
            color: { dark: '#1A1A1A', light: '#FAFAF8' },
        });
        const updatedTable = await prisma_1.default.table.update({
            where: { id: table.id },
            data: { qrCodeUrl: qrDataUrl },
        });
        res.status(201).json({ success: true, data: updatedTable });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError)
            next(new errorHandler_1.AppError(err.errors[0].message, 400));
        else
            next(err);
    }
});
// PUT /api/admin/tables/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { tableNumber, label, capacity, isActive } = req.body;
        const table = await prisma_1.default.table.update({
            where: { id: req.params.id },
            data: { tableNumber, label, capacity, isActive },
        });
        res.json({ success: true, data: table });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/tables/:id/qrcode - Get/regenerate QR Code
router.get('/:id/qrcode', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const table = await prisma_1.default.table.findFirst({
            where: { id: req.params.id, restaurantId },
            include: { restaurant: { select: { slug: true } } },
        });
        if (!table)
            throw new errorHandler_1.AppError('Meja tidak ditemukan.', 404);
        const menuUrl = `${process.env.FRONTEND_CUSTOMER_URL}/menu/${table.restaurant.slug}?table=${table.id}`;
        const qrDataUrl = await qrcode_1.default.toDataURL(menuUrl, {
            width: 600,
            margin: 2,
            color: { dark: '#1A1A1A', light: '#FAFAF8' },
        });
        // Update table with new QR
        await prisma_1.default.table.update({ where: { id: table.id }, data: { qrCodeUrl: qrDataUrl } });
        res.json({
            success: true,
            data: {
                tableId: table.id,
                tableNumber: table.tableNumber,
                menuUrl,
                qrCodeDataUrl: qrDataUrl,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/tables/:id
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma_1.default.table.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Meja dihapus.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=tables.js.map