import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'kasir')); // Kasir can also add expenses if authorized, but usually admin/manager

const expenseSchema = z.object({
  amount: z.number().min(0),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().optional(),
});

// GET /api/admin/expenses
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { month, year } = req.query;

    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where = {
      restaurantId,
      ...dateFilter,
    };

    const [expenses, totalCount, aggregate] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          user: { select: { name: true, role: true } }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true }
      })
    ]);

    const total = aggregate._sum.amount || 0;

    res.json({ 
      success: true, 
      data: { 
        expenses, 
        total,
        meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }
      } 
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/expenses
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const parsed = expenseSchema.parse(req.body);

    const expense = await prisma.expense.create({
      data: {
        restaurantId,
        userId: req.user!.id,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        date: parsed.date ? new Date(parsed.date) : new Date(),
      }
    });

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/expenses/:id
router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId!;

    const expense = await prisma.expense.findFirst({
      where: { id, restaurantId }
    });

    if (!expense) throw new AppError('Pengeluaran tidak ditemukan', 404);

    await prisma.expense.delete({ where: { id } });

    res.json({ success: true, message: 'Pengeluaran berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

export default router;
