module.exports=[23959,e=>e.a(async(t,a)=>{try{var r=e.i(89171),n=e.i(14568),o=e.i(40423),i=e.i(33691),s=e.i(34591),l=t([n,o,i,s]);async function d(e,{params:t}){let a;try{a=await e.json()}catch{a={}}if(null!==a&&"object"!=typeof a)return(0,n.badRequest)("Body must be a JSON object");let i=a??{},l=function(e){if("string"!=typeof e)return null;let t=e.trim().toLowerCase();return"merge"===t||"ignore"===t||"resolve"===t||"snooze"===t||"reopen"===t?t:null}(i.action);if(!l)return(0,n.badRequest)("action must be one of: merge, ignore, resolve, snooze, reopen");try{let{id:a}=await t,d=(0,n.toPositiveInt)(a,"id"),u=await (0,o.resolveAuthorizedScope)({request:e,scope:(0,n.readScopeFromBody)(i)}),c=(0,n.toOptionalText)(i.note),p=i.keepTransactionId,E=null==p?void 0:(0,n.toPositiveInt)(p,"keepTransactionId"),R=(0,s.getDbPool)(),y=await R.connect();try{await y.query("BEGIN");let e=(await y.query(`
        SELECT
          id::text,
          business_id::text,
          type,
          status,
          transaction_id::text,
          related_transaction_ids
        FROM alerts
        WHERE id = $1
          AND workspace_id = $2::uuid
        LIMIT 1
        FOR UPDATE
        `,[d,u.workspaceId])).rows[0];if(!e)return await y.query("ROLLBACK"),r.NextResponse.json({error:"Alert not found"},{status:404});if("resolve"===l||"snooze"===l||"reopen"===l){let e="resolve"===l?"resolved":"snooze"===l?"snoozed":"open",t=[d,u.workspaceId,e,JSON.stringify({workflowAction:{action:l,note:c??null}})],a="";c&&(t.push(c),a=`, body = CONCAT(COALESCE(body, message, ''), E'

Workflow note: ', $5::text)`);let n=await y.query(`
          UPDATE alerts
          SET
            status = $3,
            resolved_at = CASE WHEN $3 = 'resolved' THEN NOW() ELSE NULL END,
            payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb,
            metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
            ${a}
          WHERE id = $1
            AND workspace_id = $2::uuid
          RETURNING *
          `,t);return await y.query("COMMIT"),r.NextResponse.json({action:l,status:e,alert:n.rows[0]??null})}if("duplicate"!==e.type)return await y.query("ROLLBACK"),(0,n.badRequest)("merge/ignore action is only supported for duplicate alerts");if("resolved"===e.status)return await y.query("COMMIT"),r.NextResponse.json({action:l,alertId:d,message:"Alert is already resolved"});let t=[...e.transaction_id?[Number.parseInt(e.transaction_id,10)]:[],...function(e){if(!e)return[];if(Array.isArray(e))return e.map(e=>Number.parseInt(String(e),10)).filter(e=>Number.isInteger(e)&&e>0);if("string"==typeof e)try{let t=JSON.parse(e);if(Array.isArray(t))return t.map(e=>Number.parseInt(String(e),10)).filter(e=>Number.isInteger(e)&&e>0)}catch{}return[]}(e.related_transaction_ids)].filter((e,t,a)=>Number.isInteger(e)&&e>0&&a.indexOf(e)===t);if("merge"===l){let e=E??t[0];if(!e)return await y.query("ROLLBACK"),(0,n.badRequest)("No transaction IDs found on this duplicate alert");if(void 0!==E&&!t.includes(E))return await y.query("ROLLBACK"),(0,n.badRequest)("keepTransactionId must be part of related_transaction_ids");let a=t.filter(t=>t!==e),o=0;a.length>0&&(o=(await y.query(`
            UPDATE transactions
            SET
              is_hidden = TRUE,
              hidden_at = COALESCE(hidden_at, NOW()),
              hidden_reason = COALESCE(hidden_reason, $3),
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{duplicateMergedInto}',
                to_jsonb($4::bigint),
                true
              ),
              updated_at = NOW()
            WHERE workspace_id = $1::uuid
              AND id = ANY($2::bigint[])
              AND is_hidden = FALSE
            `,[u.workspaceId,a,"Merged as duplicate via auto-clean suggestion",e])).rowCount??0);let i=[d,u.workspaceId,JSON.stringify({resolution:{action:"merge",keepTransactionId:e,mergedTransactionIds:a,note:c??null}})],s="";c&&(i.push(c),s=`, body = CONCAT(COALESCE(body, message, ''), E'

Resolution note: ', $4::text)`);let l=await y.query(`
          UPDATE alerts
          SET
            status = 'resolved',
            resolved_at = NOW(),
            payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
            ${s}
          WHERE id = $1
            AND workspace_id = $2::uuid
          RETURNING *
          `,i),p=t.length>0?t:[e],R=await y.query(`
          UPDATE alerts
          SET
            status = 'resolved',
            resolved_at = NOW(),
            payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
          WHERE workspace_id = $1::uuid
            AND id <> $2
            AND type = 'duplicate'
            AND status = 'open'
            AND (
              transaction_id = ANY($4::bigint[])
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(COALESCE(related_transaction_ids, '[]'::jsonb)) related(value)
                WHERE related.value::bigint = ANY($4::bigint[])
              )
            )
          `,[u.workspaceId,d,JSON.stringify({resolution:{action:"merge",reason:"resolved by overlapping duplicate merge"}}),p]);return await y.query("COMMIT"),r.NextResponse.json({action:"merge",keepTransactionId:e,mergedTransactionIds:a,hiddenTransactions:o,resolvedSiblingAlerts:R.rowCount??0,alert:l.rows[0]??null})}let a=[d,u.workspaceId,JSON.stringify({resolution:{action:"ignore",note:c??null}})],o="";c&&(a.push(c),o=`, body = CONCAT(COALESCE(body, message, ''), E'

Resolution note: ', $4::text)`);let i=await y.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
          ${o}
        WHERE id = $1
          AND workspace_id = $2::uuid
        RETURNING *
        `,a);return await y.query("COMMIT"),r.NextResponse.json({action:"ignore",alert:i.rows[0]??null})}catch(e){throw await y.query("ROLLBACK"),e}finally{y.release()}}catch(n){let e=n instanceof Error?n.message:"Failed to process alert action",t=(0,o.getAuthErrorStatus)(n);if(t)return r.NextResponse.json({error:e},{status:t});let a=e.includes("must be")||e.includes("Provide at least one scope identifier")||e.includes("not found")?400:500;return r.NextResponse.json({error:e},{status:a})}}[n,o,i,s]=l.then?(await l)():l,e.s(["POST",()=>d,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),a()}catch(e){a(e)}},!1),96829,e=>e.a(async(t,a)=>{try{var r=e.i(47909),n=e.i(74017),o=e.i(96250),i=e.i(59756),s=e.i(61916),l=e.i(74677),d=e.i(69741),u=e.i(16795),c=e.i(87718),p=e.i(95169),E=e.i(47587),R=e.i(66012),y=e.i(70101),h=e.i(26937),C=e.i(10372),g=e.i(93695);e.i(52474);var A=e.i(220),f=e.i(23959),w=t([f]);[f]=w.then?(await w)():w;let b=new r.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/alerts/[id]/action/route",pathname:"/api/alerts/[id]/action",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/alerts/[id]/action/route.ts",nextConfigOutput:"",userland:f}),{workAsyncStorage:v,workUnitAsyncStorage:O,serverHooks:T}=b;function m(){return(0,o.patchFetch)({workAsyncStorage:v,workUnitAsyncStorage:O})}async function N(e,t,a){b.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/api/alerts/[id]/action/route";r=r.replace(/\/index$/,"")||"/";let o=await b.prepare(e,t,{srcPage:r,multiZoneDraftMode:!1});if(!o)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:f,params:w,nextConfig:m,parsedUrl:N,isDraftMode:v,prerenderManifest:O,routerServerContext:T,isOnDemandRevalidate:S,revalidateOnlyGenerated:_,resolvedPathname:I,clientReferenceManifest:x,serverActionsManifest:$}=o,j=(0,d.normalizeAppPath)(r),L=!!(O.dynamicRoutes[j]||O.routes[I]),q=async()=>((null==T?void 0:T.render404)?await T.render404(e,t,N,!1):t.end("This page could not be found"),null);if(L&&!v){let e=!!O.routes[I],t=O.dynamicRoutes[j];if(t&&!1===t.fallback&&!e){if(m.experimental.adapterPath)return await q();throw new g.NoFallbackError}}let P=null;!L||b.isDev||v||(P=I,P="/index"===P?"/":P);let k=!0===b.isDev||!L,D=L&&!k;$&&x&&(0,l.setManifestsSingleton)({page:r,clientReferenceManifest:x,serverActionsManifest:$});let U=e.method||"GET",H=(0,s.getTracer)(),M=H.getActiveScopeSpan(),W={params:w,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!m.experimental.authInterrupts},cacheComponents:!!m.cacheComponents,supportsDynamicResponse:k,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:m.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,n)=>b.onRequestError(e,t,r,n,T)},sharedContext:{buildId:f}},F=new u.NodeNextRequest(e),B=new u.NodeNextResponse(t),K=c.NextRequestAdapter.fromNodeNextRequest(F,(0,c.signalFromNodeResponse)(t));try{let o=async e=>b.handle(K,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=H.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route");if(n){let t=`${U} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${U} ${r}`)}),l=!!(0,i.getRequestMeta)(e,"minimalMode"),d=async i=>{var s,d;let u=async({previousCacheEntry:n})=>{try{if(!l&&S&&_&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await o(i);e.fetchMetrics=W.renderOpts.fetchMetrics;let s=W.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let d=W.renderOpts.collectedTags;if(!L)return await (0,R.sendResponse)(F,B,r,W.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,y.toNodeOutgoingHttpHeaders)(r.headers);d&&(t[C.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=C.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,n=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=C.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:A.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await b.onRequestError(e,t,{routerKind:"App Router",routePath:r,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:S})},!1,T),t}},c=await b.handleResponse({req:e,nextConfig:m,cacheKey:P,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:_,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:l});if(!L)return null;if((null==c||null==(s=c.value)?void 0:s.kind)!==A.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(d=c.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});l||t.setHeader("x-nextjs-cache",S?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),v&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,y.fromNodeOutgoingHttpHeaders)(c.value.headers);return l&&L||p.delete(C.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,h.getCacheControlHeader)(c.cacheControl)),await (0,R.sendResponse)(F,B,new Response(c.value.body,{headers:p,status:c.value.status||200})),null};M?await d(M):await H.withPropagatedContext(e.headers,()=>H.trace(p.BaseServerSpan.handleRequest,{spanName:`${U} ${r}`,kind:s.SpanKind.SERVER,attributes:{"http.method":U,"http.target":e.url}},d))}catch(t){if(t instanceof g.NoFallbackError||await b.onRequestError(e,t,{routerKind:"App Router",routePath:j,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:S})},!1,T),L)throw t;return await (0,R.sendResponse)(F,B,new Response(null,{status:500})),null}}e.s(["handler",()=>N,"patchFetch",()=>m,"routeModule",()=>b,"serverHooks",()=>T,"workAsyncStorage",()=>v,"workUnitAsyncStorage",()=>O]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_a1eaa581._.js.map