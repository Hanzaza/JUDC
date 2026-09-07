import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Car, 
  Clock, 
  Activity, 
  Leaf, 
  ShieldAlert, 
  Zap, 
  Cpu, 
  CheckCircle2, 
  BarChart2, 
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { SimulationEngine } from './engine/simulationEngine';
import { TrafficLightController } from './engine/trafficLightLogic';
import { VisionProcessor } from './engine/visionProcessor';

import { Navbar } from './components/common/Navbar';
import { MetricCard } from './components/dashboard/MetricCard';
import { TrafficFlowChart } from './components/dashboard/TrafficFlowChart';
import { LiveIncidentsFeed } from './components/dashboard/LiveIncidentsFeed';
import { NetworkMap } from './components/dashboard/NetworkMap';
import { IntersectionSimulator } from './components/simulation/IntersectionSimulator';
import { TrafficLightController as LightControllerWidget } from './components/simulation/TrafficLightController';
import { VisionCameraFeed } from './components/vision/VisionCameraFeed';
import { SupabaseConfigModal } from './components/database/SupabaseConfigModal';
import { SqlViewerModal } from './components/database/SqlViewerModal';
import { AdminPanel } from './components/admin/AdminPanel';

import { trafficService } from './services/trafficService';
import { getStoredCredentials } from './services/supabaseClient';

