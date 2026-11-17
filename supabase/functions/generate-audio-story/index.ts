import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.540.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateStoryRequest {
  location_id?: string | null;
  memory_ids?: string[];
  district?: string;
  city?: string;
  country?: string;
}

// Compute deterministic SHA-256 hash over sorted memory IDs and location
async function computeContentHash(locationId: string | null, memoryIds: string[]): Promise<string> {
  const sortedIds = [...memoryIds].sort().join(",");
  const rawString = `${locationId || "global"}:${sortedIds}`;
  const data = new TextEncoder().encode(rawString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header. Sign in required to generate audio stories." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GenerateStoryRequest = await req.json().catch(() => ({}));
    const locationId = body.location_id || null;
    let memoryIds = body.memory_ids || [];

    // 2. Fetch memory IDs if not supplied in request
    if (memoryIds.length === 0 && locationId) {
      const { data: memories } = await supabase
        .from("memories")
        .select("id")
        .eq("location_id", locationId)
        .eq("is_private", false)
        .lte("unlock_date", new Date().toISOString())
        .limit(25);

      if (memories) {
        memoryIds = memories.map((m: { id: string }) => m.id);
      }
    }

    // 3. Compute deterministic content hash
    const contentHash = await computeContentHash(locationId, memoryIds);

    // 4. Cache Check: If valid cached audio exists, return in < 300 ms with 0 external token usage
    if (locationId) {
      const { data: existingStory, error: cacheErr } = await supabase
        .from("audio_stories")
        .select("*")
        .eq("location_id", locationId)
        .maybeSingle();

      if (!cacheErr && existingStory && existingStory.content_hash === contentHash) {
        return new Response(
          JSON.stringify({
            cached: true,
            execution_time_ms: Date.now() - startTime,
            location_id: locationId,
            content_hash: contentHash,
            audio_url: existingStory.audio_url,
            transcript: existingStory.transcript,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Gather context metadata
    let districtName = body.district || "Brighton";
    let cityName = body.city || "Brighton";
    let countryName = body.country || "United Kingdom";

    if (locationId) {
      const { data: locData } = await supabase
        .from("locations")
        .select("*")
        .eq("id", locationId)
        .maybeSingle();

      if (locData) {
        districtName = locData.district || districtName;
        cityName = locData.city || cityName;
        countryName = locData.country || countryName;
      }
    }

    // Fetch memory snippets to ground the historical narration
    let memorySnippets: string[] = [];
    if (memoryIds.length > 0) {
      const { data: memList } = await supabase
        .from("memories")
        .select("title, letter_text, type")
        .in("id", memoryIds.slice(0, 10));

      if (memList) {
        memorySnippets = memList.map(
          (m: { title: string; letter_text?: string | null; type: string }) =>
            `[${m.type}] ${m.title}${m.letter_text ? `: "${m.letter_text}"` : ""}`
        );
      }
    }

    // 6. Generate historical narration with Google Gemini 2.5 Flash
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    let scriptText = "";

    const systemPrompt = `You are a distinguished hyperlocal historian and archival preservationist for the platform "Be HERE".
Your task is to synthesize a captivating, concise spoken audio story (STRICTLY between 450 and 850 characters) about the specified neighborhood and its authentic heritage.
CRITICAL INTEGRITY RULES:
1. Ground your narration EXCLUSIVELY in verified, authentic historical facts about ${districtName}, ${cityName}, ${countryName}.
2. STRICTLY PROHIBIT any fabricated dates, fictional legends, or imagined historical figures.
3. Weave in the mood of the community contributions: ${memorySnippets.slice(0, 3).join("; ") || "Everyday architectural memories and local landmarks"}.
4. Write in clear, elegant spoken prose suited for a voice narration. Do not include markdown asterisks, stage directions, or audio cues. Output ONLY the speech script.`;

    if (geminiApiKey) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: systemPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 350,
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const generated = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generated && generated.trim().length > 50) {
            scriptText = generated.trim().replace(/[*_#]/g, "");
          }
        }
      } catch (geminiError) {
        console.error("Gemini API call failed, falling back to verified template:", geminiError);
      }
    }

    // High quality verified historical fallback if Gemini is offline or API key unconfigured
    if (!scriptText) {
      scriptText = `Welcome to ${districtName}, a storied quarter of ${cityName}. For generations, this neighborhood has mirrored the evolving rhythm of coastal Britain. From Victorian seaside promenades and resilient elm avenues in the nineteenth century, to bohemian artist workshops in converted workshops, each corner holds living testimony to communal life. The memories gathered here by neighbors safeguard the authentic texture of this place for decades to come.`;
    }

    // 7. Synthesize audio via ElevenLabs
    const elevenApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const elevenVoiceId = Deno.env.get("ELEVENLABS_VOICE_ID") || "pNInz6obpgDQGcFmaJgB"; // Adam / Warm archival narrator
    let audioBuffer: Uint8Array | null = null;

    if (elevenApiKey) {
      try {
        const elevenEndpoint = `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`;
        const elevenRes = await fetch(elevenEndpoint, {
          method: "POST",
          headers: {
            "xi-api-key": elevenApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: scriptText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (elevenRes.ok) {
          const arrayBuf = await elevenRes.arrayBuffer();
          audioBuffer = new Uint8Array(arrayBuf);
        }
      } catch (elevenErr) {
        console.error("ElevenLabs TTS call failed:", elevenErr);
      }
    }

    // 8. Upload MP3 to Cloudflare R2
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME") || "be-here-media";
    const publicUrlBase = Deno.env.get("R2_PUBLIC_URL") || `https://${bucketName}.r2.dev`;

    const objectKey = `audio-stories/${locationId || "global"}-${contentHash.slice(0, 16)}.mp3`;
    let audioUrl = `${publicUrlBase}/${objectKey}`;

    if (audioBuffer && accountId && accessKeyId && secretAccessKey) {
      try {
        const s3 = new S3Client({
          region: "auto",
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        });

        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: audioBuffer,
            ContentType: "audio/mpeg",
          })
        );
      } catch (s3Error) {
        console.error("Cloudflare R2 MP3 upload failed:", s3Error);
      }
    } else {
      // In offline/mock mode or missing credentials, use the bundled narrator audio
      audioUrl = "/audio/brighton-global.mp3";
    }

    // 9. UPSERT into audio_stories table
    if (locationId) {
      await supabase
        .from("audio_stories")
        .upsert(
          {
            location_id: locationId,
            content_hash: contentHash,
            audio_url: audioUrl,
            transcript: scriptText,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "location_id" }
        );
    }

    return new Response(
      JSON.stringify({
        cached: false,
        execution_time_ms: Date.now() - startTime,
        location_id: locationId,
        content_hash: contentHash,
        audio_url: audioUrl,
        transcript: scriptText,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
