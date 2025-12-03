import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type FileInput = {
  bucket: string;
  path: string;
  mime_type: string;
  size_bytes: number;
};

type RequestBody = {
  title?: string;
  files?: FileInput[];
  aspect?: string;
  status?: string;
};

const ALLOWED_BUCKET = "media";
const MAX_FILES = 10;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse(401, { error: "Missing or invalid Authorization header", code: "auth_missing" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return jsonResponse(500, { error: "Server misconfiguration", code: "config_missing" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse(401, { error: "Unauthorized", code: "auth_failed" });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as RequestBody;
    const validation = validateBody(body, userId);
    if (validation.error) {
      return jsonResponse(422, { error: validation.error, code: "invalid_request" });
    }

    const files = validation.files!;
    const title = body.title?.trim() || "Untitled Carousel";
    const aspect = "square";
    const status = body.status || "draft";
    const carouselId = crypto.randomUUID();
    const insertedMediaIds: string[] = [];

    // Insert carousel
    const { error: carouselError } = await supabase
      .from("carousel")
      .insert({
        id: carouselId,
        user_id: userId,
        title,
        aspect,
        status,
      });

    if (carouselError) {
      console.error("Insert carousel failed", { error: carouselError });
      return jsonResponse(500, { error: "Failed to create carousel", code: "carousel_insert_failed" });
    }

    // Insert media + slides in order
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = file.path.split("/").pop() || "file";

      const { data: mediaRow, error: mediaError } = await supabase
        .from("media")
        .insert({
          user_id: userId,
          bucket: file.bucket,
          path: file.path,
          filename,
          mime_type: file.mime_type,
          size_bytes: file.size_bytes,
          media_type: "image",
          visibility: "private",
          is_library: false,
        })
        .select("id")
        .single();

      if (mediaError || !mediaRow?.id) {
        console.error("Insert media failed", { file: file.path, error: mediaError });
        await cleanup(supabase, carouselId, insertedMediaIds);
        return jsonResponse(500, { error: "Failed to save media", code: "media_insert_failed" });
      }

      insertedMediaIds.push(mediaRow.id);

      const { error: slideError } = await supabase
        .from("carousel_slide")
        .insert({
          carousel_id: carouselId,
          user_id: userId,
          media_id: mediaRow.id,
          position: i + 1,
        });

      if (slideError) {
        console.error("Insert slide failed", { mediaId: mediaRow.id, error: slideError });
        await cleanup(supabase, carouselId, insertedMediaIds);
        return jsonResponse(500, { error: "Failed to save slide", code: "slide_insert_failed" });
      }
    }

    return jsonResponse(200, {
      carouselId,
      slideCount: files.length,
      mediaIds: insertedMediaIds,
      aspect,
    });
  } catch (error) {
    console.error("Unexpected create-carousel error:", error);
    return jsonResponse(500, { error: "Internal server error", code: "unexpected_error" });
  }
});

function validateBody(body: RequestBody, userId: string): { error?: string; files?: FileInput[] } {
  if (!body || !Array.isArray(body.files)) {
    return { error: "files array is required" };
  }
  const files = body.files;
  if (files.length === 0) return { error: "at least one file is required" };
  if (files.length > MAX_FILES) return { error: `maximum ${MAX_FILES} files allowed` };

  for (const file of files) {
    if (!file?.path || !file?.mime_type || !file?.size_bytes || !file?.bucket) {
      return { error: "each file must include bucket, path, mime_type, size_bytes" };
    }
    if (file.bucket !== ALLOWED_BUCKET) {
      return { error: `bucket must be '${ALLOWED_BUCKET}'` };
    }
    if (!file.path.startsWith(`user_${userId}`) && !file.path.startsWith(userId)) {
      return { error: "path must be namespaced to the user" };
    }
    if (file.size_bytes <= 0) {
      return { error: "size_bytes must be positive" };
    }
  }
  return { files };
}

async function cleanup(supabase: ReturnType<typeof createClient>, carouselId: string, mediaIds: string[]) {
  try {
    await supabase.from("carousel_slide").delete().eq("carousel_id", carouselId);
  } catch (err) {
    console.error("Cleanup slides failed", err);
  }

  if (mediaIds.length) {
    try {
      await supabase.from("media").delete().in("id", mediaIds);
    } catch (err) {
      console.error("Cleanup media failed", err);
    }
  }

  try {
    await supabase.from("carousel").delete().eq("id", carouselId);
  } catch (err) {
    console.error("Cleanup carousel failed", err);
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
