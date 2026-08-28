import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { rateLimit } from 'express-rate-limit';

import { initSocket } from './socket';
import authRouter from './routes/auth';
import publicRouter from './routes/public';
import ordersRouter from './routes/orders';
import paymentsRouter from './routes/payments';
import adminMenuRouter from './routes/admin/menu';
import adminOrdersRouter from './routes/admin/orders';
import adminTablesRouter from './routes/admin/tables';
import adminReportsRouter from './routes/admin/reports';
import adminUsersRouter from './routes/admin/users';
import adminSettingsRouter from './routes/admin/settings';
import adminActivityRouter from './routes/admin/activity';
import expenseRoutes from './routes/admin/expenses';
import expenseCategoryRoutes from './routes/admin/expenseCategories';
import shiftRoutes from './routes/admin/shifts';
import inventoryRoutes from './routes/admin/inventory';
import customersRoutes from './routes/admin/customers';
import reservationRoutes from './routes/admin/reservations';
import promotionRoutes from './routes/admin/promotions';
import notificationRoutes from './routes/admin/notifications';
import { errorHandler, notFound } from './middlewares/errorHandler';

const app = express();
const httpServer = createServer(app);

// Init Socket.io
const io = initSocket(httpServer);
app.set('io', io);

// ==================== Middleware ====================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    process.env.FRONTEND_CUSTOMER_URL || 'http://localhost:3000',
    process.env.FRONTEND_ADMIN_URL || 'http://localhost:3002',
  ],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000, // Increased for local dev / heavily polled dashboard
  message: { error: 'Terlalu banyak request, coba lagi dalam 15 menit.' },
});
app.use('/api', limiter);

// ==================== Routes ====================
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin/menu', adminMenuRouter);
app.use('/api/admin/orders', adminOrdersRouter);
app.use('/api/admin/tables', adminTablesRouter);
app.use('/api/admin/reports', adminReportsRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/settings', adminSettingsRouter);
app.use('/api/admin/activity', adminActivityRouter);
app.use('/api/admin/expenses/categories', expenseCategoryRoutes);
app.use('/api/admin/expenses', expenseRoutes);
app.use('/api/admin/shifts', shiftRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/admin/customers', customersRoutes);
app.use('/api/admin/reservations', reservationRoutes);
app.use('/api/admin/promotions', promotionRoutes);
app.use('/api/admin/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SmartMenu API' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SmartMenu API', status: 'running' });
});

// ==================== Error Handling ====================
app.use(notFound);
app.use(errorHandler);

// ==================== Start Server ====================
const PORT = parseInt(process.env.PORT || '3001', 10);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 SmartMenu API running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌿 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
