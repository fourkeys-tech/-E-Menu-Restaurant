import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (typeof window === "undefined") return null;
  
  if (!socket) {
    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    const userStr = localStorage.getItem("auth-storage");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        const restaurantId = parsed.state?.user?.restaurantId;
        if (restaurantId) {
          socket.emit("join:restaurant", restaurantId);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  return socket;
};
