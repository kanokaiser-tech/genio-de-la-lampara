import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, ArrowDown, ArrowUp, Clock, TrendingUp, History, Zap } from "lucide-react";

const GOLD_COIN_VALUE = 0.01;

function coinsToPesos(coins: number): string {
  return `$${(coins * GOLD_COIN_VALUE).toFixed(2)}`;
}

export default function GoldCoinsPage() {
  const { user } = useAuth();
  const { data: balance, isLoading: lb } = trpc.goldCoins.getBalance.useQuery();
  const { data: history, isLoading: lh } = trpc.goldCoins.getHistory.useQuery();

  const earned = history?.filter(t => t.type === "earned").reduce((s, t) => s + t.amount, 0) ?? 0;
  const spent = history?.filter(t => t.type === "spent").reduce((s, t) => s + Math.abs(t.amount), 0) ?? 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Coins className="w-6 h-6 text-yellow-500" /> Monedas de Oro
      </h1>

      {/* Saldo actual */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <p className="text-sm text-gray-500 mb-2">Saldo actual</p>
        <div className="flex items-baseline gap-3">
          {lb ? <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" /> : (
            <>
              <span className="text-4xl font-bold text-yellow-600">{(user as any)?.goldCoins ?? 0}</span>
              <span className="text-lg text-gray-400">monedas</span>
              <span className="text-sm text-gray-500 ml-2">({coinsToPesos(balance?.balance ?? 0)})</span>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">1 moneda de oro = $0.01 (1 centavo)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-600 font-medium">Ganadas</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{earned}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUp className="w-4 h-4 text-red-600" />
            <p className="text-xs text-red-600 font-medium">Usadas</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{spent}</p>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2 text-sm">Como funcionan las Monedas de Oro</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li className="flex items-center gap-2"><Zap className="w-3 h-3 text-green-600 shrink-0" /> Paga en <strong>efectivo</strong> y sumas el <strong>doble</strong> de monedas</li>
          <li className="flex items-center gap-2"><ArrowDown className="w-3 h-3 text-green-600 shrink-0" /> Con otras formas de pago sumas la mitad</li>
          <li className="flex items-center gap-2"><ArrowUp className="w-3 h-3 text-red-500 shrink-0" /> Podes usarlas para <strong>descuentos</strong> en cualquier compra</li>
          <li className="flex items-center gap-2"><Clock className="w-3 h-3 text-orange-500 shrink-0" /> Las monedas ganadas en un mes <strong>vencen al mes siguiente</strong></li>
          <li className="flex items-center gap-2"><Coins className="w-3 h-3 text-yellow-500 shrink-0" /> <strong>1 moneda = $0.01</strong> (1 centavo)</li>
        </ul>
      </div>

      {/* Historial */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">Historial</p>
        </div>

        {lh ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-yellow-500 animate-spin" /></div>
        ) : (!history || history.length === 0) ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <Coins className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay transacciones aun</p>
            <p className="text-xs text-gray-400 mt-1">Hace un pedido para ganar monedas de oro</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map(tx => (
              <div key={tx.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  {tx.type === "earned" && <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><ArrowDown className="w-4 h-4 text-green-600" /></div>}
                  {tx.type === "spent" && <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"><ArrowUp className="w-4 h-4 text-red-600" /></div>}
                  {tx.type === "expired" && <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Clock className="w-4 h-4 text-gray-500" /></div>}
                  <div>
                    <p className="text-gray-900 font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      {tx.orderId && <span className="ml-1">Pedido #{tx.orderId}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === "earned" ? "text-green-600" : tx.type === "spent" ? "text-red-600" : "text-gray-500"}`}>
                    {tx.type === "earned" ? "+" : ""}{tx.amount}
                  </p>
                  <p className="text-xs text-gray-400">{coinsToPesos(tx.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
