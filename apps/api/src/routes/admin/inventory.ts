import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'chef')); // Admin and Chef can manage inventory

const itemSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  minStock: z.number().min(0).default(0),
});

const transactionSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().min(0.01),
  note: z.string().optional(),
});

// GET /api/admin/inventory
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { restaurantId },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.inventoryItem.count({ where: { restaurantId } })
    ]);
    res.json({ 
      success: true, 
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/inventory
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { name, unit, minStock } = itemSchema.parse(req.body);

    const existing = await prisma.inventoryItem.findUnique({
      where: { restaurantId_name: { restaurantId, name } },
    });
    if (existing) throw new Error("Barang sudah ada di inventory");

    const item = await prisma.inventoryItem.create({
      data: { restaurantId, name, unit, minStock },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/inventory/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const { name, unit, minStock } = itemSchema.parse(req.body);

    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.restaurantId !== restaurantId) throw new Error("Barang tidak ditemukan");

    const updated = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { name, unit, minStock },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/inventory/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.restaurantId !== restaurantId) throw new Error("Barang tidak ditemukan");

    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Barang dihapus" });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/inventory/:id/transaction
router.post('/:id/transaction', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const userId = req.user!.id;
    const { type, quantity, note } = transactionSchema.parse(req.body);

    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.restaurantId !== restaurantId) throw new Error("Barang tidak ditemukan");

    if (type === 'OUT' && item.currentStock < quantity) {
      throw new Error(`Stok tidak cukup. Sisa stok: ${item.currentStock} ${item.unit}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const trx = await tx.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type,
          quantity,
          note,
          userId,
        },
      });

      // Update current stock
      const newStock = type === 'IN' ? item.currentStock + quantity : item.currentStock - quantity;
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: newStock },
      });

      return { transaction: trx, item: updatedItem };
    });

    res.status(201).json({ success: true, data: result.item });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/inventory/:id/transactions
router.get('/:id/transactions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.restaurantId !== restaurantId) throw new Error("Barang tidak ditemukan");

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { itemId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, role: true } } },
      take: 50,
    });
    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
});

export default router;
