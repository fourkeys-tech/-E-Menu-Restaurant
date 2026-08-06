import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// GET /api/public/:restaurantSlug/menu
router.get('/:restaurantSlug/menu', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantSlug } = req.params;
    const { category, search } = req.query;

    const restaurant = await prisma.restaurant.findUnique({
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

    if (!restaurant) throw new AppError('Restoran tidak ditemukan.', 404);

    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        menuItems: {
          where: {
            isAvailable: true,
            ...(search ? { name: { contains: search as string } } : {}),
          },
          orderBy: [{ isBestSeller: 'desc' }, { sortOrder: 'asc' }],
        },
      },
      ...(category ? { where: { restaurantId: restaurant.id, slug: category as string, isActive: true } } : {}),
    });

    // Re-apply restaurant filter after category filter
    const filteredCategories = await prisma.category.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
        ...(category ? { slug: category as string } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        menuItems: {
          where: {
            isAvailable: true,
            ...(search ? { name: { contains: search as string } } : {}),
          },
          orderBy: [{ isBestSeller: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    const parsedCategories = filteredCategories.map(cat => ({
      ...cat,
      menuItems: (cat as any).menuItems.map((item: any) => ({
        ...item,
        variants: item.variants ? JSON.parse(item.variants as string) : null
      }))
    }));

    res.json({
      success: true,
      data: {
        restaurant,
        categories: parsedCategories,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/public/:restaurantSlug/menu/:itemId
router.get('/:restaurantSlug/menu/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantSlug, itemId } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true },
    });
    if (!restaurant) throw new AppError('Restoran tidak ditemukan.', 404);

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: restaurant.id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    if (!item) throw new AppError('Menu tidak ditemukan.', 404);

    const parsedItem = {
      ...item,
      variants: item.variants ? JSON.parse(item.variants as string) : null
    };

    res.json({ success: true, data: parsedItem });
  } catch (err) {
    next(err);
  }
});

// GET /api/public/:restaurantSlug/table/:tableId
router.get('/:restaurantSlug/table/:tableId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantSlug, tableId } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true },
    });
    if (!restaurant) throw new AppError('Restoran tidak ditemukan.', 404);

    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId: restaurant.id, isActive: true },
    });

    if (!table) throw new AppError('Meja tidak ditemukan.', 404);

    res.json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
});

// GET /api/public/:restaurantSlug/table-status/:tableId
router.get('/:restaurantSlug/table-status/:tableId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantSlug, tableId } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true },
    });
    if (!restaurant) throw new AppError('Restoran tidak ditemukan.', 404);

    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId: restaurant.id }
    });

    const activeOrder = await prisma.order.findFirst({
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
  } catch (err) {
    next(err);
  }
});

export default router;