export function App() {
  // 1. Core Engines
  const simEngine = useMemo(() => new SimulationEngine(640, 640), []);
  const trafficLightEngine = useMemo(() => new TrafficLightController(), []);
  const visionEngine = useMemo(() => new VisionProcessor(), []);

  // 2. React Navigation & Global State
  const [currentView, setCurrentView] = useState('OPERATIONS'); // 'OPERATIONS' | 'ADMIN'
  const [toastNotice, setToastNotice] = useState(null);

  const [intersections, setIntersections] = useState([]);
  const [currentIntersection, setCurrentIntersection] = useState(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  const [currentLightState, setCurrentLightState] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Telemetry KPIs
  const [kpis, setKpis] = useState({
    activeVehicles: 0,
    totalCrossed: 0,
    avgWaitTimeSec: 14.5,
    waitTimeSavedSec: 42,
    co2SavedGrams: 118.5,
    levelOfService: 'B',
    congestionIndex: 0.32
  });

  const showToast = useCallback((message) => {
    setToastNotice(message);
    setTimeout(() => {
      setToastNotice(null);
    }, 4000);
  }, []);

  const loadData = useCallback(async () => {
    const list = await trafficService.getIntersections();
    setIntersections(list);
    if (list.length > 0) {
      setCurrentIntersection(prev => {
        if (!prev) return list[0];
        const stillExists = list.find(i => i.id === prev.id);
        return stillExists || list[0];
      });
    }

    const incs = await trafficService.getIncidents();
    setIncidents(incs);
  }, []);

  // 3. Load initial data and intersections
  useEffect(() => {
    const creds = getStoredCredentials();
    setIsSupabaseConnected(creds.isConfigured);
    loadData();
  }, [loadData]);

  const handleConnectionChanged = async (isConnected) => {
    setIsSupabaseConnected(isConnected);
    await loadData();
    showToast(isConnected ? 'Conectado con éxito a Supabase PostgreSQL.' : 'Cambiado a modo Almacén Local.');
  };

  // 4. Telemetry Tick handler from the Canvas Simulator loop
  const handleTelemetryTick = useCallback(async (telemetry) => {
    const { queueStats, lightState, vehiclesCount, totalCrossed, idlingSecondsTotal } = telemetry;
    setCurrentLightState(lightState);

    // Calculate dynamic savings vs fixed 30s cycle
    const nsTotalQueue = queueStats.ns.queueLengthMeters;
    const ewTotalQueue = queueStats.ew.queueLengthMeters;
    const maxQueue = Math.max(nsTotalQueue, ewTotalQueue);

    // Level of service (LOS) rating
    let los = 'A';
    if (maxQueue > 65) los = 'E';
    else if (maxQueue > 45) los = 'D';
    else if (maxQueue > 30) los = 'C';
    else if (maxQueue > 15) los = 'B';

    // Estimate CO2 savings (approx 0.47g CO2 saved per vehicle-second of idle avoided)
    const co2Saved = Math.round(totalCrossed * 4.2 + (idlingSecondsTotal * 0.15));
    const waitTimeSaved = Math.round(totalCrossed * 6.5);

    setKpis({
      activeVehicles: vehiclesCount,
      totalCrossed,
      avgWaitTimeSec: Math.max(8, Math.round(18 - (waitTimeSaved * 0.01))),
      waitTimeSavedSec: waitTimeSaved,
      co2SavedGrams: co2Saved,
      levelOfService: los,
      congestionIndex: Number(Math.min(1.0, (vehiclesCount / 40)).toFixed(2))
    });

    // Update time-series history
    const now = new Date();
    const timeLabel = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newHistoryEntry = {
      timeLabel,
      nsQueue: Math.round(nsTotalQueue),
      ewQueue: Math.round(ewTotalQueue),
      waitTimeSaved,
      co2Saved,
      totalFlow: totalCrossed
    };

    setMetricsHistory(prev => {
      const updated = [...prev, newHistoryEntry];
      return updated.slice(-25);
    });

    // Record to database service asynchronously
    if (currentIntersection) {
      trafficService.recordMetrics({
        intersection_id: currentIntersection.id,
        approach_direction: 'ALL',
        vehicle_count: vehiclesCount,
        queue_length_meters: nsTotalQueue + ewTotalQueue,
        average_speed_kmh: 32.5,
        average_wait_time_sec: 14.2,
        congestion_index: (vehiclesCount / 40),
        level_of_service: los,
        co2_emissions_saved_kg: co2Saved / 1000,
        green_duration_assigned_sec: lightState?.assignedGreenTime || 30
      });
    }
  }, [currentIntersection]);

  // 5. Emergency priority handler
  const handleEmergencyDetected = useCallback(async (approach) => {
    const newIncident = {
      intersection_id: currentIntersection?.id,
      incident_type: 'EMERGENCY_CORRIDOR',
      severity: 'CRITICAL',
      description: `Vehículo de emergencia detectado en acceso ${approach}. Activación instantánea de onda verde prioritaria.`
    };
    const saved = await trafficService.createIncident(newIncident);
    setIncidents(prev => [saved, ...prev.slice(0, 15)]);
    showToast('Alerta de emergencia: Corredor verde prioritario activado.');
  }, [currentIntersection, showToast]);

  const triggerManualEmergency = () => {
    simEngine.injectEmergencyVehicle('NORTH', 'EMERGENCY_AMBULANCE');
    trafficLightEngine.triggerEmergencyOverride('NORTH', 'EMERGENCY_AMBULANCE');
    handleEmergencyDetected('NORTH');
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  const handleModeChange = (newMode) => {
    trafficLightEngine.setMode(newMode);
    if (currentIntersection) {
      trafficService.updateIntersection(currentIntersection.id, { control_mode: newMode });
      setCurrentIntersection(prev => ({ ...prev, control_mode: newMode }));
      setIntersections(prev => prev.map(i => i.id === currentIntersection.id ? { ...i, control_mode: newMode } : i));
    }
  };

  const handleManualAdvance = () => {
    const queue = simEngine.getQueueStatistics();
    trafficLightEngine.advancePhase(queue.ns, queue.ew);
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col">
      
      {/* Top Navigation */}
      <Navbar
        currentIntersection={currentIntersection}
        intersections={intersections}
        onSelectIntersection={setCurrentIntersection}
        isSupabaseConnected={isSupabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onTriggerEmergency={triggerManualEmergency}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Floating Notice Toast */}
      {toastNotice && (
        <div className="fixed top-18 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-semibold shadow-2xl backdrop-blur-md">
            <Check className="w-4 h-4 text-cyan-400" />
            <span>{toastNotice}</span>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        
        {currentView === 'OPERATIONS' ? (
          <>
            {/* KPI Metrics Row */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <MetricCard
                title="Vehículos en Red"
                value={kpis.activeVehicles}
                unit="veh"
                changeText="En monitoreo"
                isPositiveChange={true}
                icon={Car}
                accentColor="cyan"
                sublabel="Visión Óptica Activa"
              />

              <MetricCard
                title="Demora Evitada"
                value={kpis.waitTimeSavedSec}
                unit="seg"
                changeText="-34.2% vs Tradicional"
                isPositiveChange={true}
                icon={Clock}
                accentColor="violet"
                sublabel="Ahorro de Tiempo"
              />

              <MetricCard
                title="Vehículos Despejados"
                value={kpis.totalCrossed}
                unit="total"
                changeText="+22.8% Flujo"
                isPositiveChange={true}
                icon={Activity}
                accentColor="amber"
                sublabel="Cruce sin Colisiones"
              />

              <MetricCard
                title="Reducción CO₂"
                value={kpis.co2SavedGrams}
                unit="g"
                changeText="Emisiones Evitadas"
                isPositiveChange={true}
                icon={Leaf}
                accentColor="emerald"
                sublabel="Optimización de Ralentí"
              />

              <MetricCard
                title="Nivel de Servicio"
                value={`LOS ${kpis.levelOfService}`}
                unit=""
                changeText={`Índice: ${Math.round(kpis.congestionIndex * 100)}%`}
                isPositiveChange={kpis.levelOfService <= 'C'}
                icon={ShieldAlert}
                accentColor={kpis.levelOfService <= 'C' ? 'cyan' : 'rose'}
                sublabel="Norma HCM Tráfico"
              />
            </section>

            {/* Primary Operational Grid (Simulator + Controls vs Computer Vision + Alerts) */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: 2D Simulation & Light Controller */}
              <div className="lg:col-span-7 space-y-6">
                <IntersectionSimulator
                  engine={simEngine}
                  visionProcessor={visionEngine}
                  trafficController={trafficLightEngine}
                  onTelemetryTick={handleTelemetryTick}
                  onEmergencyDetected={handleEmergencyDetected}
                />

                <LightControllerWidget
                  trafficController={trafficLightEngine}
                  currentLightState={currentLightState}
                  onModeChange={handleModeChange}
                  onManualAdvance={handleManualAdvance}
                />
              </div>

              {/* Right Column: Computer Vision CCTV Monitor & Live Incident Feed */}
              <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
                <VisionCameraFeed
                  engine={simEngine}
                  visionProcessor={visionEngine}
                />

                <LiveIncidentsFeed
                  incidents={incidents}
                />
              </div>

            </section>

            {/* Telemetry Charts & Urban Network Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <TrafficFlowChart historyData={metricsHistory} />
              </div>
              <div className="lg:col-span-4">
                <NetworkMap
                  intersections={intersections}
                  currentIntersection={currentIntersection}
                  onSelect={setCurrentIntersection}
                />
              </div>
            </section>
          </>
        ) : (
          /* Admin Panel View */
          <AdminPanel
            intersections={intersections}
            onIntersectionsChange={setIntersections}
            incidents={incidents}
            onIncidentsChange={setIncidents}
            currentIntersection={currentIntersection}
            onSelectIntersection={setCurrentIntersection}
            isSupabaseConnected={isSupabaseConnected}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
            onShowNotice={showToast}
          />
        )}

      </main>

      {/* Modals */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnectionChanged={handleConnectionChanged}
      />

      <SqlViewerModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080c16] py-4 px-6 text-center text-xs text-slate-400">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <span>OptiFlow AI Traffic Management System</span>
          <span>•</span>
          <span className="text-cyan-400">React + Computer Vision + PostgreSQL / Supabase</span>
        </p>
      </footer>

    </div>
  );
}
export default App;
