import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGIN = "https://care-and-stay-dd-caregiver-dev.onrender.com";
const BUCKET = "dd-private-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg"
};
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

function respond(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
function hasSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "application/pdf") return bytes.length >= 5 && [37,80,68,70,45].every((v,i)=>bytes[i]===v);
  if (type === "image/png") return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if (type === "image/jpeg") return bytes.length >= 4 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255 && bytes[bytes.length-2]===255 && bytes[bytes.length-1]===217;
  return false;
}

Deno.serve(async (request: Request) => {
  if (request.headers.get("origin") !== ALLOWED_ORIGIN) return respond(403, "Unapproved origin.");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return respond(405, "Method not allowed.");
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ")) return respond(401, "Sign in required.");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return respond(503, "Upload service configuration unavailable.");

  try {
    const userResponse = await fetch(url + "/auth/v1/user", {
      headers: { apikey: anonKey, authorization: token }
    });
    if (!userResponse.ok) return respond(401, "Session invalid or expired.");
    const user = await userResponse.json();
    if (!UUID.test(user.id || "")) return respond(401, "Session invalid.");

    const length = Number(request.headers.get("content-length") || "0");
    if (length > MAX_BYTES + 30000) return respond(413, "File too large.");

    const form = await request.formData();
    const personId = form.get("person_id");
    const title = form.get("document_name");
    const category = form.get("category");
    const notes = form.get("notes");
    const file = form.get("file");
    if (typeof personId !== "string" || !UUID.test(personId)) return respond(400, "Choose a valid fictional profile.");
    if (typeof title !== "string" || !title.trim() || title.trim().length > 200) return respond(400, "Enter a document name (max 200 characters).");
    const allowedCategories = new Set(["education_iep","therapy","medical","benefits","legal","other"]);
    if (typeof category !== "string" || !allowedCategories.has(category)) return respond(400, "Invalid document category.");
    if (typeof notes !== "string" || notes.length > 1000) return respond(400, "Notes exceed limit.");
    if (!(file instanceof File)) return respond(400, "Choose a test PDF or image.");
    if (file.size < 1 || file.size > MAX_BYTES) return respond(413, "File must be 1 byte to 10 MB.");
    if (!Object.hasOwn(TYPES, file.type)) return respond(415, "Only PDF, PNG or JPEG files allowed.");

    const content = new Uint8Array(await file.arrayBuffer());
    if (!hasSignature(content, file.type)) return respond(415, "File contents do not match its declared type.");

    const headers = { apikey: anonKey, authorization: token };
    // Service role is used ONLY after authenticating the user and verifying ownership,
    // and ONLY for storing/cleaning up the exact validated object path.
    // This avoids direct authenticated Storage INSERT access bypassing validation.
    const storageHeaders = { apikey: serviceKey, authorization: "Bearer " + serviceKey };
    const profileResponse = await fetch(url + "/rest/v1/dd_people?select=id&owner_id=eq." + user.id + "&id=eq." + personId, { headers });
    if (!profileResponse.ok) return respond(503, "Unable to verify profile access.");
    const owned = await profileResponse.json();
    if (!Array.isArray(owned) || owned.length !== 1) return respond(403, "You cannot upload to this profile.");

    const path = user.id + "/" + personId + "/" + crypto.randomUUID() + "." + TYPES[file.type];
    const upload = await fetch(url + "/storage/v1/object/" + BUCKET + "/" + path, {
      method: "POST",
      headers: { ...storageHeaders, "Content-Type": file.type, "x-upsert": "false" },
      body: content
    });
    if (!upload.ok) return respond(502, "File storage rejected the upload.");

    const recordResponse = await fetch(url + "/rest/v1/dd_documents", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        person_id: personId,
        document_name: title.trim(),
        category,
        file_path: path,
        media_type: file.type,
        file_size: content.byteLength,
        notes: notes.trim() || null
      })
    });
    if (!recordResponse.ok) {
      const cleanup = await fetch(url + "/storage/v1/object/" + BUCKET, {
        method: "DELETE",
        headers: { ...storageHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [path] })
      });
      if (!cleanup.ok) console.error("DD upload metadata failure: orphan cleanup unsuccessful");
      return respond(502, "Document metadata could not be saved. Contact support if the problem persists.");
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("DD upload failed", error instanceof Error ? error.name : "unknown error");
    return respond(500, "Upload failed. Please retry later.");
  }
});
