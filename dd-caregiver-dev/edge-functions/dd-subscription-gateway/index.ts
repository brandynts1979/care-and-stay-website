import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/*
 * DD Parent App billing gateway — guarded prelaunch version.
 * Checkout and billing portal are intentionally DISABLED.
 * To launch, a separate reviewed implementation must remove this guard,
 * configure Stripe secrets, tax registrations and webhook/entitlement verification.
 */
const ORIGIN = "https://care-and-stay-dd-caregiver-dev.onrender.com";
const PRICE_ID = "price_1Ubr0GHU2Vcv1mFQgOfj2Ww8";
const CHECKOUT_RELEASE_APPROVED = false; // Never change without documented launch authorization.
const headers = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "Origin",
  "Content-Type": "application/json"
};
function response(status: number, body: Record<string,unknown>) {
  return new Response(JSON.stringify(body), {status, headers});
}
Deno.serve(async (req: Request) => {
  if (req.headers.get("origin") !== ORIGIN) return response(403,{error:"Origin not permitted"});
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers});
  if (req.method !== "POST") return response(405,{error:"Method not allowed"});
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return response(401,{error:"Authentication required"});
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return response(503,{error:"Service configuration unavailable"});
  try {
    const who = await fetch(url+"/auth/v1/user",{headers:{apikey:anonKey,authorization:auth}});
    if (!who.ok) return response(401,{error:"Invalid or expired session"});
    const user = await who.json();
    if (typeof user.id !== "string") return response(401,{error:"Invalid account"});
    let body:Record<string,unknown>;
    try {body=await req.json()} catch{return response(400,{error:"Invalid request"})}
    const action=body.action;
    if (action==="checkout" || action==="portal") {
      // No live Checkout, no saved-card collection, no Stripe calls.
      return response(503,{
        error:"DD subscriptions are not available for purchase yet",
        checkout_enabled:CHECKOUT_RELEASE_APPROVED
      });
    }
    if (action!=="status") return response(400,{error:"Unsupported billing action"});
    const query=url+"/rest/v1/dd_subscription_entitlements?owner_id=eq."+encodeURIComponent(user.id)
      +"&select=status,current_period_end,cancel_at_period_end,stripe_price_id&limit=1";
    const result=await fetch(query,{headers:{apikey:serviceKey,authorization:"Bearer "+serviceKey}});
    if (!result.ok) return response(503,{error:"Subscription status unavailable"});
    const records=await result.json();
    const record=Array.isArray(records)?records[0]:null;
    const status=record?.status || "none";
    const validPrice=record?.stripe_price_id===PRICE_ID;
    const period=record?.current_period_end;
    const stillCurrent=period && !Number.isNaN(Date.parse(period)) && Date.parse(period)>Date.now();
    const entitled=CHECKOUT_RELEASE_APPROVED && validPrice && stillCurrent && (status==="active"||status==="trialing");
    return response(200,{
      product:"dd_parent_app",
      monthly_price_usd:39,
      tax_behavior:"exclusive",
      checkout_enabled:CHECKOUT_RELEASE_APPROVED,
      subscription_status:status,
      entitled:Boolean(entitled),
      // Do not expose Stripe customer/subscription identifiers to the browser.
    });
  } catch {
    return response(503,{error:"Subscription service unavailable"});
  }
});
