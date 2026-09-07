import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Zap, Radio, Bell } from 'lucide-react';

export const LiveIncidentsFeed = ({ incidents = [] }) => {
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getIncidentIcon = (type) => {
    switch (type) {
      case 'EMERGENCY_CORRIDOR':
      case 'EMERGENCY':
        return <Zap className="w-4 h-4 text-rose-400" />;
      case 'GRIDLOCK':
      case 'STALLED_VEHICLE':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="rounded-xl bg-slate-900/80 backdrop-blur-md p-5 border border-slate-800 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="title-font text-base font-bold text-slate-100">
            Bitácora de Eventos & Alertas IA
          </h3>
        </div>
        <span className="text-[11px] hud-font px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
          En Vivo
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[320px] pr-1">
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 hud-font">
            No se han registrado anomalías críticas. Flujo regular.
          </div>
        ) : (
          incidents.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-start gap-3"
            >
              <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                {getIncidentIcon(item.incident_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {item.incident_type === 'EMERGENCY_CORRIDOR' ? 'Corredor Verde Activado' : item.incident_type}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadge(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 hud-font">
                  <span>{new Date(item.detected_at || Date.now()).toLocaleTimeString()}</span>
                  <span className="text-emerald-400/80 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Procesado por IA
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
