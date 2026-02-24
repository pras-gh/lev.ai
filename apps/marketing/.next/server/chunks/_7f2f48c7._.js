module.exports=[88908,e=>e.a(async(t,a)=>{try{var r=e.i(66680),s=e.i(89171),o=e.i(14568),n=e.i(85635),i=e.i(33691),l=e.i(34591),d=t([o,n,i,l]);function u(e){let t=[process.env.ALERT_ENGINE_KEY,process.env.CRON_SECRET].map(e=>(e??"").trim()).filter(e=>e.length>0);if(0===t.length)return!1;let a=function(e){if(!e)return null;let[t,a]=e.split(/\s+/,2);return t?.toLowerCase()!=="bearer"?null:a?.trim()||null}(e.headers.get("authorization")),r=e.headers.get("x-alert-engine-key")?.trim()||null,s=e.nextUrl.searchParams.get("key")?.trim()||null;return[a,r,s].filter(e=>!!e).some(e=>t.includes(e))}function c(e,t){if(null==e||""===e)return;let a="number"==typeof e?e:Number(String(e).trim());if(!Number.isInteger(a)||a<=0)throw Error(`${t} must be a positive integer`);return a}function p(e,t){if(null==e||""===e)return;let a="number"==typeof e?e:Number(String(e).trim());if(!Number.isFinite(a))throw Error(`${t} must be a number`);return a}function h(e,t){if(null!=e&&""!==e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}throw Error(`${t} must be true or false`)}}function y(e,t){let a;if(null==e||""===e)return;if("string"!=typeof e)throw Error(`${t} must be a URL string`);let r=e.trim();try{a=new URL(r)}catch{throw Error(`${t} must be a valid URL`)}if("http:"!==a.protocol&&"https:"!==a.protocol)throw Error(`${t} must use http or https`);return r}function f(e){if(!e)return null;let t=Number.parseInt(e,10);return Number.isInteger(t)&&t>0?t:null}async function m(e){let t=(0,l.getDbPool)();try{let a=await t.query(`
      INSERT INTO job_runs (
        workspace_id,
        job_type,
        dedupe_key,
        status,
        started_at,
        metrics
      )
      VALUES (
        $1::uuid,
        'alerts.daily',
        $2,
        'running',
        NOW(),
        $3::jsonb
      )
      RETURNING id::text
      `,[e.workspaceId,e.dedupeKey,JSON.stringify({mode:"workspace",options:e.options})]);return{jobRunId:f(a.rows[0]?.id),activeConflict:!1}}catch(t){if(function(e){if(!e||"object"!=typeof e)return!1;let t=e instanceof Error?e.message.toLowerCase():"",a="code"in e?String(e.code??""):"";return"42P01"===a||t.includes('relation "job_runs" does not exist')||t.includes('relation "event_outbox" does not exist')||t.includes('relation "delivery_attempts" does not exist')}(t))return{jobRunId:null,activeConflict:!1};let e=t&&"object"==typeof t&&"code"in t?String(t.code??""):"";if("23505"===e)return{jobRunId:null,activeConflict:!0};return{jobRunId:null,activeConflict:!1}}}async function w(e){if(!e.jobRunId)return;let t=(0,l.getDbPool)();try{await t.query(`
      UPDATE job_runs
      SET
        status = $3,
        finished_at = NOW(),
        error = CASE WHEN $4::text IS NULL THEN error ELSE $4::text END,
        metrics = COALESCE(metrics, '{}'::jsonb) || $5::jsonb
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[e.jobRunId,e.workspaceId,e.status,e.error??null,JSON.stringify(e.metrics)])}catch{}}async function R(e){let t=(0,l.getDbPool)();try{let a=await t.query(`
      INSERT INTO job_runs (
        workspace_id,
        job_type,
        dedupe_key,
        attempt,
        status,
        started_at,
        finished_at,
        error,
        metrics
      )
      VALUES (
        $1::uuid,
        'alerts.daily',
        $2,
        1,
        $3,
        $4::timestamptz,
        $5::timestamptz,
        $6,
        $7::jsonb
      )
      ON CONFLICT (workspace_id, job_type, dedupe_key, attempt)
      DO UPDATE
      SET
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at,
        error = EXCLUDED.error,
        metrics = EXCLUDED.metrics,
        updated_at = NOW()
      RETURNING id::text
      `,[e.workspaceId,e.dedupeKey,e.status,e.startedAt,e.finishedAt,e.error??null,JSON.stringify(e.metrics)]);return f(a.rows[0]?.id)}catch{return null}}async function k(e){let t=(0,l.getDbPool)();try{let a=await t.query(`
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
        'alerts.evaluation.completed',
        $2,
        $3::jsonb,
        'pending',
        NOW()
      )
      ON CONFLICT (workspace_id, event_type, dedupe_key)
      DO UPDATE
      SET
        payload = EXCLUDED.payload,
        status = 'pending',
        available_at = NOW(),
        last_error = NULL,
        updated_at = NOW()
      RETURNING id::text
      `,[e.workspaceId,e.dedupeKey,JSON.stringify(e.payload)]);return f(a.rows[0]?.id)}catch{return null}}function g(e){let t=e.whatsAppDigest;return t?"sent"===t.status?{status:"success",destination:t.destination,error:null,payload:{channel:"whatsapp",reason:t.reason,alertCount:t.alertCount,preview:t.preview,webhook:t.webhook}}:"failed"===t.status?{status:"failed",destination:null,error:t.error,payload:{channel:"whatsapp",reason:t.reason,alertCount:t.alertCount,preview:t.preview,error:t.error}}:null:null}async function b(e){if(!e.outboxId)return!1;let t=(0,l.getDbPool)();try{return await t.query(`
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
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        NOW()
      )
      `,[e.workspaceId,e.outboxId,e.channel,e.destination,e.status,e.error??null,JSON.stringify(e.payload)]),!0}catch{return!1}}function T(e){return{gst_due:e.alerts.gstDue.alert.status,itc_mismatch:e.alerts.itcMismatch.alert.status,refund_spike:e.alerts.refundSpike.alert.status,reconciliation_gap:e.alerts.reconciliationGap.alert.status,cash_runway_risk:e.alerts.cashRunwayRisk.alert.status,sync_failure:e.alerts.syncFailure.alert.status,anomaly_detected:e.alerts.anomalyDetected.alert.status}}function E(e){let t=e instanceof Error?e.message:"Unknown error";return t.includes("already running")?409:t.includes("must be")||t.includes("Provide at least one scope identifier")||t.includes("not found")?400:500}async function D(e){if(void 0!==e.scopeInput.workspaceId||void 0!==e.scopeInput.businessId){let t=await (0,o.resolveScope)(e.scopeInput),a=`workspace:${(0,r.randomUUID)()}`,i=await m({workspaceId:t.workspaceId,dedupeKey:a,options:e.options});if(i.activeConflict)return s.NextResponse.json({error:"An alerts.daily job is already running for this workspace"},{status:409});try{let r=await (0,n.evaluateWorkspaceAlerts)({workspaceId:t.workspaceId,businessId:t.businessId,gstDueLookaheadDays:e.options.gstDueLookaheadDays,itcMismatchThreshold:e.options.itcMismatchThreshold,refundSpikeRatioThreshold:e.options.refundSpikeRatioThreshold,cashRunwayThresholdDays:e.options.cashRunwayThresholdDays,reconciliationGapThresholdPct:e.options.reconciliationGapThresholdPct,syncFailureLookbackHours:e.options.syncFailureLookbackHours,anomalyRatioThreshold:e.options.anomalyRatioThreshold,anomalyMinDelta:e.options.anomalyMinDelta,sendWhatsAppDigest:e.options.sendWhatsAppDigest??!0,appBaseUrl:e.options.appBaseUrl});await w({jobRunId:i.jobRunId,workspaceId:t.workspaceId,status:"success",metrics:{mode:"workspace",alertStatuses:T(r),whatsAppDigestStatus:r.whatsAppDigest?.status??null}});let o=await k({workspaceId:t.workspaceId,dedupeKey:a,payload:{mode:"workspace",workspaceId:t.workspaceId,businessId:t.businessId,alerts:T(r)}}),l=g(r),d=!!l&&await b({workspaceId:t.workspaceId,outboxId:o,channel:"whatsapp",destination:l.destination,status:l.status,error:l.error??void 0,payload:l.payload});return s.NextResponse.json({mode:"workspace",workspaceId:t.workspaceId,businessId:t.businessId,result:r,controlPlane:{jobRunId:i.jobRunId,outboxId:o,deliveryTracked:d}})}catch(e){throw await w({jobRunId:i.jobRunId,workspaceId:t.workspaceId,status:"failed",error:e instanceof Error?e.message:"Failed to evaluate alerts",metrics:{mode:"workspace",failed:!0}}),e}}let t=await (0,n.runDailyAlertEvaluation)({limit:e.options.limit,gstDueLookaheadDays:e.options.gstDueLookaheadDays,itcMismatchThreshold:e.options.itcMismatchThreshold,refundSpikeRatioThreshold:e.options.refundSpikeRatioThreshold,cashRunwayThresholdDays:e.options.cashRunwayThresholdDays,reconciliationGapThresholdPct:e.options.reconciliationGapThresholdPct,syncFailureLookbackHours:e.options.syncFailureLookbackHours,anomalyRatioThreshold:e.options.anomalyRatioThreshold,anomalyMinDelta:e.options.anomalyMinDelta,sendWhatsAppDigest:e.options.sendWhatsAppDigest,appBaseUrl:e.options.appBaseUrl}),a=0,i=0,l=0;for(let e of t.results){let r=`daily:${t.startedAt}:${e.workspaceId}`;await R({workspaceId:e.workspaceId,dedupeKey:r,status:"success",startedAt:t.startedAt,finishedAt:t.finishedAt,metrics:{businessId:e.businessId,whatsAppDigestStatus:e.whatsAppDigest?.status??null,alertStatuses:T(e)}})&&(a+=1);let s=await k({workspaceId:e.workspaceId,dedupeKey:r,payload:{mode:"daily",workspaceId:e.workspaceId,businessId:e.businessId,startedAt:t.startedAt,finishedAt:t.finishedAt,alerts:T(e)}});s&&(i+=1);let o=g(e);o&&await b({workspaceId:e.workspaceId,outboxId:s,channel:"whatsapp",destination:o.destination,status:o.status,error:o.error??void 0,payload:o.payload})&&(l+=1)}for(let e of t.failures){let r=`daily:${t.startedAt}:${e.workspaceId}:failed`;await R({workspaceId:e.workspaceId,dedupeKey:r,status:"failed",startedAt:t.startedAt,finishedAt:t.finishedAt,error:e.error,metrics:{businessId:e.businessId,failed:!0,error:e.error}})&&(a+=1)}return s.NextResponse.json({mode:"daily",summary:t,controlPlane:{jobRunsWritten:a,outboxWritten:i,deliveryAttemptsWritten:l}})}async function I(e){if(!u(e))return s.NextResponse.json({error:"Unauthorized"},{status:401});try{var t;let a=(0,o.readScopeFromSearchParams)(e.nextUrl.searchParams),r=(t=e.nextUrl.searchParams,{limit:c(t.get("limit"),"limit"),gstDueLookaheadDays:c(t.get("gstDueLookaheadDays"),"gstDueLookaheadDays"),itcMismatchThreshold:c(t.get("itcMismatchThreshold"),"itcMismatchThreshold"),refundSpikeRatioThreshold:p(t.get("refundSpikeRatioThreshold"),"refundSpikeRatioThreshold"),cashRunwayThresholdDays:p(t.get("cashRunwayThresholdDays"),"cashRunwayThresholdDays"),reconciliationGapThresholdPct:p(t.get("reconciliationGapThresholdPct"),"reconciliationGapThresholdPct"),syncFailureLookbackHours:c(t.get("syncFailureLookbackHours"),"syncFailureLookbackHours"),anomalyRatioThreshold:p(t.get("anomalyRatioThreshold")??t.get("expenseSpikeRatioThreshold"),"anomalyRatioThreshold"),anomalyMinDelta:p(t.get("anomalyMinDelta")??t.get("expenseSpikeMinDelta"),"anomalyMinDelta"),sendWhatsAppDigest:h(t.get("sendWhatsAppDigest"),"sendWhatsAppDigest"),appBaseUrl:y(t.get("appBaseUrl"),"appBaseUrl")});return await D({scopeInput:a,options:r})}catch(t){let e=t instanceof Error?t.message:"Failed to run alert engine";return s.NextResponse.json({error:e},{status:E(t)})}}async function v(e){let t;if(!u(e))return s.NextResponse.json({error:"Unauthorized"},{status:401});try{t=await e.json()}catch{t={}}if(null!==t&&"object"!=typeof t)return(0,o.badRequest)("Body must be a JSON object");let a=t??{};try{let e=(0,o.readScopeFromBody)(a),t={limit:c(a.limit,"limit"),gstDueLookaheadDays:c(a.gstDueLookaheadDays,"gstDueLookaheadDays"),itcMismatchThreshold:c(a.itcMismatchThreshold,"itcMismatchThreshold"),refundSpikeRatioThreshold:p(a.refundSpikeRatioThreshold,"refundSpikeRatioThreshold"),cashRunwayThresholdDays:p(a.cashRunwayThresholdDays,"cashRunwayThresholdDays"),reconciliationGapThresholdPct:p(a.reconciliationGapThresholdPct,"reconciliationGapThresholdPct"),syncFailureLookbackHours:c(a.syncFailureLookbackHours,"syncFailureLookbackHours"),anomalyRatioThreshold:p(a.anomalyRatioThreshold??a.expenseSpikeRatioThreshold,"anomalyRatioThreshold"),anomalyMinDelta:p(a.anomalyMinDelta??a.expenseSpikeMinDelta,"anomalyMinDelta"),sendWhatsAppDigest:h(a.sendWhatsAppDigest,"sendWhatsAppDigest"),appBaseUrl:y(a.appBaseUrl,"appBaseUrl")};return await D({scopeInput:e,options:t})}catch(t){let e=t instanceof Error?t.message:"Failed to run alert engine";return s.NextResponse.json({error:e},{status:E(t)})}}[o,n,i,l]=d.then?(await d)():d,e.s(["GET",()=>I,"POST",()=>v,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),a()}catch(e){a(e)}},!1),54699,e=>e.a(async(t,a)=>{try{var r=e.i(47909),s=e.i(74017),o=e.i(96250),n=e.i(59756),i=e.i(61916),l=e.i(74677),d=e.i(69741),u=e.i(16795),c=e.i(87718),p=e.i(95169),h=e.i(47587),y=e.i(66012),f=e.i(70101),m=e.i(26937),w=e.i(10372),R=e.i(93695);e.i(52474);var k=e.i(220),g=e.i(88908),b=t([g]);[g]=b.then?(await b)():b;let D=new r.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/jobs/alerts/daily/route",pathname:"/api/jobs/alerts/daily",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/jobs/alerts/daily/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:I,workUnitAsyncStorage:v,serverHooks:N}=D;function T(){return(0,o.patchFetch)({workAsyncStorage:I,workUnitAsyncStorage:v})}async function E(e,t,a){D.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/api/jobs/alerts/daily/route";r=r.replace(/\/index$/,"")||"/";let o=await D.prepare(e,t,{srcPage:r,multiZoneDraftMode:!1});if(!o)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:g,params:b,nextConfig:T,parsedUrl:E,isDraftMode:I,prerenderManifest:v,routerServerContext:N,isOnDemandRevalidate:A,revalidateOnlyGenerated:_,resolvedPathname:S,clientReferenceManifest:C,serverActionsManifest:x}=o,U=(0,d.normalizeAppPath)(r),j=!!(v.dynamicRoutes[U]||v.routes[S]),L=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,E,!1):t.end("This page could not be found"),null);if(j&&!I){let e=!!v.routes[S],t=v.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(T.experimental.adapterPath)return await L();throw new R.NoFallbackError}}let P=null;!j||D.isDev||I||(P=S,P="/index"===P?"/":P);let O=!0===D.isDev||!j,$=j&&!O;x&&C&&(0,l.setManifestsSingleton)({page:r,clientReferenceManifest:C,serverActionsManifest:x});let M=e.method||"GET",H=(0,i.getTracer)(),F=H.getActiveScopeSpan(),W={params:b,prerenderManifest:v,renderOpts:{experimental:{authInterrupts:!!T.experimental.authInterrupts},cacheComponents:!!T.cacheComponents,supportsDynamicResponse:O,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:T.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,s)=>D.onRequestError(e,t,r,s,N)},sharedContext:{buildId:g}},q=new u.NodeNextRequest(e),G=new u.NodeNextResponse(t),B=c.NextRequestAdapter.fromNodeNextRequest(q,(0,c.signalFromNodeResponse)(t));try{let o=async e=>D.handle(B,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=H.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=a.get("next.route");if(s){let t=`${M} ${s}`;e.setAttributes({"next.route":s,"http.route":s,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${r}`)}),l=!!(0,n.getRequestMeta)(e,"minimalMode"),d=async n=>{var i,d;let u=async({previousCacheEntry:s})=>{try{if(!l&&A&&_&&!s)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await o(n);e.fetchMetrics=W.renderOpts.fetchMetrics;let i=W.renderOpts.pendingWaitUntil;i&&a.waitUntil&&(a.waitUntil(i),i=void 0);let d=W.renderOpts.collectedTags;if(!j)return await (0,y.sendResponse)(q,G,r,W.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(r.headers);d&&(t[w.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=w.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,s=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=w.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:k.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:s}}}}catch(t){throw(null==s?void 0:s.isStale)&&await D.onRequestError(e,t,{routerKind:"App Router",routePath:r,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:A})},!1,N),t}},c=await D.handleResponse({req:e,nextConfig:T,cacheKey:P,routeKind:s.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:v,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:_,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:l});if(!j)return null;if((null==c||null==(i=c.value)?void 0:i.kind)!==k.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(d=c.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});l||t.setHeader("x-nextjs-cache",A?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),I&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,f.fromNodeOutgoingHttpHeaders)(c.value.headers);return l&&j||p.delete(w.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,m.getCacheControlHeader)(c.cacheControl)),await (0,y.sendResponse)(q,G,new Response(c.value.body,{headers:p,status:c.value.status||200})),null};F?await d(F):await H.withPropagatedContext(e.headers,()=>H.trace(p.BaseServerSpan.handleRequest,{spanName:`${M} ${r}`,kind:i.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},d))}catch(t){if(t instanceof R.NoFallbackError||await D.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:A})},!1,N),j)throw t;return await (0,y.sendResponse)(q,G,new Response(null,{status:500})),null}}e.s(["handler",()=>E,"patchFetch",()=>T,"routeModule",()=>D,"serverHooks",()=>N,"workAsyncStorage",()=>I,"workUnitAsyncStorage",()=>v]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_7f2f48c7._.js.map