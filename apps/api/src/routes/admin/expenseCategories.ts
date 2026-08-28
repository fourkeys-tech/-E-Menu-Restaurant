import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin')); // Only admin manages categories

const categorySchema = z.object({
  name: z.string().min(1),
});

// GET /api/admin/expenses/categories
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const categories = await prisma.expenseCategory.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/expenses/categories
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { name } = categorySchema.parse(req.body);

    const existing = await prisma.expenseCategory.findUnique({
      where: { restaurantId_name: { restaurantId, name } },
    });
    if (existing) throw new Error("Kategori sudah ada");

    const category = await prisma.expenseCategory.create({
      data: { restaurantId, name },
    });
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/expenses/categories/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const category = await prisma.expenseCategory.findUnique({
      where: { id: req.params.id },
    });

    if (!category || category.restaurantId !== restaurantId) {
      throw new Error("Kategori tidak ditemukan");
    }

    await prisma.expenseCategory.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: "Kategori dihapus" });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/expenses/categories/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { name } = categorySchema.parse(req.body);

    const category = await prisma.expenseCategory.findUnique({
      where: { id: req.params.id },
    });

    if (!category || category.restaurantId !== restaurantId) {
      throw new Error("Kategori tidak ditemukan");
    }

    const existing = await prisma.expenseCategory.findUnique({
      where: { restaurantId_name: { restaurantId, name } },
    });
    if (existing && existing.id !== req.params.id) {
      throw new Error("Nama kategori sudah digunakan");
    }

    const oldName = category.name;

    // Use transaction to update both category name and existing expenses
    const updatedCategory = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.expenseCategory.update({
        where: { id: req.params.id },
        data: { name },
      });

      // Update all expenses that used the old category name
      await tx.expense.updateMany({
        where: { restaurantId, category: oldName },
        data: { category: name },
      });

      return updated;
    });

    res.json({ success: true, data: updatedCategory });
  } catch (err) {
    next(err);
  }
});

export default router;
