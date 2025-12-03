import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const N8N_BASE = "https://sleepyseamonster.app.n8n.cloud/webhook";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { path, body, method = "POST" } = await req.json();

    if (!path) {
      return new Response(
        JSON.stringify({ error: "Path is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const n8nUrl = `${N8N_BASE}${path}`;

    const n8nResponse = await fetch(n8nUrl, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await n8nResponse.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { data: responseText };
    }

    return new Response(
      JSON.stringify(responseData),
      {
        status: n8nResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
