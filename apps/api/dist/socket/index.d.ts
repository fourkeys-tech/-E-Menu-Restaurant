import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
export declare const initSocket: (httpServer: HttpServer) => SocketServer;
export declare const getIO: () => SocketServer;
export declare const emitNewOrder: (restaurantId: string, order: any) => void;
export declare const emitOrderStatusUpdate: (restaurantId: string, orderId: string, data: any) => void;
export declare const emitMenuAvailabilityChanged: (restaurantId: string, data: any) => void;
export declare const emitNotification: (restaurantId: string, notification: any) => void;
//# sourceMappingURL=index.d.ts.map