/**
 * OptiFlow AI - Traffic Database & Telemetry Service
 * Handles full CRUD operations and telemetry synchronization with Supabase PostgreSQL
 * or high-fidelity persistent local store when offline.
 */

import { getSupabaseClient } from './supabaseClient';

const LOCAL_STORAGE_INTERSECTIONS = 'optiflow_local_intersections';
const LOCAL_STORAGE_INCIDENTS = 'optiflow_local_incidents';

// Default initial intersections
const DEFAULT_INTERSECTIONS = [
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
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    code: 'INT-04',
    name: 'Av. Paulista & Rua da Consolação',
    latitude: -23.558700,
    longitude: -46.660100,
    status: 'ACTIVE',
    control_mode: 'ADAPTIVE_AI',
    current_phase: 'NORTH_SOUTH_GREEN',
    cycle_duration_sec: 90
  }
];

const DEFAULT_INCIDENTS = [
  {
    id: 'inc-1',
    intersection_id: 'a1111111-1111-1111-1111-111111111111',
    incident_type: 'STALLED_VEHICLE',
    severity: 'MEDIUM',
    description: 'Vehículo detenido en carril derecho Norte. Se ajusta tiempo de despeje verde.',
    status: 'RESOLVED',
    detected_at: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  },
  {
    id: 'inc-2',
    intersection_id: 'b2222222-2222-2222-2222-222222222222',
    incident_type: 'GRIDLOCK',
    severity: 'HIGH',
    description: 'Congestión alta en aproximación Este. Prioridad adaptativa elevada.',
    status: 'OPEN',
    detected_at: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  }
];

// Helper to get local data
const getLocalIntersections = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INTERSECTIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local intersections:', e);
  }
  return DEFAULT_INTERSECTIONS;
};

const saveLocalIntersections = (list) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_INTERSECTIONS, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving local intersections:', e);
  }
};

const getLocalIncidents = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INCIDENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local incidents:', e);
  }
  return DEFAULT_INCIDENTS;
};

const saveLocalIncidents = (list) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_INCIDENTS, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving local incidents:', e);
  }
};

let mockMetricsHistory = [];

