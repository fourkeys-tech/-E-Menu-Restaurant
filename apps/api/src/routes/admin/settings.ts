import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../../middlewares/errorHandler';
import { authenticate, AuthRequest } from '../../middlewares/auth';

const prisma = new PrismaClient();
const router = Router();

// Middleware: all routes require authentication
router.use(authenticate);

// Middleware: admin only routes
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Unauthorized', 403));
  }
  next();
};

// ==================== PROFILE ====================

// GET /api/admin/settings/profile
router.get('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true }
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/settings/profile
router.put('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;
    
    // Check email uniqueness if email changed
    if (email && email !== req.user!.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new AppError('Email sudah terdaftar.', 400);
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true }
    });

    res.json({ success: true, data: updated, message: 'Profil berhasil diperbarui' });
  } catch (err) {
    next(err);
  }
});


// ==================== RESTAURANT ====================

// GET /api/admin/settings/restaurant
router.get('/restaurant', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) throw new AppError('Restoran tidak ditemukan', 404);

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });
    
    if (!restaurant) throw new AppError('Restoran tidak ditemukan', 404);
    res.json({ success: true, data: restaurant });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/settings/restaurant
router.put('/restaurant', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = req.user!.restaurantId;
    if (!restaurantId) throw new AppError('Restoran tidak ditemukan', 404);

    const { 
      name, 
      address, 
      phone, 
      email, 
      logoUrl, 
      description, 
      taxPercentage, 
      serviceCharge, 
      primaryColor, 
      accentColor 
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (description !== undefined) updateData.description = description;
    
    if (taxPercentage !== undefined) {
      updateData.taxPercentage = parseFloat(taxPercentage) || 0;
    }
    if (serviceCharge !== undefined) {
      updateData.serviceCharge = parseFloat(serviceCharge) || 0;
    }
    
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: updateData
    });

    res.json({ success: true, data: updated, message: 'Pengaturan restoran berhasil diperbarui' });
  } catch (err) {
    next(err);
  }
});

export default router;
