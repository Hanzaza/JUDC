import { createClient } from '@supabase/supabase-js';

// Default mock initial state or localStorage saved keys
const STORAGE_KEY_URL = 'optiflow_supabase_url';
const STORAGE_KEY_ANON = 'optiflow_supabase_anon_key';

let cachedClient = null;

export const getStoredCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_KEY_URL) || envUrl;
  const storedKey = localStorage.getItem(STORAGE_KEY_ANON) || envKey;

  return {
    url: storedUrl,
    key: storedKey,
    isConfigured: Boolean(storedUrl && storedKey)
  };
};

export const saveSupabaseCredentials = (url, key) => {
  if (url && key) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, key.trim());
    cachedClient = createClient(url.trim(), key.trim());
    return true;
  }
  return false;
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  cachedClient = null;
};

export const getSupabaseClient = () => {
  if (cachedClient) return cachedClient;

  const { url, key, isConfigured } = getStoredCredentials();
  if (isConfigured) {
    try {
      cachedClient = createClient(url, key);
      return cachedClient;
    } catch (e) {
      console.warn('Error inicializando cliente Supabase real, usando MockStore:', e);
    }
  }

  return null;
};
