import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Zap, 
  Eye, 
  CloudRain, 
  Sun, 
  Moon, 
  Sliders, 
  Gauge, 
  ShieldAlert,
  Car
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const IntersectionSimulator = ({ 
  engine, 
  visionProcessor, 
  trafficController,
  onTelemetryTick,
  onEmergencyDetected
}) => {
  const canvasRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [trafficDensity, setTrafficDensity] = useState('NORMAL'); // 'LOW' | 'NORMAL' | 'HIGH'
  const [viewMode, setViewMode] = useState('AR_VISION'); // 'PHYSICAL' | 'AR_VISION'
  const [weather, setWeather] = useState('CLEAR');
  const [liveStats, setLiveStats] = useState({ totalActive: 0, nsCount: 0, ewCount: 0 });

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let lastTime = performance.now();
    let tickCounter = 0;

    const loop = (currentTime) => {
      const deltaSec = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // 1. Get queue statistics from engine
      const queueStats = engine.getQueueStatistics();

      // 2. Tick Traffic Light State Machine
      const lightState = trafficController.tick(
        deltaSec, 
        { count: queueStats.ns.count, queueLengthMeters: queueStats.ns.queueLengthMeters },
        { count: queueStats.ew.count, queueLengthMeters: queueStats.ew.queueLengthMeters }
      );

      // Check if emergency vehicle was automatically detected by vision
      if (queueStats.ns.hasEmergency && !lightState.isEmergency) {
        trafficController.triggerEmergencyOverride('NORTH', 'EMERGENCY_AMBULANCE');
        onEmergencyDetected && onEmergencyDetected('NORTH');
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
      } else if (queueStats.ew.hasEmergency && !lightState.isEmergency) {
        trafficController.triggerEmergencyOverride('EAST', 'EMERGENCY_AMBULANCE');
        onEmergencyDetected && onEmergencyDetected('EAST');
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
      }

      // 3. Update physics in simulation engine
      engine.setLights(lightState.lights);
      engine.update(deltaSec);

      // 4. Render Physical Ground and Cars
      engine.render(ctx);

      // 5. If AR Vision mode is active, process and render Computer Vision bounding boxes
      if (viewMode === 'AR_VISION' && visionProcessor) {
        const frameDetections = visionProcessor.processFrame(engine.vehicles, canvas.width, canvas.height);
        visionProcessor.renderAROverlay(ctx, frameDetections.detections);
      }

      // 6. Periodically emit telemetry to React state / database
      tickCounter++;
      if (tickCounter % 30 === 0) {
        setLiveStats({
          totalActive: engine.vehicles.length,
          nsCount: queueStats.ns.count,
          ewCount: queueStats.ew.count,
          totalCrossed: engine.totalCrossed
        });

        onTelemetryTick && onTelemetryTick({
          queueStats,
          lightState,
          vehiclesCount: engine.vehicles.length,
          totalCrossed: engine.totalCrossed,
          idlingSecondsTotal: engine.idlingSecondsTotal
        });
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [engine, visionProcessor, trafficController, viewMode]);

  // Handle Density Change
  const handleDensityChange = (mode) => {
    setTrafficDensity(mode);
    if (!engine) return;
    if (mode === 'LOW') engine.setSpawnRateMultiplier(0.5);
    else if (mode === 'NORMAL') engine.setSpawnRateMultiplier(1.0);
    else if (mode === 'HIGH') engine.setSpawnRateMultiplier(2.2);
  };

  const handleInjectEmergency = (type) => {
    if (!engine) return;
    const approaches = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
    const randomApproach = approaches[Math.floor(Math.random() * approaches.length)];
    engine.injectEmergencyVehicle(randomApproach, type);
  };

  const togglePause = () => {
    if (!engine) return;
    engine.isPaused = !engine.isPaused;
    setIsPaused(engine.isPaused);
  };

  return (
    <div className="rounded-xl bg-slate-900/90 backdrop-blur-md p-4 lg:p-5 border border-slate-800 shadow-2xl flex flex-col items-center">
      
      {/* Simulation Header Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h3 className="title-font text-base font-bold text-slate-100">
            Simulador de Intersección Óptica 2D
          </h3>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'AR_VISION' ? 'PHYSICAL' : 'AR_VISION')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              viewMode === 'AR_VISION'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{viewMode === 'AR_VISION' ? 'Visión Artificial (HUD)' : 'Cámara Normal'}</span>
          </button>

          <button
            onClick={togglePause}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={isPaused ? 'Reanudar' : 'Pausar'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="relative rounded-xl overflow-hidden border-2 border-slate-800 bg-[#070b14] shadow-inner max-w-full">
        <canvas
          ref={canvasRef}
          width={640}
          height={640}
          className="block w-full max-w-[640px] h-auto aspect-square cursor-crosshair"
        />

        {/* Quick HUD Telemetry Overlay on Canvas */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <div className="px-2.5 py-1 rounded bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-[11px] hud-font text-cyan-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Activos: {liveStats.totalActive} veh</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] hud-font text-slate-400">
            N-S: {liveStats.nsCount} | E-O: {liveStats.ewCount}
          </div>
        </div>

        {/* Emergency Trigger Notice */}
        {trafficController?.emergencyActive && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold hud-font flex items-center gap-2 animate-bounce shadow-2xl shadow-rose-950">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-spin" />
            <span>CORREDOR DE EMERGENCIA PRIORITARIO ACTIVO</span>
          </div>
        )}
      </div>

      {/* Control Actions Panel */}
      <div className="w-full mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Density Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> Densidad:
          </span>
          <button
            onClick={() => handleDensityChange('LOW')}
            className={`px-2 py-1 rounded font-semibold transition-all ${
              trafficDensity === 'LOW' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Baja (0.5x)
          </button>
          <button
            onClick={() => handleDensityChange('NORMAL')}
            className={`px-2 py-1 rounded font-semibold transition-all ${
              trafficDensity === 'NORMAL' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Media (1.0x)
          </button>
          <button
            onClick={() => handleDensityChange('HIGH')}
            className={`px-2 py-1 rounded font-semibold transition-all ${
              trafficDensity === 'HIGH' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Hora Pico (2.2x)
          </button>
        </div>

        {/* Emergency Injection Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleInjectEmergency('EMERGENCY_AMBULANCE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md shadow-rose-900/40"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>+ Ambulancia 🚑</span>
          </button>
          <button
            onClick={() => handleInjectEmergency('EMERGENCY_POLICE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-900/40"
          >
            <Car className="w-3.5 h-3.5" />
            <span>+ Patrulla 🚓</span>
          </button>
        </div>

      </div>

    </div>
  );
};
