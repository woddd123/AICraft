export type ApiProvider = {
  id: string;
  name: string;
  baseURL: string;
  models: { id: string; name: string }[];
};

export type ApiSettings = {
  providerId: string;
  apiKey: string;
  model: string;
};

export const PROVIDERS: ApiProvider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (通用)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (推理)' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'o4-mini', name: 'o4 Mini (推理)' },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash (快速)' },
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot 月之暗面',
    baseURL: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot V1 (8K)' },
      { id: 'moonshot-v1-32k', name: 'Moonshot V1 (32K)' },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    baseURL: '',
    models: [],
  },
];

const STORAGE_KEY = 'novelcraft_api_settings';
const MODELS_CACHE_KEY = 'novelcraft_models_cache';

type ModelsCache = Record<string, { id: string; name: string }[]>;

export function loadCachedModels(providerId: string): { id: string; name: string }[] | null {
  try {
    const raw = localStorage.getItem(MODELS_CACHE_KEY);
    if (!raw) return null;
    const cache: ModelsCache = JSON.parse(raw);
    return cache[providerId] || null;
  } catch {
    return null;
  }
}

function saveCachedModels(providerId: string, models: { id: string; name: string }[]) {
  try {
    const raw = localStorage.getItem(MODELS_CACHE_KEY);
    const cache: ModelsCache = raw ? JSON.parse(raw) : {};
    cache[providerId] = models;
    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

export async function fetchModels(baseURL: string, apiKey: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch('/api/ai/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseURL, apiKey }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.models || [];
}

export function fetchAndCacheModels(providerId: string, baseURL: string, apiKey: string) {
  return fetchModels(baseURL, apiKey).then(models => {
    saveCachedModels(providerId, models);
    return models;
  });
}

export function loadSettings(): ApiSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.apiKey && data.providerId) return data;
    return null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: ApiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getProvider(id: string): ApiProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function buildAiParams(settings: ApiSettings): { apiKey: string; baseURL: string; model: string } {
  const provider = getProvider(settings.providerId);
  return {
    apiKey: settings.apiKey,
    baseURL: provider?.baseURL || settings.providerId,
    model: settings.model,
  };
}
