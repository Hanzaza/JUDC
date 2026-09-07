-- ==============================================================================
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
    congestion_index DECIMAL(4, 3) NOT NULL DEFAULT 0.000, -- Escala 0.000 a 1.000
    level_of_service VARCHAR(2) DEFAULT 'B' CHECK (level_of_service IN ('A', 'B', 'C', 'D', 'E', 'F')),
    co2_emissions_saved_kg DECIMAL(8, 4) DEFAULT 0.0000,
    green_duration_assigned_sec INT DEFAULT 30
);

-- 4. TABLA: Detecciones de Visión Artificial (Logs por Vehículo)
CREATE TABLE IF NOT EXISTS vehicle_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intersection_id UUID REFERENCES intersections(id) ON DELETE CASCADE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('CAR', 'BUS', 'TRUCK', 'MOTORCYCLE', 'BICYCLE', 'PEDESTRIAN', 'EMERGENCY_AMBULANCE', 'EMERGENCY_POLICE', 'EMERGENCY_FIRE')),
    confidence DECIMAL(4, 3) NOT NULL, -- e.g. 0.942 (94.2%)
    lane_number INT DEFAULT 1,
    approach_direction VARCHAR(10) NOT NULL,
    estimated_speed_kmh DECIMAL(5, 2) DEFAULT 0.0,
    is_emergency BOOLEAN DEFAULT FALSE,
    bounding_box JSONB -- Almacena { x, y, width, height }
);

-- 5. TABLA: Eventos de Prioridad de Emergencia (Corredor Verde)
CREATE TABLE IF NOT EXISTS emergency_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intersection_id UUID REFERENCES intersections(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    vehicle_type VARCHAR(50) NOT NULL,
    approach_direction VARCHAR(10) NOT NULL,
    priority_level VARCHAR(20) DEFAULT 'CRITICAL' CHECK (priority_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    action_taken VARCHAR(100) DEFAULT 'INSTANT_GREEN_CORRIDOR',
    response_time_ms INT DEFAULT 240
);

-- 6. TABLA: Registro de Incidentes y Anomalías
CREATE TABLE IF NOT EXISTS traffic_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intersection_id UUID REFERENCES intersections(id) ON DELETE CASCADE,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('STALLED_VEHICLE', 'GRIDLOCK', 'ACCIDENT', 'CAMERA_OCCLUSION', 'PEDESTRIAN_HAZARD')),
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 7. TABLA: Historial de Cambios de Fase Semafórica
CREATE TABLE IF NOT EXISTS signal_phase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intersection_id UUID REFERENCES intersections(id) ON DELETE CASCADE,
    phase_name VARCHAR(50) NOT NULL,
    duration_assigned_sec INT NOT NULL,
    reason VARCHAR(100) DEFAULT 'ADAPTIVE_QUEUE_OPTIMIZATION',
    switched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_traffic_metrics_intersection_time ON traffic_metrics(intersection_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_detections_intersection_time ON vehicle_detections(intersection_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON traffic_incidents(status);
CREATE INDEX IF NOT EXISTS idx_emergency_triggered ON emergency_events(triggered_at DESC);

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS - ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE intersections ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_phase_history ENABLE ROW LEVEL SECURITY;

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

-- ==============================================================================
-- DATOS INICIALES DE PRUEBA (SEED DATA)
-- ==============================================================================
INSERT INTO intersections (id, code, name, latitude, longitude, status, control_mode, current_phase, cycle_duration_sec)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'INT-01', 'Av. 9 de Julio & Corrientes (Nodo Central)', -34.603722, -58.381592, 'ACTIVE', 'ADAPTIVE_AI', 'NORTH_SOUTH_GREEN', 85),
    ('b2222222-2222-2222-2222-222222222222', 'INT-02', 'Paseo de la Reforma & Insurgentes', 19.427024, -99.167665, 'ACTIVE', 'ADAPTIVE_AI', 'EAST_WEST_GREEN', 95),
    ('c3333333-3333-3333-3333-333333333333', 'INT-03', 'Gran Vía & Calle Alcalá (Eje Tecnológico)', 40.419200, -3.693400, 'WARNING', 'FIXED_TIME', 'NORTH_SOUTH_GREEN', 70),
    ('d4444444-4444-4444-4444-444444444444', 'INT-04', 'Av. Paulista & Rua da Consolação', -23.558700, -46.660100, 'ACTIVE', 'ADAPTIVE_AI', 'NORTH_SOUTH_GREEN', 90)
ON CONFLICT (code) DO NOTHING;

-- Métricas de ejemplo iniciales
INSERT INTO traffic_metrics (intersection_id, approach_direction, vehicle_count, queue_length_meters, average_speed_kmh, average_wait_time_sec, congestion_index, level_of_service, co2_emissions_saved_kg, green_duration_assigned_sec)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'NORTH', 42, 65.4, 28.5, 18.2, 0.420, 'B', 12.4500, 45),
    ('a1111111-1111-1111-1111-111111111111', 'SOUTH', 38, 52.0, 31.2, 15.6, 0.380, 'B', 11.2000, 45),
    ('a1111111-1111-1111-1111-111111111111', 'EAST', 24, 34.2, 36.8, 12.1, 0.250, 'A', 8.6500, 30),
    ('a1111111-1111-1111-1111-111111111111', 'WEST', 29, 41.0, 34.0, 14.5, 0.310, 'B', 9.8000, 30)
ON CONFLICT DO NOTHING;
