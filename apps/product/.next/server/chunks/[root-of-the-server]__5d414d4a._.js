module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},84536,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function i(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function n(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function a(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),i=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!i)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:i}}e.s(["getSupabaseAuthEnv",()=>a,"getSupabasePublicEnv",()=>n,"hasSupabasePublicEnv",()=>i])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},51837,e=>e.a(async(t,r)=>{try{var i=e.i(23862),n=e.i(63021),a=t([i]);[i]=a.then?(await a)():a;let c=null;function o(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return c||(c=new i.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),c}async function s(){let e=o(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new n.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>o,"pingDatabase",()=>s]),r()}catch(e){r(e)}},!1),55158,e=>{"use strict";e.i(84536),e.s([])},1115,e=>e.a(async(t,r)=>{try{var i=e.i(51837),n=t([i]);[i]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),11235,e=>e.a(async(t,r)=>{try{var i=e.i(51837);e.i(55158);var n=e.i(1115),a=t([i,n]);[i,n]=a.then?(await a)():a,e.s([]),r()}catch(e){r(e)}},!1),21902,e=>e.a(async(t,r)=>{try{var i=e.i(11235),n=t([i]);[i]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),1398,e=>e.a(async(t,r)=>{try{var i=e.i(89171),n=e.i(21902),a=e.i(51837),o=t([n,a]);[n,a]=o.then?(await o)():o;let g=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function s(e,t){return i.NextResponse.json({error:e,details:t},{status:400})}function c(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function u(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function d(e,t){if(null!=e&&""!==e)return u(e,t)}function l(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!g.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return l(e,t)}function E(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function b(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function f(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function m(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?u(t,"businessId"):void 0,workspaceId:r?l(r,"workspaceId"):void 0}}function h(e){return{businessId:d(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function _(e){let t=e.get("page"),r=e.get("limit"),i=t?u(t,"page"):1,n=r?u(r,"limit"):25;if(n>200)throw Error("limit cannot be greater than 200");return{page:i,pageSize:n}}async function w(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let i=t??(0,a.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await i.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE id = $1::uuid
        AND business_id = $2
      LIMIT 1
      `,[e.workspaceId,e.businessId])).rows[0];if(!t)throw Error("workspaceId and businessId do not belong to the same workspace");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}if(e.workspaceId){let t=(await i.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE id = $1::uuid
      LIMIT 1
      `,[e.workspaceId])).rows[0];if(!t)throw Error("workspaceId not found");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}let n=e.businessId,o=r?.allowWorkspaceAutocreate??!0,s=await i.query(`
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,[n]);!s.rows[0]&&o&&(await i.query(`
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,[n]),s=await i.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,[n]));let c=s.rows[0];if(!c)throw Error("businessId not found");return{workspaceId:c.workspace_id,businessId:Number(c.business_id)}}e.s(["badRequest",()=>s,"parseBooleanQuery",()=>c,"parsePagination",()=>_,"readScopeFromBody",()=>h,"readScopeFromSearchParams",()=>m,"resolveScope",()=>w,"toOptionalBoolean",()=>f,"toOptionalNumber",()=>b,"toOptionalPositiveInt",()=>d,"toOptionalText",()=>E,"toOptionalUuid",()=>p,"toPositiveInt",()=>u]),r()}catch(e){r(e)}},!1),91986,e=>e.a(async(t,r)=>{try{var i=e.i(1398),n=e.i(21902),a=e.i(51837),o=e.i(84536),s=t([i,n,a]);[i,n,a]=s.then?(await s)():s;let h=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,_=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;class w extends Error{status;constructor(e,t){super(e),this.name="ApiAuthError",this.status=t}}function c(e,t){throw new w(e,t)}function u(e){return _.test(e.trim())}function d(e){if(!e)return null;if("string"==typeof e){let t=e.trim();return u(t)?t:null}if(Array.isArray(e)){for(let t of e){let e=d(t);if(e)return e}return null}if("object"==typeof e){let t=d(e.access_token)??d(e.accessToken)??d(e.token);return t||(d(e.session)??d(e.currentSession)??d(e.data))}return null}function l(e){let t=e.trim();if(!t)return null;if(u(t))return t;try{let e=decodeURIComponent(t);if(e!==t&&u(e))return e;let r=JSON.parse(e),i=d(r);if(i)return i}catch{}try{let e=JSON.parse(t);return d(e)}catch{return null}}async function p(e){let t,r=function(e){let t=e.headers.get("authorization");if(t){let[e,r]=t.split(/\s+/,2);if(e?.toLowerCase()==="bearer"&&r&&u(r))return r}for(let t of[e.headers.get("x-supabase-access-token"),e.headers.get("x-access-token")]){if(!t)continue;let e=l(t);if(e)return e}for(let t of e.cookies.getAll()){let e=t.name.toLowerCase();if(!("sb-access-token"===e||"supabase-access-token"===e||e.startsWith("sb-")&&e.endsWith("-auth-token")))continue;let r=l(t.value);if(r)return r}c("Missing access token. Send Authorization: Bearer <token>.",401)}(e),{supabaseUrl:i,supabaseAnonKey:n}=function(){try{return(0,o.getSupabaseAuthEnv)()}catch{return c("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",500)}}();try{t=await fetch(`${i}/auth/v1/user`,{method:"GET",headers:{apikey:n,Authorization:`Bearer ${r}`},cache:"no-store"})}catch{c("Unable to reach auth provider for session validation.",502)}(401===t.status||403===t.status)&&c("Invalid or expired session token.",401),t.ok||c("Session validation failed at auth provider.",502);let a=await t.json(),s="string"==typeof a.id?a.id.trim():"";return h.test(s)||c("Session missing valid user id.",401),{userId:s,email:"string"==typeof a.email?a.email:null}}async function E(e){let t=e.client??(0,a.getDbPool)(),r=(await t.query(`
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,[e.workspaceId,e.userId])).rows[0];return r||c("Forbidden: user does not belong to this workspace.",403),"active"!==(r.status??"").toLowerCase()&&c("Forbidden: workspace membership is not active.",403),{role:r.role}}function b(e){if(e instanceof w)return e.status}async function f(e){return p(e)}async function m(e){let t=await p(e.request),r=await (0,i.resolveScope)(e.scope,e.client,{allowWorkspaceAutocreate:!1}),n=await E({workspaceId:r.workspaceId,userId:t.userId,client:e.client});return{...r,userId:t.userId,workspaceRole:n.role}}e.s(["getAuthErrorStatus",()=>b,"resolveAuthorizedScope",()=>m,"resolveSessionUser",()=>f]),r()}catch(e){r(e)}},!1),66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},86610,e=>{"use strict";var t=e.i(63021);let r=[{category:"revenue",weight:3,patterns:[/\brazorpay\b.*\bsettlement\b/i,/\bsettlement\b.*\brazorpay\b/i,/\bstripe\b.*\bpayout\b/i,/\bpayout\b.*\bstripe\b/i,/\bpayment received\b/i,/\bpayment\s+rec(?:eive|ei)db?\b/i]},{category:"tax",weight:3,patterns:[/\bgst\b/i,/\bgstr\b/i,/\bcbic\b/i,/\btax payment\b/i,/\bsgst\b/i,/\bcgst\b/i,/\bigst\b/i,/\btax\b/i,/\btds\b/i]},{category:"payroll",weight:3,patterns:[/\bsalary\b/i,/\bpayroll\b/i,/\bpf\b/i,/\besic\b/i,/\besi\b/i,/\bstipend\b/i,/\bwages?\b/i]},{category:"marketing",weight:3,patterns:[/\bfacebook ads\b/i,/\bgoogle ads\b/i,/\bmeta ads\b/i,/\bad spend\b/i,/\badvertising\b/i,/\bfb ads\b/i]},{category:"saas",weight:3,patterns:[/\bzoho\b/i,/\baws\b/i,/\bnotion\b/i,/\bopenai\b/i,/\bsoftware\b/i]},{category:"logistics",weight:3,patterns:[/\bdelhivery\b/i,/\bshiprocket\b/i,/\bcourier\b/i,/\bshipping\b/i]},{category:"rent/utilities",weight:3,patterns:[/\brent\b/i,/\belectricity\b/i,/\binternet\b/i,/\blease\b/i,/\bpower bill\b/i,/\butility\b/i]}];globalThis.prisma??new t.PrismaClient({log:["error"]});let i=e=>e.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim(),n=e=>i(e);function a(e){let t=i([e.description,e.merchant,e.reference].filter(e=>!!(e&&e.trim())).join(" "));if(!t)return{categoryName:null,confidence:0,tags:[]};let n=null;for(let e of r){let r=0;for(let i of e.patterns)i.test(t)&&(r+=1);if(!r)continue;let i=r*(e.weight??1);(!n||i>n.score)&&(n={category:e.category,score:i,matched:e.category})}if(!n)return{categoryName:null,confidence:0,tags:[]};let a=n.score>=6?.9:n.score>=3?.8:.65;return{categoryName:n.category,confidence:a,matchedRule:n.matched,tags:["rules:v0",`bucket:${n.category}`]}}function o(e){return new Map(e.map(e=>[n(e.name),e.id]))}function s(e){let t=n(e.categoryName);for(let r of({tax:["tax","taxes","gst"],payroll:["payroll","salary","salaries"],revenue:["revenue","sales revenue","other income","income"],marketing:["marketing","facebook ads","google ads","advertising","ads"],saas:["saas","software","tools","subscriptions"],logistics:["logistics","shipping","courier","delhivery","shiprocket"],"rent/utilities":["rent/utilities","rent and utilities","rent","utilities","electricity","internet","fixed cost"]})[t]??[t]){let t=e.categoryMap.get(n(r));if(t)return t}return null}e.s(["CATEGORIZE_V0_TARGET_RATE",0,.8,"CATEGORIZE_V0_VERSION",0,"v0","buildCategoryNameIdMap",()=>o,"categorizeTransactionV0",()=>a,"resolveCategoryIdByCategoryName",()=>s])},25417,e=>{"use strict";var t=e.i(66680);let r=["account","accountno","accountnumber","ac","acno","acnumber","acct","acctno","bankaccount","sourceaccount","fromaccount"];function i(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}function n(e){return e.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()}function a(e){return n(e.map(e=>"string"==typeof e?e.trim():"").filter(e=>e.length>0).join(" "))}function o(e){let r,i,a,o,s=(r=function(e){let t=e instanceof Date?e:new Date(e);if(Number.isNaN(t.getTime()))throw Error("date must be a valid date string");return t.toISOString().slice(0,10)}(e.date),i=function(e){if("bigint"==typeof e)return`${e.toString()}.00`;let t=Number(("number"==typeof e?String(e):e).trim().replace(/[,\s]/g,"").replace(/[₹$€£]/g,""));if(!Number.isFinite(t))throw Error("amount must be a valid numeric value");return Math.abs(t).toFixed(2)}(e.amount),a=n(e.description??""),o=n(e.account??""),`${r}|${i}|${a}|${o}`);return(0,t.createHash)("sha256").update(s).digest("hex")}function s(e){for(let[t,i]of Object.entries(e)){let e=t.trim().toLowerCase().replace(/[^a-z0-9]/g,"");if(!r.includes(e))continue;let n=function(e){if("string"==typeof e){let t=e.trim();return t.length>0?t:void 0}if("number"==typeof e||"bigint"==typeof e){let t=String(e).trim();return t.length>0?t:void 0}}(i);if(n)return n}}function c(e){if(!i(e))return;let t=s(e);if(t)return t;for(let t of[e.raw,e.bank,e.account]){if(!i(t))continue;let e=s(t);if(e)return e}}e.s(["buildHashDescription",()=>a,"computeTransactionHash",()=>o,"extractAccountHintFromMetadata",()=>c,"extractAccountHintFromRecord",()=>s])},28062,e=>e.a(async(t,r)=>{try{var i=e.i(21902),n=e.i(51837),a=e.i(86610),o=e.i(25417),s=t([i,n]);[i,n]=s.then?(await s)():s;let _=new Set(["credit","debit"]),w=new Set(["pending","posted","reversed"]),g=new Set(["system","user","api_key","job"]);function c(e){return e?e.trim().toUpperCase():"INR"}function u(e,t){if(!Number.isInteger(e)||e<=0)throw Error(`${t} must be a positive integer`)}function d(e){if(!e)return"system";if(!g.has(e))throw Error("actorType must be one of: system, user, api_key, job");return e}async function l(e,t){await e.query(`
    INSERT INTO audit_logs (
      business_id,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      action,
      before_state,
      after_state
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
    `,[t.businessId,t.actorType,t.actorId??null,t.entityType,t.entityId,t.action,t.beforeState?JSON.stringify(t.beforeState):null,t.afterState?JSON.stringify(t.afterState):null])}function p(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}async function E(e){if(u(e.businessId,"businessId"),!_.has(e.direction))throw Error("direction must be one of: credit, debit");if(!Number.isInteger(e.amountMinor)||e.amountMinor<=0)throw Error("amountMinor must be a positive integer in minor units (e.g. paise)");if(void 0!==e.categoryId&&null!==e.categoryId&&u(e.categoryId,"categoryId"),e.status&&!w.has(e.status))throw Error("status must be one of: pending, posted, reversed");if("reversed"===e.status)throw Error("Cannot create a transaction directly with status=reversed");if(e.occurredAt&&Number.isNaN(Date.parse(e.occurredAt)))throw Error("occurredAt must be a valid ISO date string");let t=c(e.currencyCode);if(3!==t.length)throw Error("currencyCode must be a 3-letter ISO code");let r=(0,n.getDbPool)(),i=await r.connect();try{await i.query("BEGIN");let t=e.occurredAt?new Date(e.occurredAt):new Date,r=p(e.metadata)?{...e.metadata}:{},n=(0,o.buildHashDescription)([e.description??null,e.counterparty??null,e.externalRef??null]),s=(0,o.extractAccountHintFromMetadata)(r)??e.counterparty??null,u=(0,o.computeTransactionHash)({date:t,amount:e.amountMinor,description:n,account:s}),d=e.categoryId??null,l=null;if(null===d){let t=(0,a.categorizeTransactionV0)({description:e.description??null,merchant:e.counterparty??null,reference:e.externalRef??null});if(t.categoryName&&t.confidence>=.65){let r=await i.query(`
          SELECT id::text, name
          FROM categories
          WHERE business_id = $1
          `,[e.businessId]),n=(0,a.buildCategoryNameIdMap)(r.rows.map(e=>{try{return{id:BigInt(e.id),name:e.name}}catch{return null}}).filter(e=>!!e)),o=(0,a.resolveCategoryIdByCategoryName)({categoryName:t.categoryName,categoryMap:n});if(null!==o){let e=Number.parseInt(o.toString(),10);Number.isInteger(e)&&e>0&&(d=e,l=t)}}}let E={...r,dedupe:{...p(r.dedupe)?r.dedupe:{},hash:u,formula:"sha256(date|amount|normalized_desc|account)"}};l&&(E.categorization={...p(r.categorization)?r.categorization:{},version:a.CATEGORIZE_V0_VERSION,autoTagged:!0,categoryName:l.categoryName,confidence:l.confidence,matchedRule:l.matchedRule??null,tags:l.tags});let b=await i.query(`
      INSERT INTO transactions (
        business_id,
        category_id,
        external_ref,
        direction,
        amount_minor,
        currency_code,
        occurred_at,
        description,
        counterparty,
        status,
        source,
        metadata,
        row_hash
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::timestamptz,
        $8,
        $9,
        COALESCE($10, 'posted'),
        COALESCE($11, 'manual'),
        COALESCE($12::jsonb, '{}'::jsonb),
        $13
      )
      RETURNING *
      `,[e.businessId,d,e.externalRef??null,e.direction,e.amountMinor,c(e.currencyCode),t.toISOString(),e.description??null,e.counterparty??null,e.status??null,e.source??null,JSON.stringify(E),u]);if(!b.rows[0])throw Error("Failed to insert transaction");return await i.query("COMMIT"),b.rows[0]}catch(r){await i.query("ROLLBACK");let e=r?.code,t=r?.constraint??"";if("23505"===e&&("transactions_workspace_hash_uniq"===t||"transactions_workspace_rowhash_uniq"===t||"transactions_business_rowhash_uniq"===t))throw Error("Duplicate transaction hash detected for this workspace");throw r}finally{i.release()}}async function b(e){u(e.businessId,"businessId"),u(e.transactionId,"transactionId");let t=[e.transactionId,e.businessId],r="";e.workspaceId&&(t.push(e.workspaceId),r=` AND workspace_id = $${t.length}::uuid`);let i="";(void 0!==e.includeDeleted?e.includeDeleted:void 0!==e.includeHidden&&e.includeHidden)||(i=" AND is_hidden = FALSE");let a=(0,n.getDbPool)(),o=(await a.query(`
    SELECT *
    FROM transactions
    WHERE id = $1
      AND business_id = $2
      ${r}
      ${i}
    LIMIT 1
    `,t)).rows[0];if(!o)throw Error("Transaction not found");return o}async function f(e){if(u(e.businessId,"businessId"),e.fromDate&&Number.isNaN(Date.parse(e.fromDate)))throw Error("fromDate must be a valid ISO date string");if(e.toDate&&Number.isNaN(Date.parse(e.toDate)))throw Error("toDate must be a valid ISO date string");let t=e.policy??"strict_ledger";if("strict_ledger"!==t&&"ui_ledger"!==t)throw Error("policy must be one of: strict_ledger, ui_ledger");let r=`
    is_hidden = TRUE
    AND (
      COALESCE(hidden_reason, '') ILIKE '%bad import%'
      OR COALESCE(hidden_reason, '') ILIKE '%bad_import%'
      OR COALESCE(hidden_reason, '') ILIKE '%invalid import%'
    )
  `,i=[],a=["status <> 'pending'"];e.workspaceId?(i.push(e.workspaceId),a.push(`workspace_id = $${i.length}::uuid`)):(i.push(e.businessId),a.push(`business_id = $${i.length}`)),e.fromDate&&(i.push(e.fromDate),a.push(`occurred_at >= $${i.length}::timestamptz`)),e.toDate&&(i.push(e.toDate),a.push(`occurred_at <= $${i.length}::timestamptz`));let o=(0,n.getDbPool)(),s=(await o.query(`
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS strict_credit_minor,
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS strict_debit_minor,
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS strict_net_minor,
      COALESCE(SUM(CASE WHEN is_hidden = FALSE AND direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS ui_credit_minor,
      COALESCE(SUM(CASE WHEN is_hidden = FALSE AND direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS ui_debit_minor,
      COALESCE(SUM(CASE WHEN is_hidden = FALSE AND direction = 'credit' THEN amount_minor WHEN is_hidden = FALSE AND direction = 'debit' THEN -amount_minor ELSE 0 END), 0)::text AS ui_net_minor,
      COALESCE(SUM(CASE WHEN is_hidden = TRUE AND direction = 'credit' THEN amount_minor WHEN is_hidden = TRUE AND direction = 'debit' THEN -amount_minor ELSE 0 END), 0)::text AS excluded_soft_deleted_net_minor,
      COALESCE(SUM(CASE WHEN ${r} AND direction = 'credit' THEN amount_minor WHEN ${r} AND direction = 'debit' THEN -amount_minor ELSE 0 END), 0)::text AS excluded_bad_import_net_minor,
      COUNT(*) FILTER (WHERE is_hidden = TRUE)::int AS soft_deleted_count,
      COUNT(*) FILTER (WHERE ${r})::int AS bad_import_count
    FROM transactions
    WHERE ${a.join(" AND ")}
    `,i)).rows[0];if(!s)throw Error("Failed to compute transaction report summary");let c="strict_ledger"===t?{creditMinor:s.strict_credit_minor,debitMinor:s.strict_debit_minor,netMinor:s.strict_net_minor}:{creditMinor:s.ui_credit_minor,debitMinor:s.ui_debit_minor,netMinor:s.ui_net_minor};return{policy:t,totals:c,excluded:{softDeletedCount:s.soft_deleted_count,softDeletedNetMinor:s.excluded_soft_deleted_net_minor,badImportCount:s.bad_import_count,badImportNetMinor:s.excluded_bad_import_net_minor},range:{fromDate:e.fromDate,toDate:e.toDate}}}async function m(e){if(u(e.businessId,"businessId"),u(e.transactionId,"transactionId"),e.hidden&&(!e.reason||!e.reason.trim()))throw Error("reason is required when hiding a transaction");let t=d(e.actorType),r=e.actorId?.trim()||null,i=(0,n.getDbPool)(),a=await i.connect();try{await a.query("BEGIN");let i=[e.transactionId,e.businessId],n="";e.workspaceId&&(i.push(e.workspaceId),n=` AND workspace_id = $${i.length}::uuid`);let o=(await a.query(`
      SELECT *
      FROM transactions
      WHERE id = $1 AND business_id = $2
      ${n}
      FOR UPDATE
      `,i)).rows[0];if(!o)throw Error("Transaction not found");let s=[e.transactionId,e.businessId,e.hidden,e.reason?.trim()??null,r],c="";e.workspaceId&&(s.push(e.workspaceId),c=` AND workspace_id = $${s.length}::uuid`);let u=(await a.query(`
      UPDATE transactions
      SET
        is_hidden = $3,
        hidden_reason = CASE WHEN $3 THEN $4 ELSE NULL END,
        hidden_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
        hidden_by = CASE WHEN $3 THEN COALESCE($5, 'system') ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1 AND business_id = $2
        ${c}
      RETURNING *
      `,s)).rows[0];if(!u)throw Error("Transaction not found");return await l(a,{businessId:e.businessId,actorType:t,actorId:r,entityType:"transaction",entityId:String(e.transactionId),action:e.hidden?"soft_hide":"unhide",beforeState:o,afterState:u}),await a.query("COMMIT"),u}catch(e){throw await a.query("ROLLBACK"),e}finally{a.release()}}async function h(e){u(e.businessId,"businessId"),u(e.transactionId,"transactionId");let t=e.reason?.trim();if(!t)throw Error("reason is required to create a reversal transaction");if(e.occurredAt&&Number.isNaN(Date.parse(e.occurredAt)))throw Error("occurredAt must be a valid ISO date string");let r=d(e.actorType),i=e.actorId?.trim()||null,a=e.markOriginalReversed??!0,o=(0,n.getDbPool)(),s=await o.connect();try{var c;await s.query("BEGIN");let n=[e.transactionId,e.businessId],o="";e.workspaceId&&(n.push(e.workspaceId),o=` AND workspace_id = $${n.length}::uuid`);let u=(await s.query(`
      SELECT *
      FROM transactions
      WHERE id = $1 AND business_id = $2
      ${o}
      FOR UPDATE
      `,n)).rows[0];if(!u)throw Error("Transaction not found");if("posted"!==u.status)throw Error("Only posted transactions can be reversed");if(u.reversed_by_transaction_id)throw Error("Transaction is already reversed");if(u.reversal_of_transaction_id)throw Error("Cannot reverse a reversal transaction directly");let d=(await s.query(`
      INSERT INTO transactions (
        business_id,
        workspace_id,
        category_id,
        direction,
        amount_minor,
        currency_code,
        occurred_at,
        description,
        counterparty,
        status,
        source,
        metadata,
        reversal_of_transaction_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        COALESCE($7::timestamptz, NOW()),
        $8,
        $9,
        'posted',
        COALESCE($10, 'reversal'),
        $11::jsonb,
        $12
      )
      RETURNING *
      `,[u.business_id,e.workspaceId??null,u.category_id,(c=u.direction,"credit"===c?"debit":"credit"),Number(u.amount_minor),u.currency_code,e.occurredAt??null,`Reversal of transaction #${u.id}: ${t}`,u.counterparty,e.source??null,JSON.stringify({reason:t,reversedTransactionId:u.id,originalMetadata:u.metadata}),u.id])).rows[0];if(!d)throw Error("Failed to create reversal transaction");let p=u;if(a){let t=[u.id,u.business_id,d.id],r="";e.workspaceId&&(t.push(e.workspaceId),r=` AND workspace_id = $${t.length}::uuid`);let i=(await s.query(`
        UPDATE transactions
        SET
          status = 'reversed',
          reversed_by_transaction_id = $3,
          updated_at = NOW()
        WHERE id = $1 AND business_id = $2
          ${r}
        RETURNING *
        `,t)).rows[0];if(!i)throw Error("Failed to mark original transaction as reversed");p=i}return await l(s,{businessId:u.business_id,actorType:r,actorId:i,entityType:"transaction",entityId:String(d.id),action:"create_reversal",beforeState:null,afterState:d}),a&&await l(s,{businessId:u.business_id,actorType:r,actorId:i,entityType:"transaction",entityId:String(u.id),action:"mark_reversed",beforeState:u,afterState:p}),await s.query("COMMIT"),{original:p,reversal:d}}catch(e){throw await s.query("ROLLBACK"),e}finally{s.release()}}e.s(["createReversalTransaction",()=>h,"getTransactionById",()=>b,"getTransactionReportingSummary",()=>f,"insertTransaction",()=>E,"setTransactionVisibility",()=>m]),r()}catch(e){r(e)}},!1),6351,e=>e.a(async(t,r)=>{try{var i=e.i(89171),n=e.i(1398),a=e.i(91986),o=e.i(28062),s=t([n,a,o]);async function c(e){let t=e.nextUrl.searchParams;try{let r=await (0,a.resolveAuthorizedScope)({request:e,scope:(0,n.readScopeFromSearchParams)(t)}),s=t.get("policy")??"strict_ledger",c=t.get("fromDate")??void 0,u=t.get("toDate")??void 0,d=await (0,o.getTransactionReportingSummary)({businessId:r.businessId,workspaceId:r.workspaceId,policy:s,fromDate:c,toDate:u});return i.NextResponse.json(d)}catch(n){let e,t=n instanceof Error?n.message:"Failed to build report",r=(0,a.getAuthErrorStatus)(n);if(r)return i.NextResponse.json({error:t},{status:r});return i.NextResponse.json({error:t},{status:(e=n instanceof Error?n.message:"Unknown error").includes("must be")||e.includes("policy")||e.includes("Provide at least one scope identifier")||e.includes("not found")?400:500})}}[n,a,o]=s.then?(await s)():s,e.s(["GET",()=>c,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),r()}catch(e){r(e)}},!1),99180,e=>e.a(async(t,r)=>{try{var i=e.i(47909),n=e.i(74017),a=e.i(96250),o=e.i(59756),s=e.i(61916),c=e.i(74677),u=e.i(69741),d=e.i(16795),l=e.i(87718),p=e.i(95169),E=e.i(47587),b=e.i(66012),f=e.i(70101),m=e.i(26937),h=e.i(10372),_=e.i(93695);e.i(52474);var w=e.i(220),g=e.i(6351),y=t([g]);[g]=y.then?(await y)():y;let A=new i.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/transactions/report/route",pathname:"/api/transactions/report",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/product/src/app/api/transactions/report/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:I,workUnitAsyncStorage:v,serverHooks:R}=A;function S(){return(0,a.patchFetch)({workAsyncStorage:I,workUnitAsyncStorage:v})}async function N(e,t,r){A.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let i="/api/transactions/report/route";i=i.replace(/\/index$/,"")||"/";let a=await A.prepare(e,t,{srcPage:i,multiZoneDraftMode:!1});if(!a)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:g,params:y,nextConfig:S,parsedUrl:N,isDraftMode:I,prerenderManifest:v,routerServerContext:R,isOnDemandRevalidate:C,revalidateOnlyGenerated:T,resolvedPathname:x,clientReferenceManifest:$,serverActionsManifest:k}=a,L=(0,u.normalizeAppPath)(i),O=!!(v.dynamicRoutes[L]||v.routes[x]),U=async()=>((null==R?void 0:R.render404)?await R.render404(e,t,N,!1):t.end("This page could not be found"),null);if(O&&!I){let e=!!v.routes[x],t=v.dynamicRoutes[L];if(t&&!1===t.fallback&&!e){if(S.experimental.adapterPath)return await U();throw new _.NoFallbackError}}let D=null;!O||A.isDev||I||(D=x,D="/index"===D?"/":D);let P=!0===A.isDev||!O,H=O&&!P;k&&$&&(0,c.setManifestsSingleton)({page:i,clientReferenceManifest:$,serverActionsManifest:k});let M=e.method||"GET",q=(0,s.getTracer)(),B=q.getActiveScopeSpan(),F={params:y,prerenderManifest:v,renderOpts:{experimental:{authInterrupts:!!S.experimental.authInterrupts},cacheComponents:!!S.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:S.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,i,n)=>A.onRequestError(e,t,i,n,R)},sharedContext:{buildId:g}},W=new d.NodeNextRequest(e),j=new d.NodeNextResponse(t),z=l.NextRequestAdapter.fromNodeNextRequest(W,(0,l.signalFromNodeResponse)(t));try{let a=async e=>A.handle(z,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${M} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${i}`)}),c=!!(0,o.getRequestMeta)(e,"minimalMode"),u=async o=>{var s,u;let d=async({previousCacheEntry:n})=>{try{if(!c&&C&&T&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await a(o);e.fetchMetrics=F.renderOpts.fetchMetrics;let s=F.renderOpts.pendingWaitUntil;s&&r.waitUntil&&(r.waitUntil(s),s=void 0);let u=F.renderOpts.collectedTags;if(!O)return await (0,b.sendResponse)(W,j,i,F.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(i.headers);u&&(t[h.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,n=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:w.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:i,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:C})},!1,R),t}},l=await A.handleResponse({req:e,nextConfig:S,cacheKey:D,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:v,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:T,responseGenerator:d,waitUntil:r.waitUntil,isMinimalMode:c});if(!O)return null;if((null==l||null==(s=l.value)?void 0:s.kind)!==w.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(u=l.value)?void 0:u.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});c||t.setHeader("x-nextjs-cache",C?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),I&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,f.fromNodeOutgoingHttpHeaders)(l.value.headers);return c&&O||p.delete(h.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,m.getCacheControlHeader)(l.cacheControl)),await (0,b.sendResponse)(W,j,new Response(l.value.body,{headers:p,status:l.value.status||200})),null};B?await u(B):await q.withPropagatedContext(e.headers,()=>q.trace(p.BaseServerSpan.handleRequest,{spanName:`${M} ${i}`,kind:s.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},u))}catch(t){if(t instanceof _.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:L,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:C})},!1,R),O)throw t;return await (0,b.sendResponse)(W,j,new Response(null,{status:500})),null}}e.s(["handler",()=>N,"patchFetch",()=>S,"routeModule",()=>A,"serverHooks",()=>R,"workAsyncStorage",()=>I,"workUnitAsyncStorage",()=>v]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__5d414d4a._.js.map