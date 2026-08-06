import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'kasir'));

const reservationSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().optional().nullable(),
  tableId: z.string().optional().nullable(),
  reservationDate: z.string().datetime(),
  guestCount: z.number().min(1).default(1),
  notes: z.string().optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
});

// GET /api/admin/reservations
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { status } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = { restaurantId };
    if (status && status !== 'all') {
      const statuses = String(status).split(',');
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { reservationDate: 'asc' },
        include: {
          table: { select: { tableNumber: true, label: true } }
        },
        skip,
        take: limit,
      }),
      prisma.reservation.count({ where })
    ]);
    res.json({ 
      success: true, 
      data: reservations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/reservations
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const data = reservationSchema.parse(req.body);

    const reservation = await prisma.reservation.create({
      data: {
        ...data,
        restaurantId,
      }
    });

    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/reservations/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const data = reservationSchema.parse(req.body);

    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!reservation || reservation.restaurantId !== restaurantId) {
      throw new Error("Reservasi tidak ditemukan");
    }

    const updated = await prisma.reservation.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/reservations/:id/status
router.put('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { status } = statusSchema.parse(req.body);

    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!reservation || reservation.restaurantId !== restaurantId) {
      throw new Error("Reservasi tidak ditemukan");
    }

    const updated = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/reservations/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!reservation || reservation.restaurantId !== restaurantId) {
      throw new Error("Reservasi tidak ditemukan");
    }

    await prisma.reservation.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Reservasi dihapus" });
  } catch (err) {
    next(err);
  }
});

export default router;
