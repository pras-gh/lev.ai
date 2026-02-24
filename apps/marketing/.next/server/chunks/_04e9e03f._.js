module.exports=[43536,e=>e.a(async(t,r)=>{try{var a=e.i(66680),n=e.i(89171),o=e.i(14568),s=e.i(40423),i=e.i(59174),d=e.i(33691),c=e.i(34591),u=e.i(49502),l=e.i(15658),p=t([o,s,i,d,c]);function w(e){return e.toLowerCase().replace(/\s+/g," ").trim()}function I(e){if(!e)return null;let t=Number.parseInt(e,10);return Number.isInteger(t)&&t>0?t:null}async function g(e){try{let t=`${e.provider}:${e.jobId}`,r=await e.client.query(`
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
        'integration.sync',
        $2,
        'running',
        NOW(),
        $3::jsonb
      )
      RETURNING id::text
      `,[e.workspaceId,t,JSON.stringify({provider:e.provider,rowCount:e.rowCount,syncMode:"adapter_pull_v1"})]),a=await e.client.query(`
      INSERT INTO ingestion_runs (
        workspace_id,
        provider,
        mode,
        status,
        started_at,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        'adapter_pull_v1',
        'running',
        NOW(),
        $3::jsonb
      )
      RETURNING id::text
      `,[e.workspaceId,e.provider,JSON.stringify({jobId:e.jobId,rowCount:e.rowCount,source:"api.integrations.sync"})]);return{jobRunId:I(r.rows[0]?.id),ingestionRunId:I(a.rows[0]?.id)}}catch(e){return function(e){if(!e||"object"!=typeof e)return;let t=e instanceof Error?e.message.toLowerCase():"",r="code"in e?String(e.code??""):"";"42P01"===r||t.includes('relation "ingestion_runs" does not exist')||t.includes('relation "job_runs" does not exist')||t.includes('relation "event_outbox" does not exist')||t.includes('relation "delivery_attempts" does not exist')}(e),{jobRunId:null,ingestionRunId:null}}}async function y(e){try{e.runIds.ingestionRunId&&await e.client.query(`
        UPDATE ingestion_runs
        SET
          status = 'success',
          finished_at = NOW(),
          rows_fetched = $3,
          rows_inserted = $4,
          rows_deduped = $5,
          metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb
        WHERE id = $1::bigint
          AND workspace_id = $2::uuid
        `,[e.runIds.ingestionRunId,e.workspaceId,e.rowsFetched,e.rowsInserted,e.rowsDeduped,JSON.stringify({provider:e.provider,integrationStatus:e.integrationStatus,completedBy:"api.integrations.sync"})]),e.runIds.jobRunId&&await e.client.query(`
        UPDATE job_runs
        SET
          status = 'success',
          finished_at = NOW(),
          metrics = COALESCE(metrics, '{}'::jsonb) || $3::jsonb
        WHERE id = $1::bigint
          AND workspace_id = $2::uuid
        `,[e.runIds.jobRunId,e.workspaceId,JSON.stringify({provider:e.provider,jobId:e.jobId,rowsFetched:e.rowsFetched,rowsInserted:e.rowsInserted,rowsDeduped:e.rowsDeduped})])}catch{}}async function b(e){try{e.runIds.ingestionRunId&&await e.client.query(`
        UPDATE ingestion_runs
        SET
          status = 'failed',
          finished_at = NOW(),
          error = $3,
          metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
        WHERE id = $1::bigint
          AND workspace_id = $2::uuid
        `,[e.runIds.ingestionRunId,e.workspaceId,e.errorMessage,JSON.stringify({provider:e.provider,jobId:e.jobId})]),e.runIds.jobRunId&&await e.client.query(`
        UPDATE job_runs
        SET
          status = 'failed',
          finished_at = NOW(),
          error = $3,
          metrics = COALESCE(metrics, '{}'::jsonb) || $4::jsonb
        WHERE id = $1::bigint
          AND workspace_id = $2::uuid
        `,[e.runIds.jobRunId,e.workspaceId,e.errorMessage,JSON.stringify({provider:e.provider,jobId:e.jobId})])}catch{}}async function v(e){try{let t=await e.client.query(`
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
        'integration.sync.result',
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
      `,[e.workspaceId,`${e.provider}:${e.jobId}:${e.status}`,JSON.stringify({provider:e.provider,jobId:e.jobId,status:e.status,...e.payload})]);return I(t.rows[0]?.id)}catch{return null}}async function m(e){if(e.outboxId)try{await e.client.query(`
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
      `,[e.workspaceId,e.outboxId,e.channel,e.destination,e.status,e.error??null,JSON.stringify(e.payload)])}catch{}}async function h(e){let t=await e.queryable.query(`
    SELECT last_cursor
    FROM integrations
    WHERE workspace_id = $1::uuid
      AND provider = $2
    LIMIT 1
    `,[e.workspaceId,e.provider]);return t.rows[0]?.last_cursor??null}async function R(e){let t;try{t=await e.json()}catch{return(0,o.badRequest)("Invalid JSON body")}if(!t||"object"!=typeof t)return(0,o.badRequest)("Body must be a JSON object");let r=t;try{var d;let t,p=(0,o.readScopeFromBody)(r),R=(t=[process.env.CONNECTOR_SYNC_KEY,process.env.CRON_SECRET].map(e=>(e??"").trim()).filter(e=>e.length>0),0!==t.length&&[function(e){if(!e)return null;let[t,r]=e.split(/\s+/,2);return t?.toLowerCase()!=="bearer"?null:r?.trim()||null}(e.headers.get("authorization")),e.headers.get("x-connector-sync-key")?.trim()??null,e.nextUrl.searchParams.get("key")?.trim()??null].filter(e=>!!e).some(e=>t.includes(e)))?await (0,o.resolveScope)(p,void 0,{allowWorkspaceAutocreate:!1}):await (0,s.resolveAuthorizedScope)({request:e,scope:p}),E=(0,o.toOptionalText)(r.provider)?.toLowerCase(),_=(0,o.toOptionalPositiveInt)(r.rowCount,"rowCount")??6,f=function(e){if("string"!=typeof e)return"delta";let t=e.trim().toLowerCase();return"initial_backfill"===t||"delta"===t||"webhook_replay"===t?t:"delta"}(r.syncMode??r.mode);if(_<1||_>25)return(0,o.badRequest)("rowCount must be between 1 and 25");if(!E||!(0,l.isIntegrationProviderId)(E))return(0,o.badRequest)(`provider must be one of: ${l.INTEGRATION_PROVIDERS.map(e=>e.id).join(", ")}`);let k=(0,u.getProviderAdapter)(E),S=(0,a.randomUUID)(),N=new Date,C=(0,c.getDbPool)(),O={workspaceId:R.workspaceId,businessId:R.businessId,provider:E},$=await h({queryable:C,workspaceId:R.workspaceId,provider:E}),A={cursor:$,limit:_},T="initial_backfill"===f?await k.backfill(A,O):await k.delta(A,O),x=await k.normalize(T.transactions,O),j=x.length>0?x:T.transactions,D=T.nextCursor,L="whatsapp"===E?["messages:write","contacts:read"]:["transactions:read","balances:read"],U={lastSyncJobId:S,lastSyncTriggeredAt:N.toISOString(),lastSyncStatus:"syncing",mode:"adapter_pull_v1",syncMode:f,providerLabel:(0,l.integrationProviderLabel)(E),previousCursor:$,adapterMetadata:T.metadata??null},P=await C.connect(),q=await (0,i.upsertConnection)({client:P,workspaceId:R.workspaceId,provider:E,status:"syncing",scopes:L,metadata:{source:"api.integrations.sync",syncMode:f,adapter:k.provider}}),F=q.connectionId?await (0,i.startSyncRun)({client:P,workspaceId:R.workspaceId,connectionId:q.connectionId,type:"initial_backfill"===f?"backfill":"delta",stats:{provider:E,rowCount:j.length,jobId:S}}):null;if(!q.connectionId)return P.release(),n.NextResponse.json({error:"Connection model unavailable. Apply latest migrations to enable canonical sync model."},{status:500});let M=await g({client:P,workspaceId:R.workspaceId,provider:E,jobId:S,rowCount:j.length}),H=await (0,i.ensureIntegrationSourceAccount)({client:P,workspaceId:R.workspaceId,businessId:R.businessId,provider:E});if(!H)return await (0,i.finishSyncRun)({client:P,workspaceId:R.workspaceId,syncRunId:F,status:"failed",error:"Unable to resolve provider account"}),P.release(),n.NextResponse.json({error:"Unable to resolve provider account for sync idempotency model"},{status:500});await (0,i.upsertConnectorCursor)({client:P,workspaceId:R.workspaceId,provider:E,stream:"transactions",mode:f,status:"running",lastRunAt:N.toISOString(),metadata:{source:"api.integrations.sync",jobId:S,rowCount:j.length}});try{await P.query("BEGIN"),await P.query(`
        INSERT INTO integrations (
          workspace_id,
          provider,
          status,
          meta,
          backfill_status,
          error_state
        )
        VALUES ($1::uuid, $2, 'syncing', $3::jsonb, $4, NULL)
        ON CONFLICT (workspace_id, provider)
        DO UPDATE
        SET
          status = 'syncing',
          backfill_status = $4,
          error_state = NULL,
          meta = COALESCE(integrations.meta, '{}'::jsonb) || EXCLUDED.meta,
          updated_at = NOW()
        `,[R.workspaceId,E,JSON.stringify(U),"initial_backfill"===f?"running":"completed"]);let e=0;for(let t=0;t<j.length;t+=1){let r=j[t],n=r.externalTxnId,o=(d=[R.workspaceId,E,r.occurredAt,r.direction,r.amount,w(r.description),w(r.counterparty)].join("|"),(0,a.createHash)("sha256").update(d).digest("hex")),s=await (0,i.upsertSourceEvent)({client:P,workspaceId:R.workspaceId,businessId:R.businessId,connectionId:q.connectionId,source:E,accountId:H,externalTxnId:n,eventType:"transaction",payload:{provider:E,jobId:S,rowNumber:t+1,...r}});if(s.existingTransactionId){s.sourceEventId&&await (0,i.finalizeSourceEvent)({client:P,workspaceId:R.workspaceId,sourceEventId:s.sourceEventId,transactionId:s.existingTransactionId,status:"duplicate"});continue}let c=await P.query(`
          INSERT INTO transactions (
            business_id,
            workspace_id,
            account_id,
            external_ref,
            external_id,
            direction,
            amount_minor,
            currency_code,
            occurred_at,
            description,
            counterparty,
            status,
            source,
            source_provider,
            source_external_id,
            account_ref,
            metadata,
            row_hash,
            gst_applicable,
            gst_candidate,
            gst_rate,
            gst_amount
          )
          VALUES (
            $1,
            $2::uuid,
            $3::uuid,
            $4,
            $5,
            $6::txn_type,
            $7::numeric,
            $8::char(3),
            $9::timestamptz,
            $10,
            $11,
            'posted',
            $12,
            $13,
            $14,
            $15,
            $16::jsonb,
            $17,
            $18,
            $19,
            $20::numeric,
            $21::numeric
          )
          ON CONFLICT DO NOTHING
          RETURNING id::text
          `,[R.businessId,R.workspaceId,H,n,n,r.direction,r.amount,r.currencyCode,r.occurredAt,r.description,r.counterparty,E,E,n,H,JSON.stringify({integration:{provider:E,providerLabel:(0,l.integrationProviderLabel)(E),syncMode:"adapter_pull_v1",syncJobId:S,rowNumber:t+1,adapterMetadata:T.metadata??null}}),o,r.gstApplicable,r.gstApplicable,r.gstRate,r.gstAmount]);e+=c.rowCount??0;let u=I(c.rows[0]?.id),p=await (0,i.upsertCanonicalRecord)({client:P,record:{workspaceId:R.workspaceId,businessId:R.businessId,provider:E,entityKind:"transaction",externalId:n,occurredAt:r.occurredAt,direction:r.direction,amount:r.amount,currencyCode:r.currencyCode,description:r.description,counterparty:r.counterparty,rawPayload:{provider:E,jobId:S,rowNumber:t+1,...r,pullMetadata:T.metadata??null},normalizedPayload:{reference:n,direction:r.direction,amount:r.amount,counterparty:r.counterparty,description:r.description},transactionId:u,ingestionRunId:M.ingestionRunId}});s.sourceEventId&&await (0,i.finalizeSourceEvent)({client:P,workspaceId:R.workspaceId,sourceEventId:s.sourceEventId,transactionId:u?BigInt(u):null,canonicalRecordId:p.canonicalId?BigInt(p.canonicalId):null,status:u?"processed":"duplicate"})}let t=Math.max(0,j.length-e),r=new Date().toISOString(),o=D??j[j.length-1]?.externalTxnId??$??`${E}:${S}:${j.length}`,s={lastSyncJobId:S,lastSyncStatus:"success",lastSyncTriggeredAt:N.toISOString(),lastSyncFinishedAt:r,lastSyncRowsInserted:e,lastSyncRowsDeduped:t,mode:"adapter_pull_v1",lastCursor:o,comingSoon:"More providers and live connector auth are coming soon."},c=await P.query(`
        UPDATE integrations
        SET
          status = 'connected',
          last_synced_at = NOW(),
          last_cursor = $3,
          backfill_status = 'completed',
          error_state = NULL,
          meta = COALESCE(meta, '{}'::jsonb) || $4::jsonb,
          updated_at = NOW()
        WHERE workspace_id = $1::uuid
          AND provider = $2
        RETURNING *
        `,[R.workspaceId,E,o,JSON.stringify(s)]);await (0,i.upsertConnection)({client:P,workspaceId:R.workspaceId,provider:E,status:"connected",scopes:L,metadata:{source:"api.integrations.sync",lastCursor:o,lastSyncedAt:r}}),await P.query("COMMIT"),await y({client:P,workspaceId:R.workspaceId,provider:E,jobId:S,runIds:M,rowsFetched:j.length,rowsInserted:e,rowsDeduped:t,integrationStatus:"connected"});let u=await v({client:P,workspaceId:R.workspaceId,provider:E,jobId:S,status:"success",payload:{rowsFetched:j.length,rowsInserted:e,rowsDeduped:t,finishedAt:r}});await m({client:P,workspaceId:R.workspaceId,outboxId:u,channel:"dashboard",destination:E,status:"success",payload:{kind:"integration.sync",provider:E,rowsInserted:e,rowsDeduped:t}});let p=(0,i.nextDeltaRunAt)(1),g=await (0,i.upsertConnectorCursor)({client:P,workspaceId:R.workspaceId,provider:E,stream:"transactions",mode:"delta",status:"idle",cursor:o,lastRunAt:r,nextRunAt:p,metadata:{source:"api.integrations.sync",completedBy:"adapter_pull_v1",rowsFetched:j.length,rowsInserted:e,rowsDeduped:t}}),b=await (0,i.runLedgerPipelinePostIngest)({workspaceId:R.workspaceId,businessId:R.businessId,runRules:!0,runAlerts:!0,sendWhatsAppDigest:!1}),h=await (0,i.enqueueNotificationOutbox)({client:P,workspaceId:R.workspaceId,eventType:"ledger.pipeline.completed",dedupeKey:`${E}:${S}:ledger_pipeline`,payload:{provider:E,jobId:S,workspaceId:R.workspaceId,businessId:R.businessId,rowsInserted:e,rowsDeduped:t,pipeline:b,nextDeltaAt:p}});return await (0,i.finishSyncRun)({client:P,workspaceId:R.workspaceId,syncRunId:F,status:"success",stats:{provider:E,rowsFetched:j.length,rowsInserted:e,rowsDeduped:t,nextCursor:o,nextDeltaAt:p,jobId:S}}),n.NextResponse.json({message:"Integration synced",job:{id:S,provider:E,status:"success",rowsFetched:j.length,rowsInserted:e,rowsDeduped:t},controlPlane:{jobRunId:M.jobRunId,ingestionRunId:M.ingestionRunId,outboxId:u,ledgerOutboxId:h,cursorId:g.cursorId},pipeline:b,integration:c.rows[0]??null})}catch(r){await P.query("ROLLBACK");let e=r instanceof Error?r.message:"Failed to run integration adapter sync";try{await P.query(`
          INSERT INTO integrations (
            workspace_id,
            provider,
            status,
            meta,
            backfill_status,
            error_state
          )
          VALUES ($1::uuid, $2, 'error', $3::jsonb, 'failed', $4)
          ON CONFLICT (workspace_id, provider)
          DO UPDATE
          SET
            status = 'error',
            backfill_status = 'failed',
            error_state = $4,
            meta = COALESCE(integrations.meta, '{}'::jsonb) || EXCLUDED.meta,
            updated_at = NOW()
          `,[R.workspaceId,E,JSON.stringify({lastSyncJobId:S,lastSyncStatus:"error",lastSyncTriggeredAt:N.toISOString(),error:e}),e])}catch{}await (0,i.upsertConnection)({client:P,workspaceId:R.workspaceId,provider:E,status:"error",scopes:L,metadata:{source:"api.integrations.sync",error:e,failedAt:new Date().toISOString()}}),await b({client:P,workspaceId:R.workspaceId,provider:E,jobId:S,runIds:M,errorMessage:e});let t=await v({client:P,workspaceId:R.workspaceId,provider:E,jobId:S,status:"failed",payload:{rowsFetched:j.length,error:e}});throw await m({client:P,workspaceId:R.workspaceId,outboxId:t,channel:"dashboard",destination:E,status:"failed",error:e,payload:{kind:"integration.sync",provider:E,error:e}}),await (0,i.upsertConnectorCursor)({client:P,workspaceId:R.workspaceId,provider:E,stream:"transactions",mode:f,status:"error",lastRunAt:N.toISOString(),nextRunAt:(0,i.nextDeltaRunAt)(1),error:e,metadata:{source:"api.integrations.sync",jobId:S}}),await (0,i.finishSyncRun)({client:P,workspaceId:R.workspaceId,syncRunId:F,status:"failed",error:e,stats:{provider:E,rowsFetched:j.length,jobId:S}}),r}finally{P.release()}}catch(a){let e=a instanceof Error?a.message:"Failed to trigger integration sync",t=(0,s.getAuthErrorStatus)(a);if(t)return n.NextResponse.json({error:e},{status:t});let r=e.includes("Provide at least one scope identifier")||e.includes("not found")||e.includes("must be")?400:500;return n.NextResponse.json({error:e},{status:r})}}[o,s,i,d,c]=p.then?(await p)():p,e.s(["POST",()=>R,"dynamic",0,"force-dynamic","runtime",0,"nodejs"]),r()}catch(e){r(e)}},!1),50864,e=>e.a(async(t,r)=>{try{var a=e.i(47909),n=e.i(74017),o=e.i(96250),s=e.i(59756),i=e.i(61916),d=e.i(74677),c=e.i(69741),u=e.i(16795),l=e.i(87718),p=e.i(95169),w=e.i(47587),I=e.i(66012),g=e.i(70101),y=e.i(26937),b=e.i(10372),v=e.i(93695);e.i(52474);var m=e.i(220),h=e.i(43536),R=t([h]);[h]=R.then?(await R)():R;let f=new a.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/integrations/sync/route",pathname:"/api/integrations/sync",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/apps/marketing/src/app/api/integrations/sync/route.ts",nextConfigOutput:"",userland:h}),{workAsyncStorage:k,workUnitAsyncStorage:S,serverHooks:N}=f;function E(){return(0,o.patchFetch)({workAsyncStorage:k,workUnitAsyncStorage:S})}async function _(e,t,r){f.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let a="/api/integrations/sync/route";a=a.replace(/\/index$/,"")||"/";let o=await f.prepare(e,t,{srcPage:a,multiZoneDraftMode:!1});if(!o)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:h,params:R,nextConfig:E,parsedUrl:_,isDraftMode:k,prerenderManifest:S,routerServerContext:N,isOnDemandRevalidate:C,revalidateOnlyGenerated:O,resolvedPathname:$,clientReferenceManifest:A,serverActionsManifest:T}=o,x=(0,c.normalizeAppPath)(a),j=!!(S.dynamicRoutes[x]||S.routes[$]),D=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,_,!1):t.end("This page could not be found"),null);if(j&&!k){let e=!!S.routes[$],t=S.dynamicRoutes[x];if(t&&!1===t.fallback&&!e){if(E.experimental.adapterPath)return await D();throw new v.NoFallbackError}}let L=null;!j||f.isDev||k||(L=$,L="/index"===L?"/":L);let U=!0===f.isDev||!j,P=j&&!U;T&&A&&(0,d.setManifestsSingleton)({page:a,clientReferenceManifest:A,serverActionsManifest:T});let q=e.method||"GET",F=(0,i.getTracer)(),M=F.getActiveScopeSpan(),H={params:R,prerenderManifest:S,renderOpts:{experimental:{authInterrupts:!!E.experimental.authInterrupts},cacheComponents:!!E.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:E.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>f.onRequestError(e,t,a,n,N)},sharedContext:{buildId:h}},W=new u.NodeNextRequest(e),J=new u.NodeNextResponse(t),B=l.NextRequestAdapter.fromNodeNextRequest(W,(0,l.signalFromNodeResponse)(t));try{let o=async e=>f.handle(B,H).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=F.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${q} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${q} ${a}`)}),d=!!(0,s.getRequestMeta)(e,"minimalMode"),c=async s=>{var i,c;let u=async({previousCacheEntry:n})=>{try{if(!d&&C&&O&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await o(s);e.fetchMetrics=H.renderOpts.fetchMetrics;let i=H.renderOpts.pendingWaitUntil;i&&r.waitUntil&&(r.waitUntil(i),i=void 0);let c=H.renderOpts.collectedTags;if(!j)return await (0,I.sendResponse)(W,J,a,H.renderOpts.pendingWaitUntil),null;{let e=await a.blob(),t=(0,g.toNodeOutgoingHttpHeaders)(a.headers);c&&(t[b.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==H.renderOpts.collectedRevalidate&&!(H.renderOpts.collectedRevalidate>=b.INFINITE_CACHE)&&H.renderOpts.collectedRevalidate,n=void 0===H.renderOpts.collectedExpire||H.renderOpts.collectedExpire>=b.INFINITE_CACHE?void 0:H.renderOpts.collectedExpire;return{value:{kind:m.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==n?void 0:n.isStale)&&await f.onRequestError(e,t,{routerKind:"App Router",routePath:a,routeType:"route",revalidateReason:(0,w.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:C})},!1,N),t}},l=await f.handleResponse({req:e,nextConfig:E,cacheKey:L,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:S,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:O,responseGenerator:u,waitUntil:r.waitUntil,isMinimalMode:d});if(!j)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==m.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(c=l.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});d||t.setHeader("x-nextjs-cache",C?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),k&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,g.fromNodeOutgoingHttpHeaders)(l.value.headers);return d&&j||p.delete(b.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,y.getCacheControlHeader)(l.cacheControl)),await (0,I.sendResponse)(W,J,new Response(l.value.body,{headers:p,status:l.value.status||200})),null};M?await c(M):await F.withPropagatedContext(e.headers,()=>F.trace(p.BaseServerSpan.handleRequest,{spanName:`${q} ${a}`,kind:i.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},c))}catch(t){if(t instanceof v.NoFallbackError||await f.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,w.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:C})},!1,N),j)throw t;return await (0,I.sendResponse)(W,J,new Response(null,{status:500})),null}}e.s(["handler",()=>_,"patchFetch",()=>E,"routeModule",()=>f,"serverHooks",()=>N,"workAsyncStorage",()=>k,"workUnitAsyncStorage",()=>S]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=_04e9e03f._.js.map