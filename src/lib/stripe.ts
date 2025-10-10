export async function createCheckoutSession(userId: string): Promise<{ url: string | null; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    return { url: data.url };
  } catch (error: any) {
    console.error('Checkout error:', error);
    return { url: null, error: error.message };
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
  } catch (error: any) {
    console.error('Portal error:', error);
    return { url: null, error: error.message };
  }
}
