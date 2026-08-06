"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const express_rate_limit_1 = require("express-rate-limit");
const socket_1 = require("./socket");
const auth_1 = __importDefault(require("./routes/auth"));
const public_1 = __importDefault(require("./routes/public"));
const orders_1 = __importDefault(require("./routes/orders"));
const payments_1 = __importDefault(require("./routes/payments"));
const menu_1 = __importDefault(require("./routes/admin/menu"));
const orders_2 = __importDefault(require("./routes/admin/orders"));
const tables_1 = __importDefault(require("./routes/admin/tables"));
const reports_1 = __importDefault(require("./routes/admin/reports"));
const users_1 = __importDefault(require("./routes/admin/users"));
const settings_1 = __importDefault(require("./routes/admin/settings"));
const activity_1 = __importDefault(require("./routes/admin/activity"));
const expenses_1 = __importDefault(require("./routes/admin/expenses"));
const expenseCategories_1 = __importDefault(require("./routes/admin/expenseCategories"));
const shifts_1 = __importDefault(require("./routes/admin/shifts"));
const inventory_1 = __importDefault(require("./routes/admin/inventory"));
const customers_1 = __importDefault(require("./routes/admin/customers"));
const reservations_1 = __importDefault(require("./routes/admin/reservations"));
const promotions_1 = __importDefault(require("./routes/admin/promotions"));
const notifications_1 = __importDefault(require("./routes/admin/notifications"));
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Init Socket.io
const io = (0, socket_1.initSocket)(httpServer);
app.set('io', io);
// ==================== Middleware ====================
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_CUSTOMER_URL || 'http://localhost:3000',
        process.env.FRONTEND_ADMIN_URL || 'http://localhost:3002',
    ],
    credentials: true,
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 3000, // Increased for local dev / heavily polled dashboard
    message: { error: 'Terlalu banyak request, coba lagi dalam 15 menit.' },
});
app.use('/api', limiter);
// ==================== Routes ====================
app.use('/api/auth', auth_1.default);
app.use('/api/public', public_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/admin/menu', menu_1.default);
app.use('/api/admin/orders', orders_2.default);
app.use('/api/admin/tables', tables_1.default);
app.use('/api/admin/reports', reports_1.default);
app.use('/api/admin/users', users_1.default);
app.use('/api/admin/settings', settings_1.default);
app.use('/api/admin/activity', activity_1.default);
app.use('/api/admin/expenses/categories', expenseCategories_1.default);
app.use('/api/admin/expenses', expenses_1.default);
app.use('/api/admin/shifts', shifts_1.default);
app.use('/api/admin/inventory', inventory_1.default);
app.use('/api/admin/customers', customers_1.default);
app.use('/api/admin/reservations', reservations_1.default);
app.use('/api/admin/promotions', promotions_1.default);
app.use('/api/admin/notifications', notifications_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SmartMenu API' });
});
// ==================== Error Handling ====================
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
// ==================== Start Server ====================
const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
    console.log(`\n🚀 SmartMenu API running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🌿 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
exports.default = app;
//# sourceMappingURL=index.js.map