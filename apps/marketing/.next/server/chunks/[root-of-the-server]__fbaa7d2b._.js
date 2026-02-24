module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},28394,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function a(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function s(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function n(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),a=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!a)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:a}}e.s(["getSupabaseAuthEnv",()=>n,"getSupabasePublicEnv",()=>s,"hasSupabasePublicEnv",()=>a])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},34591,e=>e.a(async(t,r)=>{try{var a=e.i(23862),s=e.i(63021),n=t([a]);[a]=n.then?(await n)():n;let u=null;function o(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return u||(u=new a.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),u}async function i(){let e=o(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new s.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>o,"pingDatabase",()=>i]),r()}catch(e){r(e)}},!1),65297,e=>{"use strict";e.i(28394),e.s([])},84851,e=>e.a(async(t,r)=>{try{var a=e.i(34591),s=t([a]);[a]=s.then?(await s)():s,e.s([]),r()}catch(e){r(e)}},!1),72289,e=>e.a(async(t,r)=>{try{var a=e.i(34591);e.i(65297);var s=e.i(84851),n=t([a,s]);[a,s]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),33691,e=>e.a(async(t,r)=>{try{var a=e.i(72289),s=t([a]);[a]=s.then?(await s)():s,e.s([]),r()}catch(e){r(e)}},!1),14568,e=>e.a(async(t,r)=>{try{var a=e.i(89171),s=e.i(33691),n=e.i(34591),o=t([s,n]);[s,n]=o.then?(await o)():o;let g=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function i(e,t){return a.NextResponse.json({error:e,details:t},{status:400})}function u(e){if(null!==e){if("true"===e)return!0;if("false"===e)return!1;throw Error("Boolean query params must be true or false")}}function c(e,t){let r="number"==typeof e?e:"string"==typeof e?Number(e.trim()):NaN;if(!Number.isInteger(r)||r<=0)throw Error(`${t} must be a positive integer`);return r}function d(e,t){if(null!=e&&""!==e)return c(e,t)}function l(e,t){if("string"!=typeof e)throw Error(`${t} must be a UUID string`);let r=e.trim();if(!g.test(r))throw Error(`${t} must be a valid UUID`);return r}function p(e,t){if(null!=e&&""!==e)return l(e,t)}function f(e){if("string"!=typeof e)return;let t=e.trim();return t.length>0?t:void 0}function w(e,t){if(null==e||""===e)return;let r="number"==typeof e?e:Number(e);if(!Number.isFinite(r))throw Error(`${t} must be a valid number`);return r}function E(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function h(e){let t=e.get("businessId"),r=e.get("workspaceId");return{businessId:t?c(t,"businessId"):void 0,workspaceId:r?l(r,"workspaceId"):void 0}}function _(e){return{businessId:d(e.businessId,"businessId"),workspaceId:p(e.workspaceId,"workspaceId")}}function y(e){let t=e.get("page"),r=e.get("limit"),a=t?c(t,"page"):1,s=r?c(r,"limit"):25;if(s>200)throw Error("limit cannot be greater than 200");return{page:a,pageSize:s}}async function b(e,t,r){if(!e.businessId&&!e.workspaceId)throw Error("Provide at least one scope identifier: workspaceId or businessId");let a=t??(0,n.getDbPool)();if(e.workspaceId&&e.businessId){let t=(await a.query(`
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
      `,[e.workspaceId])).rows[0];if(!t)throw Error("workspaceId not found");return{workspaceId:t.workspace_id,businessId:Number(t.business_id)}}let s=e.businessId,o=r?.allowWorkspaceAutocreate??!0,i=await a.query(`
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,[s]);!i.rows[0]&&o&&(await a.query(`
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,[s]),i=await a.query(`
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,[s]));let u=i.rows[0];if(!u)throw Error("businessId not found");return{workspaceId:u.workspace_id,businessId:Number(u.business_id)}}e.s(["badRequest",()=>i,"parseBooleanQuery",()=>u,"parsePagination",()=>y,"readScopeFromBody",()=>_,"readScopeFromSearchParams",()=>h,"resolveScope",()=>b,"toOptionalBoolean",()=>E,"toOptionalNumber",()=>w,"toOptionalPositiveInt",()=>d,"toOptionalText",()=>f,"toOptionalUuid",()=>p,"toPositiveInt",()=>c]),r()}catch(e){r(e)}},!1),40423,e=>e.a(async(t,r)=>{try{var a=e.i(14568),s=e.i(33691),n=e.i(34591),o=e.i(28394),i=t([a,s,n]);[a,s,n]=i.then?(await i)():i;let _=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,y=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;class b extends Error{status;constructor(e,t){super(e),this.name="ApiAuthError",this.status=t}}function u(e,t){throw new b(e,t)}function c(e){return y.test(e.trim())}function d(e){if(!e)return null;if("string"==typeof e){let t=e.trim();return c(t)?t:null}if(Array.isArray(e)){for(let t of e){let e=d(t);if(e)return e}return null}if("object"==typeof e){let t=d(e.access_token)??d(e.accessToken)??d(e.token);return t||(d(e.session)??d(e.currentSession)??d(e.data))}return null}function l(e){let t=e.trim();if(!t)return null;if(c(t))return t;try{let e=decodeURIComponent(t);if(e!==t&&c(e))return e;let r=JSON.parse(e),a=d(r);if(a)return a}catch{}try{let e=JSON.parse(t);return d(e)}catch{return null}}async function p(e){let t,r=function(e){let t=e.headers.get("authorization");if(t){let[e,r]=t.split(/\s+/,2);if(e?.toLowerCase()==="bearer"&&r&&c(r))return r}for(let t of[e.headers.get("x-supabase-access-token"),e.headers.get("x-access-token")]){if(!t)continue;let e=l(t);if(e)return e}for(let t of e.cookies.getAll()){let e=t.name.toLowerCase();if(!("sb-access-token"===e||"supabase-access-token"===e||e.startsWith("sb-")&&e.endsWith("-auth-token")))continue;let r=l(t.value);if(r)return r}u("Missing access token. Send Authorization: Bearer <token>.",401)}(e),{supabaseUrl:a,supabaseAnonKey:s}=function(){try{return(0,o.getSupabaseAuthEnv)()}catch{return u("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",500)}}();try{t=await fetch(`${a}/auth/v1/user`,{method:"GET",headers:{apikey:s,Authorization:`Bearer ${r}`},cache:"no-store"})}catch{u("Unable to reach auth provider for session validation.",502)}(401===t.status||403===t.status)&&u("Invalid or expired session token.",401),t.ok||u("Session validation failed at auth provider.",502);let n=await t.json(),i="string"==typeof n.id?n.id.trim():"";return _.test(i)||u("Session missing valid user id.",401),{userId:i,email:"string"==typeof n.email?n.email:null}}async function f(e){let t=e.client??(0,n.getDbPool)(),r=(await t.query(`
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,[e.workspaceId,e.userId])).rows[0];return r||u("Forbidden: user does not belong to this workspace.",403),"active"!==(r.status??"").toLowerCase()&&u("Forbidden: workspace membership is not active.",403),{role:r.role}}function w(e){if(e instanceof b)return e.status}async function E(e){return p(e)}async function h(e){let t=await p(e.request),r=await (0,a.resolveScope)(e.scope,e.client,{allowWorkspaceAutocreate:!1}),s=await f({workspaceId:r.workspaceId,userId:t.userId,client:e.client});return{...r,userId:t.userId,workspaceRole:s.role}}e.s(["getAuthErrorStatus",()=>w,"resolveAuthorizedScope",()=>h,"resolveSessionUser",()=>E]),r()}catch(e){r(e)}},!1),90386,e=>e.a(async(t,r)=>{try{var a=e.i(89171),s=e.i(14568),n=e.i(40423),o=e.i(33691),i=e.i(34591),u=t([s,n,o,i]);async function c(e,{params:t}){let r;try{r=await e.json()}catch{return(0,s.badRequest)("Invalid JSON body")}if(!r||"object"!=typeof r)return(0,s.badRequest)("Body must be a JSON object");let o=r;if(!Object.prototype.hasOwnProperty.call(o,"categoryId"))return(0,s.badRequest)("categoryId is required");try{let{id:r}=await t,u=(0,s.toPositiveInt)(r,"id"),c=(0,s.readScopeFromBody)(o),d=(0,s.readScopeFromSearchParams)(e.nextUrl.searchParams),l=await (0,n.resolveAuthorizedScope)({request:e,scope:{workspaceId:c.workspaceId??d.workspaceId,businessId:c.businessId??d.businessId}}),p=null===o.categoryId?null:(0,s.toOptionalPositiveInt)(o.categoryId,"categoryId"),f=(0,s.toOptionalText)(o.note)??null;if(null!==o.categoryId&&void 0===p)return(0,s.badRequest)("categoryId must be a positive integer or null");let w=(0,i.getDbPool)(),E=await w.connect();try{if(await E.query("BEGIN"),null!==p&&!(await E.query(`
          SELECT id::text
          FROM categories
          WHERE id = $1
            AND workspace_id = $2::uuid
          LIMIT 1
          `,[p,l.workspaceId])).rows[0])return await E.query("ROLLBACK"),(0,s.badRequest)("categoryId does not belong to this workspace");let e=(await E.query(`
        SELECT *
        FROM transactions
        WHERE id = $1
          AND workspace_id = $2::uuid
        LIMIT 1
        FOR UPDATE
        `,[u,l.workspaceId])).rows[0];if(!e)return await E.query("ROLLBACK"),a.NextResponse.json({error:"Transaction not found"},{status:404});let t=(await E.query(`
        UPDATE transactions
        SET
          category_id = $3,
          updated_at = NOW()
        WHERE id = $1
          AND workspace_id = $2::uuid
        RETURNING *
        `,[u,l.workspaceId,p])).rows[0];if(!t)return await E.query("ROLLBACK"),a.NextResponse.json({error:"Transaction not found"},{status:404});try{await E.query(`
          INSERT INTO transaction_categories (
            workspace_id,
            business_id,
            transaction_id,
            manual_category_id,
            final_category_id,
            is_manual_override,
            override_reason,
            metadata
          )
          VALUES (
            $1::uuid,
            $2,
            $3::bigint,
            $4,
            $4,
            $5,
            $6,
            $7::jsonb
          )
          ON CONFLICT (transaction_id)
          DO UPDATE
          SET
            manual_category_id = EXCLUDED.manual_category_id,
            final_category_id = EXCLUDED.final_category_id,
            is_manual_override = EXCLUDED.is_manual_override,
            override_reason = EXCLUDED.override_reason,
            metadata = COALESCE(transaction_categories.metadata, '{}'::jsonb) || EXCLUDED.metadata,
            updated_at = NOW()
          `,[l.workspaceId,l.businessId,u,p,null!==p,f,JSON.stringify({source:"api.transactions.category.patch",updatedAt:new Date().toISOString()})])}catch(t){let e=t&&"object"==typeof t&&"code"in t?String(t.code??""):"";if("42P01"!==e)throw t}return await E.query(`
        INSERT INTO audit_logs (
          workspace_id,
          business_id,
          actor_type,
          actor_id,
          entity_type,
          entity_id,
          action,
          before_state,
          after_state
        )
        VALUES (
          $1::uuid,
          $2,
          'user',
          $3,
          'transaction',
          $4,
          'transaction.category.patch',
          $5::jsonb,
          $6::jsonb
        )
        `,[l.workspaceId,l.businessId,l.userId,String(u),JSON.stringify(e),JSON.stringify(t)]),await E.query("COMMIT"),a.NextResponse.json({transaction:t,updated:{id:u,categoryId:p}})}catch(e){throw await E.query("ROLLBACK"),e}finally{E.release()}}catch(s){let e,t=s instanceof Error?s.message:"Failed to update transaction category",r=(0,n.getAuthErrorStatus)(s);if(r)return a.NextResponse.json({error:t},{status:r});return a.NextResponse.json({error:t},{status:(e=s instanceof Error?s.message:"Unknown error").includes("not found")?404:e.includes("must be")||e.includes("required")||e.includes("Provide at least one scope identifier")?400:500})}}[s,n,o,i]=u.then?(await u)():u,e.s(["PATCH",()=>c,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),r()}catch(e){r(e)}},!1),35911,e=>e.a(async(t,r)=>{try{var a=e.i(47909),s=e.i(74017),n=e.i(96250),o=e.i(59756),i=e.i(61916),u=e.i(74677),c=e.i(69741),d=e.i(16795),l=e.i(87718),p=e.i(95169),f=e.i(47587),w=e.i(66012),E=e.i(70101),h=e.i(26937),_=e.i(10372),y=e.i(93695);e.i(52474);var b=e.i(220),g=e.i(90386),I=t([g]);[g]=I.then?(await I)():I;let m=new a.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/transactions/[id]/category/route",pathname:"/api/transactions/[id]/category",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/transactions/[id]/category/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:R,workUnitAsyncStorage:v,serverHooks:N}=m;function A(){return(0,n.patchFetch)({workAsyncStorage:R,workUnitAsyncStorage:v})}async function S(e,t,r){m.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let a="/api/transactions/[id]/category/route";a=a.replace(/\/index$/,"")||"/";let n=await m.prepare(e,t,{srcPage:a,multiZoneDraftMode:!1});if(!n)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:g,params:I,nextConfig:A,parsedUrl:S,isDraftMode:R,prerenderManifest:v,routerServerContext:N,isOnDemandRevalidate:k,revalidateOnlyGenerated:x,resolvedPathname:U,clientReferenceManifest:P,serverActionsManifest:T}=n,C=(0,c.normalizeAppPath)(a),O=!!(v.dynamicRoutes[C]||v.routes[U]),L=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,S,!1):t.end("This page could not be found"),null);if(O&&!R){let e=!!v.routes[U],t=v.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(A.experimental.adapterPath)return await L();throw new y.NoFallbackError}}let B=null;!O||m.isDev||R||(B=U,B="/index"===B?"/":B);let $=!0===m.isDev||!O,q=O&&!$;T&&P&&(0,u.setManifestsSingleton)({page:a,clientReferenceManifest:P,serverActionsManifest:T});let D=e.method||"GET",j=(0,i.getTracer)(),M=j.getActiveScopeSpan(),F={params:I,prerenderManifest:v,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:$,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:A.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,s)=>m.onRequestError(e,t,a,s,N)},sharedContext:{buildId:g}},H=new d.NodeNextRequest(e),K=new d.NodeNextResponse(t),X=l.NextRequestAdapter.fromNodeNextRequest(H,(0,l.signalFromNodeResponse)(t));try{let n=async e=>m.handle(X,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=r.get("next.route");if(s){let t=`${D} ${s}`;e.setAttributes({"next.route":s,"http.route":s,"next.span_name":t}),e.updateName(t)}else e.updateName(`${D} ${a}`)}),u=!!(0,o.getRequestMeta)(e,"minimalMode"),c=async o=>{var i,c;let d=async({previousCacheEntry:s})=>{try{if(!u&&k&&x&&!s)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await n(o);e.fetchMetrics=F.renderOpts.fetchMetrics;let i=F.renderOpts.pendingWaitUntil;i&&r.waitUntil&&(r.waitUntil(i),i=void 0);let c=F.renderOpts.collectedTags;if(!O)return await (0,w.sendResponse)(H,K,a,F.renderOpts.pendingWaitUntil),null;{let e=await a.blob(),t=(0,E.toNodeOutgoingHttpHeaders)(a.headers);c&&(t[_.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,s=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=_.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:b.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:s}}}}catch(t){throw(null==s?void 0:s.isStale)&&await m.onRequestError(e,t,{routerKind:"App Router",routePath:a,routeType:"route",revalidateReason:(0,f.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:k})},!1,N),t}},l=await m.handleResponse({req:e,nextConfig:A,cacheKey:B,routeKind:s.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:v,isRoutePPREnabled:!1,isOnDemandRevalidate:k,revalidateOnlyGenerated:x,responseGenerator:d,waitUntil:r.waitUntil,isMinimalMode:u});if(!O)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==b.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(c=l.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});u||t.setHeader("x-nextjs-cache",k?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),R&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,E.fromNodeOutgoingHttpHeaders)(l.value.headers);return u&&O||p.delete(_.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,h.getCacheControlHeader)(l.cacheControl)),await (0,w.sendResponse)(H,K,new Response(l.value.body,{headers:p,status:l.value.status||200})),null};M?await c(M):await j.withPropagatedContext(e.headers,()=>j.trace(p.BaseServerSpan.handleRequest,{spanName:`${D} ${a}`,kind:i.SpanKind.SERVER,attributes:{"http.method":D,"http.target":e.url}},c))}catch(t){if(t instanceof y.NoFallbackError||await m.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,f.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:k})},!1,N),O)throw t;return await (0,w.sendResponse)(H,K,new Response(null,{status:500})),null}}e.s(["handler",()=>S,"patchFetch",()=>A,"routeModule",()=>m,"serverHooks",()=>N,"workAsyncStorage",()=>R,"workUnitAsyncStorage",()=>v]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__fbaa7d2b._.js.map