// n8n API helper functions
const N8N_BASE_URL = import.meta.env.VITE_N8N_URL || 'http://localhost:5678';

export async function n8nPost(endpoint: string, data: any) {
  const response = await fetch(`${N8N_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`N8N API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}