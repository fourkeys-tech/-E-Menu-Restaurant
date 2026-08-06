"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const auth_1 = require("../../middlewares/auth");
const errorHandler_1 = require("../../middlewares/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('admin', 'kasir', 'chef'));
// Midleware to protect admin-only routes
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return next(new errorHandler_1.AppError('Forbidden', 403));
    }
    next();
};
// GET /api/admin/reports/financial-summary
router.get('/financial-summary', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const role = req.user.role;
        const now = new Date();
        // Today
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        // This Month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // This Year
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const getWhere = (startDate) => {
            let where = { restaurantId, paymentStatus: 'paid', createdAt: { gte: startDate } };
            if (role === 'kasir')
                where.cashierId = req.user.id;
            if (role === 'chef')
                where.chefId = req.user.id;
            return where;
        };
        const [todayOrders, monthOrders, yearOrders] = await Promise.all([
            prisma_1.default.order.aggregate({ where: getWhere(startOfToday), _sum: { total: true } }),
            prisma_1.default.order.aggregate({ where: getWhere(startOfMonth), _sum: { total: true } }),
            prisma_1.default.order.aggregate({ where: getWhere(startOfYear), _sum: { total: true } }),
        ]);
        res.json({
            success: true,
            data: {
                todayRevenue: todayOrders._sum.total || 0,
                monthRevenue: monthOrders._sum.total || 0,
                yearRevenue: yearOrders._sum.total || 0,
            }
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/reports/sales?range=daily|weekly|monthly
router.get('/sales', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const role = req.user.role;
        const { range = 'daily' } = req.query;
        const now = new Date();
        let startDate;
        let groupBy = 'day';
        if (range === 'daily') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
            groupBy = 'day';
        }
        else if (range === 'weekly') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 12 * 7);
            groupBy = 'week';
        }
        else {
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 12);
            groupBy = 'month';
        }
        let salesWhere = { restaurantId, paymentStatus: 'paid', createdAt: { gte: startDate } };
        if (role === 'kasir') {
            salesWhere.cashierId = req.user.id;
        }
        else if (role === 'chef') {
            salesWhere = { restaurantId, createdAt: { gte: startDate }, chefId: req.user.id };
        }
        const orders = await prisma_1.default.order.findMany({
            where: salesWhere,
            select: { total: true, createdAt: true, orderItems: { select: { quantity: true } } },
            orderBy: { createdAt: 'asc' },
        });
        const expenses = await prisma_1.default.expense.findMany({
            where: { restaurantId, date: { gte: startDate } },
            select: { amount: true, date: true },
            orderBy: { date: 'asc' },
        });
        // Group by period
        const salesMap = {};
        for (const order of orders) {
            let key;
            if (groupBy === 'day') {
                key = order.createdAt.toISOString().split('T')[0];
            }
            else if (groupBy === 'week') {
                const d = new Date(order.createdAt);
                const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
                key = weekStart.toISOString().split('T')[0];
            }
            else {
                key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
            }
            if (!salesMap[key])
                salesMap[key] = { revenue: 0, orders: 0, items: 0, expenses: 0, profit: 0 };
            salesMap[key].revenue += order.total;
            salesMap[key].profit += order.total;
            salesMap[key].orders += 1;
            salesMap[key].items += order.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
        }
        for (const exp of expenses) {
            let key;
            if (groupBy === 'day') {
                key = exp.date.toISOString().split('T')[0];
            }
            else if (groupBy === 'week') {
                const d = new Date(exp.date);
                const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
                key = weekStart.toISOString().split('T')[0];
            }
            else {
                key = `${exp.date.getFullYear()}-${String(exp.date.getMonth() + 1).padStart(2, '0')}`;
            }
            if (!salesMap[key])
                salesMap[key] = { revenue: 0, orders: 0, items: 0, expenses: 0, profit: 0 };
            salesMap[key].expenses += exp.amount;
            salesMap[key].profit -= exp.amount;
        }
        const salesData = Object.entries(salesMap).map(([period, data]) => ({ period, ...data }));
        // Summary
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const totalOrders = orders.length;
        const totalItems = orders.reduce((sum, o) => sum + o.orderItems.reduce((s, oi) => s + oi.quantity, 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        res.json({
            success: true,
            data: {
                salesData,
                summary: { totalRevenue, totalOrders, totalItems, avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0, totalExpenses, netProfit },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/reports/top-items
router.get('/top-items', requireAdmin, async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const { limit = '10' } = req.query;
        const topItems = await prisma_1.default.orderItem.groupBy({
            by: ['menuItemId'],
            where: { order: { restaurantId, paymentStatus: 'paid' } },
            _sum: { quantity: true, subtotal: true },
            _count: { id: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: parseInt(limit),
        });
        const itemIds = topItems.map((i) => i.menuItemId);
        const menuItems = await prisma_1.default.menuItem.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, name: true, price: true, imageUrl: true, category: { select: { name: true } } },
        });
        const result = topItems.map((item) => ({
            ...item,
            menuItem: menuItems.find((m) => m.id === item.menuItemId),
        }));
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/reports/overview - Today's summary
router.get('/overview', async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurantId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const role = req.user.role;
        let todayWhere = { restaurantId, paymentStatus: 'paid', createdAt: { gte: today } };
        if (role === 'kasir') {
            todayWhere.cashierId = req.user.id;
        }
        else if (role === 'chef') {
            todayWhere = { restaurantId, createdAt: { gte: today }, chefId: req.user.id };
        }
        const [todayOrders, activeOrders, waitingPayment, totalMenuItems] = await Promise.all([
            prisma_1.default.order.aggregate({
                where: todayWhere,
                _sum: { total: true },
                _count: { id: true },
            }),
            prisma_1.default.order.count({
                where: { restaurantId, status: { in: ['pending', 'cooking', 'ready'] } },
            }),
            prisma_1.default.order.count({
                where: { restaurantId, paymentStatus: 'waiting_at_cashier' },
            }),
            prisma_1.default.menuItem.count({ where: { restaurantId, isAvailable: true } }),
        ]);
        res.json({
            success: true,
            data: {
                todayRevenue: todayOrders._sum.total || 0,
                todayOrders: todayOrders._count.id,
                activeOrders,
                waitingPayment,
                totalMenuItems,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map