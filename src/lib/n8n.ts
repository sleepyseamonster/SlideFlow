const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy`;

export async function n8nPost<T = unknown>(path: string, body: unknown) {
  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        path,
        body,
        method: "POST"
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    return res.json() as Promise<T>;
  } catch (error: unknown) {
    console.error('n8n request error:', error);
    throw error;
  }
}

export async function n8nGet<T = unknown>(path: string, params?: Record<string,string>) {
  try {
    let fullPath = path;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      fullPath = `${path}?${queryString}`;
    }

    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        path: fullPath,
        method: "GET"
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    return res.json() as Promise<T>;
  } catch (error: unknown) {
    console.error('n8n request error:', error);
    throw error;
  }
}
