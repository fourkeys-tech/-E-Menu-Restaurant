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
const socket_1 = require("../../socket");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('admin'));
// --- Category Routes ---
// GET /api/admin/menu/categories
router.get('/categories', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const categories = await prisma_1.default.category.findMany({
            where: { restaurantId },
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { menuItems: true } } },
        });
        res.json({ success: true, data: categories });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/menu/categories
router.post('/categories', async (req, res, next) => {
    try {
        const { name, slug, imageUrl, sortOrder } = req.body;
        const restaurantId = req.user.restaurantId;
        const category = await prisma_1.default.category.create({
            data: { restaurantId, name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'), imageUrl, sortOrder: sortOrder || 0 },
        });
        res.status(201).json({ success: true, data: category });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/menu/categories/:id
router.put('/categories/:id', async (req, res, next) => {
    try {
        const { name, slug, imageUrl, sortOrder, isActive } = req.body;
        const category = await prisma_1.default.category.update({
            where: { id: req.params.id },
            data: { name, slug, imageUrl, sortOrder, isActive },
        });
        res.json({ success: true, data: category });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/menu/categories/:id
router.delete('/categories/:id', async (req, res, next) => {
    try {
        await prisma_1.default.category.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Kategori dihapus.' });
    }
    catch (err) {
        next(err);
    }
});
// --- Menu Item Routes ---
const menuItemSchema = zod_1.z.object({
    categoryId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().positive(),
    imageUrl: zod_1.z.string().optional(),
    isAvailable: zod_1.z.boolean().optional(),
    isBestSeller: zod_1.z.boolean().optional(),
    isSpicy: zod_1.z.boolean().optional(),
    stock: zod_1.z.number().optional(),
    allergenInfo: zod_1.z.string().optional(),
    variants: zod_1.z.any().optional(),
    sortOrder: zod_1.z.number().optional(),
});
// GET /api/admin/menu
router.get('/', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { category, search, available } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const whereClause = {
            restaurantId,
            ...(category ? { categoryId: category } : {}),
            ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
            ...(available !== undefined ? { isAvailable: available === 'true' } : {}),
        };
        const [items, totalCount] = await Promise.all([
            prisma_1.default.menuItem.findMany({
                where: whereClause,
                include: { category: { select: { id: true, name: true } } },
                orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
                skip,
                take: limit,
            }),
            prisma_1.default.menuItem.count({ where: whereClause })
        ]);
        const parsedItems = items.map(item => ({
            ...item,
            variants: item.variants ? JSON.parse(item.variants) : null
        }));
        res.json({
            success: true,
            data: parsedItems,
            meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/menu
router.post('/', async (req, res, next) => {
    try {
        const data = menuItemSchema.parse(req.body);
        const restaurantId = req.user.restaurantId;
        const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        const { variants, ...rest } = data;
        const item = await prisma_1.default.menuItem.create({
            data: { ...rest, restaurantId, slug, variants: variants ? JSON.stringify(variants) : null },
            include: { category: { select: { id: true, name: true } } },
        });
        const parsedItem = { ...item, variants: item.variants ? JSON.parse(item.variants) : null };
        res.status(201).json({ success: true, data: parsedItem });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError)
            next(new errorHandler_1.AppError(err.errors[0].message, 400));
        else
            next(err);
    }
});
// PUT /api/admin/menu/:id
router.put('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { variants, ...rest } = req.body;
        const dataToUpdate = { ...rest };
        if (variants !== undefined)
            dataToUpdate.variants = variants ? JSON.stringify(variants) : null;
        const item = await prisma_1.default.menuItem.update({
            where: { id: req.params.id },
            data: dataToUpdate,
            include: { category: { select: { id: true, name: true } } },
        });
        // Emit availability change if toggled
        if ('isAvailable' in req.body) {
            (0, socket_1.emitMenuAvailabilityChanged)(restaurantId, { menuItemId: item.id, isAvailable: item.isAvailable });
        }
        if (rest.price !== undefined || rest.name !== undefined) {
            await prisma_1.default.activityLog.create({
                data: {
                    restaurantId,
                    userId: req.user?.id,
                    action: 'Ubah Data Menu',
                    details: `Mengubah menu: ${item.name}`,
                }
            });
        }
        const parsedItem = { ...item, variants: item.variants ? JSON.parse(item.variants) : null };
        res.json({ success: true, data: parsedItem });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/admin/menu/:id/toggle-availability
router.patch('/:id/toggle-availability', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const current = await prisma_1.default.menuItem.findUnique({ where: { id: req.params.id } });
        if (!current)
            throw new errorHandler_1.AppError('Item tidak ditemukan.', 404);
        const item = await prisma_1.default.menuItem.update({
            where: { id: req.params.id },
            data: { isAvailable: !current.isAvailable },
        });
        (0, socket_1.emitMenuAvailabilityChanged)(restaurantId, { menuItemId: item.id, isAvailable: item.isAvailable });
        res.json({ success: true, data: { id: item.id, isAvailable: item.isAvailable } });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/menu/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const item = await prisma_1.default.menuItem.findUnique({ where: { id: req.params.id } });
        if (item) {
            await prisma_1.default.menuItem.delete({ where: { id: req.params.id } });
            await prisma_1.default.activityLog.create({
                data: {
                    restaurantId,
                    userId: req.user?.id,
                    action: 'Hapus Menu',
                    details: `Menghapus menu: ${item.name}`,
                }
            });
        }
        res.json({ success: true, message: 'Menu item dihapus.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=menu.js.map