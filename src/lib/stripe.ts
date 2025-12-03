export async function createCheckoutSession(userId: string): Promise<{ url: string | null; error?: string }> {
  try {
    console.log('Creating checkout session for user:', userId);
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId }),
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response text:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError: unknown) {
      const message = parseError instanceof Error ? parseError.message : 'Invalid JSON response';
      throw new Error(`Invalid response: ${text} (${message})`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Failed to create checkout session: ${response.status}`);
    }

    return { url: data.url };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown checkout error';
    console.error('Checkout error:', error);
    return { url: null, error: message };
  }
}

export async function createCustomerPortalSession(customerId: string): Promise<{ url: string | null; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ customerId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create portal session');
    }

    return { url: data.url };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown portal error';
    console.error('Portal error:', error);
    return { url: null, error: message };
  }
}
