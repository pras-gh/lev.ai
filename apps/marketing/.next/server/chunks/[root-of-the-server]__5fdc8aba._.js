module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},28394,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function a(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function n(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function i(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),a=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!a)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:a}}e.s(["getSupabaseAuthEnv",()=>i,"getSupabasePublicEnv",()=>n,"hasSupabasePublicEnv",()=>a])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},34591,e=>e.a(async(t,r)=>{try{var a=e.i(23862),n=e.i(63021),i=t([a]);[a]=i.then?(await i)():i;let u=null;function s(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return u||(u=new a.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),u}async function o(){let e=s(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new n.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>s,"pingDatabase",()=>o]),r()}catch(e){r(e)}},!1),65297,e=>{"use strict";e.i(28394),e.s([])},84851,e=>e.a(async(t,r)=>{try{var a=e.i(34591),n=t([a]);[a]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),72289,e=>e.a(async(t,r)=>{try{var a=e.i(34591);e.i(65297);var n=e.i(84851),i=t([a,n]);[a,n]=i.then?(await i)():i,e.s([]),r()}catch(e){r(e)}},!1),33691,e=>e.a(async(t,r)=>{try{var a=e.i(72289),n=t([a]);[a]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),14568,e=>e.a(async(t,r)=>{try{var a=e.i(89171),n=e.i(33691),i=e.i(34591),s=t([n,i]);[n,i]=s.then?(await s)():s;let m=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function o(e,t){return a.NextResponse.json({error:e,details:t},{status:400})}function u(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function c(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function l(e,t){if(null!=e&&""!==e)return c(e,t)}function d(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!m.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return d(e,t)}function f(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function b(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function g(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function y(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?c(t,"businessId"):void 0,workspaceId:r?d(r,"workspaceId"):void 0}}function h(e){return{businessId:l(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function w(e){let t=e.get("page"),r=e.get("limit"),a=t?c(t,"page"):1,n=r?c(r,"limit"):25;if(n>200)throw Error("limit cannot be greater than 200");return{page:a,pageSize:n}}async function E(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let a=t??(0,i.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await a.query(`
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
      `,[n]));let u=o.rows[0];if(!u)throw Error("businessId not found");return{workspaceId:u.workspace_id,businessId:Number(u.business_id)}}e.s(["badRequest",()=>o,"parseBooleanQuery",()=>u,"parsePagination",()=>w,"readScopeFromBody",()=>h,"readScopeFromSearchParams",()=>y,"resolveScope",()=>E,"toOptionalBoolean",()=>g,"toOptionalNumber",()=>b,"toOptionalPositiveInt",()=>l,"toOptionalText",()=>f,"toOptionalUuid",()=>p,"toPositiveInt",()=>c]),r()}catch(e){r(e)}},!1),40423,e=>e.a(async(t,r)=>{try{var a=e.i(14568),n=e.i(33691),i=e.i(34591),s=e.i(28394),o=t([a,n,i]);[a,n,i]=o.then?(await o)():o;let h=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,w=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;class E extends Error{status;constructor(e,t){super(e),this.name="ApiAuthError",this.status=t}}function u(e,t){throw new E(e,t)}function c(e){return w.test(e.trim())}function l(e){if(!e)return null;if("string"==typeof e){let t=e.trim();return c(t)?t:null}if(Array.isArray(e)){for(let t of e){let e=l(t);if(e)return e}return null}if("object"==typeof e){let t=l(e.access_token)??l(e.accessToken)??l(e.token);return t||(l(e.session)??l(e.currentSession)??l(e.data))}return null}function d(e){let t=e.trim();if(!t)return null;if(c(t))return t;try{let e=decodeURIComponent(t);if(e!==t&&c(e))return e;let r=JSON.parse(e),a=l(r);if(a)return a}catch{}try{let e=JSON.parse(t);return l(e)}catch{return null}}async function p(e){let t,r=function(e){let t=e.headers.get("authorization");if(t){let[e,r]=t.split(/\s+/,2);if(e?.toLowerCase()==="bearer"&&r&&c(r))return r}for(let t of[e.headers.get("x-supabase-access-token"),e.headers.get("x-access-token")]){if(!t)continue;let e=d(t);if(e)return e}for(let t of e.cookies.getAll()){let e=t.name.toLowerCase();if(!("sb-access-token"===e||"supabase-access-token"===e||e.startsWith("sb-")&&e.endsWith("-auth-token")))continue;let r=d(t.value);if(r)return r}u("Missing access token. Send Authorization: Bearer <token>.",401)}(e),{supabaseUrl:a,supabaseAnonKey:n}=function(){try{return(0,s.getSupabaseAuthEnv)()}catch{return u("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",500)}}();try{t=await fetch(`${a}/auth/v1/user`,{method:"GET",headers:{apikey:n,Authorization:`Bearer ${r}`},cache:"no-store"})}catch{u("Unable to reach auth provider for session validation.",502)}(401===t.status||403===t.status)&&u("Invalid or expired session token.",401),t.ok||u("Session validation failed at auth provider.",502);let i=await t.json(),o="string"==typeof i.id?i.id.trim():"";return h.test(o)||u("Session missing valid user id.",401),{userId:o,email:"string"==typeof i.email?i.email:null}}async function f(e){let t=e.client??(0,i.getDbPool)(),r=(await t.query(`
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,[e.workspaceId,e.userId])).rows[0];return r||u("Forbidden: user does not belong to this workspace.",403),"active"!==(r.status??"").toLowerCase()&&u("Forbidden: workspace membership is not active.",403),{role:r.role}}function b(e){if(e instanceof E)return e.status}async function g(e){return p(e)}async function y(e){let t=await p(e.request),r=await (0,a.resolveScope)(e.scope,e.client,{allowWorkspaceAutocreate:!1}),n=await f({workspaceId:r.workspaceId,userId:t.userId,client:e.client});return{...r,userId:t.userId,workspaceRole:n.role}}e.s(["getAuthErrorStatus",()=>b,"resolveAuthorizedScope",()=>y,"resolveSessionUser",()=>g]),r()}catch(e){r(e)}},!1),64561,e=>{"use strict";var t=e.i(63021);let r=[{category:"revenue",weight:3,patterns:[/\brazorpay\b.*\bsettlement\b/i,/\bsettlement\b.*\brazorpay\b/i,/\bstripe\b.*\bpayout\b/i,/\bpayout\b.*\bstripe\b/i,/\bpayment received\b/i,/\bpayment\s+rec(?:eive|ei)db?\b/i]},{category:"tax",weight:3,patterns:[/\bgst\b/i,/\bgstr\b/i,/\bcbic\b/i,/\btax payment\b/i,/\bsgst\b/i,/\bcgst\b/i,/\bigst\b/i,/\btax\b/i,/\btds\b/i]},{category:"payroll",weight:3,patterns:[/\bsalary\b/i,/\bpayroll\b/i,/\bpf\b/i,/\besic\b/i,/\besi\b/i,/\bstipend\b/i,/\bwages?\b/i]},{category:"marketing",weight:3,patterns:[/\bfacebook ads\b/i,/\bgoogle ads\b/i,/\bmeta ads\b/i,/\bad spend\b/i,/\badvertising\b/i,/\bfb ads\b/i]},{category:"saas",weight:3,patterns:[/\bzoho\b/i,/\baws\b/i,/\bnotion\b/i,/\bopenai\b/i,/\bsoftware\b/i]},{category:"logistics",weight:3,patterns:[/\bdelhivery\b/i,/\bshiprocket\b/i,/\bcourier\b/i,/\bshipping\b/i]},{category:"rent/utilities",weight:3,patterns:[/\brent\b/i,/\belectricity\b/i,/\binternet\b/i,/\blease\b/i,/\bpower bill\b/i,/\butility\b/i]}];globalThis.prisma??new t.PrismaClient({log:["error"]});let a=e=>e.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim(),n=e=>a(e);function i(e){let t=a([e.description,e.merchant,e.reference].filter(e=>!!(e&&e.trim())).join(" "));if(!t)return{categoryName:null,confidence:0,tags:[]};let n=null;for(let e of r){let r=0;for(let a of e.patterns)a.test(t)&&(r+=1);if(!r)continue;let a=r*(e.weight??1);(!n||a>n.score)&&(n={category:e.category,score:a,matched:e.category})}if(!n)return{categoryName:null,confidence:0,tags:[]};let i=n.score>=6?.9:n.score>=3?.8:.65;return{categoryName:n.category,confidence:i,matchedRule:n.matched,tags:["rules:v0",`bucket:${n.category}`]}}function s(e){return new Map(e.map(e=>[n(e.name),e.id]))}function o(e){let t=n(e.categoryName);for(let r of({tax:["tax","taxes","gst"],payroll:["payroll","salary","salaries"],revenue:["revenue","sales revenue","other income","income"],marketing:["marketing","facebook ads","google ads","advertising","ads"],saas:["saas","software","tools","subscriptions"],logistics:["logistics","shipping","courier","delhivery","shiprocket"],"rent/utilities":["rent/utilities","rent and utilities","rent","utilities","electricity","internet","fixed cost"]})[t]??[t]){let t=e.categoryMap.get(n(r));if(t)return t}return null}e.s(["CATEGORIZE_V0_TARGET_RATE",0,.8,"CATEGORIZE_V0_VERSION",0,"v0","buildCategoryNameIdMap",()=>s,"categorizeTransactionV0",()=>i,"resolveCategoryIdByCategoryName",()=>o])},32469,e=>{"use strict";var t=e.i(66680);let r=["account","accountno","accountnumber","ac","acno","acnumber","acct","acctno","bankaccount","sourceaccount","fromaccount"];function a(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}function n(e){return e.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()}function i(e){return n(e.map(e=>"string"==typeof e?e.trim():"").filter(e=>e.length>0).join(" "))}function s(e){let r,a,i,s,o=(r=function(e){let t=e instanceof Date?e:new Date(e);if(Number.isNaN(t.getTime()))throw Error("date must be a valid date string");return t.toISOString().slice(0,10)}(e.date),a=function(e){if("bigint"==typeof e)return`${e.toString()}.00`;let t=Number(("number"==typeof e?String(e):e).trim().replace(/[,\s]/g,"").replace(/[₹$€£]/g,""));if(!Number.isFinite(t))throw Error("amount must be a valid numeric value");return Math.abs(t).toFixed(2)}(e.amount),i=n(e.description??""),s=n(e.account??""),`${r}|${a}|${i}|${s}`);return(0,t.createHash)("sha256").update(o).digest("hex")}function o(e){for(let[t,a]of Object.entries(e)){let e=t.trim().toLowerCase().replace(/[^a-z0-9]/g,"");if(!r.includes(e))continue;let n=function(e){if("string"==typeof e){let t=e.trim();return t.length>0?t:void 0}if("number"==typeof e||"bigint"==typeof e){let t=String(e).trim();return t.length>0?t:void 0}}(a);if(n)return n}}function u(e){if(!a(e))return;let t=o(e);if(t)return t;for(let t of[e.raw,e.bank,e.account]){if(!a(t))continue;let e=o(t);if(e)return e}}e.s(["buildHashDescription",()=>i,"computeTransactionHash",()=>s,"extractAccountHintFromMetadata",()=>u,"extractAccountHintFromRecord",()=>o])},66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},84942,e=>e.a(async(t,r)=>{try{var a=e.i(33691),n=e.i(34591),i=t([a,n]);function s(e){return void 0===e?null:JSON.stringify(e)}async function o(e,t){let r=t??(0,n.getDbPool)();await r.query(`
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
    `,[e.workspaceId,e.businessId??null,e.actorType,e.actorId??null,e.entityType,String(e.entityId),e.action,s(e.beforeState),s(e.afterState),e.requestId??null,e.ipAddress??null,e.userAgent??null])}async function u(e,t){try{await o(e,t)}catch(e){if(function(e){if(!e||"object"!=typeof e)return!1;let t="code"in e?String(e.code??""):"";return"42P01"===t||(e instanceof Error?e.message.toLowerCase():"").includes('relation "audit_logs" does not exist')}(e))return}}[a,n]=i.then?(await i)():i,e.s(["writeAuditLogSafe",()=>u]),r()}catch(e){r(e)}},!1),91268,e=>e.a(async(t,r)=>{try{var a=e.i(33691),n=e.i(34591),i=e.i(84942),s=e.i(64561),o=e.i(32469),u=t([a,n,i]);function c(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}function l(e,t){let r=[...t].sort((e,t)=>e-t);return`dup:${e}:${r.join(",")}`}async function d(e,t){let r=await e.query(`
    SELECT payload->>'fingerprint' AS fingerprint
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND type = 'duplicate'
      AND status IN ('open', 'snoozed')
    `,[t]);return new Set(r.rows.map(e=>e.fingerprint).filter(e=>!!e))}async function p(e){let t=e.limit??1e3,r=e.confidenceThreshold??.65,a=e.includeDeleted??!1;if(!Number.isInteger(t)||t<=0||t>1e4)throw Error("limit must be an integer between 1 and 10000");if(r<0||r>1)throw Error("confidenceThreshold must be between 0 and 1");let u=(0,n.getDbPool)(),p=await u.connect();try{await p.query("BEGIN");let n=await p.query(`
      SELECT id::text, name
      FROM categories
      WHERE workspace_id = $1::uuid
      `,[e.workspaceId]),u=(0,s.buildCategoryNameIdMap)(n.rows.map(e=>{try{return{id:BigInt(e.id),name:e.name}}catch{return null}}).filter(e=>!!e)),f=await p.query(`
      SELECT
        t.id::text,
        t.business_id::text,
        t.occurred_at::text,
        t.amount_minor::text,
        t.description,
        t.counterparty,
        t.external_ref,
        t.category_id::text,
        t.metadata
      FROM transactions t
      WHERE t.workspace_id = $1::uuid
        AND t.status IN ('posted', 'reversed')
        ${a?"":"AND t.is_hidden = FALSE"}
      ORDER BY t.occurred_at DESC, t.id DESC
      LIMIT $2
      `,[e.workspaceId,t]),b=0,g=0,y=new Map;for(let t of f.rows){let a=function(e){let t=Number.parseInt(e,10);return Number.isInteger(t)&&t>0?t:null}(t.id);if(null===a)continue;let n=(0,s.categorizeTransactionV0)({description:t.description,merchant:t.counterparty,reference:t.external_ref}),l=n.categoryName?(0,s.resolveCategoryIdByCategoryName)({categoryName:n.categoryName,categoryMap:u}):null,d=(0,o.buildHashDescription)([t.description,t.counterparty,t.external_ref]),f=(0,o.extractAccountHintFromMetadata)(t.metadata)??t.counterparty??null,h=(0,o.computeTransactionHash)({date:t.occurred_at,amount:t.amount_minor,description:d,account:f}),w=y.get(h)??[];w.push(a),y.set(h,w);let E=c(t.metadata)?t.metadata:{},m=c(E.dedupe)?E.dedupe:{},_=c(E.categorization)?E.categorization:{},A={...E,dedupe:{...m,hash:h,formula:"sha256(date|amount|normalized_desc|account)"}};n.categoryName&&n.confidence>=r&&(A.categorization={..._,version:s.CATEGORIZE_V0_VERSION,autoTagged:null!==l,categoryName:n.categoryName,confidence:n.confidence,matchedRule:n.matchedRule??null,tags:n.tags});let S=JSON.stringify(E)!==JSON.stringify(A),I=null===t.category_id&&null!==l&&n.confidence>=r;if(!S&&!I)continue;let N=[String(a),JSON.stringify(A),e.workspaceId],v=["metadata = $2::jsonb","updated_at = NOW()"];I&&null!==l&&(N.push(l.toString()),v.push(`category_id = $${N.length}`),N.push(n.confidence.toString()),v.push(`confidence = $${N.length}::numeric`),b+=1),await p.query(`
        UPDATE transactions
        SET ${v.join(", ")}
        WHERE id = $1::bigint
          AND workspace_id = $3::uuid
        `,N),g+=1,I&&null!==l&&await (0,i.writeAuditLogSafe)({workspaceId:e.workspaceId,businessId:t.business_id,actorType:"system",actorId:"trail_rules_v0",entityType:"transaction",entityId:t.id,action:"trail.transaction.auto_categorized",beforeState:{categoryId:t.category_id,confidence:null},afterState:{categoryId:l.toString(),confidence:n.confidence,matchedRule:n.matchedRule??null,modelVersion:s.CATEGORIZE_V0_VERSION,evidence:{transactionIds:[a],source:"rules_engine_v0",description:t.description,counterparty:t.counterparty,externalRef:t.external_ref}}},p)}let h=[...y.entries()].map(([e,t])=>({hash:e,ids:[...new Set(t)].sort((e,t)=>e-t)})).filter(e=>e.ids.length>1),w=h.map(e=>l(e.hash,e.ids)),E=await d(p,e.workspaceId),m=0;for(let t of h){let r=l(t.hash,t.ids);E.has(r)||(await p.query(`
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
          payload
        )
        VALUES (
          $1,
          $2::uuid,
          $3,
          'duplicate',
          'duplicate',
          'warning',
          'open',
          'Potential duplicate transaction detected by rules engine.',
          'Auto-clean suggestion: potential duplicate',
          $4,
          $5::jsonb,
          $6::jsonb
        )
        `,[e.businessId,e.workspaceId,t.ids[0],`${t.ids.length} transaction(s) share the same hash. Action: Merge / Ignore.`,JSON.stringify(t.ids),JSON.stringify({source:"rules_engine_v0",fingerprint:r,hash:t.hash,suggestedAction:"merge",suggestedKeepTransactionId:t.ids[0]??null})]),E.add(r),m+=1)}w.length>0?await p.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
        WHERE workspace_id = $1::uuid
          AND type = 'duplicate'
          AND status = 'open'
          AND COALESCE(payload->>'source', '') = 'rules_engine_v0'
          AND COALESCE(payload->>'fingerprint', '') <> ''
          AND NOT ((payload->>'fingerprint') = ANY($2::text[]))
        `,[e.workspaceId,w,JSON.stringify({resolution:{action:"auto_resolve",reason:"duplicate group no longer active"}})]):await p.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb
        WHERE workspace_id = $1::uuid
          AND type = 'duplicate'
          AND status = 'open'
          AND COALESCE(payload->>'source', '') = 'rules_engine_v0'
        `,[e.workspaceId,JSON.stringify({resolution:{action:"auto_resolve",reason:"no active duplicate groups"}})]);let _=await p.query(`
      SELECT COUNT(*)::text AS count
      FROM alerts
      WHERE workspace_id = $1::uuid
        AND type = 'duplicate'
        AND status = 'open'
      `,[e.workspaceId]),A=Number(_.rows[0]?.count??"0"),S=await p.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_hidden = FALSE)::text AS total,
        COUNT(*) FILTER (WHERE is_hidden = FALSE AND category_id IS NOT NULL)::text AS tagged
      FROM transactions
      WHERE workspace_id = $1::uuid
      `,[e.workspaceId]),I=Number(S.rows[0]?.total??"0"),N=Number(S.rows[0]?.tagged??"0");return await p.query("COMMIT"),{scanned:f.rows.length,updated:g,tagged:b,duplicateSuggestionsCreated:m,duplicateSuggestionsOpen:A,coverage:{total:I,tagged:N,ratio:I>0?N/I:0}}}catch(e){throw await p.query("ROLLBACK"),e}finally{p.release()}}[a,n,i]=u.then?(await u)():u,e.s(["applyRulesV0ForWorkspace",()=>p]),r()}catch(e){r(e)}},!1),18475,e=>e.a(async(t,r)=>{try{var a=e.i(89171),n=e.i(14568),i=e.i(40423),s=e.i(91268),o=t([n,i,s]);async function u(e){let t;try{t=await e.json()}catch{return(0,n.badRequest)("Invalid JSON body")}if(!t||"object"!=typeof t)return(0,n.badRequest)("Body must be a JSON object");let r=t;try{let t=await (0,i.resolveAuthorizedScope)({request:e,scope:(0,n.readScopeFromBody)(r)}),o=(0,n.toOptionalPositiveInt)(r.limit,"limit"),u=(0,n.toOptionalNumber)(r.confidenceThreshold,"confidenceThreshold"),c=(0,n.toOptionalBoolean)(r.includeDeleted,"includeDeleted");if(void 0!==u&&(u<0||u>1))return(0,n.badRequest)("confidenceThreshold must be between 0 and 1");let l=await (0,s.applyRulesV0ForWorkspace)({workspaceId:t.workspaceId,businessId:t.businessId,limit:o,confidenceThreshold:u,includeDeleted:c});return a.NextResponse.json({workspaceId:t.workspaceId,businessId:t.businessId,result:l})}catch(n){let e=n instanceof Error?n.message:"Failed to apply rules",t=(0,i.getAuthErrorStatus)(n);if(t)return a.NextResponse.json({error:e},{status:t});let r=e.includes("must be")||e.includes("Provide at least one scope identifier")||e.includes("not found")?400:500;return a.NextResponse.json({error:e},{status:r})}}[n,i,s]=o.then?(await o)():o,e.s(["POST",()=>u,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),r()}catch(e){r(e)}},!1),67521,e=>e.a(async(t,r)=>{try{var a=e.i(47909),n=e.i(74017),i=e.i(96250),s=e.i(59756),o=e.i(61916),u=e.i(74677),c=e.i(69741),l=e.i(16795),d=e.i(87718),p=e.i(95169),f=e.i(47587),b=e.i(66012),g=e.i(70101),y=e.i(26937),h=e.i(10372),w=e.i(93695);e.i(52474);var E=e.i(220),m=e.i(18475),_=t([m]);[m]=_.then?(await _)():_;let I=new a.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/rules/apply/route",pathname:"/api/rules/apply",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/rules/apply/route.ts",nextConfigOutput:"",userland:m}),{workAsyncStorage:N,workUnitAsyncStorage:v,serverHooks:R}=I;function A(){return(0,i.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:v})}async function S(e,t,r){I.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let a="/api/rules/apply/route";a=a.replace(/\/index$/,"")||"/";let i=await I.prepare(e,t,{srcPage:a,multiZoneDraftMode:!1});if(!i)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:m,params:_,nextConfig:A,parsedUrl:S,isDraftMode:N,prerenderManifest:v,routerServerContext:R,isOnDemandRevalidate:x,revalidateOnlyGenerated:k,resolvedPathname:T,clientReferenceManifest:C,serverActionsManifest:O}=i,U=(0,c.normalizeAppPath)(a),P=!!(v.dynamicRoutes[U]||v.routes[T]),L=async()=>((null==R?void 0:R.render404)?await R.render404(e,t,S,!1):t.end("This page could not be found"),null);if(P&&!N){let e=!!v.routes[T],t=v.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(A.experimental.adapterPath)return await L();throw new w.NoFallbackError}}let $=null;!P||I.isDev||N||($=T,$="/index"===$?"/":$);let D=!0===I.isDev||!P,B=P&&!D;O&&C&&(0,u.setManifestsSingleton)({page:a,clientReferenceManifest:C,serverActionsManifest:O});let q=e.method||"GET",j=(0,o.getTracer)(),M=j.getActiveScopeSpan(),H={params:_,prerenderManifest:v,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:A.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>I.onRequestError(e,t,a,n,R)},sharedContext:{buildId:m}},F=new l.NodeNextRequest(e),W=new l.NodeNextResponse(t),z=d.NextRequestAdapter.fromNodeNextRequest(F,(0,d.signalFromNodeResponse)(t));try{let i=async e=>I.handle(z,H).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${q} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${q} ${a}`)}),u=!!(0,s.getRequestMeta)(e,"minimalMode"),c=async s=>{var o,c;let l=async({previousCacheEntry:n})=>{try{if(!u&&x&&k&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await i(s);e.fetchMetrics=H.renderOpts.fetchMetrics;let o=H.renderOpts.pendingWaitUntil;o&&r.waitUntil&&(r.waitUntil(o),o=void 0);let c=H.renderOpts.collectedTags;if(!P)return await (0,b.sendResponse)(F,W,a,H.renderOpts.pendingWaitUntil),null;{let e=await a.blob(),t=(0,g.toNodeOutgoingHttpHeaders)(a.headers);c&&(t[h.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==H.renderOpts.collectedRevalidate&&!(H.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&H.renderOpts.collectedRevalidate,n=void 0===H.renderOpts.collectedExpire||H.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:H.renderOpts.collectedExpire;return{value:{kind:E.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await I.onRequestError(e,t,{routerKind:"App Router",routePath:a,routeType:"route",revalidateReason:(0,f.getRevalidateReason)({isStaticGeneration:B,isOnDemandRevalidate:x})},!1,R),t}},d=await I.handleResponse({req:e,nextConfig:A,cacheKey:$,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:v,isRoutePPREnabled:!1,isOnDemandRevalidate:x,revalidateOnlyGenerated:k,responseGenerator:l,waitUntil:r.waitUntil,isMinimalMode:u});if(!P)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==E.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(c=d.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});u||t.setHeader("x-nextjs-cache",x?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),N&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,g.fromNodeOutgoingHttpHeaders)(d.value.headers);return u&&P||p.delete(h.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,y.getCacheControlHeader)(d.cacheControl)),await (0,b.sendResponse)(F,W,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};M?await c(M):await j.withPropagatedContext(e.headers,()=>j.trace(p.BaseServerSpan.handleRequest,{spanName:`${q} ${a}`,kind:o.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},c))}catch(t){if(t instanceof w.NoFallbackError||await I.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,f.getRevalidateReason)({isStaticGeneration:B,isOnDemandRevalidate:x})},!1,R),P)throw t;return await (0,b.sendResponse)(F,W,new Response(null,{status:500})),null}}e.s(["handler",()=>S,"patchFetch",()=>A,"routeModule",()=>I,"serverHooks",()=>R,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>v]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__5fdc8aba._.js.map