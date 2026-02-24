module.exports=[10479,e=>e.a(async(t,a)=>{try{var n=e.i(66680),r=e.i(89171),i=e.i(14568),o=e.i(40423),s=e.i(33691),d=e.i(34591),l=e.i(84942),c=t([i,o,s,d,l]);async function u(e){let t;try{t=await e.json()}catch{return(0,i.badRequest)("Invalid JSON body")}if(!t||"object"!=typeof t)return(0,i.badRequest)("Body must be a JSON object");let a=t;try{let t=await (0,o.resolveAuthorizedScope)({request:e,scope:(0,i.readScopeFromBody)(a)}),u=(0,i.toOptionalPositiveInt)(a.limit,"limit")??600,p=(0,i.toOptionalNumber)(a.maxDateWindowDays,"maxDateWindowDays")??3,h=(0,i.toOptionalNumber)(a.confidenceThreshold,"confidenceThreshold")??.6;if(!Number.isInteger(u)||u<=0||u>2e3)return(0,i.badRequest)("limit must be an integer between 1 and 2000");if(p<=0||p>30)return(0,i.badRequest)("maxDateWindowDays must be between 1 and 30");if(h<0||h>1)return(0,i.badRequest)("confidenceThreshold must be between 0 and 1");let m=(0,d.getDbPool)(),g=await m.connect();try{await g.query("BEGIN");let e=(await g.query(`
        SELECT
          id::text,
          occurred_at::text,
          amount_minor::text,
          counterparty,
          description,
          external_ref
        FROM transactions
        WHERE workspace_id = $1::uuid
          AND is_hidden = FALSE
          AND matched = FALSE
          AND status IN ('posted', 'reversed')
        ORDER BY occurred_at DESC, id DESC
        LIMIT $2
        FOR UPDATE
        `,[t.workspaceId,u])).rows.map(e=>{var t,a;let n,r,i=Number.parseInt(e.id,10),o=(t=e.occurred_at,n=new Date(t),Number.isNaN(n.getTime())?null:n),s=(a=e.amount_minor,r=Number(a),Number.isFinite(r)?Math.abs(r):null),d=([e.counterparty,e.description,e.external_ref].filter(Boolean).join(" ")??"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();return Number.isInteger(i)&&!(i<=0)&&o&&null!==s?{id:i,date:o,amount:s,merchantTokens:d.split(" ").map(e=>e.trim()).filter(e=>e.length>2)}:null}).filter(e=>!!e),a=[];for(let t=0;t<e.length;t+=1){let n=e[t];for(let r=t+1;r<e.length;r+=1){var s,c;let t=e[r];if(Math.abs(n.amount-t.amount)>1e-4)continue;let i=(s=n.date,c=t.date,Math.abs(s.getTime()-c.getTime())/864e5);if(i>p)continue;let o=function(e,t){if(0===e.length||0===t.length)return 0;let a=new Set(e),n=new Set(t),r=0;for(let e of a)n.has(e)&&(r+=1);let i=new Set([...a,...n]).size;return 0===i?0:r/i}(n.merchantTokens,t.merchantTokens);if(o<=0)continue;let d=Math.max(0,1-i/p),l=Number((.5+.2*d+.3*o).toFixed(4));l<h||a.push({leftId:n.id,rightId:t.id,score:l,dateDiffDays:Number(i.toFixed(3)),merchantSimilarity:Number(o.toFixed(4))})}}a.sort((e,t)=>t.score-e.score);let i=new Set,o=[];for(let e of a)i.has(e.leftId)||i.has(e.rightId)||(o.push(e),i.add(e.leftId),i.add(e.rightId));let d=e.map(e=>e.id),m=new Set;for(let e of o)m.add(e.leftId),m.add(e.rightId);let f=new Date().toISOString(),E=0;for(let e of o){let a=(0,n.randomUUID)(),r=await g.query(`
          UPDATE transactions
          SET
            confidence = $3::numeric,
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{reconciliationSuggestion}',
              $4::jsonb,
              true
            ),
            updated_at = NOW()
          WHERE workspace_id = $1::uuid
            AND id = $2::bigint
            AND matched = FALSE
            AND is_hidden = FALSE
          `,[t.workspaceId,e.leftId,e.score,JSON.stringify({candidateTransactionId:e.rightId,score:e.score,dateDiffDays:e.dateDiffDays,merchantSimilarity:e.merchantSimilarity,method:"amount_date_merchant_v1",suggestedGroupId:a,generatedAt:f})]);E+=r.rowCount??0;let i=await g.query(`
          UPDATE transactions
          SET
            confidence = $3::numeric,
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{reconciliationSuggestion}',
              $4::jsonb,
              true
            ),
            updated_at = NOW()
          WHERE workspace_id = $1::uuid
            AND id = $2::bigint
            AND matched = FALSE
            AND is_hidden = FALSE
          `,[t.workspaceId,e.rightId,e.score,JSON.stringify({candidateTransactionId:e.leftId,score:e.score,dateDiffDays:e.dateDiffDays,merchantSimilarity:e.merchantSimilarity,method:"amount_date_merchant_v1",suggestedGroupId:a,generatedAt:f})]);E+=i.rowCount??0}let w=d.filter(e=>!m.has(e)),R=0;w.length>0&&(R=(await g.query(`
          UPDATE transactions
          SET
            confidence = NULL,
            metadata = COALESCE(metadata, '{}'::jsonb) - 'reconciliationSuggestion',
            updated_at = NOW()
          WHERE workspace_id = $1::uuid
            AND id = ANY($2::bigint[])
            AND matched = FALSE
            AND is_hidden = FALSE
            AND (
              confidence IS NOT NULL
              OR COALESCE(metadata, '{}'::jsonb) ? 'reconciliationSuggestion'
            )
          `,[t.workspaceId,w])).rowCount??0);let y=await g.query(`
        SELECT
          COUNT(*) FILTER (WHERE is_hidden = FALSE AND status <> 'pending')::text AS total,
          COUNT(*) FILTER (WHERE is_hidden = FALSE AND status <> 'pending' AND matched = TRUE)::text AS matched
        FROM transactions
        WHERE workspace_id = $1::uuid
        `,[t.workspaceId]),N=Number(y.rows[0]?.total??"0"),b=Number(y.rows[0]?.matched??"0"),A=N>0?b/N*100:100;return await (0,l.writeAuditLogSafe)({workspaceId:t.workspaceId,businessId:t.businessId,actorType:"system",actorId:"trail_reconciliation_v1",entityType:"reconciliation",entityId:`suggest:${Date.now()}`,action:"trail.reconciliation.suggestions.generated",beforeState:{scanned:e.length,threshold:h},afterState:{suggestions:o.length,updatedRows:E,clearedRows:R,reconMatchPct:Number(A.toFixed(2)),confidenceThreshold:h,method:"amount_date_merchant_v1",evidence:{transactionIds:[...m],pairs:o.slice(0,50).map(e=>({transactionIds:[e.leftId,e.rightId],confidence:e.score,merchantSimilarity:e.merchantSimilarity,dateDiffDays:e.dateDiffDays}))}}},g),await g.query("COMMIT"),r.NextResponse.json({workspaceId:t.workspaceId,businessId:t.businessId,scanned:e.length,suggestions:o.length,updatedRows:E,clearedRows:R,recon_match_pct:Number(A.toFixed(2))})}catch(e){throw await g.query("ROLLBACK"),e}finally{g.release()}}catch(n){let e=n instanceof Error?n.message:"Failed to generate reconciliation suggestions",t=(0,o.getAuthErrorStatus)(n);if(t)return r.NextResponse.json({error:e},{status:t});let a=e.includes("must be")||e.includes("Provide at least one scope identifier")||e.includes("not found")?400:500;return r.NextResponse.json({error:e},{status:a})}}[i,o,s,d,l]=c.then?(await c)():c,e.s(["POST",()=>u,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),a()}catch(e){a(e)}},!1),27476,e=>e.a(async(t,a)=>{try{var n=e.i(47909),r=e.i(74017),i=e.i(96250),o=e.i(59756),s=e.i(61916),d=e.i(74677),l=e.i(69741),c=e.i(16795),u=e.i(87718),p=e.i(95169),h=e.i(47587),m=e.i(66012),g=e.i(70101),f=e.i(26937),E=e.i(10372),w=e.i(93695);e.i(52474);var R=e.i(220),y=e.i(10479),N=t([y]);[y]=N.then?(await N)():N;let S=new n.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/transactions/reconcile/suggest/route",pathname:"/api/transactions/reconcile/suggest",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/transactions/reconcile/suggest/route.ts",nextConfigOutput:"",userland:y}),{workAsyncStorage:I,workUnitAsyncStorage:D,serverHooks:v}=S;function b(){return(0,i.patchFetch)({workAsyncStorage:I,workUnitAsyncStorage:D})}async function A(e,t,a){S.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let n="/api/transactions/reconcile/suggest/route";n=n.replace(/\/index$/,"")||"/";let i=await S.prepare(e,t,{srcPage:n,multiZoneDraftMode:!1});if(!i)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:y,params:N,nextConfig:b,parsedUrl:A,isDraftMode:I,prerenderManifest:D,routerServerContext:v,isOnDemandRevalidate:_,revalidateOnlyGenerated:C,resolvedPathname:T,clientReferenceManifest:x,serverActionsManifest:O}=i,L=(0,l.normalizeAppPath)(n),P=!!(D.dynamicRoutes[L]||D.routes[T]),k=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,A,!1):t.end("This page could not be found"),null);if(P&&!I){let e=!!D.routes[T],t=D.dynamicRoutes[L];if(t&&!1===t.fallback&&!e){if(b.experimental.adapterPath)return await k();throw new w.NoFallbackError}}let F=null;!P||S.isDev||I||(F=T,F="/index"===F?"/":F);let q=!0===S.isDev||!P,U=P&&!q;O&&x&&(0,d.setManifestsSingleton)({page:n,clientReferenceManifest:x,serverActionsManifest:O});let H=e.method||"GET",j=(0,s.getTracer)(),$=j.getActiveScopeSpan(),M={params:N,prerenderManifest:D,renderOpts:{experimental:{authInterrupts:!!b.experimental.authInterrupts},cacheComponents:!!b.cacheComponents,supportsDynamicResponse:q,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:b.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,n,r)=>S.onRequestError(e,t,n,r,v)},sharedContext:{buildId:y}},W=new c.NodeNextRequest(e),B=new c.NodeNextResponse(t),K=u.NextRequestAdapter.fromNodeNextRequest(W,(0,u.signalFromNodeResponse)(t));try{let i=async e=>S.handle(K,M).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=j.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${H} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${n}`)}),d=!!(0,o.getRequestMeta)(e,"minimalMode"),l=async o=>{var s,l;let c=async({previousCacheEntry:r})=>{try{if(!d&&_&&C&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(o);e.fetchMetrics=M.renderOpts.fetchMetrics;let s=M.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let l=M.renderOpts.collectedTags;if(!P)return await (0,m.sendResponse)(W,B,n,M.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,g.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[E.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,r=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==r?void 0:r.isStale)&&await S.onRequestError(e,t,{routerKind:"App Router",routePath:n,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:U,isOnDemandRevalidate:_})},!1,v),t}},u=await S.handleResponse({req:e,nextConfig:b,cacheKey:F,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:D,isRoutePPREnabled:!1,isOnDemandRevalidate:_,revalidateOnlyGenerated:C,responseGenerator:c,waitUntil:a.waitUntil,isMinimalMode:d});if(!P)return null;if((null==u||null==(s=u.value)?void 0:s.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});d||t.setHeader("x-nextjs-cache",_?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),I&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,g.fromNodeOutgoingHttpHeaders)(u.value.headers);return d&&P||p.delete(E.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,f.getCacheControlHeader)(u.cacheControl)),await (0,m.sendResponse)(W,B,new Response(u.value.body,{headers:p,status:u.value.status||200})),null};$?await l($):await j.withPropagatedContext(e.headers,()=>j.trace(p.BaseServerSpan.handleRequest,{spanName:`${H} ${n}`,kind:s.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},l))}catch(t){if(t instanceof w.NoFallbackError||await S.onRequestError(e,t,{routerKind:"App Router",routePath:L,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:U,isOnDemandRevalidate:_})},!1,v),P)throw t;return await (0,m.sendResponse)(W,B,new Response(null,{status:500})),null}}e.s(["handler",()=>A,"patchFetch",()=>b,"routeModule",()=>S,"serverHooks",()=>v,"workAsyncStorage",()=>I,"workUnitAsyncStorage",()=>D]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_c261f191._.js.map