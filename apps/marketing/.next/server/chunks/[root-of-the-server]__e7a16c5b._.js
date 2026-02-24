module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},28394,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function n(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function s(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function o(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),n=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!n)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:n}}e.s(["getSupabaseAuthEnv",()=>o,"getSupabasePublicEnv",()=>s,"hasSupabasePublicEnv",()=>n])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},34591,e=>e.a(async(t,r)=>{try{var n=e.i(23862),s=e.i(63021),o=t([n]);[n]=o.then?(await o)():o;let c=null;function a(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return c||(c=new n.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),c}async function i(){let e=a(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new s.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>a,"pingDatabase",()=>i]),r()}catch(e){r(e)}},!1),65297,e=>{"use strict";e.i(28394),e.s([])},84851,e=>e.a(async(t,r)=>{try{var n=e.i(34591),s=t([n]);[n]=s.then?(await s)():s,e.s([]),r()}catch(e){r(e)}},!1),72289,e=>e.a(async(t,r)=>{try{var n=e.i(34591);e.i(65297);var s=e.i(84851),o=t([n,s]);[n,s]=o.then?(await o)():o,e.s([]),r()}catch(e){r(e)}},!1),33691,e=>e.a(async(t,r)=>{try{var n=e.i(72289),s=t([n]);[n]=s.then?(await s)():s,e.s([]),r()}catch(e){r(e)}},!1),14568,e=>e.a(async(t,r)=>{try{var n=e.i(89171),s=e.i(33691),o=e.i(34591),a=t([s,o]);[s,o]=a.then?(await a)():a;let N=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function i(e,t){return n.NextResponse.json({error:e,details:t},{status:400})}function c(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function u(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function d(e,t){if(null!=e&&""!==e)return u(e,t)}function l(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!N.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return l(e,t)}function _(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function E(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function f(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function y(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?u(t,"businessId"):void 0,workspaceId:r?l(r,"workspaceId"):void 0}}function I(e){return{businessId:d(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function w(e){let t=e.get("page"),r=e.get("limit"),n=t?u(t,"page"):1,s=r?u(r,"limit"):25;if(s>200)throw Error("limit cannot be greater than 200");return{page:n,pageSize:s}}async function b(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let n=t??(0,o.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await n.query(`
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
      `,[e.workspaceId])).rows[0];if(!t)throw Error("workspaceId not found");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}let s=e.businessId,a=r?.allowWorkspaceAutocreate??!0,i=await n.query(`
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,[s]);!i.rows[0]&&a&&(await n.query(`
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,[s]),i=await n.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,[s]));let c=i.rows[0];if(!c)throw Error("businessId not found");return{workspaceId:c.workspace_id,businessId:Number(c.business_id)}}e.s(["badRequest",()=>i,"parseBooleanQuery",()=>c,"parsePagination",()=>w,"readScopeFromBody",()=>I,"readScopeFromSearchParams",()=>y,"resolveScope",()=>b,"toOptionalBoolean",()=>f,"toOptionalNumber",()=>E,"toOptionalPositiveInt",()=>d,"toOptionalText",()=>_,"toOptionalUuid",()=>p,"toPositiveInt",()=>u]),r()}catch(e){r(e)}},!1),40423,e=>e.a(async(t,r)=>{try{var n=e.i(14568),s=e.i(33691),o=e.i(34591),a=e.i(28394),i=t([n,s,o]);[n,s,o]=i.then?(await i)():i;let I=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,w=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;class b extends Error{status;constructor(e,t){super(e),this.name="ApiAuthError",this.status=t}}function c(e,t){throw new b(e,t)}function u(e){return w.test(e.trim())}function d(e){if(!e)return null;if("string"==typeof e){let t=e.trim();return u(t)?t:null}if(Array.isArray(e)){for(let t of e){let e=d(t);if(e)return e}return null}if("object"==typeof e){let t=d(e.access_token)??d(e.accessToken)??d(e.token);return t||(d(e.session)??d(e.currentSession)??d(e.data))}return null}function l(e){let t=e.trim();if(!t)return null;if(u(t))return t;try{let e=decodeURIComponent(t);if(e!==t&&u(e))return e;let r=JSON.parse(e),n=d(r);if(n)return n}catch{}try{let e=JSON.parse(t);return d(e)}catch{return null}}async function p(e){let t,r=function(e){let t=e.headers.get("authorization");if(t){let[e,r]=t.split(/\s+/,2);if(e?.toLowerCase()==="bearer"&&r&&u(r))return r}for(let t of[e.headers.get("x-supabase-access-token"),e.headers.get("x-access-token")]){if(!t)continue;let e=l(t);if(e)return e}for(let t of e.cookies.getAll()){let e=t.name.toLowerCase();if(!("sb-access-token"===e||"supabase-access-token"===e||e.startsWith("sb-")&&e.endsWith("-auth-token")))continue;let r=l(t.value);if(r)return r}c("Missing access token. Send Authorization: Bearer <token>.",401)}(e),{supabaseUrl:n,supabaseAnonKey:s}=function(){try{return(0,a.getSupabaseAuthEnv)()}catch{return c("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",500)}}();try{t=await fetch(`${n}/auth/v1/user`,{method:"GET",headers:{apikey:s,Authorization:`Bearer ${r}`},cache:"no-store"})}catch{c("Unable to reach auth provider for session validation.",502)}(401===t.status||403===t.status)&&c("Invalid or expired session token.",401),t.ok||c("Session validation failed at auth provider.",502);let o=await t.json(),i="string"==typeof o.id?o.id.trim():"";return I.test(i)||c("Session missing valid user id.",401),{userId:i,email:"string"==typeof o.email?o.email:null}}async function _(e){let t=e.client??(0,o.getDbPool)(),r=(await t.query(`
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,[e.workspaceId,e.userId])).rows[0];return r||c("Forbidden: user does not belong to this workspace.",403),"active"!==(r.status??"").toLowerCase()&&c("Forbidden: workspace membership is not active.",403),{role:r.role}}function E(e){if(e instanceof b)return e.status}async function f(e){return p(e)}async function y(e){let t=await p(e.request),r=await (0,n.resolveScope)(e.scope,e.client,{allowWorkspaceAutocreate:!1}),s=await _({workspaceId:r.workspaceId,userId:t.userId,client:e.client});return{...r,userId:t.userId,workspaceRole:s.role}}e.s(["getAuthErrorStatus",()=>E,"resolveAuthorizedScope",()=>y,"resolveSessionUser",()=>f]),r()}catch(e){r(e)}},!1),15658,e=>{"use strict";let t=[{id:"hdfc",label:"HDFC Bank",kind:"bank",blurb:"Bank statements and balance snapshots"},{id:"icici",label:"ICICI Bank",kind:"bank",blurb:"Bank account feeds for credits and debits"},{id:"razorpay",label:"Razorpay",kind:"payments",blurb:"Settlements, fees, and payout events"},{id:"gpay",label:"Google Pay",kind:"payments",blurb:"UPI transaction stream"},{id:"stripe",label:"Stripe",kind:"payments",blurb:"Payout and charge activity"},{id:"tally",label:"Tally",kind:"erp",blurb:"Ledger sync and posting bridge"},{id:"whatsapp",label:"WhatsApp",kind:"messaging",blurb:"Customer payment notification hooks"},{id:"zohobooks",label:"Zoho Books",kind:"erp",blurb:"Books sync for vouchers and invoices"}],r=new Set(t.map(e=>e.id));function n(e){return r.has(e)}function s(e){let r=t.find(t=>t.id===e);return r?.label??e.toUpperCase()}e.s(["INTEGRATION_PROVIDERS",0,t,"integrationProviderLabel",()=>s,"isIntegrationProviderId",()=>n])},59174,e=>e.a(async(t,r)=>{try{var n=e.i(66680),s=e.i(85635),o=e.i(33691),a=e.i(34591),i=e.i(15658),c=e.i(91268),u=t([s,o,a,c]);function d(e){if(!e)return null;let t=Number.parseInt(e,10);return Number.isInteger(t)&&t>0?t:null}function l(e){if(!e)return null;if(e instanceof Date)return Number.isNaN(e.getTime())?null:e.toISOString();let t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function p(e){return e&&"object"==typeof e&&!Array.isArray(e)?e:{}}function _(e){if(!e||"object"!=typeof e)return!1;let t="code"in e?String(e.code??""):"";if("42P01"===t)return!0;let r=e instanceof Error?e.message.toLowerCase():"";return r.includes('relation "connector_tokens" does not exist')||r.includes('relation "connections" does not exist')||r.includes('relation "sync_runs" does not exist')||r.includes('relation "connector_sync_cursors" does not exist')||r.includes('relation "connector_webhook_events" does not exist')||r.includes('relation "source_events" does not exist')||r.includes('relation "canonical_records" does not exist')}async function E(e){var t;let r,s=(t=e.token,(0,n.createHash)("sha256").update(t).digest("hex")),o=(r=e.token.trim()).length<=6?"••••••":`${r.slice(0,4)}••••${r.slice(-2)}`,i=e.client??(0,a.getDbPool)();try{let t=await i.query(`
      INSERT INTO connector_tokens (
        workspace_id,
        provider,
        token_hash,
        token_hint,
        token_ciphertext,
        scopes,
        status,
        expires_at,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        'active',
        $7::timestamptz,
        $8::jsonb
      )
      ON CONFLICT (workspace_id, provider, token_hash)
      DO UPDATE
      SET
        status = 'active',
        token_hint = EXCLUDED.token_hint,
        expires_at = EXCLUDED.expires_at,
        metadata = COALESCE(connector_tokens.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,[e.workspaceId,e.provider,s,o,e.token,JSON.stringify(e.scopes??[]),l(e.expiresAt),JSON.stringify(e.metadata??{})]);return{stored:!0,tokenHash:s,tokenHint:o,tokenId:d(t.rows[0]?.id)}}catch(e){if(_(e))return{stored:!1,tokenHash:s,tokenHint:o,tokenId:null};throw e}}async function f(e){let t=e.client??(0,a.getDbPool)();try{let r=await t.query(`
      INSERT INTO connections (
        workspace_id,
        provider,
        status,
        scopes,
        secrets_ref,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4::jsonb,
        $5,
        $6::jsonb
      )
      ON CONFLICT (workspace_id, provider)
      DO UPDATE
      SET
        status = EXCLUDED.status,
        scopes = EXCLUDED.scopes,
        secrets_ref = COALESCE(EXCLUDED.secrets_ref, connections.secrets_ref),
        metadata = COALESCE(connections.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,[e.workspaceId,e.provider,e.status,JSON.stringify(e.scopes??[]),e.secretsRef??null,JSON.stringify(e.metadata??{})]);return{stored:!0,connectionId:r.rows[0]?.id??null}}catch(e){if(_(e))return{stored:!1,connectionId:null};throw e}}async function y(e){let t=e.client??(0,a.getDbPool)();try{let r=await t.query(`
      INSERT INTO sync_runs (
        workspace_id,
        connection_id,
        type,
        started_at,
        status,
        stats_json
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        NOW(),
        'running',
        $4::jsonb
      )
      RETURNING id::text
      `,[e.workspaceId,e.connectionId,e.type,JSON.stringify(e.stats??{})]);return d(r.rows[0]?.id)}catch(e){if(_(e))return null;throw e}}async function I(e){if(!e.syncRunId)return;let t=e.client??(0,a.getDbPool)();try{await t.query(`
      UPDATE sync_runs
      SET
        status = $3,
        finished_at = NOW(),
        error = $4,
        stats_json = COALESCE(stats_json, '{}'::jsonb) || $5::jsonb,
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[e.syncRunId,e.workspaceId,e.status,e.error??null,JSON.stringify(e.stats??{})])}catch(e){if(_(e))return;throw e}}async function w(e){let t=e.client??(0,a.getDbPool)();try{var r;let n,s=await t.query(`
      SELECT a.id::text
      FROM accounts a
      LEFT JOIN integrations i ON i.id = a.integration_id
      WHERE a.workspace_id = $1::uuid
        AND (
          i.provider = $2
          OR (a.metadata->>'provider') = $2
        )
      ORDER BY a.created_at ASC
      LIMIT 1
      `,[e.workspaceId,e.provider]);if(s.rows[0]?.id)return s.rows[0].id;let o=await t.query(`
      INSERT INTO accounts (
        workspace_id,
        business_id,
        integration_id,
        account_type,
        name,
        currency_code,
        is_active,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        (
          SELECT id
          FROM integrations
          WHERE workspace_id = $1::uuid
            AND provider = $3
          LIMIT 1
        ),
        $4,
        $5,
        'INR',
        TRUE,
        $6::jsonb
      )
      RETURNING id::text
      `,[e.workspaceId,e.businessId,e.provider,(r=e.provider,!(n=i.INTEGRATION_PROVIDERS.find(e=>e.id===r))?"other":"bank"===n.kind?"bank":"payments"===n.kind?"wallet":"other"),`${(0,i.integrationProviderLabel)(e.provider)} Primary`,JSON.stringify({provider:e.provider,createdBy:"connector_sync_engine"})]);return o.rows[0]?.id??null}catch(e){if(_(e))return null;throw e}}async function b(e){let t=e.client??(0,a.getDbPool)();try{let r=await t.query(`
      INSERT INTO source_events (
        workspace_id,
        business_id,
        connection_id,
        source,
        account_id,
        external_id,
        external_txn_id,
        event_type,
        status,
        payload,
        payload_json,
        received_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3::uuid,
        $4,
        $5::uuid,
        $6,
        $6,
        $7,
        'received',
        $8::jsonb,
        $8::jsonb,
        NOW()
      )
      ON CONFLICT (connection_id, external_id)
      DO UPDATE
      SET
        last_seen_at = NOW(),
        seen_count = source_events.seen_count + 1,
        payload = EXCLUDED.payload,
        payload_json = EXCLUDED.payload_json,
        event_type = EXCLUDED.event_type,
        updated_at = NOW()
      RETURNING id::text, transaction_id::text
      `,[e.workspaceId,e.businessId,e.connectionId,e.source,e.accountId,e.externalTxnId,e.eventType??"transaction",JSON.stringify(e.payload??{})]);return{stored:!0,sourceEventId:d(r.rows[0]?.id),existingTransactionId:function(e){if(!e)return null;try{let t=BigInt(e);return t>0n?t:null}catch{return null}}(r.rows[0]?.transaction_id)}}catch(e){if(_(e))return{stored:!1,sourceEventId:null,existingTransactionId:null};throw e}}async function N(e){let t=e.client??(0,a.getDbPool)();try{await t.query(`
      UPDATE source_events
      SET
        transaction_id = COALESCE($3::bigint, transaction_id),
        canonical_record_id = COALESCE($4::bigint, canonical_record_id),
        status = $5,
        error = $6,
        last_seen_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[e.sourceEventId,e.workspaceId,e.transactionId?e.transactionId.toString():null,e.canonicalRecordId?e.canonicalRecordId.toString():null,e.status,e.error??null])}catch(e){if(_(e))return;throw e}}async function S(e){let t=e.client??(0,a.getDbPool)();try{let r=await t.query(`
      INSERT INTO connector_sync_cursors (
        workspace_id,
        provider,
        stream,
        cursor,
        sync_mode,
        status,
        last_run_at,
        next_run_at,
        error,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::timestamptz,
        $8::timestamptz,
        $9,
        $10::jsonb
      )
      ON CONFLICT (workspace_id, provider, stream)
      DO UPDATE
      SET
        cursor = EXCLUDED.cursor,
        sync_mode = EXCLUDED.sync_mode,
        status = EXCLUDED.status,
        last_run_at = COALESCE(EXCLUDED.last_run_at, connector_sync_cursors.last_run_at),
        next_run_at = COALESCE(EXCLUDED.next_run_at, connector_sync_cursors.next_run_at),
        error = EXCLUDED.error,
        metadata = COALESCE(connector_sync_cursors.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,[e.workspaceId,e.provider,e.stream??"transactions",e.cursor??null,e.mode??"delta",e.status??"idle",l(e.lastRunAt),l(e.nextRunAt),e.error??null,JSON.stringify(e.metadata??{})]);return{stored:!0,cursorId:d(r.rows[0]?.id)}}catch(e){if(_(e))return{stored:!1,cursorId:null};throw e}}async function k(e){let t=e.client??(0,a.getDbPool)();try{let r=await t.query(`
      INSERT INTO connector_webhook_events (
        workspace_id,
        provider,
        event_id,
        event_type,
        status,
        occurred_at,
        payload,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        'received',
        $5::timestamptz,
        $6::jsonb,
        $7::jsonb
      )
      ON CONFLICT (workspace_id, provider, event_id)
      DO NOTHING
      RETURNING id::text
      `,[e.workspaceId,e.provider,e.eventId,e.eventType,l(e.occurredAt),JSON.stringify(e.payload),JSON.stringify(e.metadata??{})]),n=d(r.rows[0]?.id);return{accepted:!0,duplicate:null===n,webhookEventId:n}}catch(e){if(_(e))return{accepted:!1,duplicate:!1,webhookEventId:null};throw e}}async function h(e){let t=e.client??(0,a.getDbPool)();try{await t.query(`
      UPDATE connector_webhook_events
      SET
        status = $3,
        processed_at = CASE WHEN $3 IN ('processed', 'ignored') THEN NOW() ELSE processed_at END,
        error = $4,
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[e.webhookEventId,e.workspaceId,e.status,e.error??null])}catch(e){if(_(e))return;throw e}}async function g(e){let t=e.client??(0,a.getDbPool)(),r=e.record;try{let e=await t.query(`
      INSERT INTO canonical_records (
        workspace_id,
        business_id,
        provider,
        entity_kind,
        external_id,
        occurred_at,
        direction,
        amount_minor,
        currency_code,
        description,
        counterparty,
        raw_payload,
        normalized_payload,
        transaction_id,
        ingestion_run_id
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6::timestamptz,
        $7::txn_type,
        $8::numeric,
        $9::char(3),
        $10,
        $11,
        $12::jsonb,
        $13::jsonb,
        $14::bigint,
        $15::bigint
      )
      ON CONFLICT (workspace_id, provider, entity_kind, external_id)
      DO UPDATE
      SET
        occurred_at = EXCLUDED.occurred_at,
        direction = EXCLUDED.direction,
        amount_minor = EXCLUDED.amount_minor,
        currency_code = EXCLUDED.currency_code,
        description = EXCLUDED.description,
        counterparty = EXCLUDED.counterparty,
        raw_payload = EXCLUDED.raw_payload,
        normalized_payload = EXCLUDED.normalized_payload,
        transaction_id = COALESCE(EXCLUDED.transaction_id, canonical_records.transaction_id),
        ingestion_run_id = COALESCE(EXCLUDED.ingestion_run_id, canonical_records.ingestion_run_id),
        updated_at = NOW()
      RETURNING id::text
      `,[r.workspaceId,r.businessId,r.provider,r.entityKind,r.externalId??null,l(r.occurredAt),r.direction??null,function(e){if(null==e||""===e)return null;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t.toFixed(2):null}(r.amount),function(e){if(!e)return"INR";let t=e.trim().toUpperCase();return 3!==t.length?"INR":t}(r.currencyCode),r.description??null,r.counterparty??null,JSON.stringify(p(r.rawPayload)),JSON.stringify(p(r.normalizedPayload)),r.transactionId??null,r.ingestionRunId??null]);return{stored:!0,canonicalId:d(e.rows[0]?.id)}}catch(e){if(_(e))return{stored:!1,canonicalId:null};throw e}}function m(e){let t=[e.provider,e.workspaceId,e.eventId??"",e.externalId??""].join("|");return(0,n.createHash)("sha256").update(t).digest("hex")}async function A(e){let t=e.client??(0,a.getDbPool)();try{let r=await t.query(`
      INSERT INTO event_outbox (
        workspace_id,
        event_type,
        dedupe_key,
        payload,
        status,
        available_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4::jsonb,
        'pending',
        COALESCE($5::timestamptz, NOW())
      )
      ON CONFLICT (workspace_id, event_type, dedupe_key)
      DO UPDATE
      SET
        payload = EXCLUDED.payload,
        status = 'pending',
        available_at = COALESCE(EXCLUDED.available_at, NOW()),
        last_error = NULL,
        updated_at = NOW()
      RETURNING id::text
      `,[e.workspaceId,e.eventType,e.dedupeKey,JSON.stringify(e.payload),l(e.availableAt)]);return d(r.rows[0]?.id)}catch{return null}}function v(e=1){let t=Number.isFinite(e)&&e>0?e:1;return new Date(Date.now()+60*t*6e4).toISOString()}async function O(e){let t=e.runRules??!0,r=e.runAlerts??!0,n=null;if(t)try{let t=await (0,c.applyRulesV0ForWorkspace)({workspaceId:e.workspaceId,businessId:e.businessId,limit:1500,confidenceThreshold:.65});n={ok:!0,scanned:t.scanned,tagged:t.tagged,duplicateSuggestionsOpen:t.duplicateSuggestionsOpen}}catch(e){n={ok:!1,error:e instanceof Error?e.message:"Failed to run categorization rules"}}let o=null;if(r)try{let t=await (0,s.evaluateWorkspaceAlerts)({workspaceId:e.workspaceId,businessId:e.businessId,sendWhatsAppDigest:e.sendWhatsAppDigest??!1}),r=Object.values(t.alerts).filter(e=>"opened"===e.alert.status||"updated"===e.alert.status).length;o={ok:!0,openCount:r}}catch(e){o={ok:!1,error:e instanceof Error?e.message:"Failed to run alert evaluation"}}return{rules:n,alerts:o}}async function L(e){let t=e.client??(0,a.getDbPool)(),r=[],n=["c.status IN ('idle', 'queued', 'error')","(c.next_run_at IS NULL OR c.next_run_at <= NOW())"];e.workspaceId&&(r.push(e.workspaceId),n.push(`c.workspace_id = $${r.length}::uuid`));let s=e.limit??20;r.push(s);let o=await t.query(`
    SELECT
      c.workspace_id::text,
      c.provider,
      c.stream,
      c.cursor,
      c.sync_mode
    FROM connector_sync_cursors c
    WHERE ${n.join(" AND ")}
    ORDER BY c.next_run_at NULLS FIRST, c.updated_at ASC
    LIMIT $${r.length}
    `,r),i=[];for(let e of o.rows)e.provider&&i.push({workspaceId:e.workspace_id,provider:e.provider,stream:e.stream,cursor:e.cursor,mode:e.sync_mode});return i}[s,o,a,c]=u.then?(await u)():u,e.s(["buildWebhookDedupeKey",()=>m,"enqueueConnectorWebhookEvent",()=>k,"enqueueNotificationOutbox",()=>A,"ensureIntegrationSourceAccount",()=>w,"finalizeSourceEvent",()=>N,"finishSyncRun",()=>I,"getDueDeltaSyncTargets",()=>L,"nextDeltaRunAt",()=>v,"runLedgerPipelinePostIngest",()=>O,"startSyncRun",()=>y,"updateConnectorWebhookEventStatus",()=>h,"upsertCanonicalRecord",()=>g,"upsertConnection",()=>f,"upsertConnectorCursor",()=>S,"upsertConnectorToken",()=>E,"upsertSourceEvent",()=>b]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__e7a16c5b._.js.map