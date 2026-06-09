// API Keys válidas
const VALID_API_KEYS = [
  "sk-85ef8b9e1ff446d4822407982dbf742e",  // DeepSeek
  "n8n-secret-key-2026",                    // n8n
];

export function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return VALID_API_KEYS.includes(apiKey);
}

// Crear un contexto especial para API Key (simula un usuario superadmin)
export function createApiKeyContext(apiKey: string) {
  return {
    user: {
      id: 0,
      email: "api@genio.com",
      name: "API Bot",
      isAdmin: true,
      isSuperadmin: true,
    },
    isApiKey: true,
  };
}
