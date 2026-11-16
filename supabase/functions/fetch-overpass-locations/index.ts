import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestPayload {
  level: "country" | "city" | "district";
  query: string;
  parentCountry?: string;
  parentCity?: string;
}

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: RequestPayload = await req.json();
    const { level, query, parentCountry = "", parentCity = "" } = payload;

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ locations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanQuery = query.trim().replace(/["\\]/g, "");
    let overpassQL = "";

    if (level === "country") {
      overpassQL = `
        [out:json][timeout:15];
        relation["boundary"="administrative"]["admin_level"="2"]["name"~"^${cleanQuery}",i];
        out center 10;
      `;
    } else if (level === "city") {
      overpassQL = `
        [out:json][timeout:15];
        (
          node["place"~"city|town"]["name"~"^${cleanQuery}",i];
          relation["boundary"="administrative"]["admin_level"~"4|6|7|8"]["name"~"^${cleanQuery}",i];
        );
        out center 15;
      `;
    } else {
      // district / suburb / neighbourhood
      overpassQL = `
        [out:json][timeout:15];
        (
          node["place"~"suburb|neighbourhood|quarter|borough"]["name"~"^${cleanQuery}",i];
          relation["boundary"="administrative"]["admin_level"~"9|10"]["name"~"^${cleanQuery}",i];
        );
        out center 20;
      `;
    }

    const overpassUrl = "https://overpass-api.de/api/interpreter";
    const response = await fetch(overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQL)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API responded with status ${response.status}`);
    }

    const osmData = await response.json();
    const elements: OverpassElement[] = osmData.elements || [];

    const parsedLocations = elements
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        const name = el.tags?.name || el.tags?.["name:en"] || el.tags?.["name:uk"] || "";

        if (!lat || !lng || !name) {
          return null;
        }

        const country = el.tags?.["addr:country"] || parentCountry || (level === "country" ? name : "Unknown");
        const city = el.tags?.["addr:city"] || parentCity || (level === "city" ? name : "Center");
        const district = level === "district" ? name : (el.tags?.["addr:suburb"] || name);

        return {
          osm_id: el.id,
          country,
          city,
          district,
          lat,
          lng,
        };
      })
      .filter((loc): loc is NonNullable<typeof loc> => loc !== null);

    // Save into Supabase locations cache if SUPABASE_URL & SERVICE_ROLE are available
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    let savedRecords = parsedLocations;

    if (supabaseUrl && supabaseServiceKey && parsedLocations.length > 0) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from("locations")
        .upsert(parsedLocations, { onConflict: "osm_id", ignoreDuplicates: false })
        .select();

      if (!error && data) {
        savedRecords = data;
      }
    }

    return new Response(JSON.stringify({ locations: savedRecords }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errMessage, locations: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
