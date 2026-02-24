module.exports=[84582,e=>e.a(async(t,a)=>{try{var r=e.i(66680),n=e.i(89171),i=e.i(14568),o=e.i(40423),s=e.i(33691),d=e.i(34591),c=e.i(84942),u=t([i,o,s,d,c]);function l(e,t){return Object.prototype.hasOwnProperty.call(e,t)}async function p(e){let t;try{t=await e.json()}catch{return(0,i.badRequest)("Invalid JSON body")}if(!t||"object"!=typeof t)return(0,i.badRequest)("Body must be a JSON object");let a=t;try{let t=await (0,o.resolveAuthorizedScope)({request:e,scope:(0,i.readScopeFromBody)(a)}),s=String(a.action??"").trim().toLowerCase(),u=function(e){if(!Array.isArray(e)||0===e.length)throw Error("transactionIds must be a non-empty array");let t=new Set;for(let a of e)t.add((0,i.toPositiveInt)(a,"transactionIds[]"));if(t.size>500)throw Error("transactionIds cannot contain more than 500 ids in one batch");return[...t]}(a.transactionIds),p=(0,i.toOptionalText)(a.note),h="string"==typeof a.actorType?a.actorType.trim().toLowerCase():"",m="system"===h||"user"===h||"api_key"===h||"job"===h?h:"user",_="string"==typeof a.actorId&&a.actorId.trim().length>0?a.actorId.trim():t.userId??null,y=(0,d.getDbPool)();if("categorize"===s){let e=l(a,"categoryId")?null===a.categoryId?null:(0,i.toOptionalPositiveInt)(a.categoryId,"categoryId"):void 0;if(void 0===e)return(0,i.badRequest)("categoryId is required for action=categorize");if(null!==e&&!(await y.query(`
          SELECT id::text
          FROM categories
          WHERE id = $1
            AND workspace_id = $2::uuid
          LIMIT 1
          `,[e,t.workspaceId])).rows[0])return(0,i.badRequest)("categoryId does not belong to this workspace");let r=[e,t.workspaceId,u],o=p?", metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{batchNote}', to_jsonb($4::text), true)":"";p&&r.push(p);let d=await y.query(`
        UPDATE transactions
        SET
          category_id = $1,
          updated_at = NOW()
          ${o}
        WHERE workspace_id = $2::uuid
          AND id = ANY($3::bigint[])
          AND is_hidden = FALSE
        `,r);return await (0,c.writeAuditLogSafe)({workspaceId:t.workspaceId,businessId:t.businessId,actorType:m,actorId:_,entityType:"transaction_batch",entityId:`categorize:${Date.now()}`,action:"trail.batch.categorize",beforeState:{categoryIdBefore:"mixed",affectedTransactionIds:u},afterState:{categoryId:e,updatedCount:d.rowCount??0,note:p??null,evidence:{transactionIds:u,source:"api.transactions.batch"}}},y),n.NextResponse.json({action:s,transactionIds:u,updatedCount:d.rowCount??0})}if("match"===s){let e=l(a,"confidence"),o=e?null===a.confidence?null:(0,i.toOptionalNumber)(a.confidence,"confidence"):void 0,d=(0,i.toOptionalUuid)(a.matchGroupId,"matchGroupId")??(0,r.randomUUID)();if(null!=o&&(o<0||o>1))return(0,i.badRequest)("confidence must be between 0 and 1");let h=[d,t.workspaceId,u],b="",w="";e&&(h.push(o??null),b=`, confidence = $${h.length}`),p&&(h.push(p),w=`, metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{batchNote}', to_jsonb($${h.length}::text), true)`);let f=await y.query(`
        UPDATE transactions
        SET
          matched = TRUE,
          match_group_id = $1::uuid
          ${b}
          ${w},
          updated_at = NOW()
        WHERE workspace_id = $2::uuid
          AND id = ANY($3::bigint[])
          AND is_hidden = FALSE
        `,h);return await (0,c.writeAuditLogSafe)({workspaceId:t.workspaceId,businessId:t.businessId,actorType:m,actorId:_,entityType:"transaction_batch",entityId:`match:${d}`,action:"trail.batch.match",beforeState:{matchedBefore:!1,affectedTransactionIds:u},afterState:{matched:!0,matchGroupId:d,confidence:o??null,updatedCount:f.rowCount??0,note:p??null,evidence:{transactionIds:u,source:"api.transactions.batch"}}},y),n.NextResponse.json({action:s,transactionIds:u,matchGroupId:d,updatedCount:f.rowCount??0})}if("resolve"===s){let e=[t.workspaceId,u],a=await y.query(`
        UPDATE transactions
        SET
          matched = TRUE,
          updated_at = NOW()
        WHERE workspace_id = $1::uuid
          AND id = ANY($2::bigint[])
          AND is_hidden = FALSE
        `,e),r="";p&&(e.push(p),r=`, body = CONCAT(COALESCE(body, message, ''), E'

Resolved note: ', $3::text)`);let i=await y.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW()
          ${r}
        WHERE workspace_id = $1::uuid
          AND status <> 'resolved'
          AND transaction_id = ANY($2::bigint[])
        `,e);return await (0,c.writeAuditLogSafe)({workspaceId:t.workspaceId,businessId:t.businessId,actorType:m,actorId:_,entityType:"transaction_batch",entityId:`resolve:${Date.now()}`,action:"trail.batch.resolve",beforeState:{unresolvedAlerts:!0,affectedTransactionIds:u},afterState:{resolvedTransactions:a.rowCount??0,resolvedAlerts:i.rowCount??0,note:p??null,evidence:{transactionIds:u,source:"api.transactions.batch"}}},y),n.NextResponse.json({action:s,transactionIds:u,resolvedTransactions:a.rowCount??0,resolvedAlerts:i.rowCount??0})}if("split"===s){if(1!==u.length)return(0,i.badRequest)("action=split requires exactly one transaction id");let e=(0,i.toOptionalNumber)(a.splitRatio,"splitRatio")??.5;if(e<=0||e>=1)return(0,i.badRequest)("splitRatio must be > 0 and < 1");let r=p??"Split transaction",o=u[0],d=await y.connect();try{await d.query("BEGIN");let a=(await d.query(`
          SELECT
            id,
            business_id,
            workspace_id::text,
            category_id,
            external_ref,
            direction::text AS direction,
            status::text AS status,
            amount_minor::text,
            currency_code,
            occurred_at,
            booked_at,
            description,
            counterparty,
            source,
            gst_applicable,
            gst_rate::text,
            gst_amount::text,
            metadata
          FROM transactions
          WHERE workspace_id = $1::uuid
            AND id = $2::bigint
            AND is_hidden = FALSE
          LIMIT 1
          FOR UPDATE
          `,[t.workspaceId,o])).rows[0];if(!a)return await d.query("ROLLBACK"),n.NextResponse.json({error:"Transaction not found"},{status:404});if("reversed"===a.status)return await d.query("ROLLBACK"),n.NextResponse.json({error:"Cannot split a reversed transaction"},{status:409});let c=Number(a.amount_minor);if(!Number.isFinite(c)||c<=0)return await d.query("ROLLBACK"),(0,i.badRequest)("Split source amount must be a positive number");let l=Number((c*e).toFixed(2)),p=Number((c-l).toFixed(2));if(l<=0||p<=0)return await d.query("ROLLBACK"),(0,i.badRequest)("Split ratio produced invalid amounts");let h=a.metadata&&"object"==typeof a.metadata&&!Array.isArray(a.metadata)?a.metadata:{},m=a.description?.trim()||a.counterparty?.trim()||`Transaction ${a.id}`,_=Number(a.gst_amount??"0"),y=null===a.gst_amount?null:Number((_*e).toFixed(2)),b=null===a.gst_amount?null:Number((_-(y??0)).toFixed(2)),w=await d.query(`
          INSERT INTO transactions (
            workspace_id,
            business_id,
            category_id,
            external_ref,
            direction,
            status,
            amount_minor,
            currency_code,
            occurred_at,
            booked_at,
            description,
            counterparty,
            source,
            gst_applicable,
            gst_rate,
            gst_amount,
            matched,
            match_group_id,
            confidence,
            metadata
          )
          VALUES (
            $1::uuid,
            $2,
            $3,
            $4,
            $5::txn_type,
            $6::txn_status,
            $7::numeric(14,2),
            $8,
            $9::timestamptz,
            $10::timestamptz,
            $11,
            $12,
            $13,
            $14,
            $15::numeric(6,3),
            $16::numeric(14,2),
            FALSE,
            NULL,
            NULL,
            $17::jsonb
          )
          RETURNING id::int
          `,[a.workspace_id,a.business_id,a.category_id,a.external_ref,a.direction,a.status,l,a.currency_code,a.occurred_at,a.booked_at,`${m} (split 1/2)`,a.counterparty,a.source,a.gst_applicable,a.gst_rate,y,JSON.stringify({...h,split:{sourceTransactionId:a.id,splitIndex:1,splitRatio:e,note:r}})]),f=await d.query(`
          INSERT INTO transactions (
            workspace_id,
            business_id,
            category_id,
            external_ref,
            direction,
            status,
            amount_minor,
            currency_code,
            occurred_at,
            booked_at,
            description,
            counterparty,
            source,
            gst_applicable,
            gst_rate,
            gst_amount,
            matched,
            match_group_id,
            confidence,
            metadata
          )
          VALUES (
            $1::uuid,
            $2,
            $3,
            $4,
            $5::txn_type,
            $6::txn_status,
            $7::numeric(14,2),
            $8,
            $9::timestamptz,
            $10::timestamptz,
            $11,
            $12,
            $13,
            $14,
            $15::numeric(6,3),
            $16::numeric(14,2),
            FALSE,
            NULL,
            NULL,
            $17::jsonb
          )
          RETURNING id::int
          `,[a.workspace_id,a.business_id,a.category_id,a.external_ref,a.direction,a.status,p,a.currency_code,a.occurred_at,a.booked_at,`${m} (split 2/2)`,a.counterparty,a.source,a.gst_applicable,a.gst_rate,b,JSON.stringify({...h,split:{sourceTransactionId:a.id,splitIndex:2,splitRatio:1-e,note:r}})]),g=[w.rows[0]?.id??0,f.rows[0]?.id??0].filter(e=>Number.isInteger(e)&&e>0);return await d.query(`
          UPDATE transactions
          SET
            is_hidden = TRUE,
            hidden_reason = $3,
            hidden_at = NOW(),
            hidden_by = $4,
            updated_at = NOW()
          WHERE workspace_id = $1::uuid
            AND id = $2::bigint
          `,[t.workspaceId,o,"Split into child transactions",t.userId]),await d.query(`
          INSERT INTO audit_logs (
            workspace_id,
            business_id,
            actor_type,
            actor_id,
            entity_type,
            entity_id,
            action,
            after_state
          )
          VALUES
            ($1::uuid, $2, 'user', $3, 'transaction', $4, 'transaction.split', $5::jsonb),
            ($1::uuid, $2, 'user', $3, 'transaction', $6, 'transaction.split.child_created', $7::jsonb),
            ($1::uuid, $2, 'user', $3, 'transaction', $8, 'transaction.split.child_created', $9::jsonb)
          `,[t.workspaceId,t.businessId,t.userId,String(o),JSON.stringify({splitRatio:e,note:r,createdTransactionIds:g}),String(g[0]??""),JSON.stringify({sourceTransactionId:o,amount:l}),String(g[1]??""),JSON.stringify({sourceTransactionId:o,amount:p})]),await d.query("COMMIT"),n.NextResponse.json({action:s,transactionIds:u,split:{sourceTransactionId:o,createdTransactionIds:g,splitRatio:e,note:r}})}catch(e){throw await d.query("ROLLBACK"),e}finally{d.release()}}return(0,i.badRequest)("action must be one of: categorize, match, resolve, split")}catch(r){let e=r instanceof Error?r.message:"Failed to process batch request",t=(0,o.getAuthErrorStatus)(r);if(t)return n.NextResponse.json({error:e},{status:t});let a=e.includes("must be")||e.includes("Provide at least one scope identifier")||e.includes("not found")||e.includes("cannot contain")||e.includes("non-empty")||e.includes("requires exactly")||e.includes("splitRatio")?400:500;return n.NextResponse.json({error:e},{status:a})}}[i,o,s,d,c]=u.then?(await u)():u,e.s(["POST",()=>p,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),a()}catch(e){a(e)}},!1),38881,e=>e.a(async(t,a)=>{try{var r=e.i(47909),n=e.i(74017),i=e.i(96250),o=e.i(59756),s=e.i(61916),d=e.i(74677),c=e.i(69741),u=e.i(16795),l=e.i(87718),p=e.i(95169),h=e.i(47587),m=e.i(66012),_=e.i(70101),y=e.i(26937),b=e.i(10372),w=e.i(93695);e.i(52474);var f=e.i(220),g=e.i(84582),R=t([g]);[g]=R.then?(await R)():R;let N=new r.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/transactions/batch/route",pathname:"/api/transactions/batch",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/transactions/batch/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:I,workUnitAsyncStorage:A,serverHooks:v}=N;function E(){return(0,i.patchFetch)({workAsyncStorage:I,workUnitAsyncStorage:A})}async function $(e,t,a){N.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/api/transactions/batch/route";r=r.replace(/\/index$/,"")||"/";let i=await N.prepare(e,t,{srcPage:r,multiZoneDraftMode:!1});if(!i)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:g,params:R,nextConfig:E,parsedUrl:$,isDraftMode:I,prerenderManifest:A,routerServerContext:v,isOnDemandRevalidate:S,revalidateOnlyGenerated:T,resolvedPathname:x,clientReferenceManifest:C,serverActionsManifest:O}=i,k=(0,c.normalizeAppPath)(r),q=!!(A.dynamicRoutes[k]||A.routes[x]),L=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,$,!1):t.end("This page could not be found"),null);if(q&&!I){let e=!!A.routes[x],t=A.dynamicRoutes[k];if(t&&!1===t.fallback&&!e){if(E.experimental.adapterPath)return await L();throw new w.NoFallbackError}}let U=null;!q||N.isDev||I||(U=x,U="/index"===U?"/":U);let D=!0===N.isDev||!q,P=q&&!D;O&&C&&(0,d.setManifestsSingleton)({page:r,clientReferenceManifest:C,serverActionsManifest:O});let j=e.method||"GET",F=(0,s.getTracer)(),H=F.getActiveScopeSpan(),M={params:R,prerenderManifest:A,renderOpts:{experimental:{authInterrupts:!!E.experimental.authInterrupts},cacheComponents:!!E.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:E.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,n)=>N.onRequestError(e,t,r,n,v)},sharedContext:{buildId:g}},B=new u.NodeNextRequest(e),W=new u.NodeNextResponse(t),K=l.NextRequestAdapter.fromNodeNextRequest(B,(0,l.signalFromNodeResponse)(t));try{let i=async e=>N.handle(K,M).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=F.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route");if(n){let t=`${j} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${j} ${r}`)}),d=!!(0,o.getRequestMeta)(e,"minimalMode"),c=async o=>{var s,c;let u=async({previousCacheEntry:n})=>{try{if(!d&&S&&T&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await i(o);e.fetchMetrics=M.renderOpts.fetchMetrics;let s=M.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let c=M.renderOpts.collectedTags;if(!q)return await (0,m.sendResponse)(B,W,r,M.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(r.headers);c&&(t[b.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=b.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,n=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=b.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:f.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await N.onRequestError(e,t,{routerKind:"App Router",routePath:r,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:S})},!1,v),t}},l=await N.handleResponse({req:e,nextConfig:E,cacheKey:U,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:T,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:d});if(!q)return null;if((null==l||null==(s=l.value)?void 0:s.kind)!==f.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(c=l.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});d||t.setHeader("x-nextjs-cache",S?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),I&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,_.fromNodeOutgoingHttpHeaders)(l.value.headers);return d&&q||p.delete(b.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,y.getCacheControlHeader)(l.cacheControl)),await (0,m.sendResponse)(B,W,new Response(l.value.body,{headers:p,status:l.value.status||200})),null};H?await c(H):await F.withPropagatedContext(e.headers,()=>F.trace(p.BaseServerSpan.handleRequest,{spanName:`${j} ${r}`,kind:s.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},c))}catch(t){if(t instanceof w.NoFallbackError||await N.onRequestError(e,t,{routerKind:"App Router",routePath:k,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:S})},!1,v),q)throw t;return await (0,m.sendResponse)(B,W,new Response(null,{status:500})),null}}e.s(["handler",()=>$,"patchFetch",()=>E,"routeModule",()=>N,"serverHooks",()=>v,"workAsyncStorage",()=>I,"workUnitAsyncStorage",()=>A]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_78393b39._.js.map