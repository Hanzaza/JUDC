import React, { useState } from 'react';
import { Code, X, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

const SQL_SCRIPT = `-- ==============================================================================
-- SISTEMA DE ANÁLISIS DE TRÁFICO INTELIGENTE Y VISIÓN ARTIFICIAL (OptiFlow AI)
-- Esquema DDL para PostgreSQL / Supabase
-- ==============================================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: Intersecciones Viales (Semáforos y Nodos de la Ciudad)
CREATE TABLE IF NOT EXISTS intersections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'WARNING', 'MAINTENANCE', 'OFFLINE')),
    control_mode VARCHAR(20) DEFAULT 'ADAPTIVE_AI' CHECK (control_mode IN ('ADAPTIVE_AI', 'FIXED_TIME', 'MANUAL_OVERRIDE', 'EMERGENCY_CORRIDOR')),
    current_phase VARCHAR(50) DEFAULT 'NORTH_SOUTH_GREEN',
    cycle_duration_sec INT DEFAULT 90,
    adaptive_weight_factor DECIMAL(4, 2) DEFAULT 1.25,
    camera_stream_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: Métricas de Tráfico en Tiempo Real (Telemetría Agregada)
CREATE TABLE IF NOT EXISTS traffic_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intersection_id UUID REFERENCES intersections(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approach_direction VARCHAR(10) NOT NULL CHECK (approach_direction IN ('NORTH', 'SOUTH', 'EAST', 'WEST', 'ALL')),
    vehicle_count INT NOT NULL DEFAULT 0,
    queue_length_meters DECIMAL(6, 2) NOT NULL DEFAULT 0.0,
    average_speed_kmh DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    average_wait_time_sec DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    congestion_index DECIMAL(4, 3) NOT NULL DEFAULT 0.000,
    level_of_service VARCHAR(2) DEFAULT 'B' CHECK (level_of_service IN ('A', 'B', 'C', 'D', 'E', 'F')),
    co2_emissions_saved_kg DECIMAL(8, 4) DEFAULT 0.0000,
    green_duration_assigned_sec INT DEFAULT 30
);

-- 4. TABLA: Detecciones de Visión Artificial (Logs por Vehículo)
CREATE TABLE IF NOT EXISTS vehicle_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intersection_id UUID REFERENCES intersections(id) ON DELETE CASCADE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vehicle_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(4, 3) NOT NULL,
    lane_number INT DEFAULT 1,
    approach_direction VARCHAR(10) NOT NULL,
    estimated_speed_kmh DECIMAL(5, 2) DEFAULT 0.0,
    is_emergency BOOLEAN DEFAULT FALSE,
    bounding_box JSONB
);

-- 5. TABLA: Eventos de Prioridad de Emergencia (Corredor Verde)
CREATE TABLE IF NOT EXISTS emergency_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intersection_id UUID REFERENCES intersections(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    vehicle_type VARCHAR(50) NOT NULL,
    approach_direction VARCHAR(10) NOT NULL,
    priority_level VARCHAR(20) DEFAULT 'CRITICAL',
    action_taken VARCHAR(100) DEFAULT 'INSTANT_GREEN_CORRIDOR',
    response_time_ms INT DEFAULT 240
);

-- 6. TABLA: Registro de Incidentes y Anomalías
CREATE TABLE IF NOT EXISTS traffic_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intersection_id UUID REFERENCES intersections(id) ON DELETE CASCADE,
    incident_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Políticas RLS y Permisos de Acceso Público
ALTER TABLE intersections ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_incidents ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS idempotentes con permisos CRUD completos
DROP POLICY IF EXISTS "Permitir todo en intersections" ON intersections;
CREATE POLICY "Permitir todo en intersections" ON intersections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo en traffic_metrics" ON traffic_metrics;
CREATE POLICY "Permitir todo en traffic_metrics" ON traffic_metrics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo en vehicle_detections" ON vehicle_detections;
CREATE POLICY "Permitir todo en vehicle_detections" ON vehicle_detections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo en emergency_events" ON emergency_events;
CREATE POLICY "Permitir todo en emergency_events" ON emergency_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo en traffic_incidents" ON traffic_incidents;
CREATE POLICY "Permitir todo en traffic_incidents" ON traffic_incidents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo en signal_phase_history" ON signal_phase_history;
CREATE POLICY "Permitir todo en signal_phase_history" ON signal_phase_history FOR ALL USING (true) WITH CHECK (true);

-- 8. Datos iniciales (Seed Data)
INSERT INTO intersections (id, code, name, latitude, longitude, status, control_mode, current_phase, cycle_duration_sec)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'INT-01', 'Av. 9 de Julio & Corrientes (Nodo Central)', -34.603722, -58.381592, 'ACTIVE', 'ADAPTIVE_AI', 'NORTH_SOUTH_GREEN', 85),
    ('b2222222-2222-2222-2222-222222222222', 'INT-02', 'Paseo de la Reforma & Insurgentes', 19.427024, -99.167665, 'ACTIVE', 'ADAPTIVE_AI', 'EAST_WEST_GREEN', 95),
    ('c3333333-3333-3333-3333-333333333333', 'INT-03', 'Gran Vía & Calle Alcalá (Eje Tecnológico)', 40.419200, -3.693400, 'WARNING', 'FIXED_TIME', 'NORTH_SOUTH_GREEN', 70),
    ('d4444444-4444-4444-4444-444444444444', 'INT-04', 'Av. Paulista & Rua da Consolação', -23.558700, -46.660100, 'ACTIVE', 'ADAPTIVE_AI', 'NORTH_SOUTH_GREEN', 90)
ON CONFLICT (code) DO NOTHING;
`;

export const SqlViewerModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="title-font text-lg font-bold text-white">
                Script DDL PostgreSQL / Supabase
              </h3>
              <p className="text-xs text-slate-400">
                Pega este script en el <strong>SQL Editor</strong> de tu proyecto Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Code Content Box */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-[11px] text-cyan-300/90 leading-relaxed shadow-inner">
          <pre>{SQL_SCRIPT}</pre>
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            Incluye tablas, índices de alto rendimiento y políticas RLS
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Script Copiado!' : 'Copiar Script SQL'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
