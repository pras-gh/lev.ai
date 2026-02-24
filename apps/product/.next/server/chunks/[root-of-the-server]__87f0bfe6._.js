module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},84536,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function a(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function n(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function i(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),a=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!a)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:a}}e.s(["getSupabaseAuthEnv",()=>i,"getSupabasePublicEnv",()=>n,"hasSupabasePublicEnv",()=>a])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},51837,e=>e.a(async(t,r)=>{try{var a=e.i(23862),n=e.i(63021),i=t([a]);[a]=i.then?(await i)():i;let u=null;function s(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return u||(u=new a.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),u}async function o(){let e=s(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new n.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>s,"pingDatabase",()=>o]),r()}catch(e){r(e)}},!1),55158,e=>{"use strict";e.i(84536),e.s([])},1115,e=>e.a(async(t,r)=>{try{var a=e.i(51837),n=t([a]);[a]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),11235,e=>e.a(async(t,r)=>{try{var a=e.i(51837);e.i(55158);var n=e.i(1115),i=t([a,n]);[a,n]=i.then?(await i)():i,e.s([]),r()}catch(e){r(e)}},!1),21902,e=>e.a(async(t,r)=>{try{var a=e.i(11235),n=t([a]);[a]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),1398,e=>e.a(async(t,r)=>{try{var a=e.i(89171),n=e.i(21902),i=e.i(51837),s=t([n,i]);[n,i]=s.then?(await s)():s;let b=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function o(e,t){return a.NextResponse.json({error:e,details:t},{status:400})}function u(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function c(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function l(e,t){if(null!=e&&""!==e)return c(e,t)}function d(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!b.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return d(e,t)}function f(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function E(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function w(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function _(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?c(t,"businessId"):void 0,workspaceId:r?d(r,"workspaceId"):void 0}}function y(e){return{businessId:l(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function h(e){let t=e.get("page"),r=e.get("limit"),a=t?c(t,"page"):1,n=r?c(r,"limit"):25;if(n>200)throw Error("limit cannot be greater than 200");return{page:a,pageSize:n}}async function m(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let a=t??(0,i.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await a.query(`
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
      `,[e.workspaceId])).rows[0];if(!t)throw Error("workspaceId not found");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}let n=e.businessId,s=r?.allowWorkspaceAutocreate??!0,o=await a.query(`
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,[n]);!o.rows[0]&&s&&(await a.query(`
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,[n]),o=await a.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,[n]));let u=o.rows[0];if(!u)throw Error("businessId not found");return{workspaceId:u.workspace_id,businessId:Number(u.business_id)}}e.s(["badRequest",()=>o,"parseBooleanQuery",()=>u,"parsePagination",()=>h,"readScopeFromBody",()=>y,"readScopeFromSearchParams",()=>_,"resolveScope",()=>m,"toOptionalBoolean",()=>w,"toOptionalNumber",()=>E,"toOptionalPositiveInt",()=>l,"toOptionalText",()=>f,"toOptionalUuid",()=>p,"toPositiveInt",()=>c]),r()}catch(e){r(e)}},!1),91986,e=>e.a(async(t,r)=>{try{var a=e.i(1398),n=e.i(21902),i=e.i(51837),s=e.i(84536),o=t([a,n,i]);[a,n,i]=o.then?(await o)():o;let y=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,h=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;class m extends Error{status;constructor(e,t){super(e),this.name="ApiAuthError",this.status=t}}function u(e,t){throw new m(e,t)}function c(e){return h.test(e.trim())}function l(e){if(!e)return null;if("string"==typeof e){let t=e.trim();return c(t)?t:null}if(Array.isArray(e)){for(let t of e){let e=l(t);if(e)return e}return null}if("object"==typeof e){let t=l(e.access_token)??l(e.accessToken)??l(e.token);return t||(l(e.session)??l(e.currentSession)??l(e.data))}return null}function d(e){let t=e.trim();if(!t)return null;if(c(t))return t;try{let e=decodeURIComponent(t);if(e!==t&&c(e))return e;let r=JSON.parse(e),a=l(r);if(a)return a}catch{}try{let e=JSON.parse(t);return l(e)}catch{return null}}async function p(e){let t,r=function(e){let t=e.headers.get("authorization");if(t){let[e,r]=t.split(/\s+/,2);if(e?.toLowerCase()==="bearer"&&r&&c(r))return r}for(let t of[e.headers.get("x-supabase-access-token"),e.headers.get("x-access-token")]){if(!t)continue;let e=d(t);if(e)return e}for(let t of e.cookies.getAll()){let e=t.name.toLowerCase();if(!("sb-access-token"===e||"supabase-access-token"===e||e.startsWith("sb-")&&e.endsWith("-auth-token")))continue;let r=d(t.value);if(r)return r}u("Missing access token. Send Authorization: Bearer <token>.",401)}(e),{supabaseUrl:a,supabaseAnonKey:n}=function(){try{return(0,s.getSupabaseAuthEnv)()}catch{return u("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",500)}}();try{t=await fetch(`${a}/auth/v1/user`,{method:"GET",headers:{apikey:n,Authorization:`Bearer ${r}`},cache:"no-store"})}catch{u("Unable to reach auth provider for session validation.",502)}(401===t.status||403===t.status)&&u("Invalid or expired session token.",401),t.ok||u("Session validation failed at auth provider.",502);let i=await t.json(),o="string"==typeof i.id?i.id.trim():"";return y.test(o)||u("Session missing valid user id.",401),{userId:o,email:"string"==typeof i.email?i.email:null}}async function f(e){let t=e.client??(0,i.getDbPool)(),r=(await t.query(`
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,[e.workspaceId,e.userId])).rows[0];return r||u("Forbidden: user does not belong to this workspace.",403),"active"!==(r.status??"").toLowerCase()&&u("Forbidden: workspace membership is not active.",403),{role:r.role}}function E(e){if(e instanceof m)return e.status}async function w(e){return p(e)}async function _(e){let t=await p(e.request),r=await (0,a.resolveScope)(e.scope,e.client,{allowWorkspaceAutocreate:!1}),n=await f({workspaceId:r.workspaceId,userId:t.userId,client:e.client});return{...r,userId:t.userId,workspaceRole:n.role}}e.s(["getAuthErrorStatus",()=>E,"resolveAuthorizedScope",()=>_,"resolveSessionUser",()=>w]),r()}catch(e){r(e)}},!1),66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},23796,e=>e.a(async(t,r)=>{try{var a=e.i(21902),n=e.i(51837),i=t([a,n]);function s(e){return void 0===e?null:JSON.stringify(e)}async function o(e,t){let r=t??(0,n.getDbPool)();await r.query(`
    INSERT INTO audit_logs (
      workspace_id,
      business_id,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      action,
      before_state,
      after_state,
      request_id,
      ip_address,
      user_agent
    )
    VALUES (
      $1::uuid,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8::jsonb,
      $9::jsonb,
      $10,
      $11::inet,
      $12
    )
    `,[e.workspaceId,e.businessId??null,e.actorType,e.actorId??null,e.entityType,String(e.entityId),e.action,s(e.beforeState),s(e.afterState),e.requestId??null,e.ipAddress??null,e.userAgent??null])}async function u(e,t){try{await o(e,t)}catch(e){if(function(e){if(!e||"object"!=typeof e)return!1;let t="code"in e?String(e.code??""):"";return"42P01"===t||(e instanceof Error?e.message.toLowerCase():"").includes('relation "audit_logs" does not exist')}(e))return}}[a,n]=i.then?(await i)():i,e.s(["writeAuditLogSafe",()=>u]),r()}catch(e){r(e)}},!1),76617,e=>e.a(async(t,r)=>{try{var a=e.i(21902),n=e.i(51837),i=t([a,n]);[a,n]=i.then?(await i)():i;let h=["marketing","saas","software","logistics","shipping","rent","utilities","fixed cost","internet","electricity","office","operations","professional","subscription"];function s(e){if(null==e)return 0;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t:0}function o(e){return Number(e.toFixed(2))}function u(e,t,r){return Math.min(r,Math.max(t,e))}function c(e,t){for(let r of t)if(Object.prototype.hasOwnProperty.call(e,r)){let t=e[r];if(null!=t&&""!==t)return!0}return!1}function l(e){return!!Array.isArray(e)&&e.length>0}function d(e){return!e||"object"!=typeof e||Array.isArray(e)?null:e}function p(e){return`₹${Math.abs(e).toLocaleString("en-IN",{maximumFractionDigits:2})}`}function f(e){let t=d(e);if(!t)return null;for(let e of["bank_balance","bankBalance","cash_balance","cashBalance","closing_balance","closingBalance","balance"]){let r=t[e],a=s("string"==typeof r||"number"==typeof r?r:null);if(a>0)return a}for(let e of[t.manual,t.bank,t.summary]){let t=f(e);if(null!==t&&t>0)return t}return null}async function E(e){try{for(let t of(await e.client.query(`
      SELECT meta
      FROM integrations
      WHERE workspace_id = $1::uuid
        AND status IN ('connected', 'syncing')
      ORDER BY updated_at DESC
      LIMIT 10
      `,[e.workspaceId])).rows){let e=f(t.meta);if(null!==e&&e>0)return e}}catch{}for(let t of(await e.client.query(`
    SELECT metadata
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
    ORDER BY occurred_at DESC, id DESC
    LIMIT 200
    `,[e.workspaceId])).rows){let e=f(t.metadata);if(null!==e&&e>0)return e}return Math.max(0,e.fallbackFromLedger)}async function w(e){let t=await e.client.query(`
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
      `,[e.workspaceId,e.type,JSON.stringify({resolution:{action:"auto_resolve",reason:"metric back within threshold"}})]);return}let r=e.relatedTransactionIds??[],a={...e.payload,explainable:!0,generatedAt:new Date().toISOString()};if(0===t.rows.length)return void await e.client.query(`
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
      `,[e.businessId,e.workspaceId,r[0]??null,e.type,e.severity,e.body,e.title,e.body,JSON.stringify(r),JSON.stringify(a)]);let n=t.rows[0]?.id;if(n&&await e.client.query(`
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
      `,[n,e.workspaceId,e.severity,e.body,e.title,e.body,r[0]??null,JSON.stringify(r),JSON.stringify(a)]),t.rows.length>1){let r=t.rows.slice(1).map(e=>Number.parseInt(e.id,10)).filter(e=>Number.isInteger(e)&&e>0);r.length>0&&await e.client.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE workspace_id = $1::uuid
          AND id = ANY($2::bigint[])
        `,[e.workspaceId,r,JSON.stringify({resolution:{action:"auto_resolve",reason:"superseded by latest computed alert"}})])}}async function _(e){var t;let r,a,n,i,f,_,y,m=(i=(t=new Date).getUTCFullYear(),f=t.getUTCMonth(),_=new Date(Date.UTC(i,f,20,0,0,0)),t.getTime()<=_.getTime()?(r=new Date(Date.UTC(i,f-1,1,0,0,0)),a=new Date(Date.UTC(i,f,1,0,0,0)),n=_):(r=new Date(Date.UTC(i,f,1,0,0,0)),a=new Date(Date.UTC(i,f+1,1,0,0,0)),n=new Date(Date.UTC(i,f+1,20,0,0,0))),y=(n.getTime()-t.getTime())/864e5,{cycleStart:r,cycleEnd:a,dueDate:n,dueInDays:y}),b=(await e.client.query(`
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
    `,[e.workspaceId])).rows[0];if(!b)throw Error("Failed to compute aggregates");let S=await e.client.query(`
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
    `,[e.workspaceId,m.cycleStart.toISOString(),m.cycleEnd.toISOString()]),g=0,A=0,I=0,N=[];for(let e of S.rows){let t=Number.parseInt(e.id,10);if(!Number.isInteger(t)||t<=0)continue;let r=function(e){let t=s(e.gst_amount);if(t>0)return t;let r=s(e.gst_rate);return r<=0?0:Math.abs(s(e.amount_minor))*r/100}(e);if(!(r<=0)){if("credit"===e.direction){g+=r;continue}"debit"===e.direction&&function(e){let t=(e??"").toLowerCase().replace(/[^a-z0-9\s/]/g," ").replace(/\s+/g," ").trim();return!!t&&h.some(e=>t.includes(e))}(e.category_name)&&(A+=r,!function(e){let t=d(e);if(!t)return!1;if(!0===t.invoiceUploaded||!0===t.hasInvoice||c(t,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","invoice_url"])||l(t.attachments)||l(t.evidence)||l(t.proofs)||l(t.invoices))return!0;for(let e of["evidence","invoice","documents","proof"]){let r=d(t[e]);if(r&&(c(r,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","url"])||l(r.attachments)||l(r.files)))return!0}return!1}(e.metadata)&&(I+=r,N.push(t)))}}let R=Math.max(0,g-A),v=m.dueInDays>=0&&m.dueInDays<=7,T=v?R:0,x=s(b.all_credit),k=s(b.all_debit),C=await E({client:e.client,workspaceId:e.workspaceId,fallbackFromLedger:x-k}),O=s(b.expense_30d),$=s(b.expense_60d),U=s(b.expense_90d),L=O/30,D=$/60,P=U/90,B=(L+D+P)/3,M=30*B,F=M>0?C/M:99,q=s(b.total_count),H=s(b.matched_count),j=s(b.categorized_count),W=s(b.gst_applicable_count),z=s(b.gst_tagged_count),K=q>0?H/q*100:100,Y=W>0?z/W*100:100,G=N.length,X=u(4*G,0,50),J=10*(F<3),V=u(.45*(q>0?j/q*100:100)+.45*K+.1*Y-.2*X-J,0,100),Z=u(.7*Y+(100-X)*.3,0,100);if(e.syncAlerts){let t=R>=1e4?"critical":"warning",r=v&&R>5e3;await w({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"gst_due",shouldOpen:r,severity:t,title:`GST net due ${p(R)} by ${m.dueDate.toISOString().slice(0,10)}`,body:`Output GST ${p(g)} - Input GST ${p(A)} = Net due ${p(R)}. Due date ${m.dueDate.toISOString().slice(0,10)} (${Math.max(0,Math.ceil(m.dueInDays))} day(s)). Threshold ${p(5e3)}.`,relatedTransactionIds:[],payload:{netDue:o(R),outputGst:o(g),inputGst:o(A),threshold:5e3,dueDate:m.dueDate.toISOString(),dueInDays:o(m.dueInDays),fixAction:{label:"Review GST transactions",kind:"open_filter",preset:"gst_due"}}}),await w({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"itc_mismatch",shouldOpen:G>0,severity:G>=10?"critical":"warning",title:`ITC mismatch: ${G} transaction(s) missing invoice evidence`,body:`${G} input-GST transaction(s) have no invoice evidence. Potential blocked ITC ${p(I)} in current cycle.`,relatedTransactionIds:N.slice(0,200),payload:{mismatchCount:G,mismatchAmount:o(I),cycleStart:m.cycleStart.toISOString(),cycleEnd:m.cycleEnd.toISOString(),fixAction:{label:"Upload invoices",kind:"open_filter",preset:"itc_mismatch"}}});let a=F<1.5?"critical":"warning";await w({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"cash_runway_risk",shouldOpen:F<3,severity:a,title:`Cash runway ${F.toFixed(1)} month(s)`,body:`Cash balance ${p(C)}. Burn (30/60/90d): ${p(O/30)}/${p($/60)}/${p(U/90)} per day. Weighted monthly burn ${p(M)}. Runway ${F.toFixed(1)} months.`,relatedTransactionIds:[],payload:{cashBalance:o(C),burnRateDaily30d:o(L),burnRateDaily60d:o(D),burnRateDaily90d:o(P),monthlyBurn:o(M),runwayMonths:o(F),warningThresholdMonths:3,criticalThresholdMonths:1.5,fixAction:{label:"Review unmatched cash drivers",kind:"open_recon",recon:"unmatched"}}})}let Q=await e.client.query(`
    SELECT COUNT(*)::text AS count
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND status = 'open'
      AND severity = 'critical'
    `,[e.workspaceId]),ee=s(Q.rows[0]?.count),et=u(V-5*ee,0,100);return{cash_runway_months:o(F),gst_due_amount_next_7d:o(T),itc_mismatch_count:G,recon_match_pct:o(K),month_close_readiness_pct:o(et),compliance_confidence:o(Z)}}async function y(e){let t=e.syncAlerts??!0;if(e.client)return _({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:t});let r=(0,n.getDbPool)(),a=await r.connect();try{await a.query("BEGIN");let r=await _({client:a,workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:t});return await a.query("COMMIT"),r}catch(e){throw await a.query("ROLLBACK"),e}finally{a.release()}}e.s(["computeFinanceHealth",()=>y]),r()}catch(e){r(e)}},!1),62455,e=>e.a(async(t,r)=>{try{var a=e.i(89171),n=e.i(1398),i=e.i(91986),s=e.i(21902),o=e.i(51837),u=e.i(83181),c=t([n,i,s,o,u]);[n,i,s,o,u]=c.then?(await c)():c;let p=new Set(["open","snoozed","resolved","all"]),f=new Set(["critical","warning","info"]),E=new Set([...u.FIRST_FIVE_ALERT_TYPES,"duplicate","unmatched","cash_runway","itc_available","vendor_mismatch_risk","expense_spike_anomaly"]);function l(e){return!e||"object"!=typeof e||Array.isArray(e)?null:e}async function d(e){try{let t=e.nextUrl.searchParams,r=await (0,i.resolveAuthorizedScope)({request:e,scope:(0,n.readScopeFromSearchParams)(t)}),{page:s,pageSize:c}=(0,n.parsePagination)(t),d=(0,n.parseBooleanQuery)(t.get("refresh"))??!1,w=(t.get("status")??"open").trim().toLowerCase(),_=t.get("severity")?.trim().toLowerCase(),y=t.get("type")?.trim().toLowerCase();if(!p.has(w))return(0,n.badRequest)("status must be one of: open, snoozed, resolved, all");if(_&&!f.has(_))return(0,n.badRequest)("severity must be one of: critical, warning, info");if(y&&!E.has(y))return(0,n.badRequest)(`type must be one of: ${[...E].join(", ")}`);d&&("open"===w||"all"===w)&&await (0,u.evaluateWorkspaceAlerts)({workspaceId:r.workspaceId,businessId:r.businessId});let h=["a.workspace_id = $1::uuid"],m=[r.workspaceId],b=2;"all"!==w&&(m.push(w),h.push(`a.status = $${b}`),b+=1),_&&(m.push(_),h.push(`a.severity = $${b}`),b+=1),y&&(m.push(y),h.push(`a.type = $${b}`),b+=1);let S=`WHERE ${h.join(" AND ")}`,g=(0,o.getDbPool)(),A=await g.query(`
      SELECT COUNT(*)::text AS total
      FROM alerts a
      ${S}
      `,m),I=(s-1)*c,N=await g.query(`
      SELECT
        a.id,
        a.public_id,
        a.workspace_id::text,
        a.business_id,
        a.transaction_id,
        a.type,
        a.alert_type,
        a.severity,
        a.status,
        a.title,
        a.body,
        a.message,
        a.related_transaction_ids,
        a.payload,
        a.metadata,
        a.action_url,
        a.created_at,
        a.resolved_at
      FROM alerts a
      ${S}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $${b}
      OFFSET $${b+1}
      `,[...m,c,I]),R=Number(A.rows[0]?.total??"0"),v=N.rows.map(e=>{let t=function(e){if(!e)return[];if(Array.isArray(e))return e.map(e=>Number.parseInt(String(e),10)).filter(e=>Number.isInteger(e)&&e>0);if("string"==typeof e)try{let t=JSON.parse(e);if(Array.isArray(t))return t.map(e=>Number.parseInt(String(e),10)).filter(e=>Number.isInteger(e)&&e>0)}catch{}return[]}(e.related_transaction_ids),r=[...e.transaction_id?[e.transaction_id]:[],...t].filter((e,t,r)=>Number.isInteger(e)&&e>0&&r.indexOf(e)===t),a=l(e.payload),n=l(e.metadata);return{...e,payload:a,metadata:n,meta:n??a,affected_transaction_ids:r}});return a.NextResponse.json({page:s,pageSize:c,total:R,totalPages:0===R?0:Math.ceil(R/c),alerts:v})}catch(n){let e=n instanceof Error?n.message:"Failed to list alerts",t=(0,i.getAuthErrorStatus)(n);if(t)return a.NextResponse.json({error:e},{status:t});let r=e.includes("must be")||e.includes("Boolean")||e.includes("Provide at least one scope identifier")||e.includes("not found")?400:500;return a.NextResponse.json({error:e},{status:r})}}e.s(["GET",()=>d,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),r()}catch(e){r(e)}},!1),74786,e=>e.a(async(t,r)=>{try{var a=e.i(47909),n=e.i(74017),i=e.i(96250),s=e.i(59756),o=e.i(61916),u=e.i(74677),c=e.i(69741),l=e.i(16795),d=e.i(87718),p=e.i(95169),f=e.i(47587),E=e.i(66012),w=e.i(70101),_=e.i(26937),y=e.i(10372),h=e.i(93695);e.i(52474);var m=e.i(220),b=e.i(62455),S=t([b]);[b]=S.then?(await S)():S;let I=new a.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/alerts/route",pathname:"/api/alerts",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/product/src/app/api/alerts/route.ts",nextConfigOutput:"",userland:b}),{workAsyncStorage:N,workUnitAsyncStorage:R,serverHooks:v}=I;function g(){return(0,i.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:R})}async function A(e,t,r){I.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let a="/api/alerts/route";a=a.replace(/\/index$/,"")||"/";let i=await I.prepare(e,t,{srcPage:a,multiZoneDraftMode:!1});if(!i)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:b,params:S,nextConfig:g,parsedUrl:A,isDraftMode:N,prerenderManifest:R,routerServerContext:v,isOnDemandRevalidate:T,revalidateOnlyGenerated:x,resolvedPathname:k,clientReferenceManifest:C,serverActionsManifest:O}=i,$=(0,c.normalizeAppPath)(a),U=!!(R.dynamicRoutes[$]||R.routes[k]),L=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,A,!1):t.end("This page could not be found"),null);if(U&&!N){let e=!!R.routes[k],t=R.dynamicRoutes[$];if(t&&!1===t.fallback&&!e){if(g.experimental.adapterPath)return await L();throw new h.NoFallbackError}}let D=null;!U||I.isDev||N||(D=k,D="/index"===D?"/":D);let P=!0===I.isDev||!U,B=U&&!P;O&&C&&(0,u.setManifestsSingleton)({page:a,clientReferenceManifest:C,serverActionsManifest:O});let M=e.method||"GET",F=(0,o.getTracer)(),q=F.getActiveScopeSpan(),H={params:S,prerenderManifest:R,renderOpts:{experimental:{authInterrupts:!!g.experimental.authInterrupts},cacheComponents:!!g.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:g.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>I.onRequestError(e,t,a,n,v)},sharedContext:{buildId:b}},j=new l.NodeNextRequest(e),W=new l.NodeNextResponse(t),z=d.NextRequestAdapter.fromNodeNextRequest(j,(0,d.signalFromNodeResponse)(t));try{let i=async e=>I.handle(z,H).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=F.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${M} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${a}`)}),u=!!(0,s.getRequestMeta)(e,"minimalMode"),c=async s=>{var o,c;let l=async({previousCacheEntry:n})=>{try{if(!u&&T&&x&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await i(s);e.fetchMetrics=H.renderOpts.fetchMetrics;let o=H.renderOpts.pendingWaitUntil;o&&r.waitUntil&&(r.waitUntil(o),o=void 0);let c=H.renderOpts.collectedTags;if(!U)return await (0,E.sendResponse)(j,W,a,H.renderOpts.pendingWaitUntil),null;{let e=await a.blob(),t=(0,w.toNodeOutgoingHttpHeaders)(a.headers);c&&(t[y.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==H.renderOpts.collectedRevalidate&&!(H.renderOpts.collectedRevalidate>=y.INFINITE_CACHE)&&H.renderOpts.collectedRevalidate,n=void 0===H.renderOpts.collectedExpire||H.renderOpts.collectedExpire>=y.INFINITE_CACHE?void 0:H.renderOpts.collectedExpire;return{value:{kind:m.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await I.onRequestError(e,t,{routerKind:"App Router",routePath:a,routeType:"route",revalidateReason:(0,f.getRevalidateReason)({isStaticGeneration:B,isOnDemandRevalidate:T})},!1,v),t}},d=await I.handleResponse({req:e,nextConfig:g,cacheKey:D,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:R,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:x,responseGenerator:l,waitUntil:r.waitUntil,isMinimalMode:u});if(!U)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==m.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(c=d.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});u||t.setHeader("x-nextjs-cache",T?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),N&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,w.fromNodeOutgoingHttpHeaders)(d.value.headers);return u&&U||p.delete(y.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,_.getCacheControlHeader)(d.cacheControl)),await (0,E.sendResponse)(j,W,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};q?await c(q):await F.withPropagatedContext(e.headers,()=>F.trace(p.BaseServerSpan.handleRequest,{spanName:`${M} ${a}`,kind:o.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},c))}catch(t){if(t instanceof h.NoFallbackError||await I.onRequestError(e,t,{routerKind:"App Router",routePath:$,routeType:"route",revalidateReason:(0,f.getRevalidateReason)({isStaticGeneration:B,isOnDemandRevalidate:T})},!1,v),U)throw t;return await (0,E.sendResponse)(j,W,new Response(null,{status:500})),null}}e.s(["handler",()=>A,"patchFetch",()=>g,"routeModule",()=>I,"serverHooks",()=>v,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>R]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__87f0bfe6._.js.map