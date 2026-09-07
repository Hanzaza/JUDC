import React from 'react';
import { 
  Activity, 
  Database, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  Code, 
  Settings, 
  Camera, 
  Zap, 
  Sliders, 
  MonitorPlay 
} from 'lucide-react';

export const Navbar = ({ 
  currentIntersection, 
  intersections = [], 
  onSelectIntersection, 
  isSupabaseConnected, 
  onOpenSupabaseModal, 
  onOpenSqlModal,
  onTriggerEmergency,
  currentView = 'OPERATIONS',
  onViewChange
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0a0e17]/95 backdrop-blur-md px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3.5">
        
        {/* Left: Brand & View Switcher */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
              <Activity className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="title-font text-lg font-bold tracking-wider text-white">
                  OptiFlow <span className="text-cyan-400">AI</span>
                </h1>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  v2.4
                </span>
              </div>
            </div>
          </div>

          {/* Primary View Switcher Navigation */}
          <nav className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => onViewChange && onViewChange('OPERATIONS')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'OPERATIONS'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>Centro de Control</span>
            </button>

            <button
              onClick={() => onViewChange && onViewChange('ADMIN')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'ADMIN'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Panel de Administración</span>
            </button>
          </nav>
        </div>

        {/* Right: Node Selector, Emergency Injection & Supabase Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Intersection Quick Select */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 shadow-inner">
            <span className="text-[11px] text-slate-400 mr-2 font-medium">Nodo:</span>
            <select
              value={currentIntersection?.id || ''}
              onChange={(e) => {
                const found = intersections.find(i => i.id === e.target.value);
                if (found) onSelectIntersection(found);
              }}
              className="bg-transparent text-xs text-cyan-300 font-semibold focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              {intersections.map((inter) => (
                <option key={inter.id} value={inter.id} className="bg-slate-900 text-slate-200">
                  {inter.code} - {inter.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Emergency Corridor Injection */}
          {currentView === 'OPERATIONS' && (
            <button
              onClick={onTriggerEmergency}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 transition-all duration-150 shadow-md shadow-rose-950/40"
              title="Inyectar ambulancia y activar onda verde de emergencia"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              <span className="hidden sm:inline">Simular</span> Ambulancia
            </button>
          )}

          {/* Database Sync Status Badge */}
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSupabaseConnected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-600/40 text-amber-300 hover:bg-amber-900/40'
            }`}
            title="Haz clic para ver o cambiar la configuración de Supabase"
          >
            <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{isSupabaseConnected ? 'Supabase Live' : 'Almacén Local'}</span>
          </button>

          {/* View SQL DDL Modal Trigger */}
          <button
            onClick={onOpenSqlModal}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
            title="Ver / Copiar Script SQL DDL"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
