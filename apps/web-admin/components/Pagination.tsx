import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export default function Pagination({ page, limit, total, totalPages, onPageChange, onLimitChange }: PaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
      <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
        Menampilkan <b>{start}</b> - <b>{end}</b> dari <b>{total}</b> data
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {onLimitChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Per halaman:</span>
            <select 
              value={limit} 
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "white", fontSize: 13 }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 4 }}>
          <button 
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            style={{ 
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 6, border: "1px solid var(--border)", background: page <= 1 ? "var(--surface-2)" : "white",
              cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1
            }}
          >
            <ChevronLeft size={16} />
          </button>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 40, fontSize: 14, fontWeight: 600 }}>
            {page} / {totalPages || 1}
          </div>

          <button 
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            style={{ 
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 6, border: "1px solid var(--border)", background: page >= totalPages ? "var(--surface-2)" : "white",
              cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
