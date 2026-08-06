import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import prisma from '../../lib/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authenticate, AuthRequest, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate, authorize('admin'));

const tableSchema = z.object({
  tableNumber: z.string().min(1),
  label: z.string().optional(),
  capacity: z.number().min(1).optional(),
});

// GET /api/admin/tables
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [tables, total] = await Promise.all([
      prisma.table.findMany({
        where: { restaurantId },
        orderBy: { tableNumber: 'asc' },
        include: { _count: { select: { orders: true } } },
        skip,
        take: limit,
      }),
      prisma.table.count({ where: { restaurantId } })
    ]);
    res.json({ 
      success: true, 
      data: tables,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) { next(err); }
});

// POST /api/admin/tables
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = tableSchema.parse(req.body);
    const restaurantId = req.user!.restaurantId!;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true },
    });

    const table = await prisma.table.create({
      data: { restaurantId, ...data },
    });

    // Generate QR Code URL
    const menuUrl = `${process.env.FRONTEND_CUSTOMER_URL}/menu/${restaurant!.slug}?table=${table.id}`;
    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1A1A1A', light: '#FAFAF8' },
    });

    const updatedTable = await prisma.table.update({
      where: { id: table.id },
      data: { qrCodeUrl: qrDataUrl },
    });

    res.status(201).json({ success: true, data: updatedTable });
  } catch (err) {
    if (err instanceof z.ZodError) next(new AppError(err.errors[0].message, 400));
    else next(err);
  }
});

// PUT /api/admin/tables/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, label, capacity, isActive } = req.body;
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { tableNumber, label, capacity, isActive },
    });
    res.json({ success: true, data: table });
  } catch (err) { next(err); }
});

// GET /api/admin/tables/:id/qrcode - Get/regenerate QR Code
router.get('/:id/qrcode', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const table = await prisma.table.findFirst({
      where: { id: req.params.id, restaurantId },
      include: { restaurant: { select: { slug: true } } },
    });
    if (!table) throw new AppError('Meja tidak ditemukan.', 404);

    const menuUrl = `${process.env.FRONTEND_CUSTOMER_URL}/menu/${table.restaurant.slug}?table=${table.id}`;
    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 600,
      margin: 2,
      color: { dark: '#1A1A1A', light: '#FAFAF8' },
    });

    // Update table with new QR
    await prisma.table.update({ where: { id: table.id }, data: { qrCodeUrl: qrDataUrl } });

    res.json({
      success: true,
      data: {
        tableId: table.id,
        tableNumber: table.tableNumber,
        menuUrl,
        qrCodeDataUrl: qrDataUrl,
      },
    });
  } catch (err) { next(err); }
});

// DELETE /api/admin/tables/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.table.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Meja dihapus.' });
  } catch (err) { next(err); }
});

export default router;
