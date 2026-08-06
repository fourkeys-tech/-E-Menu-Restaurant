import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);

// GET /api/admin/shifts/current
// Get the currently open shift for the logged-in user
router.get('/current', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const userId = req.user!.id;

    const shift = await prisma.shift.findFirst({
      where: {
        restaurantId,
        userId,
        status: 'open',
      }
    });

    res.json({ success: true, data: shift });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/shifts/open
router.post('/open', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const userId = req.user!.id;
    const { openingCash } = req.body;

    // Check if there's already an open shift in this restaurant by ANY user
    const existing = await prisma.shift.findFirst({
      where: { restaurantId, status: 'open' },
      include: { user: { select: { name: true } } }
    });

    if (existing) {
      if (existing.userId === userId) {
        throw new AppError('Anda masih memiliki shift yang belum ditutup.', 400);
      } else {
        throw new AppError(`Kasir ${existing.user?.name || 'lain'} sedang aktif. Harap minta Kasir tersebut untuk menutup shift-nya terlebih dahulu.`, 400);
      }
    }

    const shift = await prisma.shift.create({
      data: {
        restaurantId,
        userId,
        openingCash: Number(openingCash) || 0,
        status: 'open',
        openTime: new Date()
      }
    });

    res.status(201).json({ success: true, data: shift });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/shifts/close
router.post('/close', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const userId = req.user!.id;
    const { closingCash, notes } = req.body;

    const shift = await prisma.shift.findFirst({
      where: { restaurantId, userId, status: 'open' }
    });

    if (!shift) {
      throw new AppError('Tidak ada shift aktif yang bisa ditutup.', 400);
    }

    // Calculate expected cash based on orders completed during the shift
    // For MVP, we can assume expectedCash is openingCash + total payments processed by this user during the shift timeframe
    const payments = await prisma.payment.findMany({
      where: {
        confirmedByUserId: userId,
        status: 'paid',
        paidAt: { gte: shift.openTime }
      }
    });

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const expectedCash = shift.openingCash + totalRevenue;
    const actualClosingCash = Number(closingCash) || 0;
    const diff = actualClosingCash - expectedCash;

    const closedShift = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        closeTime: new Date(),
        closingCash: actualClosingCash,
        expectedCash,
        diff,
        status: 'closed',
        notes
      }
    });

    res.json({ success: true, data: closedShift });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/shifts
// Admin only: view all shifts history
router.get('/', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where: { restaurantId },
        include: {
          user: { select: { name: true, role: true } }
        },
        orderBy: { openTime: 'desc' },
        skip,
        take: limit
      }),
      prisma.shift.count({ where: { restaurantId } })
    ]);

    res.json({ 
      success: true, 
      data: shifts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
