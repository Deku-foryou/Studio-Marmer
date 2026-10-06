import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { Receipt } from 'lucide-react';

export default function CartSummary() {
  const { priceBreakdown } = useCart();

  return (
    <div className="border border-[#E5E1DA] bg-white p-4 space-y-3 rounded-none">
      <div className="flex items-center gap-2 mb-1">
        <Receipt size={12} className="text-[#999999]" />
        <span className="text-[10px] uppercase tracking-widest text-[#999999]">
          Order Summary
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#666666] font-light">Subtotal</span>
          <span className="text-xs text-[#1A1A1A] font-light">
            {formatPrice(priceBreakdown.subtotal)}
          </span>
        </div>
      </div>

      {/* ─── Divider ─────────────────────────────────────── */}
      <div className="h-px bg-[#E5E1DA]" />

      {/* ─── Total ───────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <span className="text-sm uppercase tracking-wider font-medium text-[#1A1A1A]">Total</span>
        <span className="text-base font-light text-[#1A1A1A]">
          {formatPrice(priceBreakdown.total)}
        </span>
      </div>
    </div>
  );
}
