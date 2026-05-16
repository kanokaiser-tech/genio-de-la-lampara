import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lamp } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
      <Lamp className="w-16 h-16 text-yellow-500/50 mb-6" />
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-zinc-400 mb-8">Pagina no encontrada</p>
      <Link to="/">
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Button>
      </Link>
    </div>
  );
}
