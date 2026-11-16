import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.540.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestPayload {
  key: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: RequestPayload = await req.json();
    const { key } = payload;

    if (!key || typeof key !== "string") {
      return new Response(
        JSON.stringify({ error: "Object key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security check: User can only delete objects from their own upload folder (uploads/{user.id}/...)
    const expectedPrefix = `uploads/${user.id}/`;
    if (!key.startsWith(expectedPrefix)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: You may only delete your own media assets" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID") || "mock-r2-account-id";
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") || "mock-access-key-id";
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") || "mock-secret-access-key";
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "behere-media";

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    const command = new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: key,
    });

    await s3.send(command);

    return new Response(
      JSON.stringify({ success: true, deletedKey: key }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
