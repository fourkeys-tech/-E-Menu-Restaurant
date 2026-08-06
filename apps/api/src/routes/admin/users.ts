import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate, authorize('admin'));

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'kasir', 'chef']),
});

// GET /api/admin/users
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { restaurantId },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { restaurantId } })
    ]);

    res.json({ 
      success: true, 
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) { next(err); }
});

// POST /api/admin/users
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = userSchema.parse(req.body);
    const restaurantId = req.user!.restaurantId!;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { restaurantId, name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err instanceof z.ZodError) next(new AppError(err.errors[0].message, 400));
    else next(err);
  }
});

// PUT /api/admin/users/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, role, isActive, password } = req.body;
    const updateData: any = { name, role, isActive };
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.id) throw new AppError('Tidak bisa menghapus akun sendiri.', 400);
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'User dihapus.' });
  } catch (err) { next(err); }
});

export default router;
