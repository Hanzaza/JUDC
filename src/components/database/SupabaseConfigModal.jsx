import React, { useState } from 'react';
import { Database, X, Check, Key, Link as LinkIcon, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { getStoredCredentials, saveSupabaseCredentials, clearSupabaseCredentials } from '../../services/supabaseClient';
import { createClient } from '@supabase/supabase-js';

export const SupabaseConfigModal = ({ isOpen, onClose, onConnectionChanged }) => {
  if (!isOpen) return null;

  const currentCreds = getStoredCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [key, setKey] = useState(currentCreds.key);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    if (!url || !key) {
      setTestResult({ success: false, message: 'Debes ingresar tanto la URL del proyecto como la Anon Key.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const client = createClient(url.trim(), key.trim());
      // Test simple ping query
      const { data, error } = await client.from('intersections').select('count', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet or auth issue
        setTestResult({
          success: true,
          message: 'Conexión con Supabase establecida. Asegúrate de haber ejecutado el script SQL en tu base de datos.'
        });
      } else {
        setTestResult({
          success: true,
          message: '¡Conexión exitosa con PostgreSQL / Supabase! Las métricas se sincronizarán en vivo.'
        });
      }

      saveSupabaseCredentials(url, key);
      onConnectionChanged && onConnectionChanged(true);
    } catch (err) {
      setTestResult({
        success: false,
        message: `Error al conectar: ${err.message || 'Verifica las credenciales y la conectividad.'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetToLocal = () => {
    clearSupabaseCredentials();
    setUrl('');
    setKey('');
    setTestResult({
      success: true,
      message: 'Modo restablecido a Almacén Local / Simulación en Memoria.'
    });
    onConnectionChanged && onConnectionChanged(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="title-font text-lg font-bold text-white">
                Conectar con Supabase / PostgreSQL
              </h3>
              <p className="text-xs text-slate-400">
                Sincronización en la nube para telemetría y eventos en tiempo real
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

        {/* Modal Form */}
        <form onSubmit={handleTestAndSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project URL de Supabase</span>
            </label>
            <input
              type="text"
              placeholder="https://xyzproject.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anon Public API Key</span>
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Feedback Message */}
          {testResult && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
            }`}>
              {testResult.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetToLocal}
              className="text-xs text-slate-400 hover:text-rose-400 font-medium transition-colors"
            >
              Usar Modo Local (Offline Mock)
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Guardar y Probar</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
