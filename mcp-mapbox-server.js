/**
 * Minimal, zero-dependency MCP server for Mapbox.
 *
 * IMPORTANT:
 * - This is a lightweight implementation intended for Cursor MCP.
 * - It uses stdio. Cursor launches it and speaks MCP over stdin/stdout.
 *
 * Env:
 * - MAPBOX_ACCESS_TOKEN (required)
 */

const readline = require("readline");

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
if (!MAPBOX_ACCESS_TOKEN) {
  // We still start, but every tool call will error with a helpful message.
}

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id, message, code = -32000, data) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function mustHaveToken() {
  if (!MAPBOX_ACCESS_TOKEN) {
    const err = new Error(
      "Missing MAPBOX_ACCESS_TOKEN. Add it to your Cursor MCP server env and restart MCP."
    );
    err.code = "MISSING_TOKEN";
    throw err;
  }
}

async function mapboxFetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Cursor-MCP-Mapbox" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mapbox error ${res.status}: ${text || res.statusText}`);
  }
  return await res.json();
}

function encodeQuery(q) {
  return encodeURIComponent(String(q ?? ""));
}

const TOOLS = [
  {
    name: "mapbox_geocode_forward",
    description:
      "Forward geocode a search string to coordinates using Mapbox Geocoding API.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text (e.g., address, place name)." },
        limit: { type: "number", description: "Max results (1-10).", default: 5 },
        proximity: {
          type: "string",
          description: 'Optional "lon,lat" to bias results (e.g., "-83.9207,35.9606").',
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "mapbox_geocode_reverse",
    description:
      "Reverse geocode coordinates to a place/address using Mapbox Geocoding API.",
    inputSchema: {
      type: "object",
      properties: {
        lon: { type: "number" },
        lat: { type: "number" },
        limit: { type: "number", default: 1 },
      },
      required: ["lon", "lat"],
      additionalProperties: false,
    },
  },
  {
    name: "mapbox_static_map_url",
    description:
      "Generate a Mapbox Static Images URL (no request performed). Useful for home-page widgets.",
    inputSchema: {
      type: "object",
      properties: {
        style: {
          type: "string",
          description:
            'Mapbox style id, e.g. "mapbox/streets-v12" or "mapbox/light-v11".',
          default: "mapbox/streets-v12",
        },
        centerLon: { type: "number" },
        centerLat: { type: "number" },
        zoom: { type: "number", default: 12 },
        width: { type: "number", default: 600 },
        height: { type: "number", default: 400 },
        markers: {
          type: "array",
          description: "Optional marker list.",
          items: {
            type: "object",
            properties: {
              lon: { type: "number" },
              lat: { type: "number" },
              label: { type: "string", description: "Single char label (a-z,0-9)." },
              color: { type: "string", description: "Hex color without #, e.g. ff0000." },
            },
            required: ["lon", "lat"],
            additionalProperties: false,
          },
        },
      },
      required: ["centerLon", "centerLat"],
      additionalProperties: false,
    },
  },
  {
    name: "mapbox_directions",
    description:
      "Get directions between two points using Mapbox Directions API (driving).",
    inputSchema: {
      type: "object",
      properties: {
        fromLon: { type: "number" },
        fromLat: { type: "number" },
        toLon: { type: "number" },
        toLat: { type: "number" },
        profile: {
          type: "string",
          enum: ["driving", "walking", "cycling"],
          default: "driving",
        },
      },
      required: ["fromLon", "fromLat", "toLon", "toLat"],
      additionalProperties: false,
    },
  },
];

async function callTool(name, args) {
  mustHaveToken();

  if (name === "mapbox_geocode_forward") {
    const q = encodeQuery(args.query);
    const limit = Math.max(1, Math.min(10, Number(args.limit ?? 5)));
    const proximity = args.proximity ? `&proximity=${encodeURIComponent(args.proximity)}` : "";
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json` +
      `?access_token=${encodeURIComponent(MAPBOX_ACCESS_TOKEN)}&limit=${limit}${proximity}`;
    const data = await mapboxFetchJson(url);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (name === "mapbox_geocode_reverse") {
    const lon = Number(args.lon);
    const lat = Number(args.lat);
    const limit = Math.max(1, Math.min(10, Number(args.limit ?? 1)));
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json` +
      `?access_token=${encodeURIComponent(MAPBOX_ACCESS_TOKEN)}&limit=${limit}`;
    const data = await mapboxFetchJson(url);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (name === "mapbox_static_map_url") {
    const style = args.style || "mapbox/streets-v12";
    const lon = Number(args.centerLon);
    const lat = Number(args.centerLat);
    const zoom = Number(args.zoom ?? 12);
    const width = Math.max(1, Math.min(1280, Number(args.width ?? 600)));
    const height = Math.max(1, Math.min(1280, Number(args.height ?? 400)));

    const markers = Array.isArray(args.markers) ? args.markers : [];
    const overlays = markers
      .map((m) => {
        const mlon = Number(m.lon);
        const mlat = Number(m.lat);
        const label = (m.label || "").slice(0, 1);
        const color = (m.color || "").replace("#", "");
        // Simple pin syntax: pin-s-label+color(lon,lat)
        const labelPart = label ? `-${encodeURIComponent(label)}` : "";
        const colorPart = color ? `+${encodeURIComponent(color)}` : "";
        return `pin-s${labelPart}${colorPart}(${mlon},${mlat})`;
      })
      .join(",");

    const overlayPart = overlays ? `${overlays}/` : "";
    const url =
      `https://api.mapbox.com/styles/v1/${style}/static/` +
      `${overlayPart}${lon},${lat},${zoom}/` +
      `${width}x${height}?access_token=${encodeURIComponent(MAPBOX_ACCESS_TOKEN)}`;

    return { content: [{ type: "text", text: url }] };
  }

  if (name === "mapbox_directions") {
    const profile = args.profile || "driving";
    const fromLon = Number(args.fromLon);
    const fromLat = Number(args.fromLat);
    const toLon = Number(args.toLon);
    const toLat = Number(args.toLat);

    const coords = `${fromLon},${fromLat};${toLon},${toLat}`;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
      `?access_token=${encodeURIComponent(MAPBOX_ACCESS_TOKEN)}&geometries=geojson&overview=simplified&steps=true`;
    const data = await mapboxFetchJson(url);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ---- MCP-ish JSON-RPC handlers ----
// Cursor MCP uses JSON-RPC over stdio. We implement the minimal subset:
// - initialize
// - tools/list
// - tools/call
const handlers = {
  initialize: async () => ({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: { name: "mapbox-mcp", version: "0.1.0" },
  }),
  "tools/list": async () => ({ tools: TOOLS }),
  "tools/call": async (params) => {
    const { name, arguments: args } = params || {};
    const result = await callTool(name, args || {});
    return result;
  },
};

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", async (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = msg || {};
  if (!method) return;

  const handler = handlers[method];
  if (!handler) {
    process.stdout.write(JSON.stringify(jsonRpcError(id ?? null, `Method not found: ${method}`, -32601)) + "\n");
    return;
  }

  try {
    const result = await handler(params);
    process.stdout.write(JSON.stringify(jsonRpcResult(id ?? null, result)) + "\n");
  } catch (err) {
    process.stdout.write(
      JSON.stringify(
        jsonRpcError(id ?? null, err?.message || "Unknown error", -32000, { code: err?.code })
      ) + "\n"
    );
  }
});

