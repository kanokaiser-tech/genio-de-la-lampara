import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Package, Users, RefreshCw, Settings, ClipboardList, Trash2, Plus, Save, Lock, Pencil, X, Check, Shield, TrendingUp, Calendar } from "lucide-react";

export default function AdminPage() {
  const { isSuperadmin } = useAuth();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("products");
  const [expanded, setExpanded] = useState<number | null>(null);

  // New forms
  const [newProd, setNewProd] = useState({ name: "", category: "", priceList: "", stock: "0" });
  const [newRev, setNewRev] = useState({ name: "", email: "", phone: "", password: "", discountType: "efectivo" as "efectivo" | "transferencia", parentId: "" });
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", phone: "", password: "" });
  const [newSuperadmin, setNewSuperadmin] = useState({ name: "", email: "", phone: "", password: "" });

  // Edit form
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", parentId: "" });

  // Password change dialog
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const [changePassUser, setChangePassUser] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Data
  const { data: products, isLoading: lp } = trpc.product.list.useQuery();
  const { data: allUsers, isLoading: lr } = trpc.user.list.useQuery();
  const { data: admins } = trpc.user.listAdmins.useQuery();
  const { data: superadmins } = trpc.user.byRole.useQuery({ role: "superadmin" }, { enabled: isSuperadmin });
  const revs = allUsers?.filter(u => u.role === "revendedor") ?? [];
  const { data: orders, isLoading: lo } = trpc.order.myOrdersAsAdmin.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: salesByAdmin, isLoading: ls } = trpc.order.salesByAdmin.useQuery(undefined, { enabled: isSuperadmin });

  // Mutations
  const cProd = trpc.product.create.useMutation({ onSuccess: () => { utils.product.list.invalidate(); setNewProd({ name: "", category: "", priceList: "", stock: "0" }); } });
  const dProd = trpc.product.delete.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const clProd = trpc.product.clearAll.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const delTnProd = trpc.tiendanube.deleteProduct.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const cRev = trpc.user.createRevendedor.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      utils.user.listAdmins.invalidate();
      setNewRev({ name: "", email: "", phone: "", password: "", discountType: "efectivo", parentId: "" });
    }
  });
  const cAdmin = trpc.user.createAdmin.useMutation({ onSuccess: () => { utils.user.listAdmins.invalidate(); setNewAdmin({ name: "", email: "", phone: "", password: "" }); } });
  const cSuperadmin = trpc.user.createSuperadmin.useMutation({
    onSuccess: () => {
      utils.user.byRole.invalidate();
      utils.user.list.invalidate();
      setNewSuperadmin({ name: "", email: "", phone: "", password: "" });
    }
  });
  const dUser = trpc.user.delete.useMutation({ onSuccess: () => { utils.user.list.invalidate(); utils.user.listAdmins.invalidate(); utils.user.byRole.invalidate(); } });
  const chPass = trpc.user.changePassword.useMutation({ onSuccess: () => closePassDialog() });
  const upUser = trpc.user.update.useMutation({ onSuccess: () => { utils.user.list.invalidate(); utils.user.listAdmins.invalidate(); utils.user.byRole.invalidate(); setEditing(null); } });
  const upSet = trpc.settings.update.useMutation({ onSuccess: () => utils.settings.get.invalidate() });
  const sync = trpc.tiendanube.sync.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const test = trpc.tiendanube.test.useMutation();
  const appr = trpc.order.approve.useMutation({ onSuccess: () => utils.order.myOrdersAsAdmin.invalidate() });
  const rej = trpc.order.reject.useMutation({ onSuccess: () => utils.order.myOrdersAsAdmin.invalidate() });
  const clearHistory = trpc.order.clearHistory.useMutation({
    onSuccess: () => {
      utils.order.salesByAdmin.invalidate();
      utils.order.myOrdersAsAdmin.invalidate();
    },
  });

  const fmt = (d: Date | string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const startEdit = (user: any) => { setEditing(user.id); setEditForm({ name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", parentId: user.parentId ? String(user.parentId) : "" }); };

const openPassDialog = (user: any) => { setChangePassUser({ id: user.id, name: user.name }); setNewPassword(""); setPassDialogOpen(true); };
const closePassDialog = () => { setPassDialogOpen(false); setChangePassUser(null); setNewPassword(""); };

  // Tabs disponibles segun rol
  const tabs = [
    { value: "products", label: `Productos (${products?.length ?? 0})`, icon: Package },
    { value: "revendedores", label: `Revendedores (${revs?.length ?? 0})`, icon: Users },
    ...(isSuperadmin ? [{ value: "admins", label: `Admins (${admins?.length ?? 0})`, icon: Users }] : []),
    { value: "orders", label: `Pedidos (${orders?.length ?? 0})`, icon: ClipboardList },
    ...(isSuperadmin ? [{ value: "import", label: "Importar", icon: RefreshCw }] : []),
    ...(isSuperadmin ? [{ value: "settings", label: "Config", icon: Settings }] : []),
    ...(isSuperadmin ? [{ value: "superadmins", label: `SuperAdmins (${superadmins?.length ?? 0})`, icon: Shield }] : []),
    ...(isSuperadmin ? [{ value: "sales", label: "Ventas", icon: TrendingUp }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administracion</h1>
        {isSuperadmin && <Badge className="bg-blue-100 text-blue-700 border-blue-300 font-bold">SUPERADMIN</Badge>}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border border-gray-200 mb-6 flex-wrap h-auto">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600">
              <t.icon className="w-4 h-4 mr-1" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* PRODUCTS */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{products?.length ?? 0} productos</p><Button variant="outline" size="sm" onClick={() => clProd.mutate()} className="border-red-300 text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3 mr-1" /> Vaciar todo</Button></div>
          {lp ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div> : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="hidden md:grid grid-cols-[1fr,130px,80px,110px,110px,110px,100px] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <span>Nombre</span><span>Categoria</span><span className="text-center">Stock</span><span className="text-right">Lista</span><span className="text-right">Efectivo</span><span className="text-right">Transfer</span><span className="text-center">Acciones</span>
              </div>
              {products?.map(p => {
                const stockNum = Number(p.stock ?? 0);
                const stockColor = stockNum <= 0 ? "text-red-500" : stockNum <= 5 ? "text-orange-500" : stockNum <= 10 ? "text-amber-500" : "text-green-600";
                return (
                  <div key={p.id} className="grid grid-cols-[1fr,130px,80px,110px,110px,110px,100px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm">
                    <span className="truncate text-gray-900">{p.name}</span>
                    <span className="text-gray-500 text-sm">{p.category}</span>
                    <span className={`text-center font-bold ${stockColor}`}>{stockNum}</span>
                    <span className="text-right text-gray-400 line-through">{formatPrice(p.priceList)}</span>
                    <span className="text-right text-blue-600 font-medium">{formatPrice(p.priceCash30)}</span>
                    <span className="text-right text-green-600">{formatPrice(p.priceTransfer25)}</span>
                    <div className="flex justify-center gap-1">
                      {p.tiendanubeId && (
                        <button onClick={() => { if (confirm('Eliminar de Tiendanube tambien?')) delTnProd.mutate({ productId: p.id }); }} className="text-gray-400 hover:text-red-500" title="Eliminar de Tiendanube"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => dProd.mutate({ id: p.id })} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* REVENDEDORES */}
        <TabsContent value="revendedores" className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-3 text-gray-900">Nuevo revendedor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                <Input placeholder="Nombre completo" value={newRev.name} onChange={e => setNewRev({ ...newRev, name: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <Input placeholder="Email" type="email" value={newRev.email} onChange={e => setNewRev({ ...newRev, email: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Telefono</label>
                <Input placeholder="Telefono" value={newRev.phone} onChange={e => setNewRev({ ...newRev, phone: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Contrasena</label>
                <Input placeholder="Contrasena" type="password" value={newRev.password} onChange={e => setNewRev({ ...newRev, password: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo de descuento</label>
                <select value={newRev.discountType} onChange={e => setNewRev({ ...newRev, discountType: e.target.value as "efectivo" | "transferencia" })} className="w-full h-9 bg-gray-50 border border-gray-300 rounded-lg px-3 text-sm text-gray-900">
                  <option value="efectivo">Efectivo -30%</option>
                  <option value="transferencia">Transferencia -25%</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-blue-600 mb-1 block font-medium">Administrador asignado</label>
                <select value={newRev.parentId} onChange={e => setNewRev({ ...newRev, parentId: e.target.value })} className="w-full h-9 bg-gray-50 border border-blue-300 rounded-lg px-3 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500">
                  <option value="">-- Seleccionar administrador --</option>
                  {admins?.map(a => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                </select>
                {!newRev.parentId && <p className="text-xs text-gray-400 mt-1">Si no seleccionas, se asigna a vos automaticamente.</p>}
              </div>
              <div className="flex items-end">
                <Button onClick={() => cRev.mutate({ ...newRev, parentId: newRev.parentId ? Number(newRev.parentId) : undefined })} disabled={!newRev.name || !newRev.email || !newRev.password} className="w-full bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1" /> Crear revendedor</Button>
              </div>
            </div>
          </div>
          {lr ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" /> : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr,180px,100px,80px,120px,60px,60px,60px] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span>Nombre</span><span>Email</span><span>Telefono</span><span>Desc.</span><span>Admin asignado</span><span></span><span></span><span></span>
              </div>
              {revs?.map(r => {
                const assignedAdmin = admins?.find(a => a.id === r.parentId);
                return (
                  <div key={r.id} className="grid grid-cols-[1fr,180px,100px,80px,120px,60px,60px,60px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm">
                    {editing === r.id ? (
                      <>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-500">Nombre</label>
                          <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-500">Email</label>
                          <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-500">Telefono</label>
                          <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                        </div>
                        <div />
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-blue-600 font-medium">Cambiar admin</label>
                          <select value={editForm.parentId} onChange={e => setEditForm({ ...editForm, parentId: e.target.value })} className="bg-gray-50 border border-blue-300 rounded-lg px-2 text-sm text-gray-900 h-8 w-full focus:ring-1 focus:ring-blue-500">
                            {admins?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-1 pt-4">
                          <Button size="sm" onClick={() => upUser.mutate({ id: r.id, name: editForm.name, email: editForm.email, phone: editForm.phone, parentId: editForm.parentId ? Number(editForm.parentId) : null })} className="bg-green-600 hover:bg-green-700 h-8 px-2" title="Guardar"><Check className="w-3 h-3 text-white" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8 px-2 text-gray-500"><X className="w-3 h-3" /></Button>
                        </div>
                        <div />
                      </>
                    ) : (
                      <>
                        <span className="truncate text-gray-900">{r.name}</span>
                        <span className="text-gray-500 truncate">{r.email}</span>
                        <span className="text-gray-500">{r.phone || "-"}</span>
                        <Badge variant="outline" className="text-blue-600 border-blue-300 w-fit text-xs">{r.discountType === "efectivo" ? "30%" : "25%"}</Badge>
                        <span className="text-gray-600 text-xs truncate" title={assignedAdmin?.email}>{assignedAdmin?.name || <span className="text-gray-400">Sin asignar</span>}</span>
                        <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => openPassDialog(r)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Lock className="w-4 h-4" /></button>
                        <button onClick={() => dUser.mutate({ id: r.id })} className="text-gray-400 hover:text-red-500 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                );
              })}
              {(!revs || revs.length === 0) && <div className="text-center py-8 text-gray-500 text-sm">No hay revendedores</div>}
            </div>
          )}
        </TabsContent>

        {/* ADMINS — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="admins" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 text-gray-900">Nuevo admin</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input placeholder="Nombre" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Email" type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Telefono (WhatsApp)" value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Contrasena" type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Button onClick={() => cAdmin.mutate(newAdmin)} disabled={!newAdmin.name || !newAdmin.email || !newAdmin.password} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1" /> Crear</Button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span>Nombre</span><span>Email</span><span>Telefono</span><span></span><span></span><span></span>
              </div>
              {admins?.map(a => (
                <div key={a.id} className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 border-t border-gray-100 items-center text-sm">
                  {editing === a.id ? (
                    <>
                      <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Button size="sm" onClick={() => upUser.mutate({ id: a.id, name: editForm.name, email: editForm.email, phone: editForm.phone })} className="bg-green-600 hover:bg-green-700 h-8 px-2"><Check className="w-3 h-3 text-white" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8 px-2 text-gray-500"><X className="w-3 h-3" /></Button>
                      <div />
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-gray-900">{a.name}</span>
                      <span className="text-gray-500">{a.email}</span>
                      <span className="text-gray-500">{a.phone || "-"}</span>
                      <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => openPassDialog(a)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Lock className="w-4 h-4" /></button>
                      <button onClick={() => dUser.mutate({ id: a.id })} className="text-gray-400 hover:text-red-500 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              ))}
              {(!admins || admins.length === 0) && <div className="text-center py-8 text-gray-500 text-sm">No hay otros admins</div>}
            </div>
          </TabsContent>
        )}

        {/* ORDERS */}
        <TabsContent value="orders" className="space-y-3">
          {lo ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div> : orders?.length === 0 ? <div className="text-center py-20 text-gray-500"><ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No hay pedidos</p></div> : (
            orders?.map(o => {
              const isExp = expanded === o.id;
              return (
                <div key={o.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <button onClick={() => setExpanded(isExp ? null : o.id)} className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <Badge className={o.status === "pending" ? "bg-amber-100 text-amber-700 border-amber-300" : o.status === "approved" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}>
                        {o.status === "pending" ? "Pendiente" : o.status === "approved" ? "Aprobado" : "Rechazado"}
                      </Badge>
                      <div className="text-left">
                        <p className="font-medium text-sm text-gray-900">Pedido #{o.id}</p>
                        <p className="text-xs text-gray-500">{fmt(o.createdAt)} - {o.paymentType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-blue-600">{formatPrice(o.totalAmount)}</span>
                    </div>
                  </button>
                  {isExp && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      {o.notes && <p className="text-sm text-gray-500 mb-2 bg-gray-50 p-2 rounded">Notas: {o.notes}</p>}
                      {o.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => appr.mutate({ id: o.id })} className="bg-green-600 hover:bg-green-700 text-white">Aprobar</Button>
                          <Button size="sm" variant="outline" onClick={() => rej.mutate({ id: o.id })} className="border-red-300 text-red-600 hover:bg-red-50">Rechazar</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* IMPORT — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="import" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Sincronizacion con Tiendanube</h3>
              <p className="text-gray-500 text-sm mb-4">Importa todos los productos de tu tienda Tiendanube. Los que no esten en Tiendanube se eliminan.</p>
              <div className="flex gap-3">
                <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {sync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Sincronizar
                </Button>
                <Button onClick={() => test.mutate()} variant="outline" className="border-gray-300 text-gray-700">Probar conexion</Button>
              </div>
              {sync.isSuccess && <p className="text-green-600 text-sm mt-3">{sync.data.imported} productos importados{sync.data.deleted ? `, ${sync.data.deleted} eliminados` : ""}</p>}
              {sync.isError && <p className="text-red-600 text-sm mt-3">Error: {sync.error.message}</p>}
            </div>
          </TabsContent>
        )}

        {/* SETTINGS — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="settings" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Configuracion</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["storeName", "whatsappNumber", "tiendanubeApiToken", "tiendanubeStoreId", "webhookUrl"] as const).map(k => (
                  <div key={k} className={k === "webhookUrl" ? "md:col-span-2" : ""}>
                    <label className="text-sm text-gray-500 mb-1 block capitalize">
                      {k === "storeName" ? "Nombre de la tienda" : k === "whatsappNumber" ? "WhatsApp" : k === "tiendanubeApiToken" ? "API Token Tiendanube" : k === "tiendanubeStoreId" ? "Store ID Tiendanube" : "Webhook URL (n8n)"}
                    </label>
                    <Input defaultValue={(settings as any)?.[k] ?? ""} onChange={e => { const el = e.target; el.dataset.value = e.target.value; }} className="bg-gray-50 border-gray-300 text-gray-900 setting-input" data-key={k} />
                  </div>
                ))}
              </div>
              <Button onClick={() => { const vals: Record<string, string> = {}; document.querySelectorAll(".setting-input").forEach(i => { const el = i as HTMLInputElement; if (el.dataset.value) vals[el.dataset.key!] = el.dataset.value; }); upSet.mutate(vals); }} disabled={upSet.isPending} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                {upSet.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Guardar
              </Button>
            </div>
          </TabsContent>
        )}

        {/* SUPERADMINS — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="superadmins" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" /> Nuevo SuperAdmin
              </h3>
              <p className="text-xs text-gray-500 mb-3">Maximo 2 superadmins permitidos. Actualmente: {superadmins?.length ?? 0}/2</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input placeholder="Nombre" value={newSuperadmin.name} onChange={e => setNewSuperadmin({ ...newSuperadmin, name: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Email" type="email" value={newSuperadmin.email} onChange={e => setNewSuperadmin({ ...newSuperadmin, email: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Telefono" value={newSuperadmin.phone} onChange={e => setNewSuperadmin({ ...newSuperadmin, phone: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Contrasena" type="password" value={newSuperadmin.password} onChange={e => setNewSuperadmin({ ...newSuperadmin, password: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Button
                  onClick={() => cSuperadmin.mutate(newSuperadmin)}
                  disabled={!newSuperadmin.name || !newSuperadmin.email || !newSuperadmin.password || (superadmins?.length ?? 0) >= 2}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" /> Crear SuperAdmin
                </Button>
              </div>
              {(superadmins?.length ?? 0) >= 2 && <p className="text-xs text-red-500 mt-2">Ya hay 2 superadmins. Elimina uno para crear otro.</p>}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span>Nombre</span><span>Email</span><span>Telefono</span><span></span><span></span><span></span>
              </div>
              {superadmins?.map(a => (
                <div key={a.id} className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 border-t border-gray-100 items-center text-sm">
                  {editing === a.id ? (
                    <>
                      <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Button size="sm" onClick={() => upUser.mutate({ id: a.id, name: editForm.name, email: editForm.email, phone: editForm.phone })} className="bg-green-600 hover:bg-green-700 h-8 px-2"><Check className="w-3 h-3 text-white" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8 px-2 text-gray-500"><X className="w-3 h-3" /></Button>
                      <div />
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-gray-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" /> {a.name}
                      </span>
                      <span className="text-gray-500">{a.email}</span>
                      <span className="text-gray-500">{a.phone || "-"}</span>
                      <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => openPassDialog(a)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Lock className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm('Eliminar este superadmin?')) dUser.mutate({ id: a.id }); }} className="text-gray-400 hover:text-red-500 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              ))}
              {(!superadmins || superadmins.length === 0) && <div className="text-center py-8 text-gray-500 text-sm">No hay superadmins</div>}
            </div>
          </TabsContent>
        )}

        {/* VENTAS — solo superadmin: reporte diario por admin */}
        {isSuperadmin && (
          <TabsContent value="sales" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Rendicion de Ventas por Admin</h2>
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">Total diario de pedidos aprobados y rechazados por cada administrador.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { if (confirm("ESTO ELIMINARA TODOS LOS PEDIDOS APROBADOS Y RECHAZADOS. Estas seguro?")) clearHistory.mutate(); }}
                disabled={clearHistory.isPending}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {clearHistory.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3 mr-1" /> Borrar historial</>}
              </Button>
            </div>

            {ls ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div> : (!salesByAdmin || salesByAdmin.length === 0) ? (
              <div className="text-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay ventas registradas aun</p>
                <p className="text-xs text-gray-400 mt-1">Los pedidos aprobados y rechazados apareceran aqui</p>
              </div>
            ) : (
              <>
                {/* Totales generales */}
                {(() => {
                  const totalAprobado = salesByAdmin.reduce((s, d) => s + d.approvedTotal, 0);
                  const totalRechazado = salesByAdmin.reduce((s, d) => s + d.rejectedTotal, 0);
                  const totalAprobados = salesByAdmin.reduce((s, d) => s + d.approvedCount, 0);
                  const totalRechazados = salesByAdmin.reduce((s, d) => s + d.rejectedCount, 0);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">{formatPrice(totalAprobado)}</p>
                        <p className="text-xs text-green-600 font-medium">Total Aprobado</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-700">{totalAprobados}</p>
                        <p className="text-xs text-blue-600 font-medium">Pedidos Aprobados</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-red-700">{formatPrice(totalRechazado)}</p>
                        <p className="text-xs text-red-600 font-medium">Total Rechazado</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-gray-700">{totalRechazados}</p>
                        <p className="text-xs text-gray-600 font-medium">Pedidos Rechazados</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Tabla por admin y fecha */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="hidden md:grid grid-cols-[1fr,130px,100px,120px,100px,120px,140px] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                    <span>Administrador</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</span>
                    <span className="text-center">Aprobados</span>
                    <span className="text-right">Total Aprobado</span>
                    <span className="text-center">Rechazados</span>
                    <span className="text-right">Total Rechazado</span>
                    <span className="text-right">Rendicion</span>
                  </div>
                  {salesByAdmin.map((row, idx) => {
                    const dateFmt = new Date(row.date + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
                    const isToday = row.date === new Date().toISOString().split("T")[0];
                    return (
                      <div key={idx} className={`grid grid-cols-1 md:grid-cols-[1fr,130px,100px,120px,100px,120px,140px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm ${isToday ? "bg-blue-50/50" : ""}`}>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" /> {row.adminName}
                        </span>
                        <span className="text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateFmt}
                          {isToday && <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] ml-1">Hoy</Badge>}
                        </span>
                        <span className="text-center">
                          <Badge className="bg-green-100 text-green-700 border-green-300">{row.approvedCount}</Badge>
                        </span>
                        <span className="text-right font-semibold text-green-700">{formatPrice(row.approvedTotal)}</span>
                        <span className="text-center">
                          {row.rejectedCount > 0 ? <Badge className="bg-red-100 text-red-700 border-red-300">{row.rejectedCount}</Badge> : <span className="text-gray-400">-</span>}
                        </span>
                        <span className="text-right font-medium text-red-600">{row.rejectedTotal > 0 ? formatPrice(row.rejectedTotal) : <span className="text-gray-400">-</span>}</span>
                        <span className="text-right font-bold text-blue-700">{formatPrice(row.approvedTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog global para cambiar contrasena */}
      <Dialog open={passDialogOpen} onOpenChange={setPassDialogOpen}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" /> Cambiar Contrasena
            </DialogTitle>
          </DialogHeader>
          {changePassUser && (
            <form onSubmit={(e) => { e.preventDefault(); if (newPassword.length >= 4) chPass.mutate({ id: changePassUser.id, newPassword }); }} className="space-y-3 pt-2">
              <p className="text-sm text-gray-600">Usuario: <strong className="text-gray-900">{changePassUser.name}</strong></p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nueva contrasena (min 4 caracteres)</label>
                <Input type="password" placeholder="Nueva contrasena" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required minLength={4} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={chPass.isPending || newPassword.length < 4} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {chPass.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-1" /> Cambiar</>}
                </Button>
                <Button variant="ghost" type="button" onClick={closePassDialog} className="text-gray-500">Cancelar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
