module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},84536,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function n(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function i(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function a(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),n=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!n)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:n}}e.s(["getSupabaseAuthEnv",()=>a,"getSupabasePublicEnv",()=>i,"hasSupabasePublicEnv",()=>n])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},51837,e=>e.a(async(t,r)=>{try{var n=e.i(23862),i=e.i(63021),a=t([n]);[n]=a.then?(await a)():a;let c=null;function s(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return c||(c=new n.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),c}async function o(){let e=s(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new i.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>s,"pingDatabase",()=>o]),r()}catch(e){r(e)}},!1),55158,e=>{"use strict";e.i(84536),e.s([])},1115,e=>e.a(async(t,r)=>{try{var n=e.i(51837),i=t([n]);[n]=i.then?(await i)():i,e.s([]),r()}catch(e){r(e)}},!1),11235,e=>e.a(async(t,r)=>{try{var n=e.i(51837);e.i(55158);var i=e.i(1115),a=t([n,i]);[n,i]=a.then?(await a)():a,e.s([]),r()}catch(e){r(e)}},!1),21902,e=>e.a(async(t,r)=>{try{var n=e.i(11235),i=t([n]);[n]=i.then?(await i)():i,e.s([]),r()}catch(e){r(e)}},!1),1398,e=>e.a(async(t,r)=>{try{var n=e.i(89171),i=e.i(21902),a=e.i(51837),s=t([i,a]);[i,a]=s.then?(await s)():s;let I=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function o(e,t){return n.NextResponse.json({error:e,details:t},{status:400})}function c(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function u(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function d(e,t){if(null!=e&&""!==e)return u(e,t)}function l(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!I.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return l(e,t)}function E(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function _(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function f(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function w(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?u(t,"businessId"):void 0,workspaceId:r?l(r,"workspaceId"):void 0}}function y(e){return{businessId:d(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function b(e){let t=e.get("page"),r=e.get("limit"),n=t?u(t,"page"):1,i=r?u(r,"limit"):25;if(i>200)throw Error("limit cannot be greater than 200");return{page:n,pageSize:i}}async function S(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let n=t??(0,a.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await n.query(`
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
      `,[e.workspaceId])).rows[0];if(!t)throw Error("workspaceId not found");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}let i=e.businessId,s=r?.allowWorkspaceAutocreate??!0,o=await n.query(`
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,[i]);!o.rows[0]&&s&&(await n.query(`
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,[i]),o=await n.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,[i]));let c=o.rows[0];if(!c)throw Error("businessId not found");return{workspaceId:c.workspace_id,businessId:Number(c.business_id)}}e.s(["badRequest",()=>o,"parseBooleanQuery",()=>c,"parsePagination",()=>b,"readScopeFromBody",()=>y,"readScopeFromSearchParams",()=>w,"resolveScope",()=>S,"toOptionalBoolean",()=>f,"toOptionalNumber",()=>_,"toOptionalPositiveInt",()=>d,"toOptionalText",()=>E,"toOptionalUuid",()=>p,"toPositiveInt",()=>u]),r()}catch(e){r(e)}},!1),66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},23796,e=>e.a(async(t,r)=>{try{var n=e.i(21902),i=e.i(51837),a=t([n,i]);function s(e){return void 0===e?null:JSON.stringify(e)}async function o(e,t){let r=t??(0,i.getDbPool)();await r.query(`
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
    `,[e.workspaceId,e.businessId??null,e.actorType,e.actorId??null,e.entityType,String(e.entityId),e.action,s(e.beforeState),s(e.afterState),e.requestId??null,e.ipAddress??null,e.userAgent??null])}async function c(e,t){try{await o(e,t)}catch(e){if(function(e){if(!e||"object"!=typeof e)return!1;let t="code"in e?String(e.code??""):"";return"42P01"===t||(e instanceof Error?e.message.toLowerCase():"").includes('relation "audit_logs" does not exist')}(e))return}}[n,i]=a.then?(await a)():a,e.s(["writeAuditLogSafe",()=>c]),r()}catch(e){r(e)}},!1),76617,e=>e.a(async(t,r)=>{try{var n=e.i(21902),i=e.i(51837),a=t([n,i]);[n,i]=a.then?(await a)():a;let b=["marketing","saas","software","logistics","shipping","rent","utilities","fixed cost","internet","electricity","office","operations","professional","subscription"];function s(e){if(null==e)return 0;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t:0}function o(e){return Number(e.toFixed(2))}function c(e,t,r){return Math.min(r,Math.max(t,e))}function u(e,t){for(let r of t)if(Object.prototype.hasOwnProperty.call(e,r)){let t=e[r];if(null!=t&&""!==t)return!0}return!1}function d(e){return!!Array.isArray(e)&&e.length>0}function l(e){return!e||"object"!=typeof e||Array.isArray(e)?null:e}function p(e){return`₹${Math.abs(e).toLocaleString("en-IN",{maximumFractionDigits:2})}`}function E(e){let t=l(e);if(!t)return null;for(let e of["bank_balance","bankBalance","cash_balance","cashBalance","closing_balance","closingBalance","balance"]){let r=t[e],n=s("string"==typeof r||"number"==typeof r?r:null);if(n>0)return n}for(let e of[t.manual,t.bank,t.summary]){let t=E(e);if(null!==t&&t>0)return t}return null}async function _(e){try{for(let t of(await e.client.query(`
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
    `,[e.workspaceId])).rows){let e=E(t.metadata);if(null!==e&&e>0)return e}return Math.max(0,e.fallbackFromLedger)}async function f(e){let t=await e.client.query(`
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
      `,[e.businessId,e.workspaceId,r[0]??null,e.type,e.severity,e.body,e.title,e.body,JSON.stringify(r),JSON.stringify(n)]);let i=t.rows[0]?.id;if(i&&await e.client.query(`
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
      `,[i,e.workspaceId,e.severity,e.body,e.title,e.body,r[0]??null,JSON.stringify(r),JSON.stringify(n)]),t.rows.length>1){let r=t.rows.slice(1).map(e=>Number.parseInt(e.id,10)).filter(e=>Number.isInteger(e)&&e>0);r.length>0&&await e.client.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE workspace_id = $1::uuid
          AND id = ANY($2::bigint[])
        `,[e.workspaceId,r,JSON.stringify({resolution:{action:"auto_resolve",reason:"superseded by latest computed alert"}})])}}async function w(e){var t;let r,n,i,a,E,w,y,S=(a=(t=new Date).getUTCFullYear(),E=t.getUTCMonth(),w=new Date(Date.UTC(a,E,20,0,0,0)),t.getTime()<=w.getTime()?(r=new Date(Date.UTC(a,E-1,1,0,0,0)),n=new Date(Date.UTC(a,E,1,0,0,0)),i=w):(r=new Date(Date.UTC(a,E,1,0,0,0)),n=new Date(Date.UTC(a,E+1,1,0,0,0)),i=new Date(Date.UTC(a,E+1,20,0,0,0))),y=(i.getTime()-t.getTime())/864e5,{cycleStart:r,cycleEnd:n,dueDate:i,dueInDays:y}),I=(await e.client.query(`
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
    `,[e.workspaceId])).rows[0];if(!I)throw Error("Failed to compute aggregates");let m=await e.client.query(`
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
    `,[e.workspaceId,S.cycleStart.toISOString(),S.cycleEnd.toISOString()]),g=0,N=0,A=0,h=[];for(let e of m.rows){let t=Number.parseInt(e.id,10);if(!Number.isInteger(t)||t<=0)continue;let r=function(e){let t=s(e.gst_amount);if(t>0)return t;let r=s(e.gst_rate);return r<=0?0:Math.abs(s(e.amount_minor))*r/100}(e);if(!(r<=0)){if("credit"===e.direction){g+=r;continue}"debit"===e.direction&&function(e){let t=(e??"").toLowerCase().replace(/[^a-z0-9\s/]/g," ").replace(/\s+/g," ").trim();return!!t&&b.some(e=>t.includes(e))}(e.category_name)&&(N+=r,!function(e){let t=l(e);if(!t)return!1;if(!0===t.invoiceUploaded||!0===t.hasInvoice||u(t,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","invoice_url"])||d(t.attachments)||d(t.evidence)||d(t.proofs)||d(t.invoices))return!0;for(let e of["evidence","invoice","documents","proof"]){let r=l(t[e]);if(r&&(u(r,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","url"])||d(r.attachments)||d(r.files)))return!0}return!1}(e.metadata)&&(A+=r,h.push(t)))}}let T=Math.max(0,g-N),x=S.dueInDays>=0&&S.dueInDays<=7,L=x?T:0,D=s(I.all_credit),k=s(I.all_debit),O=await _({client:e.client,workspaceId:e.workspaceId,fallbackFromLedger:D-k}),$=s(I.expense_30d),v=s(I.expense_60d),U=s(I.expense_90d),C=$/30,R=v/60,P=U/90,B=(C+R+P)/3,M=30*B,F=M>0?O/M:99,j=s(I.total_count),q=s(I.matched_count),W=s(I.categorized_count),H=s(I.gst_applicable_count),Y=s(I.gst_tagged_count),G=j>0?q/j*100:100,X=H>0?Y/H*100:100,z=h.length,J=c(4*z,0,50),K=10*(F<3),V=c(.45*(j>0?W/j*100:100)+.45*G+.1*X-.2*J-K,0,100),Q=c(.7*X+(100-J)*.3,0,100);if(e.syncAlerts){let t=T>=1e4?"critical":"warning",r=x&&T>5e3;await f({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"gst_due",shouldOpen:r,severity:t,title:`GST net due ${p(T)} by ${S.dueDate.toISOString().slice(0,10)}`,body:`Output GST ${p(g)} - Input GST ${p(N)} = Net due ${p(T)}. Due date ${S.dueDate.toISOString().slice(0,10)} (${Math.max(0,Math.ceil(S.dueInDays))} day(s)). Threshold ${p(5e3)}.`,relatedTransactionIds:[],payload:{netDue:o(T),outputGst:o(g),inputGst:o(N),threshold:5e3,dueDate:S.dueDate.toISOString(),dueInDays:o(S.dueInDays),fixAction:{label:"Review GST transactions",kind:"open_filter",preset:"gst_due"}}}),await f({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"itc_mismatch",shouldOpen:z>0,severity:z>=10?"critical":"warning",title:`ITC mismatch: ${z} transaction(s) missing invoice evidence`,body:`${z} input-GST transaction(s) have no invoice evidence. Potential blocked ITC ${p(A)} in current cycle.`,relatedTransactionIds:h.slice(0,200),payload:{mismatchCount:z,mismatchAmount:o(A),cycleStart:S.cycleStart.toISOString(),cycleEnd:S.cycleEnd.toISOString(),fixAction:{label:"Upload invoices",kind:"open_filter",preset:"itc_mismatch"}}});let n=F<1.5?"critical":"warning";await f({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"cash_runway_risk",shouldOpen:F<3,severity:n,title:`Cash runway ${F.toFixed(1)} month(s)`,body:`Cash balance ${p(O)}. Burn (30/60/90d): ${p($/30)}/${p(v/60)}/${p(U/90)} per day. Weighted monthly burn ${p(M)}. Runway ${F.toFixed(1)} months.`,relatedTransactionIds:[],payload:{cashBalance:o(O),burnRateDaily30d:o(C),burnRateDaily60d:o(R),burnRateDaily90d:o(P),monthlyBurn:o(M),runwayMonths:o(F),warningThresholdMonths:3,criticalThresholdMonths:1.5,fixAction:{label:"Review unmatched cash drivers",kind:"open_recon",recon:"unmatched"}}})}let Z=await e.client.query(`
    SELECT COUNT(*)::text AS count
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND status = 'open'
      AND severity = 'critical'
    `,[e.workspaceId]),ee=s(Z.rows[0]?.count),et=c(V-5*ee,0,100);return{cash_runway_months:o(F),gst_due_amount_next_7d:o(L),itc_mismatch_count:z,recon_match_pct:o(G),month_close_readiness_pct:o(et),compliance_confidence:o(Q)}}async function y(e){let t=e.syncAlerts??!0;if(e.client)return w({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:t});let r=(0,i.getDbPool)(),n=await r.connect();try{await n.query("BEGIN");let r=await w({client:n,workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:t});return await n.query("COMMIT"),r}catch(e){throw await n.query("ROLLBACK"),e}finally{n.release()}}e.s(["computeFinanceHealth",()=>y]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__e2508e6c._.js.map