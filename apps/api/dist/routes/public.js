"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middlewares/errorHandler");
const router = (0, express_1.Router)();
// GET /api/public/:restaurantSlug/menu
router.get('/:restaurantSlug/menu', async (req, res, next) => {
    try {
        const { restaurantSlug } = req.params;
        const { category, search } = req.query;
        const restaurant = await prisma_1.default.restaurant.findUnique({
            where: { slug: restaurantSlug, isActive: true },
            select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                coverImageUrl: true,
                description: true,
                openHours: true,
                taxPercentage: true,
                serviceCharge: true,
                primaryColor: true,
                accentColor: true,
            },
        });
        if (!restaurant)
            throw new errorHandler_1.AppError('Restoran tidak ditemukan.', 404);
        const categories = await prisma_1.default.category.findMany({
            where: { restaurantId: restaurant.id, isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                menuItems: {
                    where: {
                        isAvailable: true,
                        ...(search ? { name: { contains: search } } : {}),
                    },
                    orderBy: [{ isBestSeller: 'desc' }, { sortOrder: 'asc' }],
                },
            },
            ...(category ? { where: { restaurantId: restaurant.id, slug: category, isActive: true } } : {}),
        });
        // Re-apply restaurant filter after category filter
        const filteredCategories = await prisma_1.default.category.findMany({
            where: {
                restaurantId: restaurant.id,
                isActive: true,
                ...(category ? { slug: category } : {}),
            },
            orderBy: { sortOrder: 'asc' },
            include: {
                menuItems: {
                    where: {
                        isAvailable: true,
                        ...(search ? { name: { contains: search } } : {}),
                    },
                    orderBy: [{ isBestSeller: 'desc' }, { sortOrder: 'asc' }],
                },
            },
        });
        const parsedCategories = filteredCategories.map((cat) => ({
            ...cat,
            menuItems: cat.menuItems.map((item) => ({
                ...item,
                variants: item.variants ? JSON.parse(item.variants) : null
            }))
        }));
        res.json({
            success: true,
            data: {
                restaurant,
                categories: parsedCategories,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/public/:restaurantSlug/menu/:itemId
router.get('/:restaurantSlug/menu/:itemId', async (req, res, next) => {
    try {
        const { restaurantSlug, itemId } = req.params;
        const restaurant = await prisma_1.default.restaurant.findUnique({
            where: { slug: restaurantSlug },
            select: { id: true },
        });
        if (!restaurant)
            throw new errorHandler_1.AppError('Restoran tidak ditemukan.', 404);
        const item = await prisma_1.default.menuItem.findFirst({
            where: { id: itemId, restaurantId: restaurant.id },
            include: { category: { select: { id: true, name: true, slug: true } } },
        });
        if (!item)
            throw new errorHandler_1.AppError('Menu tidak ditemukan.', 404);
        const parsedItem = {
            ...item,
            variants: item.variants ? JSON.parse(item.variants) : null
        };
        res.json({ success: true, data: parsedItem });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/public/:restaurantSlug/table/:tableId
router.get('/:restaurantSlug/table/:tableId', async (req, res, next) => {
    try {
        const { restaurantSlug, tableId } = req.params;
        const restaurant = await prisma_1.default.restaurant.findUnique({
            where: { slug: restaurantSlug },
            select: { id: true },
        });
        if (!restaurant)
            throw new errorHandler_1.AppError('Restoran tidak ditemukan.', 404);
        const table = await prisma_1.default.table.findFirst({
            where: { id: tableId, restaurantId: restaurant.id, isActive: true },
        });
        if (!table)
            throw new errorHandler_1.AppError('Meja tidak ditemukan.', 404);
        res.json({ success: true, data: table });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/public/:restaurantSlug/table-status/:tableId
router.get('/:restaurantSlug/table-status/:tableId', async (req, res, next) => {
    try {
        const { restaurantSlug, tableId } = req.params;
        const restaurant = await prisma_1.default.restaurant.findUnique({
            where: { slug: restaurantSlug },
            select: { id: true },
        });
        if (!restaurant)
            throw new errorHandler_1.AppError('Restoran tidak ditemukan.', 404);
        const table = await prisma_1.default.table.findFirst({
            where: { id: tableId, restaurantId: restaurant.id }
        });
        const activeOrder = await prisma_1.default.order.findFirst({
            where: {
                restaurantId: restaurant.id,
                tableId,
                OR: [
                    { status: { notIn: ['completed', 'cancelled'] } },
                    { paymentStatus: { not: 'paid' } }
                ]
            }
        });
        res.json({ success: true, data: { isOccupied: !!activeOrder, tableNumber: table?.tableNumber } });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=public.js.map