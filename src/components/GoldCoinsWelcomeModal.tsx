import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Coins, Gift, Zap } from "lucide-react";

const GOLD_COINS_WELCOME_KEY = "gold_coins_welcome_seen_v2";

interface GoldCoinsWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export function GoldCoinsWelcomeModal({ open, onClose }: GoldCoinsWelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(GOLD_COINS_WELCOME_KEY, "true");
    }
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Coins className="w-6 h-6 text-amber-500" />
            ¡Monedas de Oro!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              Las <strong>Monedas de Oro</strong> son puntos que acumulás con cada compra.
              Podés canjearlas por descuentos en tus próximos pedidos.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600">💰 1 moneda = $0.01 de descuento</p>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-600">⏰ Las monedas vencen a los 30 días</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox 
              id="dont-show-again" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label htmlFor="dont-show-again" className="text-sm cursor-pointer">
              No volver a mostrar este mensaje
            </label>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={handleClose} className="bg-amber-500 hover:bg-amber-600">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
