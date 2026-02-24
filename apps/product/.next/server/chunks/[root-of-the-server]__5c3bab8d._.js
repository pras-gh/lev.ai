module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},84536,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function n(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function a(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function s(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),n=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!n)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:n}}e.s(["getSupabaseAuthEnv",()=>s,"getSupabasePublicEnv",()=>a,"hasSupabasePublicEnv",()=>n])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},51837,e=>e.a(async(t,r)=>{try{var n=e.i(23862),a=e.i(63021),s=t([n]);[n]=s.then?(await s)():s;let c=null;function i(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return c||(c=new n.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),c}async function o(){let e=i(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new a.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>i,"pingDatabase",()=>o]),r()}catch(e){r(e)}},!1),55158,e=>{"use strict";e.i(84536),e.s([])},1115,e=>e.a(async(t,r)=>{try{var n=e.i(51837),a=t([n]);[n]=a.then?(await a)():a,e.s([]),r()}catch(e){r(e)}},!1),11235,e=>e.a(async(t,r)=>{try{var n=e.i(51837);e.i(55158);var a=e.i(1115),s=t([n,a]);[n,a]=s.then?(await s)():s,e.s([]),r()}catch(e){r(e)}},!1),21902,e=>e.a(async(t,r)=>{try{var n=e.i(11235),a=t([n]);[n]=a.then?(await a)():a,e.s([]),r()}catch(e){r(e)}},!1),1398,e=>e.a(async(t,r)=>{try{var n=e.i(89171),a=e.i(21902),s=e.i(51837),i=t([a,s]);[a,s]=i.then?(await i)():i;let m=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function o(e,t){return n.NextResponse.json({error:e,details:t},{status:400})}function c(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function u(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function l(e,t){if(null!=e&&""!==e)return u(e,t)}function d(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!m.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return d(e,t)}function E(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function f(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function _(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function w(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?u(t,"businessId"):void 0,workspaceId:r?d(r,"workspaceId"):void 0}}function b(e){return{businessId:l(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function S(e){let t=e.get("page"),r=e.get("limit"),n=t?u(t,"page"):1,a=r?u(r,"limit"):25;if(a>200)throw Error("limit cannot be greater than 200");return{page:n,pageSize:a}}async function y(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let n=t??(0,s.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await n.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE id = $1::uuid
        AND business_id = $2
      LIMIT 1
      `,[e.workspaceId,e.businessId])).rows[0];if(!t)throw Error("workspaceId and businessId do not belong to the same workspace");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}if(e.workspaceId){let t=(await n.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE id = $1::uuid
      LIMIT 1
      `,[e.workspaceId])).rows[0];if(!t)throw Error("workspaceId not found");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}let a=e.businessId,i=r?.allowWorkspaceAutocreate??!0,o=await n.query(`
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,[a]);!o.rows[0]&&i&&(await n.query(`
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,[a]),o=await n.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,[a]));let c=o.rows[0];if(!c)throw Error("businessId not found");return{workspaceId:c.workspace_id,businessId:Number(c.business_id)}}e.s(["badRequest",()=>o,"parseBooleanQuery",()=>c,"parsePagination",()=>S,"readScopeFromBody",()=>b,"readScopeFromSearchParams",()=>w,"resolveScope",()=>y,"toOptionalBoolean",()=>_,"toOptionalNumber",()=>f,"toOptionalPositiveInt",()=>l,"toOptionalText",()=>E,"toOptionalUuid",()=>p,"toPositiveInt",()=>u]),r()}catch(e){r(e)}},!1),91986,e=>e.a(async(t,r)=>{try{var n=e.i(1398),a=e.i(21902),s=e.i(51837),i=e.i(84536),o=t([n,a,s]);[n,a,s]=o.then?(await o)():o;let b=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,S=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;class y extends Error{status;constructor(e,t){super(e),this.name="ApiAuthError",this.status=t}}function c(e,t){throw new y(e,t)}function u(e){return S.test(e.trim())}function l(e){if(!e)return null;if("string"==typeof e){let t=e.trim();return u(t)?t:null}if(Array.isArray(e)){for(let t of e){let e=l(t);if(e)return e}return null}if("object"==typeof e){let t=l(e.access_token)??l(e.accessToken)??l(e.token);return t||(l(e.session)??l(e.currentSession)??l(e.data))}return null}function d(e){let t=e.trim();if(!t)return null;if(u(t))return t;try{let e=decodeURIComponent(t);if(e!==t&&u(e))return e;let r=JSON.parse(e),n=l(r);if(n)return n}catch{}try{let e=JSON.parse(t);return l(e)}catch{return null}}async function p(e){let t,r=function(e){let t=e.headers.get("authorization");if(t){let[e,r]=t.split(/\s+/,2);if(e?.toLowerCase()==="bearer"&&r&&u(r))return r}for(let t of[e.headers.get("x-supabase-access-token"),e.headers.get("x-access-token")]){if(!t)continue;let e=d(t);if(e)return e}for(let t of e.cookies.getAll()){let e=t.name.toLowerCase();if(!("sb-access-token"===e||"supabase-access-token"===e||e.startsWith("sb-")&&e.endsWith("-auth-token")))continue;let r=d(t.value);if(r)return r}c("Missing access token. Send Authorization: Bearer <token>.",401)}(e),{supabaseUrl:n,supabaseAnonKey:a}=function(){try{return(0,i.getSupabaseAuthEnv)()}catch{return c("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",500)}}();try{t=await fetch(`${n}/auth/v1/user`,{method:"GET",headers:{apikey:a,Authorization:`Bearer ${r}`},cache:"no-store"})}catch{c("Unable to reach auth provider for session validation.",502)}(401===t.status||403===t.status)&&c("Invalid or expired session token.",401),t.ok||c("Session validation failed at auth provider.",502);let s=await t.json(),o="string"==typeof s.id?s.id.trim():"";return b.test(o)||c("Session missing valid user id.",401),{userId:o,email:"string"==typeof s.email?s.email:null}}async function E(e){let t=e.client??(0,s.getDbPool)(),r=(await t.query(`
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,[e.workspaceId,e.userId])).rows[0];return r||c("Forbidden: user does not belong to this workspace.",403),"active"!==(r.status??"").toLowerCase()&&c("Forbidden: workspace membership is not active.",403),{role:r.role}}function f(e){if(e instanceof y)return e.status}async function _(e){return p(e)}async function w(e){let t=await p(e.request),r=await (0,n.resolveScope)(e.scope,e.client,{allowWorkspaceAutocreate:!1}),a=await E({workspaceId:r.workspaceId,userId:t.userId,client:e.client});return{...r,userId:t.userId,workspaceRole:a.role}}e.s(["getAuthErrorStatus",()=>f,"resolveAuthorizedScope",()=>w,"resolveSessionUser",()=>_]),r()}catch(e){r(e)}},!1),76617,e=>e.a(async(t,r)=>{try{var n=e.i(21902),a=e.i(51837),s=t([n,a]);[n,a]=s.then?(await s)():s;let S=["marketing","saas","software","logistics","shipping","rent","utilities","fixed cost","internet","electricity","office","operations","professional","subscription"];function i(e){if(null==e)return 0;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t:0}function o(e){return Number(e.toFixed(2))}function c(e,t,r){return Math.min(r,Math.max(t,e))}function u(e,t){for(let r of t)if(Object.prototype.hasOwnProperty.call(e,r)){let t=e[r];if(null!=t&&""!==t)return!0}return!1}function l(e){return!!Array.isArray(e)&&e.length>0}function d(e){return!e||"object"!=typeof e||Array.isArray(e)?null:e}function p(e){return`₹${Math.abs(e).toLocaleString("en-IN",{maximumFractionDigits:2})}`}function E(e){let t=d(e);if(!t)return null;for(let e of["bank_balance","bankBalance","cash_balance","cashBalance","closing_balance","closingBalance","balance"]){let r=t[e],n=i("string"==typeof r||"number"==typeof r?r:null);if(n>0)return n}for(let e of[t.manual,t.bank,t.summary]){let t=E(e);if(null!==t&&t>0)return t}return null}async function f(e){try{for(let t of(await e.client.query(`
      SELECT meta
      FROM integrations
      WHERE workspace_id = $1::uuid
        AND status IN ('connected', 'syncing')
      ORDER BY updated_at DESC
      LIMIT 10
      `,[e.workspaceId])).rows){let e=E(t.meta);if(null!==e&&e>0)return e}}catch{}for(let t of(await e.client.query(`
    SELECT metadata
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
    ORDER BY occurred_at DESC, id DESC
    LIMIT 200
    `,[e.workspaceId])).rows){let e=E(t.metadata);if(null!==e&&e>0)return e}return Math.max(0,e.fallbackFromLedger)}async function _(e){let t=await e.client.query(`
    SELECT id::text
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND type = $2
      AND status IN ('open', 'snoozed')
    ORDER BY created_at DESC, id DESC
    `,[e.workspaceId,e.type]);if(!e.shouldOpen){if(0===t.rows.length)return;await e.client.query(`
      UPDATE alerts
      SET
        status = 'resolved',
        resolved_at = NOW(),
        payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
        metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
      WHERE workspace_id = $1::uuid
        AND type = $2
        AND status IN ('open', 'snoozed')
      `,[e.workspaceId,e.type,JSON.stringify({resolution:{action:"auto_resolve",reason:"metric back within threshold"}})]);return}let r=e.relatedTransactionIds??[],n={...e.payload,explainable:!0,generatedAt:new Date().toISOString()};if(0===t.rows.length)return void await e.client.query(`
      INSERT INTO alerts (
        business_id,
        workspace_id,
        transaction_id,
        alert_type,
        type,
        severity,
        status,
        message,
        title,
        body,
        related_transaction_ids,
        payload,
        metadata
      )
      VALUES (
        $1,
        $2::uuid,
        $3,
        $4,
        $4,
        $5,
        'open',
        $6,
        $7,
        $8,
        $9::jsonb,
        $10::jsonb,
        $10::jsonb
      )
      `,[e.businessId,e.workspaceId,r[0]??null,e.type,e.severity,e.body,e.title,e.body,JSON.stringify(r),JSON.stringify(n)]);let a=t.rows[0]?.id;if(a&&await e.client.query(`
      UPDATE alerts
      SET
        severity = $3,
        status = 'open',
        resolved_at = NULL,
        message = $4,
        title = $5,
        body = $6,
        transaction_id = $7,
        related_transaction_ids = $8::jsonb,
        payload = $9::jsonb,
        metadata = $9::jsonb
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[a,e.workspaceId,e.severity,e.body,e.title,e.body,r[0]??null,JSON.stringify(r),JSON.stringify(n)]),t.rows.length>1){let r=t.rows.slice(1).map(e=>Number.parseInt(e.id,10)).filter(e=>Number.isInteger(e)&&e>0);r.length>0&&await e.client.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE workspace_id = $1::uuid
          AND id = ANY($2::bigint[])
        `,[e.workspaceId,r,JSON.stringify({resolution:{action:"auto_resolve",reason:"superseded by latest computed alert"}})])}}async function w(e){var t;let r,n,a,s,E,w,b,y=(s=(t=new Date).getUTCFullYear(),E=t.getUTCMonth(),w=new Date(Date.UTC(s,E,20,0,0,0)),t.getTime()<=w.getTime()?(r=new Date(Date.UTC(s,E-1,1,0,0,0)),n=new Date(Date.UTC(s,E,1,0,0,0)),a=w):(r=new Date(Date.UTC(s,E,1,0,0,0)),n=new Date(Date.UTC(s,E+1,1,0,0,0)),a=new Date(Date.UTC(s,E+1,20,0,0,0))),b=(a.getTime()-t.getTime())/864e5,{cycleStart:r,cycleEnd:n,dueDate:a,dueInDays:b}),m=(await e.client.query(`
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS all_credit,
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS all_debit,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '30 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_30d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '60 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_60d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '90 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_90d,
      COUNT(*) FILTER (WHERE status <> 'pending')::text AS total_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND matched = TRUE)::text AS matched_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND category_id IS NOT NULL)::text AS categorized_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND gst_applicable = TRUE)::text AS gst_applicable_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND gst_applicable = TRUE AND gst_amount IS NOT NULL)::text AS gst_tagged_count
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
    `,[e.workspaceId])).rows[0];if(!m)throw Error("Failed to compute aggregates");let I=await e.client.query(`
    SELECT
      t.id::text,
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
    ORDER BY t.occurred_at DESC, t.id DESC
    `,[e.workspaceId,y.cycleStart.toISOString(),y.cycleEnd.toISOString()]),A=0,h=0,g=0,N=[];for(let e of I.rows){let t=Number.parseInt(e.id,10);if(!Number.isInteger(t)||t<=0)continue;let r=function(e){let t=i(e.gst_amount);if(t>0)return t;let r=i(e.gst_rate);return r<=0?0:Math.abs(i(e.amount_minor))*r/100}(e);if(!(r<=0)){if("credit"===e.direction){A+=r;continue}"debit"===e.direction&&function(e){let t=(e??"").toLowerCase().replace(/[^a-z0-9\s/]/g," ").replace(/\s+/g," ").trim();return!!t&&S.some(e=>t.includes(e))}(e.category_name)&&(h+=r,!function(e){let t=d(e);if(!t)return!1;if(!0===t.invoiceUploaded||!0===t.hasInvoice||u(t,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","invoice_url"])||l(t.attachments)||l(t.evidence)||l(t.proofs)||l(t.invoices))return!0;for(let e of["evidence","invoice","documents","proof"]){let r=d(t[e]);if(r&&(u(r,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","url"])||l(r.attachments)||l(r.files)))return!0}return!1}(e.metadata)&&(g+=r,N.push(t)))}}let k=Math.max(0,A-h),T=y.dueInDays>=0&&y.dueInDays<=7,v=T?k:0,L=i(m.all_credit),U=i(m.all_debit),x=await f({client:e.client,workspaceId:e.workspaceId,fallbackFromLedger:L-U}),O=i(m.expense_30d),D=i(m.expense_60d),C=i(m.expense_90d),R=O/30,$=D/60,B=C/90,P=(R+$+B)/3,M=30*P,F=M>0?x/M:99,W=i(m.total_count),H=i(m.matched_count),j=i(m.categorized_count),q=i(m.gst_applicable_count),z=i(m.gst_tagged_count),Y=W>0?H/W*100:100,G=q>0?z/q*100:100,X=N.length,K=c(4*X,0,50),J=10*(F<3),V=c(.45*(W>0?j/W*100:100)+.45*Y+.1*G-.2*K-J,0,100),Z=c(.7*G+(100-K)*.3,0,100);if(e.syncAlerts){let t=k>=1e4?"critical":"warning",r=T&&k>5e3;await _({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"gst_due",shouldOpen:r,severity:t,title:`GST net due ${p(k)} by ${y.dueDate.toISOString().slice(0,10)}`,body:`Output GST ${p(A)} - Input GST ${p(h)} = Net due ${p(k)}. Due date ${y.dueDate.toISOString().slice(0,10)} (${Math.max(0,Math.ceil(y.dueInDays))} day(s)). Threshold ${p(5e3)}.`,relatedTransactionIds:[],payload:{netDue:o(k),outputGst:o(A),inputGst:o(h),threshold:5e3,dueDate:y.dueDate.toISOString(),dueInDays:o(y.dueInDays),fixAction:{label:"Review GST transactions",kind:"open_filter",preset:"gst_due"}}}),await _({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"itc_mismatch",shouldOpen:X>0,severity:X>=10?"critical":"warning",title:`ITC mismatch: ${X} transaction(s) missing invoice evidence`,body:`${X} input-GST transaction(s) have no invoice evidence. Potential blocked ITC ${p(g)} in current cycle.`,relatedTransactionIds:N.slice(0,200),payload:{mismatchCount:X,mismatchAmount:o(g),cycleStart:y.cycleStart.toISOString(),cycleEnd:y.cycleEnd.toISOString(),fixAction:{label:"Upload invoices",kind:"open_filter",preset:"itc_mismatch"}}});let n=F<1.5?"critical":"warning";await _({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"cash_runway_risk",shouldOpen:F<3,severity:n,title:`Cash runway ${F.toFixed(1)} month(s)`,body:`Cash balance ${p(x)}. Burn (30/60/90d): ${p(O/30)}/${p(D/60)}/${p(C/90)} per day. Weighted monthly burn ${p(M)}. Runway ${F.toFixed(1)} months.`,relatedTransactionIds:[],payload:{cashBalance:o(x),burnRateDaily30d:o(R),burnRateDaily60d:o($),burnRateDaily90d:o(B),monthlyBurn:o(M),runwayMonths:o(F),warningThresholdMonths:3,criticalThresholdMonths:1.5,fixAction:{label:"Review unmatched cash drivers",kind:"open_recon",recon:"unmatched"}}})}let Q=await e.client.query(`
    SELECT COUNT(*)::text AS count
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND status = 'open'
      AND severity = 'critical'
    `,[e.workspaceId]),ee=i(Q.rows[0]?.count),et=c(V-5*ee,0,100);return{cash_runway_months:o(F),gst_due_amount_next_7d:o(v),itc_mismatch_count:X,recon_match_pct:o(Y),month_close_readiness_pct:o(et),compliance_confidence:o(Z)}}async function b(e){let t=e.syncAlerts??!0;if(e.client)return w({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:t});let r=(0,a.getDbPool)(),n=await r.connect();try{await n.query("BEGIN");let r=await w({client:n,workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:t});return await n.query("COMMIT"),r}catch(e){throw await n.query("ROLLBACK"),e}finally{n.release()}}e.s(["computeFinanceHealth",()=>b]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__5c3bab8d._.js.map