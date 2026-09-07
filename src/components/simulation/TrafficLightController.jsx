import React from 'react';
import { Cpu, Clock, HandMetal, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export const TrafficLightController = ({ 
  trafficController, 
  currentLightState, 
  onModeChange,
  onManualAdvance
}) => {
  const mode = trafficController?.mode || 'ADAPTIVE_AI';
  const phase = currentLightState?.phase || 'NS_GREEN';
  const timeLeft = currentLightState?.timeLeft ?? 15;
  const isEmergency = currentLightState?.isEmergency;

  const getPhaseName = () => {
    if (isEmergency) return '🚨 CORREDOR DE EMERGENCIA PRIORITARIO';
    switch (phase) {
      case 'NS_GREEN': return 'FASE 1: VERDE ACCESO NORTE - SUR';
      case 'NS_YELLOW': return 'PRECAUCIÓN: ÁMBAR NORTE - SUR';
      case 'ALL_RED_1': return 'DESPEJE TOTAL DE SEGURIDAD (TODO ROJO)';
      case 'EW_GREEN': return 'FASE 2: VERDE ACCESO ESTE - OESTE';
      case 'EW_YELLOW': return 'PRECAUCIÓN: ÁMBAR ESTE - OESTE';
      case 'ALL_RED_2': return 'DESPEJE TOTAL DE SEGURIDAD (TODO ROJO)';
      default: return 'CICLO ACTIVO';
    }
  };

  const lights = currentLightState?.lights || { north: 'RED', south: 'RED', east: 'RED', west: 'RED' };

  const renderLightBulb = (color, state) => {
    const isLit = state === color;
    let bgClass = 'bg-slate-900 border-slate-700';
    let glowClass = '';

    if (isLit) {
      if (color === 'RED') {
        bgClass = 'bg-rose-500 border-rose-400';
        glowClass = 'shadow-lg shadow-rose-500/80';
      } else if (color === 'YELLOW') {
        bgClass = 'bg-amber-500 border-amber-400';
        glowClass = 'shadow-lg shadow-amber-500/80';
      } else if (color === 'GREEN') {
        bgClass = 'bg-emerald-500 border-emerald-400';
        glowClass = 'shadow-lg shadow-emerald-500/80';
      }
    }

    return (
      <div className={`w-3.5 h-3.5 rounded-full border ${bgClass} ${glowClass} transition-all duration-150`} />
    );
  };

  const renderApproachStatus = (label, state) => {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-black/60 border border-slate-800">
          {renderLightBulb('RED', state)}
          {renderLightBulb('YELLOW', state)}
          {renderLightBulb('GREEN', state)}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-slate-900/90 backdrop-blur-md p-5 border border-slate-800 shadow-xl flex flex-col gap-4">
      
      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="title-font text-base font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Controlador de Fases Semafóricas
          </h3>
          <p className="text-xs text-slate-400">
            Algoritmo inteligente de optimización de tiempos en tiempo real
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          <button
            onClick={() => onModeChange('ADAPTIVE_AI')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'ADAPTIVE_AI'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>IA Adaptativa</span>
          </button>
          <button
            onClick={() => onModeChange('FIXED_TIME')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'FIXED_TIME'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tiempo Fijo</span>
          </button>
        </div>
      </div>

      {/* Active Phase Banner & Countdown Clock */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        isEmergency 
          ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/40 animate-pulse'
          : 'bg-slate-950/80 border-cyan-500/30 shadow-inner'
      }`}>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 hud-font block">
            ESTADO DE FASE ACTUAL
          </span>
          <h4 className="text-sm font-bold text-slate-100 mt-0.5">
            {getPhaseName()}
          </h4>
          <span className="text-xs text-slate-400 mt-1 block">
            {mode === 'ADAPTIVE_AI' 
              ? '⚡ Ajustado por densidad óptica vehicular' 
              : '⏱️ Intervalo predeterminado de 30s'}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 shadow-md">
          <span className="title-font text-2xl font-black text-cyan-300 hud-font leading-none">
            {timeLeft}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-1">
            Segundos
          </span>
        </div>
      </div>

      {/* Grid of 4 Approach States */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {renderApproachStatus('Norte (N)', lights.north)}
        {renderApproachStatus('Sur (S)', lights.south)}
        {renderApproachStatus('Este (E)', lights.east)}
        {renderApproachStatus('Oeste (O)', lights.west)}
      </div>

      {/* Efficiency Comparison Footer */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            {mode === 'ADAPTIVE_AI' 
              ? 'Eficiencia vial estimada: +38.4% de reducción en colas' 
              : 'Modo Convencional (Sin optimización activa)'}
          </span>
        </div>

        <button
          onClick={onManualAdvance}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <span>Forzar Cambio de Fase</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

    </div>
  );
};
