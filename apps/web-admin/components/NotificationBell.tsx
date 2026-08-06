"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { fetchAdmin } from "@/lib/auth";
import { getSocket } from "@/lib/socket";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const res = await fetchAdmin<{ data: Notification[], unreadCount: number }>("/api/admin/notifications");
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadNotifications();

    const socket = getSocket();
    if (socket) {
      const handleNewNotification = (notif: Notification) => {
        // Play sound
        const audio = new Audio('/notif-sound.mp3'); // We'll assume this exists or fails silently
        audio.play().catch(() => {});

        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      socket.on('notification:new', handleNewNotification);

      return () => {
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      // Mark all as read
      fetchAdmin("/api/admin/notifications/read-all", { method: "PUT" }).then(() => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      });
    }
  };

  return (
    <div style={{ position: "fixed", top: 12, right: 24, zIndex: 100 }}>
      <button 
        onClick={handleOpen}
        style={{ 
          background: "white", 
          border: "1px solid var(--border)", 
          borderRadius: "50%", 
          width: 40, height: 40, 
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
        }}
      >
        <Bell size={18} color="var(--text-primary)" />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: -2, right: -2, 
            background: "var(--error)", color: "white", 
            fontSize: 10, fontWeight: 700, 
            width: 18, height: 18, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 48, right: 0,
          background: "white", width: 320, maxHeight: 400,
          borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          border: "1px solid var(--border)",
          overflow: "hidden", display: "flex", flexDirection: "column",
          animation: "slideUp 0.2s ease"
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Notifikasi</h3>
            {unreadCount > 0 && <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{unreadCount} Baru</span>}
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: "center", padding: 20, fontSize: 13, color: "var(--text-muted)" }}>Belum ada notifikasi.</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ 
                  padding: "12px", 
                  borderRadius: 8, 
                  background: n.isRead ? "transparent" : "rgba(34, 197, 94, 0.05)",
                  borderLeft: n.isRead ? "3px solid transparent" : "3px solid var(--primary)"
                }}>
                  <p style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: "var(--text-primary)", marginBottom: 4 }}>{n.title}</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{n.message}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                    {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(n.createdAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
