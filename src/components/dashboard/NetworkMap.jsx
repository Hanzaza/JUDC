import React from 'react';
import { MapPin, Navigation, Signal, Radio } from 'lucide-react';

export const NetworkMap = ({ intersections = [], currentIntersection, onSelect }) => {
  return (
    <div className="rounded-xl bg-slate-900/80 backdrop-blur-md p-5 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <h3 className="title-font text-base font-bold text-slate-100">
            Red de Semáforos Inteligentes (Malla Urbana)
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {intersections.length} nodos interconectados
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {intersections.map((inter) => {
          const isSelected = inter.id === currentIntersection?.id;
          return (
            <div
              key={inter.id}
              onClick={() => onSelect(inter)}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="hud-font text-xs font-bold text-cyan-400">
                  {inter.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${inter.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{inter.status}</span>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                {inter.name}
              </h4>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 hud-font">
                <span>Modo: {inter.control_mode === 'ADAPTIVE_AI' ? 'IA' : 'Fijo'}</span>
                <span>Ciclo: {inter.cycle_duration_sec}s</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
