import React, { useState, useEffect } from 'react';
import { 
  Network, 
  ShieldAlert, 
  Database, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle, 
  Sliders, 
  MapPin, 
  Zap, 
  Activity, 
  Code, 
  Check, 
  ExternalLink,
  Cpu,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { IntersectionModal } from './IntersectionModal';
import { IncidentModal } from './IncidentModal';
import { trafficService } from '../../services/trafficService';
import { getStoredCredentials } from '../../services/supabaseClient';

export const AdminPanel = ({ 
  intersections, 
  onIntersectionsChange, 
  incidents, 
  onIncidentsChange,
  currentIntersection,
  onSelectIntersection,
  isSupabaseConnected,
  onOpenSupabaseModal,
  onOpenSqlModal,
  onShowNotice
}) => {
  const [activeTab, setActiveTab] = useState('intersections'); // 'intersections' | 'incidents' | 'database'

  // Modals state
  const [isInterModalOpen, setIsInterModalOpen] = useState(false);
  const [editingIntersection, setEditingIntersection] = useState(null);
  
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);

  // Search and Filters
  const [interSearch, setInterSearch] = useState('');
  const [interStatusFilter, setInterStatusFilter] = useState('ALL');

  const [incSearch, setIncSearch] = useState('');
  const [incStatusFilter, setIncStatusFilter] = useState('ALL');

  // Supabase Diagnostics
  const [diagResult, setDiagResult] = useState(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearingMetrics, setIsClearingMetrics] = useState(false);

  // Run diagnostics when entering database tab
  useEffect(() => {
    if (activeTab === 'database') {
      runDiagnostics();
    }
  }, [activeTab]);

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const res = await trafficService.testSupabaseConnection();
      setDiagResult(res);
    } catch (err) {
      setDiagResult({ isConnected: false, message: err.message, tables: {} });
    } finally {
      setIsDiagnosing(false);
    }
  };

  // ============================================================================
  // INTERSECTIONS CRUD HANDLERS
  // ============================================================================
  const handleSaveIntersection = async (formData) => {
    if (editingIntersection) {
      // Update
      const updated = await trafficService.updateIntersection(editingIntersection.id, formData);
      onIntersectionsChange(intersections.map(i => i.id === editingIntersection.id ? updated : i));
      if (currentIntersection?.id === editingIntersection.id) {
        onSelectIntersection(updated);
      }
      onShowNotice && onShowNotice(`Nodo ${updated.code} actualizado con éxito.`);
    } else {
      // Create
      const created = await trafficService.createIntersection(formData);
      onIntersectionsChange([created, ...intersections]);
      onShowNotice && onShowNotice(`Nuevo nodo ${created.code} registrado correctamente.`);
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    }
  };

  const handleDeleteIntersection = async (id, code) => {
    if (window.confirm(`¿Estás seguro de eliminar el nodo semafórico ${code}? Esta acción es permanente.`)) {
      try {
        await trafficService.deleteIntersection(id);
        const filtered = intersections.filter(i => i.id !== id);
        onIntersectionsChange(filtered);
        if (currentIntersection?.id === id && filtered.length > 0) {
          onSelectIntersection(filtered[0]);
        }
        onShowNotice && onShowNotice(`Intersección ${code} eliminada.`);
      } catch (err) {
        alert(`Error al eliminar: ${err.message}`);
      }
    }
  };

  const handleToggleMode = async (inter) => {
    const newMode = inter.control_mode === 'ADAPTIVE_AI' ? 'FIXED_TIME' : 'ADAPTIVE_AI';
    const updated = await trafficService.updateIntersection(inter.id, { control_mode: newMode });
    onIntersectionsChange(intersections.map(i => i.id === inter.id ? updated : i));
    if (currentIntersection?.id === inter.id) {
      onSelectIntersection(updated);
    }
    onShowNotice && onShowNotice(`Modo de ${inter.code} cambiado a ${newMode}.`);
  };

  // ============================================================================
  // INCIDENTS CRUD HANDLERS
  // ============================================================================
  const handleSaveIncident = async (formData) => {
    if (editingIncident) {
      const updated = await trafficService.updateIncident(editingIncident.id, formData);
      onIncidentsChange(incidents.map(inc => inc.id === editingIncident.id ? updated : inc));
      onShowNotice && onShowNotice('Incidente actualizado.');
    } else {
      const created = await trafficService.createIncident(formData);
      onIncidentsChange([created, ...incidents]);
      onShowNotice && onShowNotice('Nuevo incidente reportado.');
    }
  };

  const handleResolveIncident = async (incident) => {
    const updated = await trafficService.updateIncident(incident.id, {
      status: 'RESOLVED',
      resolved_at: new Date().toISOString()
    });
    onIncidentsChange(incidents.map(inc => inc.id === incident.id ? updated : inc));
    onShowNotice && onShowNotice(`Incidente marcado como Resuelto.`);
  };

  const handleDeleteIncident = async (id) => {
    if (window.confirm('¿Deseas eliminar este registro de incidente?')) {
      await trafficService.deleteIncident(id);
      onIncidentsChange(incidents.filter(inc => inc.id !== id));
      onShowNotice && onShowNotice('Incidente eliminado.');
    }
  };

  // ============================================================================
  // SEED & CLEAR ACTIONS
  // ============================================================================
  const handleSeedDatabase = async () => {
    if (!isSupabaseConnected) {
      alert('Conéctate primero a Supabase antes de sembrar los datos.');
      onOpenSupabaseModal();
      return;
    }

    setIsSeeding(true);
    try {
      await trafficService.seedInitialDataToSupabase();
      const freshIntersections = await trafficService.getIntersections();
      const freshIncidents = await trafficService.getIncidents();
      onIntersectionsChange(freshIntersections);
      onIncidentsChange(freshIncidents);
      if (freshIntersections.length > 0) onSelectIntersection(freshIntersections[0]);
      await runDiagnostics();
      onShowNotice && onShowNotice('¡Base de datos sembrada con éxito en Supabase!');
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
    } catch (err) {
      alert(`Fallo al sembrar datos: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearMetrics = async () => {
    if (window.confirm('¿Eliminar historial de métricas de telemetría acumuladas?')) {
      setIsClearingMetrics(true);
      try {
        await trafficService.clearMetricsHistory();
        await runDiagnostics();
        onShowNotice && onShowNotice('Historial de métricas depurado.');
      } catch (err) {
        alert(`Error al limpiar métricas: ${err.message}`);
      } finally {
        setIsClearingMetrics(false);
      }
    }
  };

  // Filtering
  const filteredIntersections = intersections.filter(inter => {
    const matchesSearch = inter.code.toLowerCase().includes(interSearch.toLowerCase()) ||
                          inter.name.toLowerCase().includes(interSearch.toLowerCase());
    const matchesStatus = interStatusFilter === 'ALL' || inter.status === interStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = (inc.description || '').toLowerCase().includes(incSearch.toLowerCase()) ||
                          (inc.incident_type || '').toLowerCase().includes(incSearch.toLowerCase());
    const matchesStatus = incStatusFilter === 'ALL' || inc.status === incStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const creds = getStoredCredentials();

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick KPI Summary */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0c1524] border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Sliders className="w-5 h-5" />
              </div>
              <h2 className="title-font text-2xl font-bold text-white tracking-wide">
                Panel de Administración Vial
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Gestión CRUD de semáforos, auditoría de incidentes y sincronización directa con PostgreSQL / Supabase
            </p>
          </div>

          {/* Quick Metrics Badge Counters */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total Nodos</span>
              <span className="text-base font-bold text-cyan-400 font-mono">{intersections.length}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Incidentes Abiertos</span>
              <span className="text-base font-bold text-rose-400 font-mono">
                {incidents.filter(i => i.status === 'OPEN').length}
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Motor Base Datos</span>
              <span className={`text-xs font-semibold flex items-center gap-1.5 mt-0.5 ${
                isSupabaseConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                {isSupabaseConnected ? 'Supabase Live' : 'Local Mock'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('intersections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'intersections'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Nodos & Semáforos ({intersections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'incidents'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Incidentes & Alertas ({incidents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'database'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Estado Supabase & Herramientas</span>
          </button>
        </div>

        {/* Action Button depending on active tab */}
        {activeTab === 'intersections' && (
          <button
            onClick={() => {
              setEditingIntersection(null);
              setIsInterModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Intersección</span>
          </button>
        )}

        {activeTab === 'incidents' && (
          <button
            onClick={() => {
              setEditingIncident(null);
              setIsIncidentModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-orange-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Reportar Incidente</span>
          </button>
        )}
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: INTERSECTIONS CRUD */}
      {/* ======================================================================= */}
      {activeTab === 'intersections' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={interSearch}
                onChange={(e) => setInterSearch(e.target.value)}
                placeholder="Buscar por código o nombre..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-400">Filtrar Estado:</span>
              <select
                value={interStatusFilter}
                onChange={(e) => setInterStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">ACTIVO</option>
                <option value="WARNING">ADVERTENCIA</option>
                <option value="MAINTENANCE">MANTENIMIENTO</option>
                <option value="OFFLINE">FUERA DE LÍNEA</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Nombre / Arteria</th>
                    <th className="py-3 px-4">Coordenadas</th>
                    <th className="py-3 px-4">Modo de Control</th>
                    <th className="py-3 px-4">Ciclo</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredIntersections.map((inter) => {
                    const isSelected = currentIntersection?.id === inter.id;
                    return (
                      <tr 
                        key={inter.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        {/* Code */}
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                          <div className="flex items-center gap-2">
                            <span>{inter.code}</span>
                            {isSelected && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                En Simulador
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                          {inter.name}
                        </td>

                        {/* Coordinates */}
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {inter.latitude?.toFixed(4)}, {inter.longitude?.toFixed(4)}
                          </span>
                        </td>

                        {/* Mode */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleMode(inter)}
                            title="Haz clic para alternar entre Inteligente y Fijo"
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                              inter.control_mode === 'ADAPTIVE_AI'
                                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <Cpu className="w-3 h-3" />
                            <span>{inter.control_mode === 'ADAPTIVE_AI' ? 'Adaptativo (IA)' : 'Tiempo Fijo'}</span>
                          </button>
                        </td>

                        {/* Cycle Duration */}
                        <td className="py-3.5 px-4 text-slate-300 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400/80" />
                            {inter.cycle_duration_sec || 90}s
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            inter.status === 'ACTIVE'
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : inter.status === 'WARNING'
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              inter.status === 'ACTIVE' ? 'bg-emerald-400' : inter.status === 'WARNING' ? 'bg-amber-400' : 'bg-rose-400'
                            }`} />
                            {inter.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onSelectIntersection(inter)}
                              title="Cargar en el simulador 2D"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            >
                              <Activity className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingIntersection(inter);
                                setIsInterModalOpen(true);
                              }}
                              title="Editar intersección"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteIntersection(inter.id, inter.code)}
                              title="Eliminar intersección"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredIntersections.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No se encontraron intersecciones con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: INCIDENTS CRUD */}
      {/* ======================================================================= */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={incSearch}
                onChange={(e) => setIncSearch(e.target.value)}
                placeholder="Buscar en descripción o tipo..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-400">Estado:</span>
              <select
                value={incStatusFilter}
                onChange={(e) => setIncStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="OPEN">ABIERTO</option>
                <option value="INVESTIGATING">EN CURSO</option>
                <option value="RESOLVED">RESUELTO</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Severidad</th>
                    <th className="py-3 px-4">Descripción / Acciones</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredIncidents.map((inc) => {
                    const formattedDate = inc.detected_at 
                      ? new Date(inc.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Reciente';

                    return (
                      <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {formattedDate}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {inc.incident_type}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                              : inc.severity === 'HIGH'
                              ? 'bg-orange-950/60 border-orange-500/40 text-orange-300'
                              : inc.severity === 'MEDIUM'
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                              : 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                          }`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-md">
                          {inc.description}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            inc.status === 'RESOLVED'
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : inc.status === 'INVESTIGATING'
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          }`}>
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inc.status !== 'RESOLVED' && (
                              <button
                                onClick={() => handleResolveIncident(inc)}
                                title="Marcar como Resuelto"
                                className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 transition-colors text-[10px] font-semibold flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Resolver</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingIncident(inc);
                                setIsIncidentModalOpen(true);
                              }}
                              title="Editar incidente"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteIncident(inc.id)}
                              title="Eliminar incidente"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredIncidents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No hay incidentes reportados con este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: SUPABASE DIAGNOSTICS & TOOLS */}
      {/* ======================================================================= */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          
          {/* Status Diagnostic Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl border ${
                  isSupabaseConnected 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="title-font text-lg font-bold text-white flex items-center gap-2">
                    <span>Estado del Backend Supabase / PostgreSQL</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      isSupabaseConnected 
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    }`}>
                      {isSupabaseConnected ? 'Conectado a la Nube' : 'Modo Almacén Local'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-md">
                    {creds.url ? `URL: ${creds.url}` : 'Sin URL configurada (usando localStorage mock)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={runDiagnostics}
                  disabled={isDiagnosing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Probar Conexión</span>
                </button>
                <button
                  onClick={onOpenSupabaseModal}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600/30 transition-colors"
                >
                  Credenciales
                </button>
              </div>
            </div>

            {/* Diagnostics feedback message */}
            {diagResult && (
              <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                diagResult.isConnected && !diagResult.hasMissingTables
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <Activity className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-white flex items-center justify-between">
                    <span>{diagResult.message}</span>
                    {diagResult.latencyMs && (
                      <span className="font-mono text-cyan-400">Latencia: {diagResult.latencyMs} ms</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tables Checklist */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Verificación de Tablas en Supabase
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: 'intersections', label: 'Intersecciones & Semáforos' },
                  { name: 'traffic_metrics', label: 'Telemetría de Tráfico' },
                  { name: 'vehicle_detections', label: 'Detecciones Visión YOLO' },
                  { name: 'emergency_events', label: 'Eventos de Emergencia' },
                  { name: 'traffic_incidents', label: 'Bitácora de Incidentes' },
                  { name: 'signal_phase_history', label: 'Historial de Fases' }
                ].map((t) => {
                  const status = diagResult?.tables?.[t.name];
                  const exists = status?.exists;
                  const count = status?.count ?? 0;

                  return (
                    <div 
                      key={t.name}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-cyan-300">{t.name}</div>
                        <div className="text-[10px] text-slate-400">{t.label}</div>
                      </div>
                      <div className="text-right">
                        {isSupabaseConnected ? (
                          exists ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                              <span className="font-mono">{count} filas</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                              <AlertTriangle className="w-3 h-3" />
                              <span>No detectada</span>
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Modo Local</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Database Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSeedDatabase}
                disabled={isSeeding}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-all disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${isSeeding ? 'animate-bounce' : ''}`} />
                <span>{isSeeding ? 'Sembrando datos...' : 'Sembrar Datos Iniciales en Supabase'}</span>
              </button>

              <button
                onClick={onOpenSqlModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 border border-slate-700 text-cyan-300 hover:bg-slate-700 transition-colors"
              >
                <Code className="w-4 h-4" />
                <span>Ver / Copiar Script SQL DDL</span>
              </button>

              <button
                onClick={handleClearMetrics}
                disabled={isClearingMetrics}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600/10 text-rose-300 border border-rose-500/30 hover:bg-rose-600/20 transition-colors ml-auto disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isClearingMetrics ? 'Depurando...' : 'Limpiar Logs de Telemetría'}</span>
              </button>
            </div>

          </div>

          {/* Quick Guide Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-5 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Instrucciones para configurar Supabase por primera vez:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
              <li>Crea un proyecto en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">supabase.com</a>.</li>
              <li>Abre el <strong>SQL Editor</strong> en tu panel de Supabase.</li>
              <li>Haz clic en el botón <strong>"Ver / Copiar Script SQL DDL"</strong> de arriba y ejecuta el código en Supabase.</li>
              <li>Ve a <strong>Project Settings → API</strong> en Supabase y copia la <code>Project URL</code> y la <code>anon public key</code>.</li>
              <li>Pégalas en <strong>Credenciales</strong> (o en un archivo <code>.env</code>) y ¡todo el sistema se sincronizará automáticamente!</li>
            </ol>
          </div>

        </div>
      )}

      {/* Modals */}
      <IntersectionModal
        isOpen={isInterModalOpen}
        onClose={() => setIsInterModalOpen(false)}
        onSave={handleSaveIntersection}
        intersection={editingIntersection}
      />

      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        onSave={handleSaveIncident}
        incident={editingIncident}
        intersections={intersections}
      />

    </div>
  );
};
