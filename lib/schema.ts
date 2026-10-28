import raw from "@/data/guide.schema.json";

type Json = Record<string, unknown>;

// Inlines $ref pointers so the schema can be used as a tool input_schema.
function deref(node: unknown, defs: Json, isProps = false): unknown {
  if (Array.isArray(node)) return node.map((n) => deref(n, defs));
  if (node && typeof node === "object") {
    const obj = node as Json;
    if (typeof obj.$ref === "string") {
      const key = obj.$ref.replace("#/$defs/", "");
      return deref(defs[key], defs);
    }
    const out: Json = {};
    for (const [k, v] of Object.entries(obj)) {
      // In a properties map these are property names, not keywords, so they stay.
      if (!isProps && (k === "$schema" || k === "$defs" || k === "title")) continue;
      out[k] = deref(v, defs, k === "properties");
    }
    return out;
  }
  return node;
}

const defs = (raw as Json).$defs as Json;
const props = (raw as Json).properties as Json;

export const GUIDE_SCHEMA = raw as Json;

// For apps whose users connect with an API key or basic auth: nothing to register or approve.
export const NO_OAUTH_SCHEMA: Json = {
  $schema: (raw as Json).$schema,
  $defs: defs,
  type: "object",
  required: ["slug", "name", "website", "summary", "lastVerified", "origin", "noOAuth", "nuances", "openQuestions", "sources"],
  properties: {
    ...Object.fromEntries(["slug", "name", "website", "category", "summary", "lastVerified", "origin", "interpretation", "probes", "nuances", "whenStuck", "openQuestions", "sources"].map((k) => [k, props[k]])),
    noOAuth: {
      type: "object",
      required: ["method", "howUsersConnect", "evidence"],
      properties: {
        method: { enum: ["api_key", "basic", "other", "not_found"], description: "not_found = no app by this name could be identified" },
        howUsersConnect: { type: "string", description: "How each user connects their account to your product: where they create the key, which plan it needs, what it can access. 2 to 4 sentences." },
        evidence: { $ref: "#/$defs/evidence" },
      },
    },
  },
};

// Tool schemas: refs inlined, and no probes (the server writes those).
const toolSchema = (s: Json) => {
  const out = deref(s, defs) as Json;
  delete (out.properties as Json).probes;
  return out;
};
export const TOOL_INPUT_SCHEMA = toolSchema(raw as Json);
export const NO_OAUTH_TOOL_SCHEMA = toolSchema(NO_OAUTH_SCHEMA);
