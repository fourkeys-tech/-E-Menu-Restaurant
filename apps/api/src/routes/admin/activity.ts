import { Router, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { AppError } from '../../middlewares/errorHandler';

const router = Router();

router.use(authenticate);

// GET /api/admin/activity - Get activity logs for the restaurant
router.get('/', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) throw new AppError('Akses ditolak.', 403);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { restaurantId },
        include: {
          user: { select: { name: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.activityLog.count({ where: { restaurantId } })
    ]);

    res.json({ 
      success: true, 
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) { next(err); }
});

export default router;
