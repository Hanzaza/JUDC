/**
 * OptiFlow AI - Traffic Database & Telemetry Service
 * Handles data synchronization with Supabase PostgreSQL or high-fidelity local store.
 */

import { getSupabaseClient } from './supabaseClient';

// Fallback in-memory / local storage mock data
const LOCAL_INTERSECTIONS = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    code: 'INT-01',
    name: 'Av. 9 de Julio & Corrientes (Nodo Central)',
    latitude: -34.603722,
    longitude: -58.381592,
    status: 'ACTIVE',
    control_mode: 'ADAPTIVE_AI',
    current_phase: 'NORTH_SOUTH_GREEN',
    cycle_duration_sec: 85
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    code: 'INT-02',
    name: 'Paseo de la Reforma & Insurgentes',
    latitude: 19.427024,
    longitude: -99.167665,
    status: 'ACTIVE',
    control_mode: 'ADAPTIVE_AI',
    current_phase: 'EAST_WEST_GREEN',
    cycle_duration_sec: 95
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    code: 'INT-03',
    name: 'Gran Vía & Calle Alcalá (Eje Tecnológico)',
    latitude: 40.419200,
    longitude: -3.693400,
    status: 'WARNING',
    control_mode: 'FIXED_TIME',
    current_phase: 'NORTH_SOUTH_GREEN',
    cycle_duration_sec: 70
  }
];

let mockMetricsHistory = [];
let mockIncidents = [
  {
    id: 'inc-1',
    intersection_id: 'a1111111-1111-1111-1111-111111111111',
    incident_type: 'STALLED_VEHICLE',
    severity: 'MEDIUM',
    description: 'Vehículo detenido en carril derecho Norte. Se ajusta tiempo de despeje verde.',
    status: 'RESOLVED',
    detected_at: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  }
];

export const trafficService = {
  /**
   * Get list of all monitored intersections
   */
  async getIntersections() {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('intersections').select('*').order('code');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Fallo consulta a Supabase, usando datos locales:', err);
      }
    }
    return LOCAL_INTERSECTIONS;
  },

  /**
   * Save a real-time traffic metric snapshot to PostgreSQL / Supabase
   */
  async recordMetrics(metricPayload) {
    const supabase = getSupabaseClient();
    const entry = {
      ...metricPayload,
      recorded_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('traffic_metrics').insert([entry]);
      } catch (err) {
        console.warn('Error guardando métricas en Supabase:', err);
      }
    }

    // Keep last 40 entries in memory for live charts
    mockMetricsHistory.push(entry);
    if (mockMetricsHistory.length > 40) {
      mockMetricsHistory.shift();
    }

    return entry;
  },

  /**
   * Fetch recent metrics for charts
   */
  async getRecentMetrics(intersectionId, limit = 20) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('traffic_metrics')
          .select('*')
          .eq('intersection_id', intersectionId)
          .order('recorded_at', { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data.reverse();
        }
      } catch (err) {
        console.warn('Fallo consulta métricas Supabase:', err);
      }
    }

    return mockMetricsHistory.slice(-limit);
  },

  /**
   * Log an emergency priority event
   */
  async logEmergencyEvent(eventData) {
    const supabase = getSupabaseClient();
    const entry = {
      ...eventData,
      triggered_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('emergency_events').insert([entry]);
      } catch (err) {
        console.warn('Error guardando evento de emergencia en Supabase:', err);
      }
    }

    return entry;
  },

  /**
   * Log an incident
   */
  async logIncident(incidentData) {
    const supabase = getSupabaseClient();
    const entry = {
      ...incidentData,
      id: `inc-${Date.now()}`,
      detected_at: new Date().toISOString(),
      status: 'OPEN'
    };

    if (supabase) {
      try {
        await supabase.from('traffic_incidents').insert([entry]);
      } catch (err) {
        console.warn('Error registrando incidente en Supabase:', err);
      }
    }

    mockIncidents.unshift(entry);
    if (mockIncidents.length > 20) mockIncidents.pop();

    return entry;
  },

  /**
   * Fetch live incidents list
   */
  async getIncidents() {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('traffic_incidents')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(10);

        if (!error && data) return data;
      } catch (err) {
        console.warn('Error obteniendo incidentes de Supabase:', err);
      }
    }

    return mockIncidents;
  }
};
