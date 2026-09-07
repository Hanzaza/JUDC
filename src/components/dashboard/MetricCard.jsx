import React from 'react';

export const MetricCard = ({ 
  title, 
  value, 
  unit = '', 
  changeText, 
  isPositiveChange = true, 
  icon: Icon, 
  accentColor = 'cyan', // 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet'
  sublabel 
}) => {
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/10',
      iconBg: 'bg-cyan-500/10',
      iconText: 'text-cyan-400',
      valueText: 'text-cyan-300'
    },
    emerald: {
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/10',
      iconBg: 'bg-emerald-500/10',
      iconText: 'text-emerald-400',
      valueText: 'text-emerald-300'
    },
    amber: {
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/10',
      iconBg: 'bg-amber-500/10',
      iconText: 'text-amber-400',
      valueText: 'text-amber-300'
    },
    rose: {
      border: 'border-rose-500/30',
      glow: 'shadow-rose-500/10',
      iconBg: 'bg-rose-500/10',
      iconText: 'text-rose-400',
      valueText: 'text-rose-300'
    },
    violet: {
      border: 'border-violet-500/30',
      glow: 'shadow-violet-500/10',
      iconBg: 'bg-violet-500/10',
      iconText: 'text-violet-400',
      valueText: 'text-violet-300'
    }
  };

  const scheme = colorMap[accentColor] || colorMap.cyan;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-900/80 backdrop-blur-md p-4 border ${scheme.border} shadow-lg ${scheme.glow} transition-all duration-200 hover:scale-[1.01]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className={`text-2xl font-bold tracking-tight title-font ${scheme.valueText}`}>
              {value}
            </span>
            {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${scheme.iconBg} ${scheme.iconText}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(changeText || sublabel) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {changeText && (
            <span className={`font-medium ${isPositiveChange ? 'text-emerald-400' : 'text-rose-400'}`}>
              {changeText}
            </span>
          )}
          {sublabel && (
            <span className="text-slate-400 text-[11px]">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
};
