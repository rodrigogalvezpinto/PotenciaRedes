/**
 * Panel de Administración Comercial y Operaciones - PulsoRed Chile
 * Incluye:
 * 1. Autenticación segura con sesión y token.
 * 2. Dashboard con métricas reales.
 * 3. Gestión y conciliación de transferencias Tenpo manuales (con control de unicidad de movimiento).
 * 4. Registro de compras manuales en proveedor (SMM PWR) con ID externo y costos.
 * 5. CRUD completo de catálogo de servicios (campos comerciales y privados de proveedor).
 * 6. Configuración comercial y bitácora de auditoría inmutable.
 */
import React, { useState, useEffect } from 'react';
import { Service, Order, AuditLog } from '../types.js';
import {
  ShieldCheck,
  Package,
  Layers,
  Settings,
  History,
  CheckCircle,
  Building2,
  DollarSign,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Send,
  LogOut,
  X,
  Search
} from 'lucide-react';

interface AdminPanelProps {
  onOpenDevModal: (title: string, message: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onOpenDevModal }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pulsorad_admin_token'));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'services' | 'config' | 'audit'>('dashboard');

  // Credenciales de login
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState<boolean>(false);

  // Datos del dashboard
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemConfig, setSystemConfig] = useState<any[]>([]);

  // Filtros de órdenes
  const [orderFilterPayment, setOrderFilterPayment] = useState<string>('');
  const [orderFilterDelivery, setOrderFilterDelivery] = useState<string>('');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // Modales operativos
  const [verifyTransferModal, setVerifyTransferModal] = useState<Order | null>(null);
  const [dispatchRecordModal, setDispatchRecordModal] = useState<Order | null>(null);
  const [statusChangeModal, setStatusChangeModal] = useState<Order | null>(null);
  const [serviceModal, setServiceModal] = useState<{ mode: 'create' | 'edit'; service?: any } | null>(null);

  // Formularios de modales
  const [verifyAmount, setVerifyAmount] = useState<number>(0);
  const [bankMovementId, setBankMovementId] = useState<string>('');
  const [verifyNotes, setVerifyNotes] = useState<string>('');

  const [externalOrderId, setExternalOrderId] = useState<string>('');
  const [dispatchCost, setDispatchCost] = useState<number>(0);
  const [dispatchNotes, setDispatchNotes] = useState<string>('');

  const [newDeliveryStatus, setNewDeliveryStatus] = useState<string>('COMPLETED');
  const [statusReason, setStatusReason] = useState<string>('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Cargar datos según tab activo
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoadingLogin(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales inválidas.');

      setToken(data.token);
      localStorage.setItem('pulsorad_admin_token', data.token);
      setLoadingLogin(false);
    } catch (err: any) {
      setLoginError(err.message || 'Error al iniciar sesión.');
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    fetch('/api/admin/logout', { method: 'POST', headers: authHeaders }).catch(() => {});
    setToken(null);
    localStorage.removeItem('pulsorad_admin_token');
  };

  const loadDashboard = () => {
    fetch('/api/admin/dashboard', { headers: authHeaders })
      .then((r) => r.json())
      .then(setDashboardData)
      .catch(console.error);
  };

  const loadOrders = () => {
    const params = new URLSearchParams();
    if (orderFilterPayment) params.append('paymentStatus', orderFilterPayment);
    if (orderFilterDelivery) params.append('deliveryStatus', orderFilterDelivery);
    if (orderSearch) params.append('search', orderSearch);

    fetch(`/api/admin/orders?${params.toString()}`, { headers: authHeaders })
      .then((r) => r.json())
      .then(setOrders)
      .catch(console.error);
  };

  const loadServices = () => {
    fetch('/api/admin/services', { headers: authHeaders })
      .then((r) => r.json())
      .then(setServices)
      .catch(console.error);
  };

  const loadConfig = () => {
    fetch('/api/admin/system-config', { headers: authHeaders })
      .then((r) => r.json())
      .then(setSystemConfig)
      .catch(console.error);
  };

  const loadAudit = () => {
    fetch('/api/admin/audit-logs', { headers: authHeaders })
      .then((r) => r.json())
      .then(setAuditLogs)
      .catch(console.error);
  };

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'services') loadServices();
    if (activeTab === 'config') loadConfig();
    if (activeTab === 'audit') loadAudit();
  }, [token, activeTab]);

  // Si no está autenticado, renderizar Login
  if (!token) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-800 text-left text-white relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-600 via-purple-500 to-orange-500 shadow-md">
            <img
              src="/assets/aistudio/PotenciaRedes__Crecimiento_Social_Neo_n_3e17a135.png"
              alt="Logo"
              className="w-full h-full object-cover rounded-full bg-black"
            />
          </div>
          <div>
            <h2 className="text-xl font-black">Acceso Administrativo</h2>
            <span className="text-[11px] text-orange-400 font-bold uppercase tracking-wider">PotenciaRedes Chile</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Panel de operaciones, verificación de transferencias Tenpo y bitácora auditable.
        </p>

        {loginError && (
          <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 mb-4">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña inicial: PulsoRedAdmin2026!"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-fuchsia-500 focus:outline-none font-mono"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Predeterminada: <code>PulsoRedAdmin2026!</code>
            </span>
          </div>

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-orange-500 hover:from-fuchsia-500 hover:to-orange-400 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-orange-500/20 cursor-pointer"
          >
            {loadingLogin ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    );
  }

  // Ejecución de verificación de transferencia Tenpo
  const submitVerifyTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyTransferModal) return;
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/orders/${verifyTransferModal.id}/verify-transfer`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          verifiedAmount: verifyAmount,
          bankMovementId,
          adminNotes: verifyNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al verificar transferencia.');

      setActionSuccess('Transferencia conciliada y verificada exitosamente.');
      setVerifyTransferModal(null);
      loadOrders();
      loadDashboard();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Ejecución de registro de despacho en proveedor
  const submitDispatchRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchRecordModal) return;
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/orders/${dispatchRecordModal.id}/dispatch-record`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          providerName: 'SMM_PWR',
          externalOrderId,
          costAmount: dispatchCost,
          costCurrency: 'USD',
          notes: dispatchNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar despacho.');

      setActionSuccess('Despacho en proveedor registrado.');
      setDispatchRecordModal(null);
      loadOrders();
      loadDashboard();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Eliminación o archivado de servicio
  const handleDeleteService = async (id: string) => {
    if (!confirm('¿Confirma eliminar o archivar este servicio?')) return;
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message);
      loadServices();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left">
      {/* Barra Superior Admin con Fondo Neón */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-fuchsia-950/30 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-600 via-purple-500 to-orange-500 shadow-md shrink-0">
            <img
              src="/assets/aistudio/PotenciaRedes__Crecimiento_Social_Neo_n_3e17a135.png"
              alt="Logo"
              className="w-full h-full object-cover rounded-full bg-black"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Módulo Administrativo y de Operaciones</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">Auditoría OWASP Nivel 2</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">
              Panel de Operaciones PotenciaRedes Chile
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-blue-200 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            Operador: <strong>admin</strong>
          </span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Alertas Globales de Acción */}
      {actionSuccess && (
        <div className="my-4 p-3.5 bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="my-4 p-3.5 bg-red-50 border border-red-200 text-xs font-bold text-red-900 rounded-xl flex items-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Pestañas de Navegación del Panel */}
      <div className="flex flex-wrap gap-2 my-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/20'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Dashboard y Métricas</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/20'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Gestión de Pedidos</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'services'
              ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/20'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Catálogo y Precios</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/20'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Configuración Comercial</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/20'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Registro de Auditoría</span>
        </button>
      </div>

      {/* 1. DASHBOARD CON TARJETAS DE COLOR */}
      {activeTab === 'dashboard' && dashboardData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-white to-blue-50/60 p-5 rounded-2xl border border-blue-200/80 shadow-2xs">
              <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">Total Pedidos</span>
              <div className="text-2xl font-extrabold text-blue-950 mt-1 font-mono">
                {dashboardData.metrics.totalOrders}
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-amber-50/70 p-5 rounded-2xl border border-amber-200/80 shadow-2xs">
              <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">Transferencias Pendientes</span>
              <div className="text-2xl font-extrabold text-amber-950 mt-1 font-mono">
                {dashboardData.metrics.pendingTransfers}
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-indigo-50/60 p-5 rounded-2xl border border-indigo-200/80 shadow-2xs">
              <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider">Cola de Despacho</span>
              <div className="text-2xl font-extrabold text-indigo-950 mt-1 font-mono">
                {dashboardData.metrics.readyForDispatch}
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-emerald-50/70 p-5 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Recaudación Neta Confirmada</span>
              <div className="text-2xl font-extrabold text-emerald-950 mt-1 font-mono">
                {formatCLP(dashboardData.metrics.totalRevenueCLP)}
              </div>
            </div>
          </div>

          {/* Últimos Pedidos */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Pedidos Recientes en el Sistema</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Referencia</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Servicio</th>
                    <th className="py-2.5 px-3">Monto</th>
                    <th className="py-2.5 px-3">Medio</th>
                    <th className="py-2.5 px-3">Pago</th>
                    <th className="py-2.5 px-3">Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData.recentOrders?.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ord.reference}</td>
                      <td className="py-2.5 px-3">{ord.customer_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{ord.service_title}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{formatCLP(ord.final_price)}</td>
                      <td className="py-2.5 px-3">{ord.payment_method === 'TENPO_TRANSFER' ? 'Tenpo' : 'Webpay'}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">{ord.payment_status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">{ord.delivery_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. GESTIÓN DE PEDIDOS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Buscar por referencia, email o nombre..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <select
              value={orderFilterPayment}
              onChange={(e) => setOrderFilterPayment(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="">Todos los Estados de Pago</option>
              <option value="PENDING">Pendiente</option>
              <option value="REPORTED">Informado (Tenpo)</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="REJECTED">Rechazado</option>
            </select>

            <select
              value={orderFilterDelivery}
              onChange={(e) => setOrderFilterDelivery(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="">Todos los Estados de Entrega</option>
              <option value="UNSENT">No enviada</option>
              <option value="READY_FOR_DISPATCH">Listo para despacho</option>
              <option value="DISPATCHED_TO_PROVIDER">Despachado a proveedor</option>
              <option value="COMPLETED">Completado</option>
              <option value="INCIDENT">Incidencia</option>
            </select>

            <button
              onClick={loadOrders}
              className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
            >
              Filtrar
            </button>
          </div>

          {/* Tabla de Pedidos */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">Referencia</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Cliente / Destino</th>
                    <th className="py-3 px-3">Servicio / Cantidad</th>
                    <th className="py-3 px-3">Monto CLP</th>
                    <th className="py-3 px-3">Estado Pago</th>
                    <th className="py-3 px-3">Estado Entrega</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No hay pedidos registrados con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{ord.reference}</td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(ord.created_at).toLocaleDateString('es-CL')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{ord.customer_name}</span>
                          <span className="text-slate-500 truncate block max-w-[140px]">{ord.customer_email}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 block">{ord.service_title}</span>
                          <span className="font-mono text-slate-500">{ord.quantity.toLocaleString('es-CL')} unidades</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">{formatCLP(ord.final_price)}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                              ord.payment_status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.payment_status === 'REPORTED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700">{ord.delivery_status}</span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          {/* Botón verificar transferencia */}
                          {ord.payment_status !== 'CONFIRMED' && ord.payment_method === 'TENPO_TRANSFER' && (
                            <button
                              onClick={() => {
                                setVerifyTransferModal(ord);
                                setVerifyAmount(ord.final_price);
                                setBankMovementId('');
                                setVerifyNotes('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                            >
                              Verificar Tenpo
                            </button>
                          )}

                          {/* Botón registrar despacho en proveedor */}
                          {ord.payment_status === 'CONFIRMED' && (
                            <button
                              onClick={() => {
                                setDispatchRecordModal(ord);
                                setExternalOrderId('');
                                setDispatchCost(0);
                                setDispatchNotes('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                            >
                              Registrar SMM
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CATÁLOGO Y PRECIOS (CRUD) */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Catálogo de Servicios</h2>
              <p className="text-xs text-slate-500">
                Administración de precios en CLP, límites mínimos/máximos y parámetros de proveedor.
              </p>
            </div>
            <button
              onClick={() =>
                setServiceModal({
                  mode: 'create',
                  service: {
                    title: '',
                    platform: 'instagram',
                    category: 'followers',
                    description: '',
                    price_per_1000: 4990,
                    min_quantity: 100,
                    max_quantity: 10000,
                    url_pattern: '^https?:\\/\\/(www\\.)?instagram\\.com\\/[A-Za-z0-9_.]+\\/?$',
                    url_placeholder: 'https://instagram.com/usuario',
                    delivery_time_hours: 4,
                    delivery_conditions: 'Perfil público obligatorio durante todo el proceso.',
                    refill_days: 30,
                    refill_conditions: 'Reposición manual ante caídas >10%.',
                    cancellation_conditions: 'Cancelable antes de procesar.',
                    provider_name: 'SMM_PWR',
                    provider_service_id: '101',
                    provider_cost_usd: 1.0,
                    status: 'PUBLISHED'
                  }
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Servicio</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">Servicio</th>
                    <th className="py-3 px-3">Plataforma</th>
                    <th className="py-3 px-3">Precio Público / 1.000</th>
                    <th className="py-3 px-3">Límites (Mín - Máx)</th>
                    <th className="py-3 px-3">Proveedor / ID Ext</th>
                    <th className="py-3 px-3">Costo USD</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{s.title}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{s.id}</span>
                      </td>
                      <td className="py-3 px-3 capitalize">{s.platform}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {formatCLP(s.price_per_1000)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {s.min_quantity.toLocaleString('es-CL')} - {s.max_quantity.toLocaleString('es-CL')}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {s.provider_name || 'SMM_PWR'} (ID: {s.provider_service_id || '0'})
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        ${s.provider_cost_usd?.toFixed(2) || '0.00'} USD
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            s.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'PAUSED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => setServiceModal({ mode: 'edit', service: s })}
                          className="p-1 text-slate-600 hover:text-slate-900 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(s.id)}
                          className="p-1 text-red-600 hover:text-red-900 transition-colors"
                          title="Eliminar o Archivar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIGURACIÓN COMERCIAL */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configuración Comercial y Bloqueos de Seguridad</h2>
            <p className="text-xs text-slate-500">
              Parámetros de cuentas bancarias receptoras, WhatsApp de soporte y estado de integraciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemConfig.map((cfg) => (
              <div key={cfg.key} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <span className="font-mono font-bold text-slate-700 block">{cfg.key}</span>
                <span className="text-slate-500 block text-[11px]">{cfg.description}</span>
                <div className="font-mono bg-white p-2 rounded border border-slate-200 text-slate-900 break-all">
                  {cfg.value}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
            <span className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Bloqueo de Seguridad Operacional Activo
            </span>
            <p className="leading-relaxed">
              La compra automática en SMM PWR (<code>SMM_PWR_AUTOMATION_ENABLED</code>) se encuentra deliberadamente deshabilitada en el código backend. Cada orden pagada debe ser despachada y registrada manualmente por un operador autorizado para evitar pérdidas por timeouts o inconsistencias del proveedor.
            </p>
          </div>
        </div>
      )}

      {/* 5. AUDITORÍA */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Bitácora de Auditoría Inmutable</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Fecha UTC</th>
                  <th className="py-2.5 px-3">Operador</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Entidad</th>
                  <th className="py-2.5 px-3">Motivo / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString('es-CL')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{log.admin_user}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">{log.action}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {log.entity_type}:{log.entity_id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{log.reason || 'Acción de sistema'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: VERIFICAR TRANSFERENCIA TENPO */}
      {verifyTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-left">
            <div className="px-6 py-4 bg-emerald-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold">Verificar Transferencia Bancaria Tenpo</h3>
              <button onClick={() => setVerifyTransferModal(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitVerifyTransfer} className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block">Pedido:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {verifyTransferModal.reference} ({verifyTransferModal.customer_name})
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Monto Verificado Recibido en Cuenta Tenpo (CLP)
                </label>
                <input
                  type="number"
                  value={verifyAmount}
                  onChange={(e) => setVerifyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ID de Movimiento Bancario Tenpo (Restricción ÚNICA)
                </label>
                <input
                  type="text"
                  value={bankMovementId}
                  onChange={(e) => setBankMovementId(e.target.value)}
                  placeholder="Ej. TENPO-TX-984210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  El sistema bloquea la reutilización de un mismo ID de movimiento para pedidos distintos.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Observaciones del Operador</label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Comentarios de auditoría..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVerifyTransferModal(null)}
                  className="px-4 py-2 bg-slate-100 rounded text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white rounded font-bold hover:bg-emerald-900"
                >
                  Aprobar y Marcar Pagado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR DESPACHO EN SMM PWR */}
      {dispatchRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-left">
            <div className="px-6 py-4 bg-blue-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold">Registrar Compra Manual en SMM PWR</h3>
              <button onClick={() => setDispatchRecordModal(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitDispatchRecord} className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block">Destino a comprar:</span>
                <span className="font-mono text-slate-900 break-all block">
                  {dispatchRecordModal.destination_url}
                </span>
                <span className="text-slate-500 font-mono">
                  Cantidad: {dispatchRecordModal.quantity.toLocaleString('es-CL')} unidades
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ID de Orden Externo entregado por SMM PWR
                </label>
                <input
                  type="text"
                  value={externalOrderId}
                  onChange={(e) => setExternalOrderId(e.target.value)}
                  placeholder="Ej. 1892831"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Costo en Proveedor (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={dispatchCost}
                  onChange={(e) => setDispatchCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notas del Operador</label>
                <textarea
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Detalles del despacho manual..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDispatchRecordModal(null)}
                  className="px-4 py-2 bg-slate-100 rounded text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-800 text-white rounded font-bold hover:bg-blue-900"
                >
                  Guardar Registro de Despacho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRUD DE SERVICIO (CREAR / EDITAR) */}
      {serviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-left my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold">
                {serviceModal.mode === 'create' ? 'Crear Nuevo Servicio en Catálogo' : 'Editar Servicio Existente'}
              </h3>
              <button onClick={() => setServiceModal(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionError(null);
                const s = serviceModal.service;
                const url = serviceModal.mode === 'create' ? '/api/admin/services' : `/api/admin/services/${s.id}`;
                const method = serviceModal.mode === 'create' ? 'POST' : 'PUT';

                try {
                  const res = await fetch(url, {
                    method,
                    headers: authHeaders,
                    body: JSON.stringify(s)
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);

                  setActionSuccess(data.message);
                  setServiceModal(null);
                  loadServices();
                  setTimeout(() => setActionSuccess(null), 3000);
                } catch (err: any) {
                  setActionError(err.message);
                }
              }}
              className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    value={serviceModal.service.title}
                    onChange={(e) =>
                      setServiceModal({
                        ...serviceModal,
                        service: { ...serviceModal.service, title: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Plataforma</label>
                  <select
                    value={serviceModal.service.platform}
                    onChange={(e) =>
                      setServiceModal({
                        ...serviceModal,
                        service: { ...serviceModal.service, platform: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X / Twitter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Descripción Clara</label>
                <textarea
                  value={serviceModal.service.description}
                  onChange={(e) =>
                    setServiceModal({
                      ...serviceModal,
                      service: { ...serviceModal.service, description: e.target.value }
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Precio Público / 1.000 (CLP)</label>
                  <input
                    type="number"
                    value={serviceModal.service.price_per_1000}
                    onChange={(e) =>
                      setServiceModal({
                        ...serviceModal,
                        service: { ...serviceModal.service, price_per_1000: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Cantidad Mínima</label>
                  <input
                    type="number"
                    value={serviceModal.service.min_quantity}
                    onChange={(e) =>
                      setServiceModal({
                        ...serviceModal,
                        service: { ...serviceModal.service, min_quantity: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Cantidad Máxima</label>
                  <input
                    type="number"
                    value={serviceModal.service.max_quantity}
                    onChange={(e) =>
                      setServiceModal({
                        ...serviceModal,
                        service: { ...serviceModal.service, max_quantity: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    required
                  />
                </div>
              </div>

              {/* Parámetros de Proveedor (Solo Administrativos) */}
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Parámetros Privados de Proveedor (Ocultos para clientes)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Proveedor</label>
                    <input
                      type="text"
                      value={serviceModal.service.provider_name || 'SMM_PWR'}
                      onChange={(e) =>
                        setServiceModal({
                          ...serviceModal,
                          service: { ...serviceModal.service, provider_name: e.target.value }
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">ID Externo</label>
                    <input
                      type="text"
                      value={serviceModal.service.provider_service_id || '0'}
                      onChange={(e) =>
                        setServiceModal({
                          ...serviceModal,
                          service: { ...serviceModal.service, provider_service_id: e.target.value }
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Costo Proveedor (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={serviceModal.service.provider_cost_usd || 0}
                      onChange={(e) =>
                        setServiceModal({
                          ...serviceModal,
                          service: { ...serviceModal.service, provider_cost_usd: Number(e.target.value) }
                        })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Estado de Publicación</label>
                <select
                  value={serviceModal.service.status}
                  onChange={(e) =>
                    setServiceModal({
                      ...serviceModal,
                      service: { ...serviceModal.service, status: e.target.value }
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded"
                >
                  <option value="PUBLISHED">Publicado (Visible en tienda)</option>
                  <option value="PAUSED">Pausado (No acepta nuevos pedidos)</option>
                  <option value="ARCHIVED">Archivado (Oculto)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setServiceModal(null)}
                  className="px-4 py-2 bg-slate-100 rounded text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800"
                >
                  Guardar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
