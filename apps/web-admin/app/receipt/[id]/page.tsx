"use client";

import { useEffect, useState, use } from "react";

const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function ReceiptPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [printerWidth, setPrinterWidth] = useState("80mm");

  useEffect(() => {
    setPrinterWidth(localStorage.getItem("receiptWidth") || "80mm");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${apiUrl}/api/orders/${params.id}/status`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setOrder(res.data);
        } else {
          setError(res.error || "Pesanan tidak ditemukan");
        }
      })
      .catch(() => setError("Gagal memuat struk"));
  }, [params.id]);

  useEffect(() => {
    if (order) {
      setTimeout(() => window.print(), 500);
    }
  }, [order]);

  if (error) return <div style={{ padding: 20 }}>{error}</div>;
  if (!order) return <div style={{ padding: 20 }}>Memuat struk...</div>;

  const containerWidth = printerWidth === "58mm" ? "200px" : "300px";

  return (
    <div style={{ 
      width: containerWidth, 
      margin: "0 auto", 
      fontFamily: "'Courier New', Courier, monospace", 
      fontSize: "12px", 
      color: "#000",
      background: "#fff",
      padding: "20px 10px"
    }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 6px", fontWeight: "bold" }}>{order.restaurant?.name || "SmartMenu"}</h2>
        <p style={{ margin: "2px 0" }}>Meja: {order.table?.tableNumber || "-"}</p>
        <p style={{ margin: "2px 0" }}>No: {order.orderNumber}</p>
        <p style={{ margin: "2px 0" }}>{new Date(order.createdAt).toLocaleString("id-ID")}</p>
      </div>
      
      <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "10px 0", marginBottom: 10 }}>
        {order.orderItems.map((oi: any, i: number) => {
          let variants: any[] = [];
          if (oi.variantSelected) {
             variants = Array.isArray(oi.variantSelected) ? oi.variantSelected : [oi.variantSelected];
          }
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "bold" }}>{oi.quantity}x {oi.menuItem.name}</span>
                <span>{formatRupiah(oi.subtotal)}</span>
              </div>
              {variants.length > 0 && variants.map((v: any, idx: number) => (
                <div key={idx} style={{ paddingLeft: 14, fontSize: 11 }}>- {v.name}: {v.selectedOption.label}</div>
              ))}
              {oi.notes && <div style={{ paddingLeft: 14, fontSize: 11, fontStyle: "italic" }}>{oi.notes}</div>}
            </div>
          )
        })}
      </div>

      <div style={{ paddingBottom: 10, borderBottom: "1px dashed #000", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>Subtotal</span>
          <span>{formatRupiah(order.subtotal)}</span>
        </div>
        {order.discountAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>Diskon {order.promotion?.name ? `(${order.promotion.name})` : ''}</span>
            <span>-{formatRupiah(order.discountAmount)}</span>
          </div>
        )}
        {order.taxAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>PPN</span>
            <span>{formatRupiah(order.taxAmount)}</span>
          </div>
        )}
        {order.serviceCharge > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>Biaya Layanan</span>
            <span>{formatRupiah(order.serviceCharge)}</span>
          </div>
        )}
        
        <div style={{ marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 14 }}>
          <span>TOTAL</span>
          <span>{formatRupiah(order.total)}</span>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 24, fontSize: 11 }}>
        <p style={{ margin: "2px 0" }}>Terima kasih atas kunjungan Anda!</p>
        <p style={{ margin: "2px 0" }}>Powered by SmartMenu</p>
      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: ${printerWidth} auto; }
          body { margin: 0; padding: 10px; }
        }
      `}</style>
    </div>
  );
}
