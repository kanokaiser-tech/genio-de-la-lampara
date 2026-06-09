import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, AlertTriangle, MessageCircle, CheckCircle } from "lucide-react";

const TERMS_KEY = "marketplace_terms_accepted_v2";

interface MarketplaceTermsModalProps {
  open: boolean;
  onAccept: () => void;
}

export function MarketplaceTermsModal({ open, onAccept }: MarketplaceTermsModalProps) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      localStorage.setItem(TERMS_KEY, "true");
      onAccept();
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-white rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-blue-600" />
            Términos y Condiciones del Marketplace
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 font-semibold mb-2">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ LEÉ ESTO ANTES DE CONTINUAR
            </div>
            <p className="text-sm text-yellow-700">
              El Marketplace es un espacio donde revendedores publican y negocian entre ellos. 
              <strong className="block mt-1">LA TIENDA NO PARTICIPA EN LAS NEGOCIACIONES NI ES RESPONSABLE POR LAS TRANSACCIONES.</strong>
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              1. Negociación entre revendedores
            </h3>
            <p className="text-sm text-gray-600">
              Los productos publicados son ofrecidos por otros revendedores. Cualquier negociación es responsabilidad EXCLUSIVA de los revendedores.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              2. Moderación automática (IA)
            </h3>
            <p className="text-sm text-gray-600">
              Los productos son moderados por IA. Si ves un producto inapropiado, reportalo.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">3. Prohibiciones</h3>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>❌ Drogas, alcohol, tabaco, medicamentos</li>
              <li>❌ Armas, cuchillos, explosivos</li>
              <li>❌ Productos que ya vende la tienda oficial</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox 
              id="terms-accept" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
            />
            <label htmlFor="terms-accept" className="text-sm font-medium cursor-pointer">
              Acepto los términos y condiciones del Marketplace
            </label>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleAccept} 
            disabled={!accepted}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aceptar y continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