export const trafficService = {
  // ============================================================================
  // INTERSECTIONS CRUD
  // ============================================================================

  /**
   * Get all intersections
   */
  async getIntersections() {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('intersections')
          .select('*')
          .order('code', { ascending: true });

        if (!error && data && data.length > 0) {
          saveLocalIntersections(data);
          return data;
        }
      } catch (err) {
        console.warn('Fallo consulta a Supabase, usando datos locales:', err);
      }
    }
    return getLocalIntersections();
  },

  /**
   * Create a new intersection
   */
  async createIntersection(payload) {
    const supabase = getSupabaseClient();
    const newRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `int-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'ACTIVE',
      control_mode: 'ADAPTIVE_AI',
      current_phase: 'NORTH_SOUTH_GREEN',
      cycle_duration_sec: 90,
      ...payload
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('intersections')
          .insert([newRecord])
          .select()
          .single();

        if (error) {
          console.error('Error insertando intersección en Supabase:', error);
          throw error;
        }
        if (data) {
          // Update local cache
          const local = getLocalIntersections();
          saveLocalIntersections([data, ...local]);
          return data;
        }
      } catch (err) {
        console.error('Error creando intersección en Supabase:', err);
        throw err;
      }
    }

    // Local fallback
    const local = getLocalIntersections();
    const updated = [newRecord, ...local];
    saveLocalIntersections(updated);
    return newRecord;
  },

  /**
   * Update an existing intersection
   */
  async updateIntersection(id, updates) {
    const supabase = getSupabaseClient();
    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('intersections')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error actualizando intersección en Supabase:', error);
          throw error;
        }
        if (data) {
          const local = getLocalIntersections();
          saveLocalIntersections(local.map(item => (item.id === id ? data : item)));
          return data;
        }
      } catch (err) {
        console.error('Error actualizando intersección en Supabase:', err);
        throw err;
      }
    }

    // Local fallback
    const local = getLocalIntersections();
    const updatedList = local.map(item => (item.id === id ? { ...item, ...payload } : item));
    saveLocalIntersections(updatedList);
    return updatedList.find(i => i.id === id);
  },

  /**
   * Delete an intersection by ID
   */
  async deleteIntersection(id) {
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('intersections')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error eliminando intersección en Supabase:', error);
          throw error;
        }
      } catch (err) {
        console.error('Error eliminando intersección en Supabase:', err);
        throw err;
      }
    }

    // Local fallback
    const local = getLocalIntersections();
    const filtered = local.filter(item => item.id !== id);
    saveLocalIntersections(filtered);
    return true;
  },

  // ============================================================================
  // INCIDENTS CRUD
  // ============================================================================

  /**
   * Fetch all traffic incidents
   */
  async getIncidents() {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('traffic_incidents')
          .select('*')
          .order('detected_at', { ascending: false });

        if (!error && data) {
          saveLocalIncidents(data);
          return data;
        }
      } catch (err) {
        console.warn('Error obteniendo incidentes de Supabase:', err);
      }
    }

    return getLocalIncidents();
  },

  /**
   * Create / Log a new incident
   */
  async createIncident(incidentData) {
    const supabase = getSupabaseClient();
    const newIncident = {
      id: crypto.randomUUID ? crypto.randomUUID() : `inc-${Date.now()}`,
      detected_at: new Date().toISOString(),
      status: 'OPEN',
      severity: 'MEDIUM',
      ...incidentData
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('traffic_incidents')
          .insert([newIncident])
          .select()
          .single();

        if (!error && data) {
          const local = getLocalIncidents();
          saveLocalIncidents([data, ...local]);
          return data;
        }
      } catch (err) {
        console.warn('Error registrando incidente en Supabase:', err);
      }
    }

    // Local fallback
    const local = getLocalIncidents();
    const updated = [newIncident, ...local];
    saveLocalIncidents(updated);
    return newIncident;
  },

  /**
   * Log an incident (alias used by simulator engines)
   */
  async logIncident(incidentData) {
    return this.createIncident(incidentData);
  },

  /**
   * Update an existing incident (status, resolution, notes)
   */
  async updateIncident(id, updates) {
    const supabase = getSupabaseClient();
    const payload = { ...updates };
    if (updates.status === 'RESOLVED' && !updates.resolved_at) {
      payload.resolved_at = new Date().toISOString();
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('traffic_incidents')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const local = getLocalIncidents();
          saveLocalIncidents(local.map(inc => (inc.id === id ? data : inc)));
          return data;
        }
      } catch (err) {
        console.warn('Error actualizando incidente en Supabase:', err);
      }
    }

    const local = getLocalIncidents();
    const updated = local.map(inc => (inc.id === id ? { ...inc, ...payload } : inc));
    saveLocalIncidents(updated);
    return updated.find(inc => inc.id === id);
  },

  /**
   * Delete an incident
   */
  async deleteIncident(id) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('traffic_incidents')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.warn('Error eliminando incidente en Supabase:', err);
      }
    }

    const local = getLocalIncidents();
    saveLocalIncidents(local.filter(inc => inc.id !== id));
    return true;
  },

  // ============================================================================
  // TELEMETRY & METRICS
  // ============================================================================

  /**
   * Record real-time metrics
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

    mockMetricsHistory.push(entry);
    if (mockMetricsHistory.length > 50) {
      mockMetricsHistory.shift();
    }

    return entry;
  },

  /**
   * Fetch recent metrics for a given intersection
   */
  async getRecentMetrics(intersectionId, limit = 25) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('traffic_metrics')
          .select('*')
          .eq('intersection_id', intersectionId)
          .order('recorded_at', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          return data.reverse();
        }
      } catch (err) {
        console.warn('Fallo consulta métricas Supabase:', err);
      }
    }

    return mockMetricsHistory.slice(-limit);
  },

  /**
   * Clear metrics history
   */
  async clearMetricsHistory(intersectionId = null) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('traffic_metrics').delete();
        if (intersectionId) {
          query = query.eq('intersection_id', intersectionId);
        } else {
          query = query.neq('id', '00000000-0000-0000-0000-000000000000');
        }
        await query;
      } catch (e) {
        console.warn('Error clearing Supabase metrics:', e);
      }
    }
    mockMetricsHistory = [];
    return true;
  },

  /**
   * Log an emergency event
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

  // ============================================================================
  // DATABASE DIAGNOSTICS & SEEDING
  // ============================================================================

  /**
   * Comprehensive diagnostic test of Supabase connection & tables
   */
  async testSupabaseConnection() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        isConnected: false,
        message: 'No hay credenciales de Supabase configuradas.',
        latencyMs: null,
        tables: {}
      };
    }

    const startTime = performance.now();
    const tablesToCheck = [
      'intersections',
      'traffic_metrics',
      'vehicle_detections',
      'emergency_events',
      'traffic_incidents',
      'signal_phase_history'
    ];

    const tablesStatus = {};
    let hasAnyError = false;

    try {
      for (const table of tablesToCheck) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (error) {
            tablesStatus[table] = { exists: false, count: 0, error: error.message };
            hasAnyError = true;
          } else {
            tablesStatus[table] = { exists: true, count: count ?? 0, error: null };
          }
        } catch (tableErr) {
          tablesStatus[table] = { exists: false, count: 0, error: tableErr.message };
          hasAnyError = true;
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        isConnected: true,
        latencyMs,
        hasMissingTables: hasAnyError,
        tables: tablesStatus,
        message: hasAnyError
          ? 'Conectado a Supabase, pero faltan algunas tablas. Ejecuta el script SQL en Supabase.'
          : 'Conexión activa y tablas verificadas con éxito en PostgreSQL.'
      };
    } catch (err) {
      return {
        isConnected: false,
        latencyMs: null,
        message: `Error al comunicar con Supabase: ${err.message}`,
        tables: {}
      };
    }
  },

  /**
   * Seed initial sample data directly to Supabase
   */
  async seedInitialDataToSupabase() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase no está conectado.');
    }

    // 1. Seed Intersections
    const { error: interError } = await supabase
      .from('intersections')
      .upsert(DEFAULT_INTERSECTIONS, { onConflict: 'code' });

    if (interError) {
      throw new Error(`Error sembrando intersecciones: ${interError.message}`);
    }

    // 2. Seed Incidents
    const { error: incError } = await supabase
      .from('traffic_incidents')
      .upsert(DEFAULT_INCIDENTS, { onConflict: 'id' });

    if (incError) {
      console.warn('Advertencia sembrando incidentes:', incError.message);
    }

    // 3. Seed Sample Metrics
    const sampleMetrics = [
      {
        intersection_id: 'a1111111-1111-1111-1111-111111111111',
        approach_direction: 'NORTH',
        vehicle_count: 42,
        queue_length_meters: 65.4,
        average_speed_kmh: 28.5,
        average_wait_time_sec: 18.2,
        congestion_index: 0.420,
        level_of_service: 'B',
        co2_emissions_saved_kg: 12.4500,
        green_duration_assigned_sec: 45
      },
      {
        intersection_id: 'a1111111-1111-1111-1111-111111111111',
        approach_direction: 'SOUTH',
        vehicle_count: 38,
        queue_length_meters: 52.0,
        average_speed_kmh: 31.2,
        average_wait_time_sec: 15.6,
        congestion_index: 0.380,
        level_of_service: 'B',
        co2_emissions_saved_kg: 11.2000,
        green_duration_assigned_sec: 45
      }
    ];

    await supabase.from('traffic_metrics').insert(sampleMetrics).catch(() => {});

    return true;
  }
};
