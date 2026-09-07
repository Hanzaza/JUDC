import React, { useState, useEffect } from 'react';
import { X, Network, MapPin, Sliders, CheckCircle2, AlertTriangle, Layers, Clock } from 'lucide-react';

const PRESET_CITIES = [
  { label: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { label: 'Ciudad de México', lat: 19.4326, lng: -99.1332 },
  { label: 'Madrid', lat: 40.4168, lng: -3.7038 },
  { label: 'São Paulo', lat: -23.5505, lng: -46.6333 },
  { label: 'Bogotá', lat: 4.7110, lng: -74.0721 },
  { label: 'Santiago', lat: -33.4489, lng: -70.6693 }
];

export const IntersectionModal = ({ isOpen, onClose, onSave, intersection = null }) => {
  const isEditing = Boolean(intersection);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    latitude: -34.6037,
    longitude: -58.3816,
    status: 'ACTIVE',
    control_mode: 'ADAPTIVE_AI',
    cycle_duration_sec: 90
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (intersection) {
      setFormData({
        code: intersection.code || '',
        name: intersection.name || '',
        latitude: intersection.latitude ?? -34.6037,
        longitude: intersection.longitude ?? -58.3816,
        status: intersection.status || 'ACTIVE',
        control_mode: intersection.control_mode || 'ADAPTIVE_AI',
        cycle_duration_sec: intersection.cycle_duration_sec || 90
      });
    } else {
      setFormData({
        code: `INT-0${Math.floor(Math.random() * 90) + 10}`,
        name: '',
        latitude: -34.6037,
        longitude: -58.3816,
        status: 'ACTIVE',
        control_mode: 'ADAPTIVE_AI',
        cycle_duration_sec: 90
      });
    }
    setError(null);
  }, [intersection, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setError('El código del nodo es obligatorio (ej. INT-05).');
      return;
    }
    if (!formData.name.trim()) {
      setError('El nombre de la intersección o arteria vial es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        ...formData,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        cycle_duration_sec: parseInt(formData.cycle_duration_sec, 10)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la intersección');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0e1422] border border-slate-700 shadow-2xl p-6 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="title-font text-lg font-bold text-white">
                {isEditing ? 'Editar Nodo Semafórico' : 'Registrar Nueva Intersección'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? `Modificando configuración de ${intersection?.code}` : 'Configura un nuevo cruce vial en la red inteligente'}
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

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Código Único
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="ej. INT-05"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre del Cruce / Arteria
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ej. Av. Libertador & Callao"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Coordinates & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Geolocalización GPS</span>
              </label>
              <div className="flex gap-1 overflow-x-auto text-[10px] text-slate-400">
                <span className="self-center mr-1">Preajustes:</span>
                {PRESET_CITIES.map((city) => (
                  <button
                    key={city.label}
                    type="button"
                    onClick={() => setFormData({ ...formData, latitude: city.lat, longitude: city.lng })}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300"
                  >
                    {city.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.000001"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="Latitud (ej. -34.6037)"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                step="0.000001"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="Longitud (ej. -58.3816)"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Control Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estado Operativo
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ACTIVE">ACTIVO (En línea)</option>
                <option value="WARNING">ADVERTENCIA (Congestión)</option>
                <option value="MAINTENANCE">MANTENIMIENTO</option>
                <option value="OFFLINE">FUERA DE LÍNEA</option>
              </select>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Modo de Control
              </label>
              <select
                value={formData.control_mode}
                onChange={(e) => setFormData({ ...formData, control_mode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ADAPTIVE_AI">Adaptativo (IA OptiFlow)</option>
                <option value="FIXED_TIME">Tiempo Fijo (Tradicional)</option>
                <option value="MANUAL_OVERRIDE">Control Manual</option>
                <option value="EMERGENCY_CORRIDOR">Corredor de Emergencia</option>
              </select>
            </div>

            {/* Cycle Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Ciclo Total ({formData.cycle_duration_sec}s)</span>
              </label>
              <input
                type="number"
                min="40"
                max="180"
                value={formData.cycle_duration_sec}
                onChange={(e) => setFormData({ ...formData, cycle_duration_sec: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar Nodo' : 'Guardar Intersección'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
