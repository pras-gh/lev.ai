module.exports=[2792,e=>e.a(async(t,a)=>{try{var r=e.i(89171),n=e.i(1398),i=e.i(91986),o=e.i(21902),s=e.i(51837),c=e.i(76617),u=t([n,i,o,s,c]);[n,i,o,s,c]=u.then?(await u)():u;let E=["%marketing%","%saas%","%software%","%logistics%","%shipping%","%rent%","%utilities%","%fixed cost%","%internet%","%electricity%","%office%","%operations%","%professional%","%subscription%","%tax%"];function l(e){if(null==e)return 0;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t:0}function d(e){return Number(e.toFixed(2))}async function p(e){try{let t,a,o,u,p,m,h=await (0,i.resolveAuthorizedScope)({request:e,scope:(0,n.readScopeFromSearchParams)(e.nextUrl.searchParams)}),_=function(e){let t=(e??"MTD").trim().toUpperCase();if("MTD"===t||"30D"===t||"90D"===t)return t;throw Error("range must be one of: MTD, 30D, 90D")}(e.nextUrl.searchParams.get("range")),A=new Date,C="MTD"===_?{from:new Date(Date.UTC(A.getUTCFullYear(),A.getUTCMonth(),1,0,0,0)),to:A}:{from:new Date(A.getTime()-24*("30D"===_?30:90)*36e5),to:A},S=(u=A.getUTCFullYear(),p=A.getUTCMonth(),m=new Date(Date.UTC(u,p,20,0,0,0)),A.getTime()<=m.getTime()?(t=new Date(Date.UTC(u,p-1,1,0,0,0)),a=new Date(Date.UTC(u,p,1,0,0,0)),o=m):(t=new Date(Date.UTC(u,p,1,0,0,0)),a=new Date(Date.UTC(u,p+1,1,0,0,0)),o=new Date(Date.UTC(u,p+1,20,0,0,0))),{cycleStart:t,cycleEnd:a,dueDate:o,dueInDays:(o.getTime()-A.getTime())/864e5}),g=(0,s.getDbPool)(),[N,w,R,f,D]=await Promise.all([(0,c.computeFinanceHealth)({workspaceId:h.workspaceId,businessId:h.businessId,syncAlerts:!1}),g.query(`
        SELECT
          COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS revenue,
          COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS expenses
        FROM transactions
        WHERE workspace_id = $1::uuid
          AND is_hidden = FALSE
          AND status <> 'pending'
          AND occurred_at >= $2::timestamptz
          AND occurred_at < $3::timestamptz
        `,[h.workspaceId,C.from.toISOString(),C.to.toISOString()]),g.query(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN direction = 'credit' THEN amount_minor
                ELSE -amount_minor
              END
            ),
            0
          )::text AS cash_balance
        FROM transactions
        WHERE workspace_id = $1::uuid
          AND is_hidden = FALSE
          AND status <> 'pending'
        `,[h.workspaceId]),g.query(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN t.direction = 'credit' AND t.gst_applicable = TRUE THEN
                  CASE
                    WHEN COALESCE(t.gst_amount, 0) > 0 THEN t.gst_amount
                    WHEN COALESCE(t.gst_rate, 0) > 0 THEN ABS(t.amount_minor) * t.gst_rate / 100
                    ELSE 0
                  END
                ELSE 0
              END
            ),
            0
          )::text AS output_gst,
          COALESCE(
            SUM(
              CASE
                WHEN t.direction = 'debit'
                  AND t.gst_applicable = TRUE
                  AND COALESCE(c.name, '') ILIKE ANY($4::text[]) THEN
                  CASE
                    WHEN COALESCE(t.gst_amount, 0) > 0 THEN t.gst_amount
                    WHEN COALESCE(t.gst_rate, 0) > 0 THEN ABS(t.amount_minor) * t.gst_rate / 100
                    ELSE 0
                  END
                ELSE 0
              END
            ),
            0
          )::text AS input_gst
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.workspace_id = $1::uuid
          AND t.is_hidden = FALSE
          AND t.status IN ('posted', 'reversed')
          AND t.occurred_at >= $2::timestamptz
          AND t.occurred_at < $3::timestamptz
        `,[h.workspaceId,S.cycleStart.toISOString(),S.cycleEnd.toISOString(),E]),g.query(`
        SELECT
          COUNT(*) FILTER (WHERE type = 'itc_mismatch' AND status = 'open')::text AS itc_mismatch_alert_count,
          COALESCE(
            SUM(
              CASE
                WHEN type = 'itc_mismatch'
                  AND status = 'open'
                  AND COALESCE(payload->>'mismatchAmount', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
                THEN (payload->>'mismatchAmount')::numeric
                ELSE 0
              END
            ),
            0
          )::text AS itc_mismatch_alert_value,
          COUNT(*) FILTER (
            WHERE status = 'open'
              AND type IN (
                'refund_spike',
                'reconciliation_gap',
                'sync_failure',
                'anomaly_detected',
                'cash_runway_risk',
                'duplicate',
                'unmatched'
              )
          )::text AS anomaly_count
        FROM alerts
        WHERE workspace_id = $1::uuid
        `,[h.workspaceId])]),T=w.rows[0],v=R.rows[0],y=f.rows[0],x=D.rows[0],O=d(l(T?.revenue)),H=d(l(T?.expenses)),b=d(l(v?.cash_balance)),I=l(y?.output_gst),U=l(y?.input_gst),L=d(Math.max(0,I-U)),M=Math.max(0,Math.ceil(S.dueInDays)),P=d(l(x?.itc_mismatch_alert_value)),k=Math.max(Math.trunc(N.itc_mismatch_count),Math.trunc(l(x?.itc_mismatch_alert_count))),F=Math.trunc(l(x?.anomaly_count)),q=d(30*N.cash_runway_months);return r.NextResponse.json({workspaceId:h.workspaceId,businessId:h.businessId,range:_,cash_balance:b,runway_days:q,revenue_mtd:O,expenses_mtd:H,gst_due_days:M,gst_est_payable:L,itc_mismatch_count:k,itc_mismatch_value:P,reconciliation_pct:d(N.recon_match_pct),anomaly_count:F,month_close_readiness_pct:d(N.month_close_readiness_pct),compliance_confidence:d(N.compliance_confidence),generatedAt:A.toISOString()})}catch(o){let e=o instanceof Error?o.message:"Failed to compute overview metrics",t=(0,i.getAuthErrorStatus)(o);if(t)return r.NextResponse.json({error:e},{status:t});if(e.includes("range must be"))return(0,n.badRequest)(e);let a=e.includes("Provide at least one scope identifier")||e.includes("not found")||e.includes("must be")?400:500;return r.NextResponse.json({error:e},{status:a})}}e.s(["GET",()=>p,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),a()}catch(e){a(e)}},!1),62084,e=>e.a(async(t,a)=>{try{var r=e.i(47909),n=e.i(74017),i=e.i(96250),o=e.i(59756),s=e.i(61916),c=e.i(74677),u=e.i(69741),l=e.i(16795),d=e.i(87718),p=e.i(95169),E=e.i(47587),m=e.i(66012),h=e.i(70101),_=e.i(26937),A=e.i(10372),C=e.i(93695);e.i(52474);var S=e.i(220),g=e.i(2792),N=t([g]);[g]=N.then?(await N)():N;let f=new r.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/metrics/overview/route",pathname:"/api/metrics/overview",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/product/src/app/api/metrics/overview/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:D,workUnitAsyncStorage:T,serverHooks:v}=f;function w(){return(0,i.patchFetch)({workAsyncStorage:D,workUnitAsyncStorage:T})}async function R(e,t,a){f.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/api/metrics/overview/route";r=r.replace(/\/index$/,"")||"/";let i=await f.prepare(e,t,{srcPage:r,multiZoneDraftMode:!1});if(!i)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:g,params:N,nextConfig:w,parsedUrl:R,isDraftMode:D,prerenderManifest:T,routerServerContext:v,isOnDemandRevalidate:y,revalidateOnlyGenerated:x,resolvedPathname:O,clientReferenceManifest:H,serverActionsManifest:b}=i,I=(0,u.normalizeAppPath)(r),U=!!(T.dynamicRoutes[I]||T.routes[O]),L=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,R,!1):t.end("This page could not be found"),null);if(U&&!D){let e=!!T.routes[O],t=T.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(w.experimental.adapterPath)return await L();throw new C.NoFallbackError}}let M=null;!U||f.isDev||D||(M=O,M="/index"===M?"/":M);let P=!0===f.isDev||!U,k=U&&!P;b&&H&&(0,c.setManifestsSingleton)({page:r,clientReferenceManifest:H,serverActionsManifest:b});let F=e.method||"GET",q=(0,s.getTracer)(),$=q.getActiveScopeSpan(),W={params:N,prerenderManifest:T,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:w.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,n)=>f.onRequestError(e,t,r,n,v)},sharedContext:{buildId:g}},j=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),B=d.NextRequestAdapter.fromNodeNextRequest(j,(0,d.signalFromNodeResponse)(t));try{let i=async e=>f.handle(B,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=q.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route");if(n){let t=`${F} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${F} ${r}`)}),c=!!(0,o.getRequestMeta)(e,"minimalMode"),u=async o=>{var s,u;let l=async({previousCacheEntry:n})=>{try{if(!c&&y&&x&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await i(o);e.fetchMetrics=W.renderOpts.fetchMetrics;let s=W.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let u=W.renderOpts.collectedTags;if(!U)return await (0,m.sendResponse)(j,K,r,W.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(r.headers);u&&(t[A.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=A.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,n=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=A.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:S.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await f.onRequestError(e,t,{routerKind:"App Router",routePath:r,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:y})},!1,v),t}},d=await f.handleResponse({req:e,nextConfig:w,cacheKey:M,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:y,revalidateOnlyGenerated:x,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:c});if(!U)return null;if((null==d||null==(s=d.value)?void 0:s.kind)!==S.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(u=d.value)?void 0:u.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});c||t.setHeader("x-nextjs-cache",y?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),D&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,h.fromNodeOutgoingHttpHeaders)(d.value.headers);return c&&U||p.delete(A.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,_.getCacheControlHeader)(d.cacheControl)),await (0,m.sendResponse)(j,K,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};$?await u($):await q.withPropagatedContext(e.headers,()=>q.trace(p.BaseServerSpan.handleRequest,{spanName:`${F} ${r}`,kind:s.SpanKind.SERVER,attributes:{"http.method":F,"http.target":e.url}},u))}catch(t){if(t instanceof C.NoFallbackError||await f.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:y})},!1,v),U)throw t;return await (0,m.sendResponse)(j,K,new Response(null,{status:500})),null}}e.s(["handler",()=>R,"patchFetch",()=>w,"routeModule",()=>f,"serverHooks",()=>v,"workAsyncStorage",()=>D,"workUnitAsyncStorage",()=>T]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_aa5938e2._.js.map