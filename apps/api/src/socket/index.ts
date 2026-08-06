import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
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
    socket.on('join:restaurant', (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}`);
      console.log(`🏠 Socket ${socket.id} joined restaurant:${restaurantId}`);
    });

    // Join order tracking room
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`📴 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit helpers
export const emitNewOrder = (restaurantId: string, order: any) => {
  getIO().to(`restaurant:${restaurantId}`).emit('order:new', order);
};

export const emitOrderStatusUpdate = (restaurantId: string, orderId: string, data: any) => {
  getIO().to(`restaurant:${restaurantId}`).emit('order:status_updated', data);
  getIO().to(`order:${orderId}`).emit('order:status_updated', data);
};

export const emitMenuAvailabilityChanged = (restaurantId: string, data: any) => {
  getIO().to(`restaurant:${restaurantId}`).emit('menu:availability_changed', data);
};

export const emitNotification = (restaurantId: string, notification: any) => {
  getIO().to(`restaurant:${restaurantId}`).emit('notification:new', notification);
};
