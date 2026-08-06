import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin')); // Only Admin manages customers directly

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6).optional().nullable(),
  email: z.string().email().optional().nullable(),
});

// GET /api/admin/customers
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: { restaurantId },
        orderBy: { totalSpent: 'desc' }, // VIPs first
        skip,
        take: limit,
      }),
      prisma.customer.count({ where: { restaurantId } })
    ]);
    res.json({ 
      success: true, 
      data: customers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, orderNumber: true, total: true, createdAt: true, status: true },
        },
      }
    });

    if (!customer || customer.restaurantId !== restaurantId) {
      throw new Error("Pelanggan tidak ditemukan");
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/customers/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { name, phone, email } = customerSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer || customer.restaurantId !== restaurantId) {
      throw new Error("Pelanggan tidak ditemukan");
    }

    if (phone && phone !== customer.phone) {
      const existing = await prisma.customer.findUnique({
        where: { restaurantId_phone: { restaurantId, phone } },
      });
      if (existing) throw new Error("Nomor HP sudah digunakan pelanggan lain");
    }

    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: { name, phone, email },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/customers/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer || customer.restaurantId !== restaurantId) {
      throw new Error("Pelanggan tidak ditemukan");
    }

    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Pelanggan dihapus" });
  } catch (err) {
    next(err);
  }
});

export default router;
