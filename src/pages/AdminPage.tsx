import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Users, RefreshCw, Settings, ClipboardList, Trash2, Plus, Save, Lock, Pencil, X, Check } from "lucide-react";

export default function AdminPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("products");
  const [expanded, setExpanded] = useState<number | null>(null);

  // New forms
  const [newProd, setNewProd] = useState({ name: "", category: "", priceList: "", stock: "0" });
  const [newRev, setNewRev] = useState({ name: "", email: "", phone: "", password: "", discountType: "efectivo" as "efectivo" | "transferencia", parentId: "" });
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", phone: "", password: "" });

  // Edit form
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", parentId: "" });

  // Password change
  const [changePass, setChangePass] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Data
  const { data: products, isLoading: lp } = trpc.product.list.useQuery();
  const { data: allUsers, isLoading: lr } = trpc.user.list.useQuery();
  const { data: admins } = trpc.user.listAdmins.useQuery();
  const revs = allUsers?.filter(u => u.role === "revendedor") ?? [];
  const { data: orders, isLoading: lo } = trpc.order.myOrdersAsAdmin.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();

  // Mutations
  const cProd = trpc.product.create.useMutation({ onSuccess: () => { utils.product.list.invalidate(); setNewProd({ name: "", category: "", priceList: "", stock: "0" }); } });
  const dProd = trpc.product.delete.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const clProd = trpc.product.clearAll.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const cRev = trpc.user.createRevendedor.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      utils.user.listAdmins.invalidate();
      setNewRev({ name: "", email: "", phone: "", password: "", discountType: "efectivo", parentId: "" });
    }
  });
  const cAdmin = trpc.user.createAdmin.useMutation({ onSuccess: () => { utils.user.listAdmins.invalidate(); setNewAdmin({ name: "", email: "", phone: "", password: "" }); } });
  const dUser = trpc.user.delete.useMutation({ onSuccess: () => { utils.user.myRevendedores.invalidate(); utils.user.listAdmins.invalidate(); } });
  const chPass = trpc.user.changePassword.useMutation({ onSuccess: () => { setChangePass(null); setNewPassword(""); } });
  const upUser = trpc.user.update.useMutation({ onSuccess: () => { utils.user.list.invalidate(); utils.user.listAdmins.invalidate(); setEditing(null); } });
  const upSet = trpc.settings.update.useMutation({ onSuccess: () => utils.settings.get.invalidate() });
  const sync = trpc.tiendanube.sync.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const test = trpc.tiendanube.test.useMutation();
  const appr = trpc.order.approve.useMutation({ onSuccess: () => utils.order.myOrdersAsAdmin.invalidate() });
  const rej = trpc.order.reject.useMutation({ onSuccess: () => utils.order.myOrdersAsAdmin.invalidate() });

  const fmt = (d: Date | string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const startEdit = (user: any) => { setEditing(user.id); setEditForm({ name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", parentId: user.parentId ? String(user.parentId) : "" }); };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Panel de Administracion</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 mb-6 flex-wrap h-auto">
          <TabsTrigger value="products" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"><Package className="w-4 h-4 mr-1" /> Productos ({products?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="revendedores" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"><Users className="w-4 h-4 mr-1" /> Revendedores ({revs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="admins" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"><Users className="w-4 h-4 mr-1" /> Admins ({admins?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"><ClipboardList className="w-4 h-4 mr-1" /> Pedidos ({orders?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"><RefreshCw className="w-4 h-4 mr-1" /> Importar</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"><Settings className="w-4 h-4 mr-1" /> Config</TabsTrigger>
        </TabsList>

        {/* PRODUCTS */}
        <TabsContent value="products" className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Nuevo producto</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <Input placeholder="Nombre" value={newProd.name} onChange={e => setNewProd({ ...newProd, name: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Categoria" value={newProd.category} onChange={e => setNewProd({ ...newProd, category: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Precio lista" type="number" value={newProd.priceList} onChange={e => setNewProd({ ...newProd, priceList: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Stock" type="number" value={newProd.stock} onChange={e => setNewProd({ ...newProd, stock: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Button onClick={() => cProd.mutate({ name: newProd.name, category: newProd.category, priceList: Number(newProd.priceList), stock: Number(newProd.stock) })} disabled={!newProd.name || !newProd.category || !newProd.priceList} className="bg-yellow-500 hover:bg-yellow-600 text-black"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
            </div>
          </div>
          <div className="flex justify-between items-center"><p className="text-sm text-zinc-400">{products?.length ?? 0} productos</p><Button variant="outline" size="sm" onClick={() => clProd.mutate()} className="border-red-600 text-red-500"><Trash2 className="w-3 h-3 mr-1" /> Vaciar</Button></div>
          {lp ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-yellow-500 animate-spin" /></div> : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr,150px,120px,120px,120px,80px] gap-4 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase"><span>Nombre</span><span>Categoria</span><span className="text-right">Lista</span><span className="text-right">Efectivo</span><span className="text-right">Transfer</span><span></span></div>
              {products?.map(p => (
                <div key={p.id} className="grid grid-cols-[1fr,150px,120px,120px,120px,80px] gap-4 px-4 py-3 border-t border-zinc-800/50 items-center text-sm">
                  <span className="truncate">{p.name}</span><span className="text-zinc-400 text-sm">{p.category}</span>
                  <span className="text-right text-zinc-400 line-through">{formatPrice(p.priceList)}</span>
                  <span className="text-right text-yellow-500 font-medium">{formatPrice(p.priceCash30)}</span>
                  <span className="text-right text-green-400">{formatPrice(p.priceTransfer25)}</span>
                  <button onClick={() => dProd.mutate({ id: p.id })} className="text-zinc-500 hover:text-red-400 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REVENDEDORES */}
        <TabsContent value="revendedores" className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Nuevo revendedor</h3>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              <Input placeholder="Nombre" value={newRev.name} onChange={e => setNewRev({ ...newRev, name: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Email" type="email" value={newRev.email} onChange={e => setNewRev({ ...newRev, email: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Telefono" value={newRev.phone} onChange={e => setNewRev({ ...newRev, phone: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Contrasena" type="password" value={newRev.password} onChange={e => setNewRev({ ...newRev, password: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <select value={newRev.discountType} onChange={e => setNewRev({ ...newRev, discountType: e.target.value as "efectivo" | "transferencia" })} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white">
                <option value="efectivo">Efectivo 30%</option><option value="transferencia">Transfer 25%</option>
              </select>
              <select value={newRev.parentId} onChange={e => setNewRev({ ...newRev, parentId: e.target.value })} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white">
                <option value="">-- Asignar a --</option>
                {admins?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <Button onClick={() => cRev.mutate({ ...newRev, parentId: newRev.parentId ? Number(newRev.parentId) : undefined })} disabled={!newRev.name || !newRev.email || !newRev.password} className="bg-yellow-500 hover:bg-yellow-600 text-black"><Plus className="w-4 h-4 mr-1" /> Crear</Button>
            </div>
          </div>
          {lr ? <Loader2 className="w-6 h-6 text-yellow-500 animate-spin mx-auto" /> : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr,180px,100px,80px,120px,60px,60px,60px] gap-3 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase items-center"><span>Nombre</span><span>Email</span><span>Telefono</span><span>Desc.</span><span>Admin asignado</span><span></span><span></span><span></span></div>
              {revs?.map(r => {
                const assignedAdmin = admins?.find(a => a.id === r.parentId);
                return (
                  <div key={r.id} className="grid grid-cols-[1fr,180px,100px,80px,120px,60px,60px,60px] gap-3 px-4 py-3 border-t border-zinc-800/50 items-center text-sm">
                    {editing === r.id ? (
                      <>
                        <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-zinc-800 border-zinc-700 h-8 text-sm" />
                        <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-zinc-800 border-zinc-700 h-8 text-sm" />
                        <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-zinc-800 border-zinc-700 h-8 text-sm" />
                        <div />
                        <select value={editForm.parentId} onChange={e => setEditForm({ ...editForm, parentId: e.target.value })} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-sm text-white h-8">
                          {admins?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <Button size="sm" onClick={() => upUser.mutate({ id: r.id, name: editForm.name, email: editForm.email, phone: editForm.phone, parentId: editForm.parentId ? Number(editForm.parentId) : null })} className="bg-green-600 hover:bg-green-700 h-8 px-2"><Check className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8 px-2"><X className="w-3 h-3" /></Button>
                        <div />
                      </>
                    ) : (
                      <>
                        <span className="truncate">{r.name}</span>
                        <span className="text-zinc-400 truncate">{r.email}</span>
                        <span className="text-zinc-400">{r.phone || "-"}</span>
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 w-fit text-xs">{r.discountType === "efectivo" ? "30%" : "25%"}</Badge>
                        <span className="text-zinc-300 text-xs truncate" title={assignedAdmin?.email}>{assignedAdmin?.name || <span className="text-zinc-600">Sin asignar</span>}</span>
                        <button onClick={() => startEdit(r)} className="text-zinc-500 hover:text-blue-400 flex justify-center"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setChangePass({ id: r.id, name: r.name })} className="text-zinc-500 hover:text-yellow-400 flex justify-center"><Lock className="w-4 h-4" /></button>
                        <button onClick={() => dUser.mutate({ id: r.id })} className="text-zinc-500 hover:text-red-400 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                );
              })}
              {(!revs || revs.length === 0) && <div className="text-center py-8 text-zinc-500 text-sm">No hay revendedores</div>}
            </div>
          )}
          {changePass && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h4 className="font-medium mb-2">Cambiar contrasena de {changePass.name}</h4>
              <div className="flex gap-2">
                <Input type="password" placeholder="Nueva contrasena" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-zinc-800 border-zinc-700 max-w-xs" />
                <Button onClick={() => chPass.mutate({ id: changePass.id, newPassword })} disabled={newPassword.length < 4} className="bg-yellow-500 hover:bg-yellow-600 text-black"><Lock className="w-4 h-4 mr-1" /> Cambiar</Button>
                <Button variant="ghost" onClick={() => setChangePass(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ADMINS */}
        <TabsContent value="admins" className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Nuevo admin</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <Input placeholder="Nombre" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Email" type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Telefono (WhatsApp)" value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Contrasena" type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="bg-zinc-800 border-zinc-700" />
              <Button onClick={() => cAdmin.mutate(newAdmin)} disabled={!newAdmin.name || !newAdmin.email || !newAdmin.password} className="bg-yellow-500 hover:bg-yellow-600 text-black"><Plus className="w-4 h-4 mr-1" /> Crear</Button>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase items-center"><span>Nombre</span><span>Email</span><span>Telefono</span><span></span><span></span><span></span></div>
            {admins?.map(a => (
              <div key={a.id} className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 border-t border-zinc-800/50 items-center text-sm">
                {editing === a.id ? (
                  <>
                    <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-zinc-800 border-zinc-700 h-8 text-sm" />
                    <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-zinc-800 border-zinc-700 h-8 text-sm" />
                    <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-zinc-800 border-zinc-700 h-8 text-sm" />
                    <Button size="sm" onClick={() => upUser.mutate({ id: a.id, name: editForm.name, email: editForm.email, phone: editForm.phone })} className="bg-green-600 hover:bg-green-700 h-8 px-2"><Check className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8 px-2"><X className="w-3 h-3" /></Button>
                    <div />
                  </>
                ) : (
                  <>
                    <span className="font-medium">{a.name}</span><span className="text-zinc-400">{a.email}</span><span className="text-zinc-400">{a.phone || "-"}</span>
                    <button onClick={() => startEdit(a)} className="text-zinc-500 hover:text-blue-400 flex justify-center"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setChangePass({ id: a.id, name: a.name })} className="text-zinc-500 hover:text-yellow-400 flex justify-center"><Lock className="w-4 h-4" /></button>
                    <button onClick={() => dUser.mutate({ id: a.id })} className="text-zinc-500 hover:text-red-400 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            ))}
            {(!admins || admins.length === 0) && <div className="text-center py-8 text-zinc-500 text-sm">No hay otros admins</div>}
          </div>
          {changePass && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h4 className="font-medium mb-2">Cambiar contrasena de {changePass.name}</h4>
              <div className="flex gap-2">
                <Input type="password" placeholder="Nueva contrasena" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-zinc-800 border-zinc-700 max-w-xs" />
                <Button onClick={() => chPass.mutate({ id: changePass.id, newPassword })} disabled={newPassword.length < 4} className="bg-yellow-500 hover:bg-yellow-600 text-black"><Lock className="w-4 h-4 mr-1" /> Cambiar</Button>
                <Button variant="ghost" onClick={() => setChangePass(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders" className="space-y-3">
          {lo ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-yellow-500 animate-spin" /></div> : orders?.length === 0 ? <div className="text-center py-20 text-zinc-500"><ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No hay pedidos</p></div> : (
            orders?.map(o => {
              const isExp = expanded === o.id;
              return (
                <div key={o.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpanded(isExp ? null : o.id)} className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-800/50">
                    <div className="flex items-center gap-4">
                      <Badge className={o.status === "pending" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" : o.status === "approved" ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-red-500/10 text-red-500 border-red-500/30"}>{o.status === "pending" ? "Pendiente" : o.status === "approved" ? "Aprobado" : "Rechazado"}</Badge>
                      <div className="text-left"><p className="font-medium text-sm">Pedido #{o.id}</p><p className="text-xs text-zinc-400">{fmt(o.createdAt)} - {o.paymentType}</p></div>
                    </div>
                    <div className="flex items-center gap-4"><span className="font-bold text-yellow-500">{formatPrice(o.totalAmount)}</span></div>
                  </button>
                  {isExp && (
                    <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                      {o.notes && <p className="text-sm text-zinc-400 mb-2 bg-zinc-800/50 p-2 rounded">Notas: {o.notes}</p>}
                      {o.status === "pending" && <div className="flex gap-2"><Button size="sm" onClick={() => appr.mutate({ id: o.id })} className="bg-green-600 hover:bg-green-700">Aprobar</Button><Button size="sm" variant="outline" onClick={() => rej.mutate({ id: o.id })} className="border-red-600 text-red-500">Rechazar</Button></div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* IMPORT */}
        <TabsContent value="import" className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-2">Sincronizacion con Tiendanube</h3>
            <p className="text-zinc-400 text-sm mb-4">Importa todos los productos de tu tienda Tiendanube. Los que no esten en Tiendanube se eliminan.</p>
            <div className="flex gap-3">
              <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="bg-yellow-500 hover:bg-yellow-600 text-black">{sync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Sincronizar</Button>
              <Button onClick={() => test.mutate()} variant="outline" className="border-zinc-700">Probar conexion</Button>
            </div>
            {sync.isSuccess && <p className="text-green-400 text-sm mt-3">{sync.data.imported} productos importados{sync.data.deleted ? `, ${sync.data.deleted} eliminados` : ""}</p>}
            {sync.isError && <p className="text-red-400 text-sm mt-3">Error: {sync.error.message}</p>}
          </div>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4">Configuracion</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["storeName", "whatsappNumber", "tiendanubeApiToken", "tiendanubeStoreId", "webhookUrl"] as const).map(k => (
                <div key={k} className={k === "webhookUrl" ? "md:col-span-2" : ""}>
                  <label className="text-sm text-zinc-400 mb-1 block capitalize">{k === "storeName" ? "Nombre de la tienda" : k === "whatsappNumber" ? "WhatsApp" : k === "tiendanubeApiToken" ? "API Token Tiendanube" : k === "tiendanubeStoreId" ? "Store ID Tiendanube" : "Webhook URL (n8n)"}</label>
                  <Input defaultValue={(settings as any)?.[k] ?? ""} onChange={e => { const el = e.target; el.dataset.value = e.target.value; }} className="bg-zinc-800 border-zinc-700 setting-input" data-key={k} />
                </div>
              ))}
            </div>
            <Button onClick={() => { const vals: Record<string, string> = {}; document.querySelectorAll(".setting-input").forEach(i => { const el = i as HTMLInputElement; if (el.dataset.value) vals[el.dataset.key!] = el.dataset.value; }); upSet.mutate(vals); }} disabled={upSet.isPending} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black">{upSet.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Guardar</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
