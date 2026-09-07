import React from 'react';
import { Activity, Database, Sparkles, AlertTriangle, ShieldCheck, Code, Settings, Camera, Zap } from 'lucide-react';

export const Navbar = ({ 
  currentIntersection, 
  intersections = [], 
  onSelectIntersection, 
  isSupabaseConnected, 
  onOpenSupabaseModal, 
  onOpenSqlModal,
  onTriggerEmergency
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0a0e17]/90 backdrop-blur-md px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Status */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
            <Activity className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="title-font text-xl font-bold tracking-wider text-white">
                OptiFlow <span className="text-cyan-400">AI</span>
              </h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                v2.4 Smart Vision
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Control Adaptativo de Tráfico & Visión Computacional
            </p>
          </div>
        </div>

        {/* Intersection Selector & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
            <span className="text-xs text-slate-400 mr-2 font-medium">Nodo:</span>
            <select
              value={currentIntersection?.id || ''}
              onChange={(e) => {
                const found = intersections.find(i => i.id === e.target.value);
                if (found) onSelectIntersection(found);
              }}
              className="bg-transparent text-xs text-cyan-300 font-semibold focus:outline-none cursor-pointer"
            >
              {intersections.map((inter) => (
                <option key={inter.id} value={inter.id} className="bg-slate-900 text-slate-200">
                  {inter.code} - {inter.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Emergency Corridor Injection */}
          <button
            onClick={onTriggerEmergency}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 transition-all duration-150 shadow-lg shadow-rose-950/50"
            title="Inyectar ambulancia y activar onda verde de emergencia"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
            <span>Simular Ambulancia</span>
          </button>

          {/* Database Sync Status Badge */}
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSupabaseConnected
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{isSupabaseConnected ? 'PostgreSQL (Supabase Live)' : 'Almacén Local (Mock)'}</span>
          </button>

          {/* View SQL DDL Modal Trigger */}
          <button
            onClick={onOpenSqlModal}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
            title="Ver / Copiar Script SQL de PostgreSQL"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
