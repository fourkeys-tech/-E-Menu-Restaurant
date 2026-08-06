"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitNotification = exports.emitMenuAvailabilityChanged = exports.emitOrderStatusUpdate = exports.emitNewOrder = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: [
                process.env.FRONTEND_CUSTOMER_URL || 'http://localhost:3000',
                process.env.FRONTEND_ADMIN_URL || 'http://localhost:3002',
            ],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        console.log(`📡 Socket connected: ${socket.id}`);
        // Join restaurant room
        socket.on('join:restaurant', (restaurantId) => {
            socket.join(`restaurant:${restaurantId}`);
            console.log(`🏠 Socket ${socket.id} joined restaurant:${restaurantId}`);
        });
        // Join order tracking room
        socket.on('join:order', (orderId) => {
            socket.join(`order:${orderId}`);
        });
        socket.on('disconnect', () => {
            console.log(`📴 Socket disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error('Socket.io not initialized');
    return io;
};
exports.getIO = getIO;
// Emit helpers
const emitNewOrder = (restaurantId, order) => {
    (0, exports.getIO)().to(`restaurant:${restaurantId}`).emit('order:new', order);
};
exports.emitNewOrder = emitNewOrder;
const emitOrderStatusUpdate = (restaurantId, orderId, data) => {
    (0, exports.getIO)().to(`restaurant:${restaurantId}`).emit('order:status_updated', data);
    (0, exports.getIO)().to(`order:${orderId}`).emit('order:status_updated', data);
};
exports.emitOrderStatusUpdate = emitOrderStatusUpdate;
const emitMenuAvailabilityChanged = (restaurantId, data) => {
    (0, exports.getIO)().to(`restaurant:${restaurantId}`).emit('menu:availability_changed', data);
};
exports.emitMenuAvailabilityChanged = emitMenuAvailabilityChanged;
const emitNotification = (restaurantId, notification) => {
    (0, exports.getIO)().to(`restaurant:${restaurantId}`).emit('notification:new', notification);
};
exports.emitNotification = emitNotification;
//# sourceMappingURL=index.js.map