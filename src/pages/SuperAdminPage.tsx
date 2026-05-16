import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Plus,
  Trash2,
  Users,
  Loader2,
} from "lucide-react";

export default function SuperAdminPage() {
  const utils = trpc.useUtils();
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    phone: "",
    unionId: "",
  });

  const { data: allUsers, isLoading } = trpc.user.list.useQuery();
  const { data: admins } = trpc.user.listAdmins.useQuery();
  const { data: allRevendedores } = trpc.user.byRole.useQuery(
    { role: "revendedor" },
    { enabled: true }
  );

  const createAdmin = trpc.user.createAdmin.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      utils.user.listAdmins.invalidate();
      setNewAdmin({ name: "", email: "", phone: "", unionId: "" });
    },
  });
  const deleteUser = trpc.user.delete.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      utils.user.listAdmins.invalidate();
    },
  });


  const totalRevendedores = allRevendedores?.length ?? 0;
  const totalAdmins = admins?.length ?? 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-yellow-500" />
        <h1 className="text-2xl font-bold">Panel de Super Admin</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Administradores</p>
          <p className="text-3xl font-bold text-yellow-500">{totalAdmins}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Revendedores</p>
          <p className="text-3xl font-bold text-yellow-500">{totalRevendedores}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Usuarios totales</p>
          <p className="text-3xl font-bold text-yellow-500">{allUsers?.length ?? 0}</p>
        </div>
      </div>

      {/* Create admin */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">Crear nuevo administrador</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input
            placeholder="Nombre"
            value={newAdmin.name}
            onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
          <Input
            placeholder="Email"
            type="email"
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
          <Input
            placeholder="Telefono (WhatsApp)"
            value={newAdmin.phone}
            onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
          <Input
            placeholder="Union ID"
            value={newAdmin.unionId}
            onChange={(e) => setNewAdmin({ ...newAdmin, unionId: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
          <Button
            onClick={() =>
              createAdmin.mutate({
                name: newAdmin.name,
                email: newAdmin.email,
                phone: newAdmin.phone || undefined,
                unionId: newAdmin.unionId,
              })
            }
            disabled={createAdmin.isPending || !newAdmin.name || !newAdmin.email || !newAdmin.unionId}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Admin
          </Button>
        </div>
      </div>

      {/* Admins list */}
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Administradores
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr,200px,120px,120px,120px,80px] gap-4 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase">
            <span>Nombre</span>
            <span>Email</span>
            <span>Telefono</span>
            <span>Rol</span>
            <span>Revendedores</span>
            <span></span>
          </div>
          {admins?.map((admin) => {
            const revCount =
              allRevendedores?.filter((r) => r.parentId === admin.id).length ?? 0;
            return (
              <div
                key={admin.id}
                className="grid grid-cols-[1fr,200px,120px,120px,120px,80px] gap-4 px-4 py-3 border-t border-zinc-800/50 items-center text-sm"
              >
                <span className="font-medium">{admin.name}</span>
                <span className="text-zinc-400">{admin.email}</span>
                <span className="text-zinc-400">{admin.phone || "-"}</span>
                <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30 w-fit">
                  Admin
                </Badge>
                <span className="text-zinc-400">{revCount} revendedor{revCount !== 1 ? "es" : ""}</span>
                <button
                  onClick={() => {
                    if (confirm("Eliminar este administrador?")) {
                      deleteUser.mutate({ id: admin.id });
                    }
                  }}
                  className="text-zinc-500 hover:text-red-400 flex justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {(!admins || admins.length === 0) && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No hay administradores creados
            </div>
          )}
        </div>
      )}

      {/* All revendedores */}
      <h3 className="font-semibold text-lg mb-4 mt-8 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Todos los revendedores
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr,200px,120px,120px,120px,80px] gap-4 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase">
            <span>Nombre</span>
            <span>Email</span>
            <span>Telefono</span>
            <span>Admin asignado</span>
            <span>Descuento</span>
            <span></span>
          </div>
          {allRevendedores?.map((rev) => {
            const adminName = admins?.find((a) => a.id === rev.parentId)?.name ?? "Sin asignar";
            return (
              <div
                key={rev.id}
                className="grid grid-cols-[1fr,200px,120px,120px,120px,80px] gap-4 px-4 py-3 border-t border-zinc-800/50 items-center text-sm"
              >
                <span className="font-medium">{rev.name}</span>
                <span className="text-zinc-400">{rev.email}</span>
                <span className="text-zinc-400">{rev.phone || "-"}</span>
                <span className="text-zinc-400">{adminName}</span>
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 w-fit">
                  {rev.discountType === "efectivo" ? "30%" : "25%"}
                </Badge>
                <button
                  onClick={() => {
                    if (confirm("Eliminar este revendedor?")) {
                      deleteUser.mutate({ id: rev.id });
                    }
                  }}
                  className="text-zinc-500 hover:text-red-400 flex justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {(!allRevendedores || allRevendedores.length === 0) && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No hay revendedores registrados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
