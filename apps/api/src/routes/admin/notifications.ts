import { Router, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);
// All authenticated staff can view notifications

// GET /api/admin/notifications
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const notifications = await prisma.notification.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    const unreadCount = await prisma.notification.count({
      where: { restaurantId, isRead: false }
    });

    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/notifications/read-all
router.put('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    
    await prisma.notification.updateMany({
      where: { restaurantId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true, message: "Semua notifikasi ditandai sudah dibaca" });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/notifications/:id/read
router.put('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    
    if (!notif || notif.restaurantId !== restaurantId) {
      throw new Error("Notifikasi tidak ditemukan");
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
