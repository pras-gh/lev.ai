module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},28394,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function a(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function s(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function i(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),a=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!a)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:a}}e.s(["getSupabaseAuthEnv",()=>i,"getSupabasePublicEnv",()=>s,"hasSupabasePublicEnv",()=>a])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},34591,e=>e.a(async(t,r)=>{try{var a=e.i(23862),s=e.i(63021),i=t([a]);[a]=i.then?(await i)():i;let c=null;function n(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return c||(c=new a.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),c}async function o(){let e=n(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new s.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>n,"pingDatabase",()=>o]),r()}catch(e){r(e)}},!1),65297,e=>{"use strict";e.i(28394),e.s([])},84851,e=>e.a(async(t,r)=>{try{var a=e.i(34591),s=t([a]);[a]=s.then?(await s)():s,e.s([]),r()}catch(e){r(e)}},!1),72289,e=>e.a(async(t,r)=>{try{var a=e.i(34591);e.i(65297);var s=e.i(84851),i=t([a,s]);[a,s]=i.then?(await i)():i,e.s([]),r()}catch(e){r(e)}},!1),33691,e=>e.a(async(t,r)=>{try{var a=e.i(72289),s=t([a]);[a]=s.then?(await s)():s,e.s([]),r()}catch(e){r(e)}},!1),14568,e=>e.a(async(t,r)=>{try{var a=e.i(89171),s=e.i(33691),i=e.i(34591),n=t([s,i]);[s,i]=n.then?(await n)():n;let S=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function o(e,t){return a.NextResponse.json({error:e,details:t},{status:400})}function c(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function u(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function d(e,t){if(null!=e&&""!==e)return u(e,t)}function l(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!S.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return l(e,t)}function m(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function f(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function g(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function b(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?u(t,"businessId"):void 0,workspaceId:r?l(r,"workspaceId"):void 0}}function E(e){return{businessId:d(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function w(e){let t=e.get("page"),r=e.get("limit"),a=t?u(t,"page"):1,s=r?u(r,"limit"):25;if(s>200)throw Error("limit cannot be greater than 200");return{page:a,pageSize:s}}async function h(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let a=t??(0,i.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await a.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE id = $1::uuid
        AND business_id = $2
      LIMIT 1
      `,[e.workspaceId,e.businessId])).rows[0];if(!t)throw Error("workspaceId and businessId do not belong to the same workspace");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}if(e.workspaceId){let t=(await a.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE id = $1::uuid
      LIMIT 1
      `,[e.workspaceId])).rows[0];if(!t)throw Error("workspaceId not found");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}let s=e.businessId,n=r?.allowWorkspaceAutocreate??!0,o=await a.query(`
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,[s]);!o.rows[0]&&n&&(await a.query(`
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,[s]),o=await a.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,[s]));let c=o.rows[0];if(!c)throw Error("businessId not found");return{workspaceId:c.workspace_id,businessId:Number(c.business_id)}}e.s(["badRequest",()=>o,"parseBooleanQuery",()=>c,"parsePagination",()=>w,"readScopeFromBody",()=>E,"readScopeFromSearchParams",()=>b,"resolveScope",()=>h,"toOptionalBoolean",()=>g,"toOptionalNumber",()=>f,"toOptionalPositiveInt",()=>d,"toOptionalText",()=>m,"toOptionalUuid",()=>p,"toPositiveInt",()=>u]),r()}catch(e){r(e)}},!1),40423,e=>e.a(async(t,r)=>{try{var a=e.i(14568),s=e.i(33691),i=e.i(34591),n=e.i(28394),o=t([a,s,i]);[a,s,i]=o.then?(await o)():o;let E=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,w=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;class h extends Error{status;constructor(e,t){super(e),this.name="ApiAuthError",this.status=t}}function c(e,t){throw new h(e,t)}function u(e){return w.test(e.trim())}function d(e){if(!e)return null;if("string"==typeof e){let t=e.trim();return u(t)?t:null}if(Array.isArray(e)){for(let t of e){let e=d(t);if(e)return e}return null}if("object"==typeof e){let t=d(e.access_token)??d(e.accessToken)??d(e.token);return t||(d(e.session)??d(e.currentSession)??d(e.data))}return null}function l(e){let t=e.trim();if(!t)return null;if(u(t))return t;try{let e=decodeURIComponent(t);if(e!==t&&u(e))return e;let r=JSON.parse(e),a=d(r);if(a)return a}catch{}try{let e=JSON.parse(t);return d(e)}catch{return null}}async function p(e){let t,r=function(e){let t=e.headers.get("authorization");if(t){let[e,r]=t.split(/\s+/,2);if(e?.toLowerCase()==="bearer"&&r&&u(r))return r}for(let t of[e.headers.get("x-supabase-access-token"),e.headers.get("x-access-token")]){if(!t)continue;let e=l(t);if(e)return e}for(let t of e.cookies.getAll()){let e=t.name.toLowerCase();if(!("sb-access-token"===e||"supabase-access-token"===e||e.startsWith("sb-")&&e.endsWith("-auth-token")))continue;let r=l(t.value);if(r)return r}c("Missing access token. Send Authorization: Bearer <token>.",401)}(e),{supabaseUrl:a,supabaseAnonKey:s}=function(){try{return(0,n.getSupabaseAuthEnv)()}catch{return c("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",500)}}();try{t=await fetch(`${a}/auth/v1/user`,{method:"GET",headers:{apikey:s,Authorization:`Bearer ${r}`},cache:"no-store"})}catch{c("Unable to reach auth provider for session validation.",502)}(401===t.status||403===t.status)&&c("Invalid or expired session token.",401),t.ok||c("Session validation failed at auth provider.",502);let i=await t.json(),o="string"==typeof i.id?i.id.trim():"";return E.test(o)||c("Session missing valid user id.",401),{userId:o,email:"string"==typeof i.email?i.email:null}}async function m(e){let t=e.client??(0,i.getDbPool)(),r=(await t.query(`
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,[e.workspaceId,e.userId])).rows[0];return r||c("Forbidden: user does not belong to this workspace.",403),"active"!==(r.status??"").toLowerCase()&&c("Forbidden: workspace membership is not active.",403),{role:r.role}}function f(e){if(e instanceof h)return e.status}async function g(e){return p(e)}async function b(e){let t=await p(e.request),r=await (0,a.resolveScope)(e.scope,e.client,{allowWorkspaceAutocreate:!1}),s=await m({workspaceId:r.workspaceId,userId:t.userId,client:e.client});return{...r,userId:t.userId,workspaceRole:s.role}}e.s(["getAuthErrorStatus",()=>f,"resolveAuthorizedScope",()=>b,"resolveSessionUser",()=>g]),r()}catch(e){r(e)}},!1),66625,e=>e.a(async(t,r)=>{try{var a=e.i(33691),s=e.i(34591),i=t([a,s]);[a,s]=i.then?(await i)():i;let b=["marketing","saas","software","logistics","shipping","rent","utilities","fixed cost","internet","electricity","office","operations","professional","subscription","tax"],E=["fixed cost","rent","lease","electricity","internet","utility","salary","payroll","subscription","saas","insurance","office","emi"];function n(e){if(null==e)return 0;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t:0}function o(e){return Number(e.toFixed(2))}function c(e){return(e??"").toLowerCase().replace(/[^a-z0-9\s/]/g," ").replace(/\s+/g," ").trim()}function u(e){return!e||"object"!=typeof e||Array.isArray(e)?null:e}function d(e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}}function l(e,t){return t.some(t=>e.includes(t))}function p(e){return`₹${Math.abs(e).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`}function m(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}async function f(e){let t=function(e,t=new Date){if(!e){let e=t.getUTCFullYear(),r=t.getUTCMonth(),a=new Date(Date.UTC(e,r,1,0,0,0)),s=new Date(Date.UTC(e,r+1,1,0,0,0));return{key:`${e}-${String(r+1).padStart(2,"0")}`,label:a.toLocaleString("en-IN",{month:"long",year:"numeric",timeZone:"UTC"}),start:a,end:s}}if(!/^\d{4}-\d{2}$/.test(e))throw Error("month must be in YYYY-MM format");let[r,a]=e.split("-"),s=Number.parseInt(r,10),i=Number.parseInt(a,10);if(!Number.isInteger(s)||s<2e3||s>3e3)throw Error("month year must be between 2000 and 3000");if(!Number.isInteger(i)||i<1||i>12)throw Error("month value must be between 01 and 12");let n=new Date(Date.UTC(s,i-1,1,0,0,0)),o=new Date(Date.UTC(s,i,1,0,0,0));return{key:`${s}-${String(i).padStart(2,"0")}`,label:n.toLocaleString("en-IN",{month:"long",year:"numeric",timeZone:"UTC"}),start:n,end:o}}(e.month),r=e.client??(0,s.getDbPool)(),a=Number.isFinite(e.gstRateGuessPct)?Math.max(0,e.gstRateGuessPct):18,i=(await r.query(`
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS revenue,
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS expenses,
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS profit
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND occurred_at >= $2::timestamptz
      AND occurred_at < $3::timestamptz
    `,[e.workspaceId,t.start.toISOString(),t.end.toISOString()])).rows[0];if(!i)throw Error("Failed to compute monthly aggregates");let p=await r.query(`
    SELECT
      t.direction::text AS direction,
      t.amount_minor::text,
      t.gst_amount::text,
      t.gst_rate::text,
      c.name AS category_name,
      t.metadata
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status IN ('posted', 'reversed')
      AND t.gst_applicable = TRUE
      AND t.occurred_at >= $2::timestamptz
      AND t.occurred_at < $3::timestamptz
    `,[e.workspaceId,t.start.toISOString(),t.end.toISOString()]),m=0,f=0,g=0;for(let e of p.rows){let t=function(e){let t=n(e.gst_amount);if(t>0)return t;let r=n(e.gst_rate);return r<=0?0:Math.abs(n(e.amount_minor))*r/100}(e);if(t<=0)continue;if("credit"===e.direction){m+=t,g+=1;continue}let r=function(e){let t=u(e);if(t){for(let e of[t.gst_itc_eligible,t.itcEligible,t.gstItcEligible]){let t=d(e);if(void 0!==t)return t}for(let e of[t.gst,t.tax,t.claims]){let t=u(e);if(t)for(let e of[t.itcEligible,t.gstItcEligible,t.itc_eligible,t.inputCreditEligible]){let t=d(e);if(void 0!==t)return t}}}}(e.metadata);if(!0===r){f+=t;continue}void 0===r&&function(e){let t=c(e);return!!t&&l(t,b)}(e.category_name)&&(f+=t)}let w=await r.query(`
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS closing_cash
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND occurred_at < $2::timestamptz
    `,[e.workspaceId,t.end.toISOString()]),h=await r.query(`
    SELECT
      t.amount_minor::text,
      t.occurred_at::text,
      c.name AS category_name,
      t.description,
      t.counterparty,
      t.metadata
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.direction = 'debit'
      AND t.occurred_at >= ($2::timestamptz - INTERVAL '90 days')
      AND t.occurred_at < $2::timestamptz
    `,[e.workspaceId,t.end.toISOString()]),S=await r.query(`
    SELECT
      COALESCE(SUM(amount_minor), 0)::text AS expense_90d
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND direction = 'debit'
      AND occurred_at >= ($2::timestamptz - INTERVAL '90 days')
      AND occurred_at < $2::timestamptz
    `,[e.workspaceId,t.end.toISOString()]),x=0,_=0;for(let e of h.rows){if(!function(e){let t=c([e.category_name,e.description,e.counterparty].filter(Boolean).join(" "));if(t&&l(t,E))return!0;let r=u(e.metadata),a=r?u(r.categorization):null;return(a&&"string"==typeof a.categoryName?c(a.categoryName):"").includes("fixed cost")}(e))continue;let r=Math.abs(n(e.amount_minor));x+=r;let a=new Date(e.occurred_at).getTime();Number.isFinite(a)&&a>=t.start.getTime()&&a<t.end.getTime()&&(_+=r)}let A=n(i.revenue),y=n(i.expenses),I=n(i.profit),v=n(w.rows[0]?.closing_cash),N=n(S.rows[0]?.expense_90d)/3,k=m,T=!1;0===g&&A>0&&(k=A*a/100,T=!0);let L=f,C=Math.max(0,k-L),D=x/3,U=Math.max(0,D-_),R=Math.max(0,.25*N),O=D>0?U:R,M=Math.max(0,v-C-O);return{month:t.key,monthLabel:t.label,periodStart:t.start.toISOString(),periodEndExclusive:t.end.toISOString(),generatedAt:new Date().toISOString(),metrics:{revenue:o(A),expenses:o(y),profitEstimate:o(I),gstPayableEstimate:o(C),safeToSpendCash:o(M),closingCashBalance:o(v),gstPayableReserve:o(C),upcomingBillsReserve:o(O),reserveBuffer:o(O),expectedFixedCostsNext30Days:o(D),alreadyPaidFixedCostsThisMonth:o(_),fallbackExpenseBufferUsed:o(R),outputGstEstimate:o(k),eligibleItcEstimate:o(L),profitMarginPct:o(A>0?I/A*100:0)},assumptions:["Revenue = sum(credit). Expenses = sum(debit abs). Profit estimate = Revenue - Expenses (non-hidden, status != pending).",`GST payable estimate = max(0, output GST - eligible ITC). ${T?`Output GST fallback applied as Revenue * ${o(a)}% due to missing GST split on sales.`:"Output GST used transaction-level GST amounts/rates."}`,"Safe-to-spend cash = cash on hand - GST payable reserve - upcoming bills reserve. Upcoming reserve = max(0, expected fixed costs next 30 days - already paid fixed costs this month); fallback buffer 25% of average monthly expenses when fixed-cost signal is unavailable.","For statutory GST filing in India, reconcile with GSTR-1/GSTR-3B and GSTR-2B eligible ITC as per CGST Act Section 16/17 conditions."]}}function g(e){let{summary:t}=e,r=new Date(t.generatedAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}),a=t.assumptions.map(e=>`<li>${m(e)}</li>`).join(""),s=e.autoPrint?'<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));</script>':"";return`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Monthly Finance Summary - ${m(t.month)}</title>
    <style>
      :root {
        --text: #0f172a;
        --muted: #475569;
        --line: #e2e8f0;
        --bg: #f8fafc;
        --card: #ffffff;
        --accent: #0f766e;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        color: var(--text);
        background: var(--bg);
      }
      .page {
        max-width: 980px;
        margin: 16px auto;
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 20px;
      }
      .top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.2;
      }
      .sub {
        margin-top: 4px;
        color: var(--muted);
        font-size: 13px;
      }
      .actions {
        display: flex;
        gap: 8px;
      }
      .btn {
        border: 1px solid var(--line);
        background: #fff;
        color: var(--text);
        border-radius: 8px;
        font-size: 12px;
        padding: 8px 10px;
        cursor: pointer;
      }
      .btn-primary {
        border-color: #134e4a;
        background: var(--accent);
        color: #fff;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 10px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 12px;
        background: #fff;
      }
      .label {
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .value {
        margin-top: 6px;
        font-size: 22px;
        font-weight: 700;
      }
      .meta-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .meta {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px;
        font-size: 13px;
      }
      .meta strong {
        display: block;
        margin-bottom: 4px;
      }
      .section-title {
        margin-top: 16px;
        margin-bottom: 8px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
      }
      ul {
        margin: 8px 0 0 16px;
        padding: 0;
        font-size: 13px;
        color: var(--text);
      }
      li { margin-bottom: 6px; }
      .footer {
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px dashed var(--line);
        font-size: 12px;
        color: var(--muted);
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      @media print {
        body {
          background: #fff;
        }
        .page {
          margin: 0;
          border: none;
          border-radius: 0;
          padding: 0;
          max-width: none;
        }
        .actions {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <div class="top">
        <div>
          <h1>Monthly Finance Summary</h1>
          <div class="sub">Period: ${m(t.monthLabel)} (${m(t.month)})</div>
          <div class="sub">Workspace: ${m(e.workspaceId)} • Business: ${e.businessId}</div>
          <div class="sub">Generated: ${m(r)} (UTC)</div>
        </div>
        <div class="actions">
          <button class="btn" type="button" onclick="window.location.reload()">Refresh</button>
          <button class="btn btn-primary" type="button" onclick="window.print()">Download PDF</button>
        </div>
      </div>

      <section class="grid">
        <article class="card">
          <div class="label">Revenue</div>
          <div class="value">${p(t.metrics.revenue)}</div>
        </article>
        <article class="card">
          <div class="label">Expenses</div>
          <div class="value">${p(t.metrics.expenses)}</div>
        </article>
        <article class="card">
          <div class="label">Profit Estimate</div>
          <div class="value">${p(t.metrics.profitEstimate)}</div>
        </article>
        <article class="card">
          <div class="label">GST Payable Estimate</div>
          <div class="value">${p(t.metrics.gstPayableEstimate)}</div>
        </article>
        <article class="card">
          <div class="label">Safe-to-Spend Cash</div>
          <div class="value">${p(t.metrics.safeToSpendCash)}</div>
        </article>
      </section>

      <section class="meta-grid">
        <article class="meta">
          <strong>Closing Cash Balance</strong>
          ${p(t.metrics.closingCashBalance)}
        </article>
        <article class="meta">
          <strong>Upcoming Bills Reserve</strong>
          ${p(t.metrics.upcomingBillsReserve)}
        </article>
        <article class="meta">
          <strong>Profit Margin</strong>
          ${t.metrics.profitMarginPct.toFixed(2)}%
        </article>
      </section>

      <section>
        <h2 class="section-title">Computation Notes</h2>
        <ul>${a}</ul>
      </section>

      <div class="footer">
        This is an ops estimate for India SMB finance monitoring. Statutory output must be confirmed during return filing and month close.
      </div>
    </main>
    ${s}
  </body>
</html>`}e.s(["buildMonthlySummaryHtml",()=>g,"computeMonthlySummary",()=>f]),r()}catch(e){r(e)}},!1),87468,e=>e.a(async(t,r)=>{try{var a=e.i(85635),s=e.i(66625),i=e.i(91268),n=e.i(33691),o=e.i(34591),c=t([a,s,i,n,o]);function u(e){let t=new Headers;for(let r of(t.set("content-type","application/json"),["authorization","x-supabase-access-token","x-access-token","cookie"])){let a=e.headers.get(r);a&&t.set(r,a)}return t}function d(e){if(!e)return 0;let t=Date.parse(e);return Number.isNaN(t)?0:t}async function l(e){var t;let r=(0,o.getDbPool)();return t=(await r.query(`
    SELECT
      (
        SELECT COUNT(*)::text
        FROM transactions t
        WHERE t.workspace_id = $1::uuid
          AND t.is_hidden = FALSE
          AND t.status <> 'pending'
      ) AS tx_total,
      (
        SELECT COUNT(*)::text
        FROM transactions t
        WHERE t.workspace_id = $1::uuid
          AND t.is_hidden = FALSE
          AND t.status <> 'pending'
          AND t.category_id IS NOT NULL
      ) AS tx_categorized,
      (
        SELECT COUNT(*)::text
        FROM transactions t
        WHERE t.workspace_id = $1::uuid
          AND t.is_hidden = FALSE
          AND t.status <> 'pending'
          AND t.matched = TRUE
      ) AS tx_matched,
      (
        SELECT MAX(t.updated_at)::text
        FROM transactions t
        WHERE t.workspace_id = $1::uuid
      ) AS tx_latest_updated_at,
      (
        SELECT COUNT(*)::text
        FROM alerts a
        WHERE a.workspace_id = $1::uuid
          AND a.status = 'open'
      ) AS open_alerts,
      (
        SELECT MAX(COALESCE(a.resolved_at, a.created_at))::text
        FROM alerts a
        WHERE a.workspace_id = $1::uuid
      ) AS alerts_latest_touched_at
    `,[e])).rows[0],{txTotal:Number(t?.tx_total??"0"),txCategorized:Number(t?.tx_categorized??"0"),txMatched:Number(t?.tx_matched??"0"),openAlerts:Number(t?.open_alerts??"0"),txLatestUpdatedAt:t?.tx_latest_updated_at??null,alertsLatestTouchedAt:t?.alerts_latest_touched_at??null}}async function p(e){let t=await fetch(new URL("/api/transactions/reconcile/suggest",e.request.url),{method:"POST",headers:u(e.request),cache:"no-store",body:JSON.stringify({workspaceId:e.scope.workspaceId,businessId:e.scope.businessId,limit:e.limit,maxDateWindowDays:e.maxDateWindowDays,confidenceThreshold:e.confidenceThreshold})}),r=await t.json().catch(()=>null);if(!t.ok){var a;throw Error((a="Failed to run reconciliation suggestion step",r&&"object"==typeof r?"string"==typeof r.error&&r.error.trim()?r.error.trim():"string"==typeof r.message&&r.message.trim()?r.message.trim():a:a))}let s=r&&"object"==typeof r?r:{};return{workspaceId:"string"==typeof s.workspaceId?s.workspaceId:e.scope.workspaceId,businessId:"number"==typeof s.businessId?s.businessId:e.scope.businessId,scanned:Number(s.scanned??0),suggestions:Number(s.suggestions??0),updatedRows:Number(s.updatedRows??0),clearedRows:Number(s.clearedRows??0),recon_match_pct:Number(s.recon_match_pct??0)}}async function m(e){let t=Date.now(),r=function(e){if(!e)return;let t=e.trim();if(t){if(!/^\d{4}-\d{2}$/.test(t))throw Error("month must be in YYYY-MM format");return t}}(e.options?.month),n=await l(e.scope.workspaceId),o=e.options?.ruleLimit??2e3,c=e.options?.confidenceThreshold??.65,u=e.options?.reconcileLimit??1200,m=e.options?.reconcileMaxDateWindowDays??3,f=e.options?.reconcileConfidenceThreshold??.6,g=e.options?.sendWhatsAppDigest??!1,b=Date.now(),E=await (0,i.applyRulesV0ForWorkspace)({workspaceId:e.scope.workspaceId,businessId:e.scope.businessId,limit:o,confidenceThreshold:c}),w=Date.now()-b,h=Date.now(),S=await p({request:e.request,scope:e.scope,limit:u,maxDateWindowDays:m,confidenceThreshold:f}),x=Date.now()-h,_=Date.now(),A=await (0,a.evaluateWorkspaceAlerts)({workspaceId:e.scope.workspaceId,businessId:e.scope.businessId,sendWhatsAppDigest:g}),y=Date.now()-_,I=Date.now(),v=await (0,s.computeMonthlySummary)({workspaceId:e.scope.workspaceId,businessId:e.scope.businessId,month:r}),N=Date.now()-I,k=await l(e.scope.workspaceId),T=Date.now()-t,L={txTotal:k.txTotal-n.txTotal,txCategorized:k.txCategorized-n.txCategorized,txMatched:k.txMatched-n.txMatched,openAlerts:k.openAlerts-n.openAlerts},C=0!==L.txTotal||0!==L.txCategorized||0!==L.txMatched||0!==L.openAlerts||d(k.txLatestUpdatedAt)>d(n.txLatestUpdatedAt)||d(k.alertsLatestTouchedAt)>d(n.alertsLatestTouchedAt);return{workspaceId:e.scope.workspaceId,businessId:e.scope.businessId,month:v.month,monthLabel:v.monthLabel,completedAt:new Date().toISOString(),durationMs:T,stageDurations:{categorizeMs:w,reconcileMs:x,alertsMs:y,reportMs:N},categorize:E,reconcile:S,alerts:{result:A,statusCounts:function(e){let t=[e.alerts.gstDue.alert.status,e.alerts.itcMismatch.alert.status,e.alerts.refundSpike.alert.status,e.alerts.reconciliationGap.alert.status,e.alerts.cashRunwayRisk.alert.status,e.alerts.syncFailure.alert.status,e.alerts.anomalyDetected.alert.status],r=0,a=0,s=0,i=0;for(let e of t){if("opened"===e){r+=1;continue}if("updated"===e){a+=1;continue}if("resolved"===e){s+=1;continue}i+=1}return{opened:r,updated:a,resolved:s,none:i}}(A)},report:{generatedAt:v.generatedAt,metrics:v.metrics},verification:{before:n,after:k,delta:L,checks:{apiRun:!0,dbTouched:C,alertsEvaluated:!0,reportGenerated:!!v.generatedAt}}}}[a,s,i,n,o]=c.then?(await c)():c,e.s(["forwardAuthHeaders",()=>u,"runCloseMonthPipeline",()=>m]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__cae12076._.js.map