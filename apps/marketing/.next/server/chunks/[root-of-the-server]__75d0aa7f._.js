module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},28394,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function a(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function i(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function n(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),a=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!a)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:a}}e.s(["getSupabaseAuthEnv",()=>n,"getSupabasePublicEnv",()=>i,"hasSupabasePublicEnv",()=>a])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},34591,e=>e.a(async(t,r)=>{try{var a=e.i(23862),i=e.i(63021),n=t([a]);[a]=n.then?(await n)():n;let l=null;function s(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return l||(l=new a.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),l}async function o(){let e=s(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new i.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>s,"pingDatabase",()=>o]),r()}catch(e){r(e)}},!1),65297,e=>{"use strict";e.i(28394),e.s([])},84851,e=>e.a(async(t,r)=>{try{var a=e.i(34591),i=t([a]);[a]=i.then?(await i)():i,e.s([]),r()}catch(e){r(e)}},!1),72289,e=>e.a(async(t,r)=>{try{var a=e.i(34591);e.i(65297);var i=e.i(84851),n=t([a,i]);[a,i]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),33691,e=>e.a(async(t,r)=>{try{var a=e.i(72289),i=t([a]);[a]=i.then?(await i)():i,e.s([]),r()}catch(e){r(e)}},!1),14568,e=>e.a(async(t,r)=>{try{var a=e.i(89171),i=e.i(33691),n=e.i(34591),s=t([i,n]);[i,n]=s.then?(await s)():s;let S=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function o(e,t){return a.NextResponse.json({error:e,details:t},{status:400})}function l(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function c(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function u(e,t){if(null!=e&&""!==e)return c(e,t)}function d(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!S.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return d(e,t)}function m(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function f(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function g(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function h(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?c(t,"businessId"):void 0,workspaceId:r?d(r,"workspaceId"):void 0}}function b(e){return{businessId:u(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function E(e){let t=e.get("page"),r=e.get("limit"),a=t?c(t,"page"):1,i=r?c(r,"limit"):25;if(i>200)throw Error("limit cannot be greater than 200");return{page:a,pageSize:i}}async function w(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let a=t??(0,n.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await a.query(`
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
      `,[e.workspaceId])).rows[0];if(!t)throw Error("workspaceId not found");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}let i=e.businessId,s=r?.allowWorkspaceAutocreate??!0,o=await a.query(`
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,[i]);!o.rows[0]&&s&&(await a.query(`
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,[i]),o=await a.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,[i]));let l=o.rows[0];if(!l)throw Error("businessId not found");return{workspaceId:l.workspace_id,businessId:Number(l.business_id)}}e.s(["badRequest",()=>o,"parseBooleanQuery",()=>l,"parsePagination",()=>E,"readScopeFromBody",()=>b,"readScopeFromSearchParams",()=>h,"resolveScope",()=>w,"toOptionalBoolean",()=>g,"toOptionalNumber",()=>f,"toOptionalPositiveInt",()=>u,"toOptionalText",()=>m,"toOptionalUuid",()=>p,"toPositiveInt",()=>c]),r()}catch(e){r(e)}},!1),40423,e=>e.a(async(t,r)=>{try{var a=e.i(14568),i=e.i(33691),n=e.i(34591),s=e.i(28394),o=t([a,i,n]);[a,i,n]=o.then?(await o)():o;let b=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,E=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;class w extends Error{status;constructor(e,t){super(e),this.name="ApiAuthError",this.status=t}}function l(e,t){throw new w(e,t)}function c(e){return E.test(e.trim())}function u(e){if(!e)return null;if("string"==typeof e){let t=e.trim();return c(t)?t:null}if(Array.isArray(e)){for(let t of e){let e=u(t);if(e)return e}return null}if("object"==typeof e){let t=u(e.access_token)??u(e.accessToken)??u(e.token);return t||(u(e.session)??u(e.currentSession)??u(e.data))}return null}function d(e){let t=e.trim();if(!t)return null;if(c(t))return t;try{let e=decodeURIComponent(t);if(e!==t&&c(e))return e;let r=JSON.parse(e),a=u(r);if(a)return a}catch{}try{let e=JSON.parse(t);return u(e)}catch{return null}}async function p(e){let t,r=function(e){let t=e.headers.get("authorization");if(t){let[e,r]=t.split(/\s+/,2);if(e?.toLowerCase()==="bearer"&&r&&c(r))return r}for(let t of[e.headers.get("x-supabase-access-token"),e.headers.get("x-access-token")]){if(!t)continue;let e=d(t);if(e)return e}for(let t of e.cookies.getAll()){let e=t.name.toLowerCase();if(!("sb-access-token"===e||"supabase-access-token"===e||e.startsWith("sb-")&&e.endsWith("-auth-token")))continue;let r=d(t.value);if(r)return r}l("Missing access token. Send Authorization: Bearer <token>.",401)}(e),{supabaseUrl:a,supabaseAnonKey:i}=function(){try{return(0,s.getSupabaseAuthEnv)()}catch{return l("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",500)}}();try{t=await fetch(`${a}/auth/v1/user`,{method:"GET",headers:{apikey:i,Authorization:`Bearer ${r}`},cache:"no-store"})}catch{l("Unable to reach auth provider for session validation.",502)}(401===t.status||403===t.status)&&l("Invalid or expired session token.",401),t.ok||l("Session validation failed at auth provider.",502);let n=await t.json(),o="string"==typeof n.id?n.id.trim():"";return b.test(o)||l("Session missing valid user id.",401),{userId:o,email:"string"==typeof n.email?n.email:null}}async function m(e){let t=e.client??(0,n.getDbPool)(),r=(await t.query(`
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,[e.workspaceId,e.userId])).rows[0];return r||l("Forbidden: user does not belong to this workspace.",403),"active"!==(r.status??"").toLowerCase()&&l("Forbidden: workspace membership is not active.",403),{role:r.role}}function f(e){if(e instanceof w)return e.status}async function g(e){return p(e)}async function h(e){let t=await p(e.request),r=await (0,a.resolveScope)(e.scope,e.client,{allowWorkspaceAutocreate:!1}),i=await m({workspaceId:r.workspaceId,userId:t.userId,client:e.client});return{...r,userId:t.userId,workspaceRole:i.role}}e.s(["getAuthErrorStatus",()=>f,"resolveAuthorizedScope",()=>h,"resolveSessionUser",()=>g]),r()}catch(e){r(e)}},!1),66625,e=>e.a(async(t,r)=>{try{var a=e.i(33691),i=e.i(34591),n=t([a,i]);[a,i]=n.then?(await n)():n;let h=["marketing","saas","software","logistics","shipping","rent","utilities","fixed cost","internet","electricity","office","operations","professional","subscription","tax"],b=["fixed cost","rent","lease","electricity","internet","utility","salary","payroll","subscription","saas","insurance","office","emi"];function s(e){if(null==e)return 0;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t:0}function o(e){return Number(e.toFixed(2))}function l(e){return(e??"").toLowerCase().replace(/[^a-z0-9\s/]/g," ").replace(/\s+/g," ").trim()}function c(e){return!e||"object"!=typeof e||Array.isArray(e)?null:e}function u(e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}}function d(e,t){return t.some(t=>e.includes(t))}function p(e){return`₹${Math.abs(e).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`}function m(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}async function f(e){let t=function(e,t=new Date){if(!e){let e=t.getUTCFullYear(),r=t.getUTCMonth(),a=new Date(Date.UTC(e,r,1,0,0,0)),i=new Date(Date.UTC(e,r+1,1,0,0,0));return{key:`${e}-${String(r+1).padStart(2,"0")}`,label:a.toLocaleString("en-IN",{month:"long",year:"numeric",timeZone:"UTC"}),start:a,end:i}}if(!/^\d{4}-\d{2}$/.test(e))throw Error("month must be in YYYY-MM format");let[r,a]=e.split("-"),i=Number.parseInt(r,10),n=Number.parseInt(a,10);if(!Number.isInteger(i)||i<2e3||i>3e3)throw Error("month year must be between 2000 and 3000");if(!Number.isInteger(n)||n<1||n>12)throw Error("month value must be between 01 and 12");let s=new Date(Date.UTC(i,n-1,1,0,0,0)),o=new Date(Date.UTC(i,n,1,0,0,0));return{key:`${i}-${String(n).padStart(2,"0")}`,label:s.toLocaleString("en-IN",{month:"long",year:"numeric",timeZone:"UTC"}),start:s,end:o}}(e.month),r=e.client??(0,i.getDbPool)(),a=Number.isFinite(e.gstRateGuessPct)?Math.max(0,e.gstRateGuessPct):18,n=(await r.query(`
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
    `,[e.workspaceId,t.start.toISOString(),t.end.toISOString()])).rows[0];if(!n)throw Error("Failed to compute monthly aggregates");let p=await r.query(`
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
    `,[e.workspaceId,t.start.toISOString(),t.end.toISOString()]),m=0,f=0,g=0;for(let e of p.rows){let t=function(e){let t=s(e.gst_amount);if(t>0)return t;let r=s(e.gst_rate);return r<=0?0:Math.abs(s(e.amount_minor))*r/100}(e);if(t<=0)continue;if("credit"===e.direction){m+=t,g+=1;continue}let r=function(e){let t=c(e);if(t){for(let e of[t.gst_itc_eligible,t.itcEligible,t.gstItcEligible]){let t=u(e);if(void 0!==t)return t}for(let e of[t.gst,t.tax,t.claims]){let t=c(e);if(t)for(let e of[t.itcEligible,t.gstItcEligible,t.itc_eligible,t.inputCreditEligible]){let t=u(e);if(void 0!==t)return t}}}}(e.metadata);if(!0===r){f+=t;continue}void 0===r&&function(e){let t=l(e);return!!t&&d(t,h)}(e.category_name)&&(f+=t)}let E=await r.query(`
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS closing_cash
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND occurred_at < $2::timestamptz
    `,[e.workspaceId,t.end.toISOString()]),w=await r.query(`
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
    `,[e.workspaceId,t.end.toISOString()]),x=0,y=0;for(let e of w.rows){if(!function(e){let t=l([e.category_name,e.description,e.counterparty].filter(Boolean).join(" "));if(t&&d(t,b))return!0;let r=c(e.metadata),a=r?c(r.categorization):null;return(a&&"string"==typeof a.categoryName?l(a.categoryName):"").includes("fixed cost")}(e))continue;let r=Math.abs(s(e.amount_minor));x+=r;let a=new Date(e.occurred_at).getTime();Number.isFinite(a)&&a>=t.start.getTime()&&a<t.end.getTime()&&(y+=r)}let v=s(n.revenue),A=s(n.expenses),_=s(n.profit),N=s(E.rows[0]?.closing_cash),I=s(S.rows[0]?.expense_90d)/3,R=m,C=!1;0===g&&v>0&&(R=v*a/100,C=!0);let T=f,k=Math.max(0,R-T),U=x/3,P=Math.max(0,U-y),L=Math.max(0,.25*I),O=U>0?P:L,D=Math.max(0,N-k-O);return{month:t.key,monthLabel:t.label,periodStart:t.start.toISOString(),periodEndExclusive:t.end.toISOString(),generatedAt:new Date().toISOString(),metrics:{revenue:o(v),expenses:o(A),profitEstimate:o(_),gstPayableEstimate:o(k),safeToSpendCash:o(D),closingCashBalance:o(N),gstPayableReserve:o(k),upcomingBillsReserve:o(O),reserveBuffer:o(O),expectedFixedCostsNext30Days:o(U),alreadyPaidFixedCostsThisMonth:o(y),fallbackExpenseBufferUsed:o(L),outputGstEstimate:o(R),eligibleItcEstimate:o(T),profitMarginPct:o(v>0?_/v*100:0)},assumptions:["Revenue = sum(credit). Expenses = sum(debit abs). Profit estimate = Revenue - Expenses (non-hidden, status != pending).",`GST payable estimate = max(0, output GST - eligible ITC). ${C?`Output GST fallback applied as Revenue * ${o(a)}% due to missing GST split on sales.`:"Output GST used transaction-level GST amounts/rates."}`,"Safe-to-spend cash = cash on hand - GST payable reserve - upcoming bills reserve. Upcoming reserve = max(0, expected fixed costs next 30 days - already paid fixed costs this month); fallback buffer 25% of average monthly expenses when fixed-cost signal is unavailable.","For statutory GST filing in India, reconcile with GSTR-1/GSTR-3B and GSTR-2B eligible ITC as per CGST Act Section 16/17 conditions."]}}function g(e){let{summary:t}=e,r=new Date(t.generatedAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}),a=t.assumptions.map(e=>`<li>${m(e)}</li>`).join(""),i=e.autoPrint?'<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));</script>':"";return`<!doctype html>
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
    ${i}
  </body>
</html>`}e.s(["buildMonthlySummaryHtml",()=>g,"computeMonthlySummary",()=>f]),r()}catch(e){r(e)}},!1),22010,e=>e.a(async(t,r)=>{try{var a=e.i(89171),i=e.i(14568),n=e.i(40423),s=e.i(66625),o=t([i,n,s]);async function l(e,{params:t}){try{let r,o=await (0,n.resolveAuthorizedScope)({request:e,scope:(0,i.readScopeFromSearchParams)(e.nextUrl.searchParams)}),{month:l}=await t,c=e.nextUrl.searchParams.get("gstRateGuess");if(c&&""!==c.trim()){let e=Number(c);if(!Number.isFinite(e)||e<0||e>100)return(0,i.badRequest)("gstRateGuess must be a number between 0 and 100");r=e}let u=await (0,s.computeMonthlySummary)({workspaceId:o.workspaceId,businessId:o.businessId,month:l,gstRateGuessPct:r}),d="true"===e.nextUrl.searchParams.get("autoPrint"),p=(0,s.buildMonthlySummaryHtml)({summary:u,workspaceId:o.workspaceId,businessId:o.businessId,autoPrint:d});return new a.NextResponse(p,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Disposition":`inline; filename="monthly-summary-${u.month}.html"`}})}catch(i){let e,t=i instanceof Error?i.message:"Failed to generate monthly summary HTML",r=(0,n.getAuthErrorStatus)(i);if(r)return a.NextResponse.json({error:t},{status:r});return a.NextResponse.json({error:t},{status:(e=i instanceof Error?i.message:"Unknown error").includes("month ")||e.includes("Provide at least one scope identifier")||e.includes("not found")||e.includes("must be")?400:500})}}[i,n,s]=o.then?(await o)():o,e.s(["GET",()=>l,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),r()}catch(e){r(e)}},!1),87781,e=>e.a(async(t,r)=>{try{var a=e.i(47909),i=e.i(74017),n=e.i(96250),s=e.i(59756),o=e.i(61916),l=e.i(74677),c=e.i(69741),u=e.i(16795),d=e.i(87718),p=e.i(95169),m=e.i(47587),f=e.i(66012),g=e.i(70101),h=e.i(26937),b=e.i(10372),E=e.i(93695);e.i(52474);var w=e.i(220),S=e.i(22010),x=t([S]);[S]=x.then?(await x)():x;let A=new a.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/reports/monthly/[month]/route",pathname:"/api/reports/monthly/[month]",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/reports/monthly/[month]/route.ts",nextConfigOutput:"",userland:S}),{workAsyncStorage:_,workUnitAsyncStorage:N,serverHooks:I}=A;function y(){return(0,n.patchFetch)({workAsyncStorage:_,workUnitAsyncStorage:N})}async function v(e,t,r){A.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let a="/api/reports/monthly/[month]/route";a=a.replace(/\/index$/,"")||"/";let n=await A.prepare(e,t,{srcPage:a,multiZoneDraftMode:!1});if(!n)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:S,params:x,nextConfig:y,parsedUrl:v,isDraftMode:_,prerenderManifest:N,routerServerContext:I,isOnDemandRevalidate:R,revalidateOnlyGenerated:C,resolvedPathname:T,clientReferenceManifest:k,serverActionsManifest:U}=n,P=(0,c.normalizeAppPath)(a),L=!!(N.dynamicRoutes[P]||N.routes[T]),O=async()=>((null==I?void 0:I.render404)?await I.render404(e,t,v,!1):t.end("This page could not be found"),null);if(L&&!_){let e=!!N.routes[T],t=N.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(y.experimental.adapterPath)return await O();throw new E.NoFallbackError}}let D=null;!L||A.isDev||_||(D=T,D="/index"===D?"/":D);let $=!0===A.isDev||!L,M=L&&!$;U&&k&&(0,l.setManifestsSingleton)({page:a,clientReferenceManifest:k,serverActionsManifest:U});let B=e.method||"GET",F=(0,o.getTracer)(),H=F.getActiveScopeSpan(),q={params:x,prerenderManifest:N,renderOpts:{experimental:{authInterrupts:!!y.experimental.authInterrupts},cacheComponents:!!y.cacheComponents,supportsDynamicResponse:$,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:y.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,i)=>A.onRequestError(e,t,a,i,I)},sharedContext:{buildId:S}},z=new u.NodeNextRequest(e),j=new u.NodeNextResponse(t),G=d.NextRequestAdapter.fromNodeNextRequest(z,(0,d.signalFromNodeResponse)(t));try{let n=async e=>A.handle(G,q).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=F.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=r.get("next.route");if(i){let t=`${B} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${B} ${a}`)}),l=!!(0,s.getRequestMeta)(e,"minimalMode"),c=async s=>{var o,c;let u=async({previousCacheEntry:i})=>{try{if(!l&&R&&C&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await n(s);e.fetchMetrics=q.renderOpts.fetchMetrics;let o=q.renderOpts.pendingWaitUntil;o&&r.waitUntil&&(r.waitUntil(o),o=void 0);let c=q.renderOpts.collectedTags;if(!L)return await (0,f.sendResponse)(z,j,a,q.renderOpts.pendingWaitUntil),null;{let e=await a.blob(),t=(0,g.toNodeOutgoingHttpHeaders)(a.headers);c&&(t[b.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==q.renderOpts.collectedRevalidate&&!(q.renderOpts.collectedRevalidate>=b.INFINITE_CACHE)&&q.renderOpts.collectedRevalidate,i=void 0===q.renderOpts.collectedExpire||q.renderOpts.collectedExpire>=b.INFINITE_CACHE?void 0:q.renderOpts.collectedExpire;return{value:{kind:w.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:i}}}}catch(t){throw(null==i?void 0:i.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:a,routeType:"route",revalidateReason:(0,m.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:R})},!1,I),t}},d=await A.handleResponse({req:e,nextConfig:y,cacheKey:D,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:R,revalidateOnlyGenerated:C,responseGenerator:u,waitUntil:r.waitUntil,isMinimalMode:l});if(!L)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==w.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(c=d.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});l||t.setHeader("x-nextjs-cache",R?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),_&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,g.fromNodeOutgoingHttpHeaders)(d.value.headers);return l&&L||p.delete(b.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,h.getCacheControlHeader)(d.cacheControl)),await (0,f.sendResponse)(z,j,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};H?await c(H):await F.withPropagatedContext(e.headers,()=>F.trace(p.BaseServerSpan.handleRequest,{spanName:`${B} ${a}`,kind:o.SpanKind.SERVER,attributes:{"http.method":B,"http.target":e.url}},c))}catch(t){if(t instanceof E.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,m.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:R})},!1,I),L)throw t;return await (0,f.sendResponse)(z,j,new Response(null,{status:500})),null}}e.s(["handler",()=>v,"patchFetch",()=>y,"routeModule",()=>A,"serverHooks",()=>I,"workAsyncStorage",()=>_,"workUnitAsyncStorage",()=>N]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__75d0aa7f._.js.map