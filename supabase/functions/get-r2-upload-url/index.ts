import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.540.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.540.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestPayload {
  filename: string;
  contentType: string;
  sizeBytes?: number;
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
    const { filename, contentType, sizeBytes } = payload;

    if (!contentType || (!contentType.startsWith("image/") && !contentType.startsWith("video/"))) {
      return new Response(
        JSON.stringify({ error: "Unsupported content type. Only images and videos are allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Size limit guard: 5MB for images, 50MB for 60s video
    if (sizeBytes) {
      if (contentType.startsWith("image/") && sizeBytes > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Image file exceeds maximum 5 MB limit" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (contentType.startsWith("video/") && sizeBytes > 50 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Video file exceeds maximum 50 MB limit" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID") || "mock-r2-account-id";
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") || "mock-access-key-id";
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") || "mock-secret-access-key";
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "behere-media";
    const r2PublicBaseUrl = Deno.env.get("R2_PUBLIC_BASE_URL") || `https://media.behere.local`;

    const cleanFilename = (filename || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
    const ext = cleanFilename.includes(".")
      ? cleanFilename.split(".").pop()
      : (contentType.startsWith("video/") ? "mp4" : "webp");
    
    const key = `uploads/${user.id}/${crypto.randomUUID()}.${ext}`;

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = `${r2PublicBaseUrl.replace(/\/+$/, "")}/${key}`;

    return new Response(
      JSON.stringify({
        uploadUrl,
        key,
        publicUrl,
        contentType,
        expiresIn: 3600,
      }),
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
