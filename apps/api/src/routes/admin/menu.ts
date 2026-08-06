import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';
import { emitMenuAvailabilityChanged } from '../../socket';

const router = Router();
router.use(authenticate, authorize('admin'));

// --- Category Routes ---

// GET /api/admin/menu/categories
router.get('/categories', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { menuItems: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

// POST /api/admin/menu/categories
router.post('/categories', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, slug, imageUrl, sortOrder } = req.body;
    const restaurantId = req.user!.restaurantId!;
    const category = await prisma.category.create({
      data: { restaurantId, name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'), imageUrl, sortOrder: sortOrder || 0 },
    });
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
});

// PUT /api/admin/menu/categories/:id
router.put('/categories/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, slug, imageUrl, sortOrder, isActive } = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name, slug, imageUrl, sortOrder, isActive },
    });
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
});

// DELETE /api/admin/menu/categories/:id
router.delete('/categories/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Kategori dihapus.' });
  } catch (err) { next(err); }
});

// --- Menu Item Routes ---

const menuItemSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  stock: z.number().optional(),
  allergenInfo: z.string().optional(),
  variants: z.any().optional(),
  sortOrder: z.number().optional(),
});

// GET /api/admin/menu
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { category, search, available } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const whereClause = {
      restaurantId,
      ...(category ? { categoryId: category as string } : {}),
      ...(search ? { name: { contains: search as string, mode: 'insensitive' } } : {}),
      ...(available !== undefined ? { isAvailable: available === 'true' } : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.menuItem.findMany({
        where: whereClause,
        include: { category: { select: { id: true, name: true } } },
        orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.menuItem.count({ where: whereClause })
    ]);

    const parsedItems = items.map(item => ({
      ...item,
      variants: item.variants ? JSON.parse(item.variants as string) : null
    }));

    res.json({ 
      success: true, 
      data: parsedItems, 
      meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }
    });
  } catch (err) { next(err); }
});

// POST /api/admin/menu
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = menuItemSchema.parse(req.body);
    const restaurantId = req.user!.restaurantId!;
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    const { variants, ...rest } = data;
    const item = await prisma.menuItem.create({
      data: { ...rest, restaurantId, slug, variants: variants ? JSON.stringify(variants) : null },
      include: { category: { select: { id: true, name: true } } },
    });
    const parsedItem = { ...item, variants: item.variants ? JSON.parse(item.variants as string) : null };
    res.status(201).json({ success: true, data: parsedItem });
  } catch (err) {
    if (err instanceof z.ZodError) next(new AppError(err.errors[0].message, 400));
    else next(err);
  }
});

// PUT /api/admin/menu/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { variants, ...rest } = req.body;
    const dataToUpdate = { ...rest };
    if (variants !== undefined) dataToUpdate.variants = variants ? JSON.stringify(variants) : null;

    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: dataToUpdate,
      include: { category: { select: { id: true, name: true } } },
    });

    // Emit availability change if toggled
    if ('isAvailable' in req.body) {
      emitMenuAvailabilityChanged(restaurantId, { menuItemId: item.id, isAvailable: item.isAvailable });
    }

    if (rest.price !== undefined || rest.name !== undefined) {
      await prisma.activityLog.create({
        data: {
          restaurantId,
          userId: req.user?.id,
          action: 'Ubah Data Menu',
          details: `Mengubah menu: ${item.name}`,
        }
      });
    }

    const parsedItem = { ...item, variants: item.variants ? JSON.parse(item.variants as string) : null };
    res.json({ success: true, data: parsedItem });
  } catch (err) { next(err); }
});

// PATCH /api/admin/menu/:id/toggle-availability
router.patch('/:id/toggle-availability', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const current = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    if (!current) throw new AppError('Item tidak ditemukan.', 404);

    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { isAvailable: !current.isAvailable },
    });

    emitMenuAvailabilityChanged(restaurantId, { menuItemId: item.id, isAvailable: item.isAvailable });
    res.json({ success: true, data: { id: item.id, isAvailable: item.isAvailable } });
  } catch (err) { next(err); }
});

// DELETE /api/admin/menu/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    if (item) {
      await prisma.menuItem.delete({ where: { id: req.params.id } });
      await prisma.activityLog.create({
        data: {
          restaurantId,
          userId: req.user?.id,
          action: 'Hapus Menu',
          details: `Menghapus menu: ${item.name}`,
        }
      });
    }
    res.json({ success: true, message: 'Menu item dihapus.' });
  } catch (err) { next(err); }
});

export default router;
