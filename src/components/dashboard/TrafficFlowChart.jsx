import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { TrendingUp, BarChart2, Leaf, Clock } from 'lucide-react';

export const TrafficFlowChart = ({ historyData = [] }) => {
  const [metricMode, setMetricMode] = useState('QUEUE'); // 'QUEUE' | 'WAIT_TIME' | 'CO2'

  // Prepare chart data formatting
  const chartData = historyData.map((item, idx) => ({
    time: item.timeLabel || `${idx}s`,
    nsQueue: item.nsQueue || 0,
    ewQueue: item.ewQueue || 0,
    waitTimeSaved: item.waitTimeSaved || 0,
    co2Saved: item.co2Saved || 0,
    totalFlow: item.totalFlow || 0
  }));

  return (
    <div className="rounded-xl bg-slate-900/80 backdrop-blur-md p-5 border border-slate-800 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="title-font text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            Telemetría Dinámica de Flujo & Impacto
          </h3>
          <p className="text-xs text-slate-400">
            Comparativa en tiempo real por eje vial registrada en PostgreSQL
          </p>
        </div>

        {/* Metric Mode Selectors */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
          <button
            onClick={() => setMetricMode('QUEUE')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              metricMode === 'QUEUE'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Longitud de Cola (m)
          </button>
          <button
            onClick={() => setMetricMode('WAIT_TIME')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              metricMode === 'WAIT_TIME'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tiempo Ahorrado (s)
          </button>
          <button
            onClick={() => setMetricMode('CO2')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              metricMode === 'CO2'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ahorro CO₂ (g)
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 hud-font">
            Recopilando telemetría de sensores...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorEw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '0.5rem',
                  fontSize: '12px'
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              {metricMode === 'QUEUE' && (
                <>
                  <Area 
                    type="monotone" 
                    dataKey="nsQueue" 
                    name="Cola Norte-Sur (m)" 
                    stroke="#00f2fe" 
                    fillOpacity={1} 
                    fill="url(#colorNs)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ewQueue" 
                    name="Cola Este-Oeste (m)" 
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#colorEw)" 
                    strokeWidth={2}
                  />
                </>
              )}

              {metricMode === 'WAIT_TIME' && (
                <Area 
                  type="monotone" 
                  dataKey="waitTimeSaved" 
                  name="Demora Evitada (segundos acumulados)" 
                  stroke="#a78bfa" 
                  fillOpacity={1} 
                  fill="url(#colorEw)" 
                  strokeWidth={2}
                />
              )}

              {metricMode === 'CO2' && (
                <Area 
                  type="monotone" 
                  dataKey="co2Saved" 
                  name="Reducción de CO₂ Evitada (g)" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorCo2)" 
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
