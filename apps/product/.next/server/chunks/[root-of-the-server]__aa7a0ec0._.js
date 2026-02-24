module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},84536,e=>{"use strict";function t(e){if(!e)return!1;try{let t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol}catch{return!1}}function r(e){if(!e)return null;let t=e.trim();return t.length>0?t:null}function a(){return t(process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}function n(){let e=process.env.NEXT_PUBLIC_SUPABASE_URL??"",r=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";if(!t(e)||!r)throw Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e,supabaseAnonKey:r}}function i(){let e=r(process.env.SUPABASE_URL)??r(process.env.NEXT_PUBLIC_SUPABASE_URL),a=r(process.env.SUPABASE_ANON_KEY)??r(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);if(!e||!t(e)||!a)throw Error("Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");return{supabaseUrl:e.replace(/\/+$/,""),supabaseAnonKey:a}}e.s(["getSupabaseAuthEnv",()=>i,"getSupabasePublicEnv",()=>n,"hasSupabasePublicEnv",()=>a])},23862,e=>e.a(async(t,r)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),r()}catch(e){r(e)}},!0),63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},51837,e=>e.a(async(t,r)=>{try{var a=e.i(23862),n=e.i(63021),i=t([a]);[a]=i.then?(await i)():i;let l=null;function s(){let e=function(){let e=["DATABASE_URL","POSTGRES_URL","POSTGRES_PRISMA_URL","NEON_DATABASE_URL","SUPABASE_DB_URL"];for(let t of e){let e=process.env[t];if(e&&e.trim().length>0)return e}throw Error(`No Postgres connection string found. Set one of: ${e.join(", ")}`)}();return l||(l=new a.Pool({connectionString:e,ssl:!("disable"===process.env.DATABASE_SSL||e.includes("localhost")||e.includes("127.0.0.1"))&&{rejectUnauthorized:!1}})),l}async function o(){let e=s(),t=await e.query("select now()::text as now");if(!t.rows[0]?.now)throw Error("Database responded without timestamp");return t.rows[0].now}globalThis.prisma??new n.PrismaClient({log:["error"]}),e.s(["getDbPool",()=>s,"pingDatabase",()=>o]),r()}catch(e){r(e)}},!1),55158,e=>{"use strict";e.i(84536),e.s([])},1115,e=>e.a(async(t,r)=>{try{var a=e.i(51837),n=t([a]);[a]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),11235,e=>e.a(async(t,r)=>{try{var a=e.i(51837);e.i(55158);var n=e.i(1115),i=t([a,n]);[a,n]=i.then?(await i)():i,e.s([]),r()}catch(e){r(e)}},!1),21902,e=>e.a(async(t,r)=>{try{var a=e.i(11235),n=t([a]);[a]=n.then?(await n)():n,e.s([]),r()}catch(e){r(e)}},!1),30508,e=>e.a(async(t,r)=>{try{var a=e.i(89171),n=e.i(21902),i=e.i(51837),s=t([n,i]);async function o(e){let t=(0,i.getDbPool)(),r=await t.query(`
    SELECT provider, status, meta
    FROM integrations
    WHERE workspace_id = $1::uuid
      AND status IN ('connected', 'syncing')
    `,[e]),a=[{channel:"dashboard",destination:e}];for(let e of r.rows){let t=e.meta??{};if("whatsapp"===e.provider){let e="string"==typeof t.alertPhone&&t.alertPhone.trim()?t.alertPhone.trim():null;a.push({channel:"whatsapp",destination:e});continue}if("zohobooks"===e.provider){a.push({channel:"email",destination:"finance@workspace.local"});continue}}return a}async function l(e){let t;if(t=[process.env.CONNECTOR_SYNC_KEY,process.env.CRON_SECRET,process.env.ALERT_ENGINE_KEY].map(e=>(e??"").trim()).filter(e=>e.length>0),!(0!==t.length&&[function(e){if(!e)return null;let[t,r]=e.split(/\s+/,2);return t?.toLowerCase()!=="bearer"?null:r?.trim()||null}(e.headers.get("authorization")),e.headers.get("x-connector-sync-key")?.trim()??null,e.headers.get("x-alert-engine-key")?.trim()??null,e.nextUrl.searchParams.get("key")?.trim()??null].filter(e=>!!e).some(e=>t.includes(e))))return a.NextResponse.json({error:"Unauthorized"},{status:401});let r=function(e,t){if(!e)return 25;let r=Number.parseInt(e,10);return!Number.isInteger(r)||r<=0?25:r}(e.nextUrl.searchParams.get("limit"),0),n=(0,i.getDbPool)(),s=await n.connect();try{let e=await s.query(`
      SELECT
        id::text,
        workspace_id::text,
        event_type,
        dedupe_key,
        payload,
        attempt_count::text
      FROM event_outbox
      WHERE status IN ('pending', 'failed')
        AND available_at <= NOW()
      ORDER BY available_at ASC, id ASC
      LIMIT $1
      `,[Math.min(r,100)]);if(!e.rows.length)return a.NextResponse.json({picked:0,sent:0,failed:0,message:"No pending events"});let t=0,n=0;for(let r of e.rows){let e=Number.parseInt(r.id,10),a=Number.parseInt(r.attempt_count,10)||0;await s.query(`
        UPDATE event_outbox
        SET
          status = 'processing',
          attempt_count = attempt_count + 1,
          last_attempt_at = NOW(),
          updated_at = NOW()
        WHERE id = $1::bigint
        `,[e]);try{for(let t of(await o(r.workspace_id)))await s.query(`
            INSERT INTO delivery_attempts (
              workspace_id,
              outbox_id,
              channel,
              destination,
              status,
              payload,
              attempted_at
            )
            VALUES (
              $1::uuid,
              $2::bigint,
              $3,
              $4,
              'success',
              $5::jsonb,
              NOW()
            )
            `,[r.workspace_id,e,t.channel,t.destination,JSON.stringify({eventType:r.event_type,dedupeKey:r.dedupe_key,channel:t.channel,destination:t.destination,payload:r.payload})]);await s.query(`
          UPDATE event_outbox
          SET
            status = 'sent',
            last_error = NULL,
            updated_at = NOW()
          WHERE id = $1::bigint
          `,[e]),t+=1}catch(o){n+=1;let t=o instanceof Error?o.message:"Delivery failed";await s.query(`
          INSERT INTO delivery_attempts (
            workspace_id,
            outbox_id,
            channel,
            destination,
            status,
            error,
            payload,
            attempted_at
          )
          VALUES (
            $1::uuid,
            $2::bigint,
            'dashboard',
            $3,
            'failed',
            $4,
            $5::jsonb,
            NOW()
          )
          `,[r.workspace_id,e,r.workspace_id,t,JSON.stringify({eventType:r.event_type,dedupeKey:r.dedupe_key,attempt:a+1})]);let i=Math.min(60,Math.max(5,(a+1)*5));await s.query(`
          UPDATE event_outbox
          SET
            status = CASE WHEN attempt_count >= 5 THEN 'dead_letter' ELSE 'failed' END,
            available_at = NOW() + ($2::text || ' minutes')::interval,
            last_error = $3,
            updated_at = NOW()
          WHERE id = $1::bigint
          `,[e,String(i),t])}}return a.NextResponse.json({picked:e.rows.length,sent:t,failed:n,generatedAt:new Date().toISOString()})}finally{s.release()}}[n,i]=s.then?(await s)():s,e.s(["POST",()=>l,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),r()}catch(e){r(e)}},!1),36398,e=>e.a(async(t,r)=>{try{var a=e.i(47909),n=e.i(74017),i=e.i(96250),s=e.i(59756),o=e.i(61916),l=e.i(74677),u=e.i(69741),c=e.i(16795),d=e.i(87718),p=e.i(95169),h=e.i(47587),E=e.i(66012),_=e.i(70101),f=e.i(26937),v=e.i(10372),y=e.i(93695);e.i(52474);var R=e.i(220),g=e.i(30508),m=t([g]);[g]=m.then?(await m)():m;let x=new a.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/connectors/notifications/dispatch/route",pathname:"/api/connectors/notifications/dispatch",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/product/src/app/api/connectors/notifications/dispatch/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:N,workUnitAsyncStorage:S,serverHooks:P}=x;function A(){return(0,i.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:S})}async function w(e,t,r){x.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let a="/api/connectors/notifications/dispatch/route";a=a.replace(/\/index$/,"")||"/";let i=await x.prepare(e,t,{srcPage:a,multiZoneDraftMode:!1});if(!i)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:g,params:m,nextConfig:A,parsedUrl:w,isDraftMode:N,prerenderManifest:S,routerServerContext:P,isOnDemandRevalidate:b,revalidateOnlyGenerated:U,resolvedPathname:T,clientReferenceManifest:C,serverActionsManifest:O}=i,I=(0,u.normalizeAppPath)(a),k=!!(S.dynamicRoutes[I]||S.routes[T]),L=async()=>((null==P?void 0:P.render404)?await P.render404(e,t,w,!1):t.end("This page could not be found"),null);if(k&&!N){let e=!!S.routes[T],t=S.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(A.experimental.adapterPath)return await L();throw new y.NoFallbackError}}let B=null;!k||x.isDev||N||(B=T,B="/index"===B?"/":B);let D=!0===x.isDev||!k,q=k&&!D;O&&C&&(0,l.setManifestsSingleton)({page:a,clientReferenceManifest:C,serverActionsManifest:O});let $=e.method||"GET",j=(0,o.getTracer)(),H=j.getActiveScopeSpan(),M={params:m,prerenderManifest:S,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:A.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>x.onRequestError(e,t,a,n,P)},sharedContext:{buildId:g}},K=new c.NodeNextRequest(e),W=new c.NodeNextResponse(t),X=d.NextRequestAdapter.fromNodeNextRequest(K,(0,d.signalFromNodeResponse)(t));try{let i=async e=>x.handle(X,M).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${$} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${$} ${a}`)}),l=!!(0,s.getRequestMeta)(e,"minimalMode"),u=async s=>{var o,u;let c=async({previousCacheEntry:n})=>{try{if(!l&&b&&U&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await i(s);e.fetchMetrics=M.renderOpts.fetchMetrics;let o=M.renderOpts.pendingWaitUntil;o&&r.waitUntil&&(r.waitUntil(o),o=void 0);let u=M.renderOpts.collectedTags;if(!k)return await (0,E.sendResponse)(K,W,a,M.renderOpts.pendingWaitUntil),null;{let e=await a.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(a.headers);u&&(t[v.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=v.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,n=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=v.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await x.onRequestError(e,t,{routerKind:"App Router",routePath:a,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:b})},!1,P),t}},d=await x.handleResponse({req:e,nextConfig:A,cacheKey:B,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:S,isRoutePPREnabled:!1,isOnDemandRevalidate:b,revalidateOnlyGenerated:U,responseGenerator:c,waitUntil:r.waitUntil,isMinimalMode:l});if(!k)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(u=d.value)?void 0:u.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});l||t.setHeader("x-nextjs-cache",b?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),N&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,_.fromNodeOutgoingHttpHeaders)(d.value.headers);return l&&k||p.delete(v.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,f.getCacheControlHeader)(d.cacheControl)),await (0,E.sendResponse)(K,W,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};H?await u(H):await j.withPropagatedContext(e.headers,()=>j.trace(p.BaseServerSpan.handleRequest,{spanName:`${$} ${a}`,kind:o.SpanKind.SERVER,attributes:{"http.method":$,"http.target":e.url}},u))}catch(t){if(t instanceof y.NoFallbackError||await x.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:b})},!1,P),k)throw t;return await (0,E.sendResponse)(K,W,new Response(null,{status:500})),null}}e.s(["handler",()=>w,"patchFetch",()=>A,"routeModule",()=>x,"serverHooks",()=>P,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>S]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__aa7a0ec0._.js.map