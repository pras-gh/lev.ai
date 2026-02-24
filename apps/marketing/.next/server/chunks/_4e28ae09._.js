module.exports=[12473,e=>e.a(async(t,r)=>{try{var a=e.i(89171),n=e.i(14568),s=e.i(40423),i=e.i(33691),o=e.i(34591),u=e.i(79750),c=t([n,s,i,o,u]);[n,s,i,o,u]=c.then?(await c)():c;let f=new Set(["pending","posted","reversed"]),g=new Set(["bank","upi","razorpay","stripe","hdfc","icici","gpay","tally","whatsapp","zohobooks","manual","csv_import","csv_proof","reversal","import"]),E=new Set(["unmatched","itc_mismatch","gst_due"]),y=new Set(["all","unmatched","needs_review"]);function l(e){return e?e.split(",").map(e=>e.trim().toLowerCase()).filter(Boolean):[]}function d(e,t,r){let a=e.get(r);if(null!==a)return a.trim();if(!t)return"";let n=t[r];return"string"==typeof n?n.trim():"number"==typeof n||"bigint"==typeof n?String(n):""}function p(e,t,r){var a;let n=e.get(r);return null!==n?l(n):t?(a=t[r])?Array.isArray(a)?a.map(e=>String(e).trim().toLowerCase()).filter(Boolean):"string"==typeof a?l(a):[]:[]:[]}async function h(e){let t;try{t=await e.json()}catch{return(0,n.badRequest)("Invalid JSON body")}if(!t||"object"!=typeof t)return(0,n.badRequest)("Body must be a JSON object");try{let r=t,i=await (0,s.resolveAuthorizedScope)({request:e,scope:(0,n.readScopeFromBody)(r)}),o=await (0,u.insertTransaction)({...r,businessId:i.businessId});return a.NextResponse.json({transaction:o},{status:201})}catch(n){let e=n instanceof Error?n.message:"Failed to insert transaction",t=(0,s.getAuthErrorStatus)(n);if(t)return a.NextResponse.json({error:e},{status:t});let r=e.includes("must be")||e.includes("Invalid")||e.includes("Cannot")||e.includes("violates")||e.includes("Provide at least one scope identifier")||e.includes("not found")?400:500;return a.NextResponse.json({error:e},{status:r})}}async function m(e){let t=e.nextUrl.searchParams;try{var r;let i,u,c,l=function(e){if(!e)return null;try{let t=JSON.parse(e);if(!t||"object"!=typeof t||Array.isArray(t))throw Error("filters must be a JSON object");return t}catch{throw Error("filters must be valid JSON")}}(t.get("filters")),h=(0,n.readScopeFromSearchParams)(t),m={workspaceId:h.workspaceId??("string"==typeof l?.workspaceId?l.workspaceId:void 0),businessId:h.businessId??function(e){if(null!=e&&""!==e)return(0,n.toPositiveInt)(e,"businessId")}(l?.businessId)},R=await (0,s.resolveAuthorizedScope)({request:e,scope:m}),_=t.has("cursor")||t.has("filters"),w=function(e,t,r){let a=e.get(r);if(null!==a)return(0,n.parseBooleanQuery)(a);if(!t)return;let s=t[r];if("boolean"==typeof s)return s;if("string"==typeof s){if("true"===s)return!0;if("false"===s)return!1}}(t,l,"includeDeleted")??!1,b=d(t,l,"from"),v=d(t,l,"to"),S=d(t,l,"q"),A=d(t,l,"category"),N=d(t,l,"preset").toLowerCase(),x=(d(t,l,"recon")||"all").toLowerCase(),C=function(e){if(!e)return[];if("string"==typeof e){if(!e)return[];let t=e.split(",").map(e=>e.trim()).filter(Boolean).map(e=>Number.parseInt(e,10));if(0===t.length)return[];if(t.some(e=>!Number.isInteger(e)||e<=0))throw Error("ids must be a comma-separated list of positive integers");if(t.length>500)throw Error("ids cannot contain more than 500 transaction ids");return[...new Set(t)]}if(!Array.isArray(e))return[];let t=e.map(e=>Number.parseInt(String(e),10)).filter(e=>Number.isInteger(e)&&e>0);if(t.length>500)throw Error("ids cannot contain more than 500 transaction ids");return[...new Set(t)]}(t.get("ids")??l?.ids??l?.transactionIds),I=p(t,l,"status"),O=p(t,l,"source");if(b&&Number.isNaN(Date.parse(b)))return(0,n.badRequest)("from must be a valid date or ISO timestamp");if(v&&Number.isNaN(Date.parse(v)))return(0,n.badRequest)("to must be a valid date or ISO timestamp");if(I.some(e=>!f.has(e)))return(0,n.badRequest)("status must only include: pending, posted, reversed");if(O.some(e=>!g.has(e)))return(0,n.badRequest)("source must only include: bank, upi, razorpay, stripe, hdfc, icici, gpay, tally, whatsapp, zohobooks, manual, csv_import, csv_proof, reversal, import");if(N&&!E.has(N))return(0,n.badRequest)("preset must be one of: unmatched, itc_mismatch, gst_due");if(!y.has(x))return(0,n.badRequest)("recon must be one of: all, unmatched, needs_review");let $=(r={workspaceId:R.workspaceId,includeDeleted:w,from:b,to:v,q:S,category:A,statusFilter:I,sourceFilter:O,transactionIds:C,preset:N,recon:x},i=["t.workspace_id = $1::uuid"],u=[r.workspaceId],c=2,r.includeDeleted||i.push("t.is_hidden = FALSE"),r.from&&(u.push(r.from),i.push(`t.occurred_at >= $${c}::timestamptz`),c+=1),r.to&&(u.push(r.to),i.push(`t.occurred_at < ($${c}::date + INTERVAL '1 day')`),c+=1),r.q&&(u.push(`%${r.q}%`),i.push(`(COALESCE(t.description, '') ILIKE $${c} OR COALESCE(t.counterparty, '') ILIKE $${c} OR COALESCE(t.external_ref, '') ILIKE $${c})`),c+=1),r.statusFilter.length>0&&(u.push(r.statusFilter),i.push(`t.status::text = ANY($${c}::text[])`),c+=1),r.sourceFilter.length>0&&(u.push(r.sourceFilter),i.push(`t.source = ANY($${c}::text[])`),c+=1),r.category&&(/^\d+$/.test(r.category)?(u.push(Number(r.category)),i.push(`t.category_id = $${c}`)):(u.push(`%${r.category}%`),i.push(`COALESCE(c.name, '') ILIKE $${c}`)),c+=1),r.transactionIds.length>0&&(u.push(r.transactionIds),i.push(`t.id = ANY($${c}::bigint[])`),c+=1),"unmatched"===r.preset&&i.push("t.matched = FALSE"),"gst_due"===r.preset&&i.push("t.gst_applicable = TRUE"),"itc_mismatch"===r.preset&&i.push(`
      EXISTS (
        SELECT 1
        FROM alerts a
        WHERE a.workspace_id = t.workspace_id
          AND a.type = 'itc_mismatch'
          AND a.status = 'open'
          AND (
            a.transaction_id = t.id
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(COALESCE(a.related_transaction_ids, '[]'::jsonb)) related(value)
              WHERE related.value::bigint = t.id
            )
          )
      )
    `),"unmatched"===r.recon&&i.push("t.matched = FALSE"),"needs_review"===r.recon&&(i.push("t.matched = FALSE"),i.push("t.confidence IS NOT NULL"),i.push("t.confidence >= 0.60"),i.push("t.confidence < 0.95")),{whereClause:`WHERE ${i.join(" AND ")}`,values:u,index:c}),T=(0,o.getDbPool)();if(_){let e=function(e){let t=e.searchParams.get("limit");if(null!==t)return(0,n.toPositiveInt)(t,"limit");let r=e.filters?.limit;return null==r||""===r?null:(0,n.toPositiveInt)(r,"limit")}({searchParams:t,filters:l})??50;if(e>200)return(0,n.badRequest)("limit cannot be greater than 200");let r=function(e){if(!e)return null;let[t,r]=decodeURIComponent(e).split("|",2);if(!t||!r)throw Error("cursor must be in format <isoDate>|<id>");if(Number.isNaN(Date.parse(t)))throw Error("cursor date is invalid");let a=Number.parseInt(r,10);if(!Number.isInteger(a)||a<=0)throw Error("cursor id is invalid");return{occurredAt:t,id:a}}(t.get("cursor")),s=[],i=[...$.values],o=$.index;r&&(i.push(r.occurredAt,r.id),s.push(`(t.occurred_at < $${o}::timestamptz OR (t.occurred_at = $${o}::timestamptz AND t.id < $${o+1}::bigint))`),o+=2),i.push(e+1);let u=s.length>0?`${$.whereClause} AND ${s.join(" AND ")}`:$.whereClause,c=await T.query(`
        SELECT
          t.id,
          t.public_id,
          t.workspace_id::text,
          t.business_id,
          t.occurred_at,
          t.description,
          t.counterparty,
          t.external_ref,
          t.direction::text AS direction,
          t.status::text AS status,
          t.amount_minor::text AS amount,
          t.currency_code,
          t.source,
          t.category_id,
          c.name AS category_name,
          c.type AS category_type,
          t.gst_applicable,
          t.gst_rate::text,
          t.gst_amount::text,
          t.matched,
          t.match_group_id::text,
          t.confidence::text,
          t.metadata,
          t.is_hidden,
          t.created_at,
          t.updated_at
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        ${u}
        ORDER BY t.occurred_at DESC, t.id DESC
        LIMIT $${o}
        `,i),d=c.rows.length>e,p=d?c.rows.slice(0,e):c.rows,h=p[p.length-1],m=d&&h?`${new Date(h.occurred_at).toISOString()}|${h.id}`:null;return a.NextResponse.json({count:p.length,limit:e,hasMore:d,nextCursor:m,appliedPreset:N||null,appliedRecon:x,transactions:p})}let{page:P,pageSize:L}=(0,n.parsePagination)(t),D=(P-1)*L,k=await T.query(`
      SELECT COUNT(*)::text AS total
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      ${$.whereClause}
      `,$.values),q=[...$.values,L,D],F=await T.query(`
      SELECT
        t.id,
        t.public_id,
        t.workspace_id::text,
        t.business_id,
        t.occurred_at,
        t.description,
        t.counterparty,
        t.external_ref,
        t.direction::text AS direction,
        t.status::text AS status,
        t.amount_minor::text AS amount,
        t.currency_code,
        t.source,
        t.category_id,
        c.name AS category_name,
        c.type AS category_type,
        t.gst_applicable,
        t.gst_rate::text,
        t.gst_amount::text,
        t.matched,
        t.match_group_id::text,
        t.confidence::text,
        t.metadata,
        t.is_hidden,
        t.created_at,
        t.updated_at
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      ${$.whereClause}
      ORDER BY t.occurred_at DESC, t.id DESC
      LIMIT $${$.index}
      OFFSET $${$.index+1}
      `,q),j=Number(k.rows[0]?.total??"0");return a.NextResponse.json({page:P,pageSize:L,total:j,totalPages:0===j?0:Math.ceil(j/L),count:F.rows.length,appliedPreset:N||null,appliedRecon:x,transactions:F.rows})}catch(n){let e=n instanceof Error?n.message:"Failed to query transactions",t=(0,s.getAuthErrorStatus)(n);if(t)return a.NextResponse.json({error:e},{status:t});let r=e.includes("must be")||e.includes("Boolean")||e.includes("Provide at least one scope identifier")||e.includes("not found")||e.includes("ids ")?400:500;return a.NextResponse.json({error:e},{status:r})}}e.s(["GET",()=>m,"POST",()=>h,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),r()}catch(e){r(e)}},!1),62414,e=>e.a(async(t,r)=>{try{var a=e.i(47909),n=e.i(74017),s=e.i(96250),i=e.i(59756),o=e.i(61916),u=e.i(74677),c=e.i(69741),l=e.i(16795),d=e.i(87718),p=e.i(95169),h=e.i(47587),m=e.i(66012),f=e.i(70101),g=e.i(26937),E=e.i(10372),y=e.i(93695);e.i(52474);var R=e.i(220),_=e.i(12473),w=t([_]);[_]=w.then?(await w)():w;let S=new a.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/transactions/route",pathname:"/api/transactions",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/transactions/route.ts",nextConfigOutput:"",userland:_}),{workAsyncStorage:A,workUnitAsyncStorage:N,serverHooks:x}=S;function b(){return(0,s.patchFetch)({workAsyncStorage:A,workUnitAsyncStorage:N})}async function v(e,t,r){S.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let a="/api/transactions/route";a=a.replace(/\/index$/,"")||"/";let s=await S.prepare(e,t,{srcPage:a,multiZoneDraftMode:!1});if(!s)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:_,params:w,nextConfig:b,parsedUrl:v,isDraftMode:A,prerenderManifest:N,routerServerContext:x,isOnDemandRevalidate:C,revalidateOnlyGenerated:I,resolvedPathname:O,clientReferenceManifest:$,serverActionsManifest:T}=s,P=(0,c.normalizeAppPath)(a),L=!!(N.dynamicRoutes[P]||N.routes[O]),D=async()=>((null==x?void 0:x.render404)?await x.render404(e,t,v,!1):t.end("This page could not be found"),null);if(L&&!A){let e=!!N.routes[O],t=N.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(b.experimental.adapterPath)return await D();throw new y.NoFallbackError}}let k=null;!L||S.isDev||A||(k=O,k="/index"===k?"/":k);let q=!0===S.isDev||!L,F=L&&!q;T&&$&&(0,u.setManifestsSingleton)({page:a,clientReferenceManifest:$,serverActionsManifest:T});let j=e.method||"GET",U=(0,o.getTracer)(),H=U.getActiveScopeSpan(),M={params:w,prerenderManifest:N,renderOpts:{experimental:{authInterrupts:!!b.experimental.authInterrupts},cacheComponents:!!b.cacheComponents,supportsDynamicResponse:q,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:b.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>S.onRequestError(e,t,a,n,x)},sharedContext:{buildId:_}},B=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),z=d.NextRequestAdapter.fromNodeNextRequest(B,(0,d.signalFromNodeResponse)(t));try{let s=async e=>S.handle(z,M).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=U.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${j} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${j} ${a}`)}),u=!!(0,i.getRequestMeta)(e,"minimalMode"),c=async i=>{var o,c;let l=async({previousCacheEntry:n})=>{try{if(!u&&C&&I&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await s(i);e.fetchMetrics=M.renderOpts.fetchMetrics;let o=M.renderOpts.pendingWaitUntil;o&&r.waitUntil&&(r.waitUntil(o),o=void 0);let c=M.renderOpts.collectedTags;if(!L)return await (0,m.sendResponse)(B,K,a,M.renderOpts.pendingWaitUntil),null;{let e=await a.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(a.headers);c&&(t[E.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,n=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await S.onRequestError(e,t,{routerKind:"App Router",routePath:a,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:F,isOnDemandRevalidate:C})},!1,x),t}},d=await S.handleResponse({req:e,nextConfig:b,cacheKey:k,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:I,responseGenerator:l,waitUntil:r.waitUntil,isMinimalMode:u});if(!L)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(c=d.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});u||t.setHeader("x-nextjs-cache",C?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,f.fromNodeOutgoingHttpHeaders)(d.value.headers);return u&&L||p.delete(E.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,g.getCacheControlHeader)(d.cacheControl)),await (0,m.sendResponse)(B,K,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};H?await c(H):await U.withPropagatedContext(e.headers,()=>U.trace(p.BaseServerSpan.handleRequest,{spanName:`${j} ${a}`,kind:o.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},c))}catch(t){if(t instanceof y.NoFallbackError||await S.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,h.getRevalidateReason)({isStaticGeneration:F,isOnDemandRevalidate:C})},!1,x),L)throw t;return await (0,m.sendResponse)(B,K,new Response(null,{status:500})),null}}e.s(["handler",()=>v,"patchFetch",()=>b,"routeModule",()=>S,"serverHooks",()=>x,"workAsyncStorage",()=>A,"workUnitAsyncStorage",()=>N]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=_4e28ae09._.js.map