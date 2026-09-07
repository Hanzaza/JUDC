import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, FileText, Activity } from 'lucide-react';

const INCIDENT_TYPES = [
  { value: 'STALLED_VEHICLE', label: 'Vehículo Detenido / Varado' },
  { value: 'GRIDLOCK', label: 'Embotellamiento / Bloqueo de Cruce' },
  { value: 'ACCIDENT', label: 'Colisión / Accidente Vial' },
  { value: 'PEDESTRIAN_HAZARD', label: 'Peligro Peatonal en Calzada' },
  { value: 'CAMERA_OCCLUSION', label: 'Oclusión o Falla de Cámara CCTV' }
];

export const IncidentModal = ({ isOpen, onClose, onSave, incident = null, intersections = [] }) => {
  const isEditing = Boolean(incident);

  const [formData, setFormData] = useState({
    intersection_id: '',
    incident_type: 'STALLED_VEHICLE',
    severity: 'MEDIUM',
    description: '',
    status: 'OPEN'
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (incident) {
      setFormData({
        intersection_id: incident.intersection_id || (intersections[0]?.id || ''),
        incident_type: incident.incident_type || 'STALLED_VEHICLE',
        severity: incident.severity || 'MEDIUM',
        description: incident.description || '',
        status: incident.status || 'OPEN'
      });
    } else {
      setFormData({
        intersection_id: intersections[0]?.id || '',
        incident_type: 'STALLED_VEHICLE',
        severity: 'MEDIUM',
        description: '',
        status: 'OPEN'
      });
    }
    setError(null);
  }, [incident, isOpen, intersections]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setError('Por favor ingresa una breve descripción del incidente vial.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        ...formData,
        description: formData.description.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el incidente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e1422] border border-slate-700 shadow-2xl p-6 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="title-font text-lg font-bold text-white">
                {isEditing ? 'Editar Incidente Vial' : 'Reportar Nuevo Incidente'}
              </h3>
              <p className="text-xs text-slate-400">
                Bitácora de anomalías y eventos prioritarios en la red
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
          
          {/* Intersection selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Intersección / Nodo Afectado
            </label>
            <select
              value={formData.intersection_id}
              onChange={(e) => setFormData({ ...formData, intersection_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {intersections.map((inter) => (
                <option key={inter.id} value={inter.id} className="bg-slate-900 text-slate-200">
                  {inter.code} - {inter.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Incident Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tipo de Incidente
              </label>
              <select
                value={formData.incident_type}
                onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nivel de Severidad
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="LOW">Baja (Sin impacto grave)</option>
                <option value="MEDIUM">Media (Demora moderada)</option>
                <option value="HIGH">Alta (Congestión crítica)</option>
                <option value="CRITICAL">Crítica (Cierre / Emergencia)</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Estado del Incidente
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'OPEN', label: 'Abierto', color: 'border-rose-500/50 text-rose-400' },
                { value: 'INVESTIGATING', label: 'En Curso', color: 'border-amber-500/50 text-amber-400' },
                { value: 'RESOLVED', label: 'Resuelto', color: 'border-emerald-500/50 text-emerald-400' }
              ].map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: st.value })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    formData.status === st.value
                      ? `${st.color} bg-slate-800 shadow-md`
                      : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descripción del Suceso y Acciones Tomadas
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalla lo detectado por visión artificial o reporte de operador vial..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Footer */}
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
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar Incidente' : 'Registrar Incidente'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
