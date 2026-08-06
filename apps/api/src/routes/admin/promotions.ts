import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);

const promotionSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.number().min(0.1),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  maxUsage: z.number().int().min(1).optional().nullable(),
  isActive: z.boolean().default(true),
});

// GET /api/admin/promotions/active
router.get('/active', authorize('admin', 'kasir'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const now = new Date();
    
    const promos = await prisma.promotion.findMany({
      where: { 
        restaurantId, 
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: promos });
  } catch (err) { next(err); }
});

// GET /api/admin/promotions
router.get('/', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { 
              orders: { where: { status: { not: 'cancelled' } } } 
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.promotion.count({ where: { restaurantId } })
    ]);

    res.json({ 
      success: true, 
      data: promotions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/promotions
router.post('/', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const data = promotionSchema.parse(req.body);

    const existing = await prisma.promotion.findUnique({
      where: { restaurantId_code: { restaurantId, code: data.code } }
    });
    if (existing) throw new Error("Kode promo sudah digunakan");

    const promotion = await prisma.promotion.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        restaurantId,
        name: `Promo ${data.code}`, // placeholder for required field
        description: "",
      }
    });

    res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/promotions/:id
router.put('/:id', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const data = promotionSchema.parse(req.body);

    const promotion = await prisma.promotion.findUnique({ where: { id: req.params.id } });
    if (!promotion || promotion.restaurantId !== restaurantId) {
      throw new Error("Promo tidak ditemukan");
    }

    if (data.code !== promotion.code) {
      const existing = await prisma.promotion.findUnique({
        where: { restaurantId_code: { restaurantId, code: data.code } }
      });
      if (existing) throw new Error("Kode promo sudah digunakan");
    }

    const updated = await prisma.promotion.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        name: `Promo ${data.code}`,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/promotions/:id
router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const promotion = await prisma.promotion.findUnique({ 
      where: { id: req.params.id },
      include: { _count: { select: { orders: true } } }
    });
    
    if (!promotion || promotion.restaurantId !== restaurantId) {
      throw new Error("Promo tidak ditemukan");
    }

    if (promotion._count.orders > 0) {
      throw new Error("Promo sudah digunakan pada pesanan dan tidak dapat dihapus. Silakan nonaktifkan saja.");
    }

    await prisma.promotion.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Promo dihapus" });
  } catch (err) {
    next(err);
  }
});

export default router;
