module.exports=[15658,t=>{"use strict";let e=[{id:"hdfc",label:"HDFC Bank",kind:"bank",blurb:"Bank statements and balance snapshots"},{id:"icici",label:"ICICI Bank",kind:"bank",blurb:"Bank account feeds for credits and debits"},{id:"razorpay",label:"Razorpay",kind:"payments",blurb:"Settlements, fees, and payout events"},{id:"gpay",label:"Google Pay",kind:"payments",blurb:"UPI transaction stream"},{id:"stripe",label:"Stripe",kind:"payments",blurb:"Payout and charge activity"},{id:"tally",label:"Tally",kind:"erp",blurb:"Ledger sync and posting bridge"},{id:"whatsapp",label:"WhatsApp",kind:"messaging",blurb:"Customer payment notification hooks"},{id:"zohobooks",label:"Zoho Books",kind:"erp",blurb:"Books sync for vouchers and invoices"}],r=new Set(e.map(t=>t.id));function n(t){return r.has(t)}function i(t){let r=e.find(e=>e.id===t);return r?.label??t.toUpperCase()}t.s(["INTEGRATION_PROVIDERS",0,e,"integrationProviderLabel",()=>i,"isIntegrationProviderId",()=>n])},59174,t=>t.a(async(e,r)=>{try{var n=t.i(66680),i=t.i(85635),o=t.i(33691),a=t.i(34591),s=t.i(15658),c=t.i(91268),d=e([i,o,a,c]);function u(t){if(!t)return null;let e=Number.parseInt(t,10);return Number.isInteger(e)&&e>0?e:null}function l(t){if(!t)return null;if(t instanceof Date)return Number.isNaN(t.getTime())?null:t.toISOString();let e=new Date(t);return Number.isNaN(e.getTime())?null:e.toISOString()}function p(t){return t&&"object"==typeof t&&!Array.isArray(t)?t:{}}function y(t){if(!t||"object"!=typeof t)return!1;let e="code"in t?String(t.code??""):"";if("42P01"===e)return!0;let r=t instanceof Error?t.message.toLowerCase():"";return r.includes('relation "connector_tokens" does not exist')||r.includes('relation "connections" does not exist')||r.includes('relation "sync_runs" does not exist')||r.includes('relation "connector_sync_cursors" does not exist')||r.includes('relation "connector_webhook_events" does not exist')||r.includes('relation "source_events" does not exist')||r.includes('relation "canonical_records" does not exist')}async function m(t){var e;let r,i=(e=t.token,(0,n.createHash)("sha256").update(e).digest("hex")),o=(r=t.token.trim()).length<=6?"••••••":`${r.slice(0,4)}••••${r.slice(-2)}`,s=t.client??(0,a.getDbPool)();try{let e=await s.query(`
      INSERT INTO connector_tokens (
        workspace_id,
        provider,
        token_hash,
        token_hint,
        token_ciphertext,
        scopes,
        status,
        expires_at,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        'active',
        $7::timestamptz,
        $8::jsonb
      )
      ON CONFLICT (workspace_id, provider, token_hash)
      DO UPDATE
      SET
        status = 'active',
        token_hint = EXCLUDED.token_hint,
        expires_at = EXCLUDED.expires_at,
        metadata = COALESCE(connector_tokens.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,[t.workspaceId,t.provider,i,o,t.token,JSON.stringify(t.scopes??[]),l(t.expiresAt),JSON.stringify(t.metadata??{})]);return{stored:!0,tokenHash:i,tokenHint:o,tokenId:u(e.rows[0]?.id)}}catch(t){if(y(t))return{stored:!1,tokenHash:i,tokenHint:o,tokenId:null};throw t}}async function g(t){let e=t.client??(0,a.getDbPool)();try{let r=await e.query(`
      INSERT INTO connections (
        workspace_id,
        provider,
        status,
        scopes,
        secrets_ref,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4::jsonb,
        $5,
        $6::jsonb
      )
      ON CONFLICT (workspace_id, provider)
      DO UPDATE
      SET
        status = EXCLUDED.status,
        scopes = EXCLUDED.scopes,
        secrets_ref = COALESCE(EXCLUDED.secrets_ref, connections.secrets_ref),
        metadata = COALESCE(connections.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,[t.workspaceId,t.provider,t.status,JSON.stringify(t.scopes??[]),t.secretsRef??null,JSON.stringify(t.metadata??{})]);return{stored:!0,connectionId:r.rows[0]?.id??null}}catch(t){if(y(t))return{stored:!1,connectionId:null};throw t}}async function _(t){let e=t.client??(0,a.getDbPool)();try{let r=await e.query(`
      INSERT INTO sync_runs (
        workspace_id,
        connection_id,
        type,
        started_at,
        status,
        stats_json
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        NOW(),
        'running',
        $4::jsonb
      )
      RETURNING id::text
      `,[t.workspaceId,t.connectionId,t.type,JSON.stringify(t.stats??{})]);return u(r.rows[0]?.id)}catch(t){if(y(t))return null;throw t}}async function b(t){if(!t.syncRunId)return;let e=t.client??(0,a.getDbPool)();try{await e.query(`
      UPDATE sync_runs
      SET
        status = $3,
        finished_at = NOW(),
        error = $4,
        stats_json = COALESCE(stats_json, '{}'::jsonb) || $5::jsonb,
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[t.syncRunId,t.workspaceId,t.status,t.error??null,JSON.stringify(t.stats??{})])}catch(t){if(y(t))return;throw t}}async function E(t){let e=t.client??(0,a.getDbPool)();try{var r;let n,i=await e.query(`
      SELECT a.id::text
      FROM accounts a
      LEFT JOIN integrations i ON i.id = a.integration_id
      WHERE a.workspace_id = $1::uuid
        AND (
          i.provider = $2
          OR (a.metadata->>'provider') = $2
        )
      ORDER BY a.created_at ASC
      LIMIT 1
      `,[t.workspaceId,t.provider]);if(i.rows[0]?.id)return i.rows[0].id;let o=await e.query(`
      INSERT INTO accounts (
        workspace_id,
        business_id,
        integration_id,
        account_type,
        name,
        currency_code,
        is_active,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        (
          SELECT id
          FROM integrations
          WHERE workspace_id = $1::uuid
            AND provider = $3
          LIMIT 1
        ),
        $4,
        $5,
        'INR',
        TRUE,
        $6::jsonb
      )
      RETURNING id::text
      `,[t.workspaceId,t.businessId,t.provider,(r=t.provider,!(n=s.INTEGRATION_PROVIDERS.find(t=>t.id===r))?"other":"bank"===n.kind?"bank":"payments"===n.kind?"wallet":"other"),`${(0,s.integrationProviderLabel)(t.provider)} Primary`,JSON.stringify({provider:t.provider,createdBy:"connector_sync_engine"})]);return o.rows[0]?.id??null}catch(t){if(y(t))return null;throw t}}async function I(t){let e=t.client??(0,a.getDbPool)();try{let r=await e.query(`
      INSERT INTO source_events (
        workspace_id,
        business_id,
        connection_id,
        source,
        account_id,
        external_id,
        external_txn_id,
        event_type,
        status,
        payload,
        payload_json,
        received_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3::uuid,
        $4,
        $5::uuid,
        $6,
        $6,
        $7,
        'received',
        $8::jsonb,
        $8::jsonb,
        NOW()
      )
      ON CONFLICT (connection_id, external_id)
      DO UPDATE
      SET
        last_seen_at = NOW(),
        seen_count = source_events.seen_count + 1,
        payload = EXCLUDED.payload,
        payload_json = EXCLUDED.payload_json,
        event_type = EXCLUDED.event_type,
        updated_at = NOW()
      RETURNING id::text, transaction_id::text
      `,[t.workspaceId,t.businessId,t.connectionId,t.source,t.accountId,t.externalTxnId,t.eventType??"transaction",JSON.stringify(t.payload??{})]);return{stored:!0,sourceEventId:u(r.rows[0]?.id),existingTransactionId:function(t){if(!t)return null;try{let e=BigInt(t);return e>0n?e:null}catch{return null}}(r.rows[0]?.transaction_id)}}catch(t){if(y(t))return{stored:!1,sourceEventId:null,existingTransactionId:null};throw t}}async function f(t){let e=t.client??(0,a.getDbPool)();try{await e.query(`
      UPDATE source_events
      SET
        transaction_id = COALESCE($3::bigint, transaction_id),
        canonical_record_id = COALESCE($4::bigint, canonical_record_id),
        status = $5,
        error = $6,
        last_seen_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[t.sourceEventId,t.workspaceId,t.transactionId?t.transactionId.toString():null,t.canonicalRecordId?t.canonicalRecordId.toString():null,t.status,t.error??null])}catch(t){if(y(t))return;throw t}}async function h(t){let e=t.client??(0,a.getDbPool)();try{let r=await e.query(`
      INSERT INTO connector_sync_cursors (
        workspace_id,
        provider,
        stream,
        cursor,
        sync_mode,
        status,
        last_run_at,
        next_run_at,
        error,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::timestamptz,
        $8::timestamptz,
        $9,
        $10::jsonb
      )
      ON CONFLICT (workspace_id, provider, stream)
      DO UPDATE
      SET
        cursor = EXCLUDED.cursor,
        sync_mode = EXCLUDED.sync_mode,
        status = EXCLUDED.status,
        last_run_at = COALESCE(EXCLUDED.last_run_at, connector_sync_cursors.last_run_at),
        next_run_at = COALESCE(EXCLUDED.next_run_at, connector_sync_cursors.next_run_at),
        error = EXCLUDED.error,
        metadata = COALESCE(connector_sync_cursors.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,[t.workspaceId,t.provider,t.stream??"transactions",t.cursor??null,t.mode??"delta",t.status??"idle",l(t.lastRunAt),l(t.nextRunAt),t.error??null,JSON.stringify(t.metadata??{})]);return{stored:!0,cursorId:u(r.rows[0]?.id)}}catch(t){if(y(t))return{stored:!1,cursorId:null};throw t}}async function N(t){let e=t.client??(0,a.getDbPool)();try{let r=await e.query(`
      INSERT INTO connector_webhook_events (
        workspace_id,
        provider,
        event_id,
        event_type,
        status,
        occurred_at,
        payload,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        'received',
        $5::timestamptz,
        $6::jsonb,
        $7::jsonb
      )
      ON CONFLICT (workspace_id, provider, event_id)
      DO NOTHING
      RETURNING id::text
      `,[t.workspaceId,t.provider,t.eventId,t.eventType,l(t.occurredAt),JSON.stringify(t.payload),JSON.stringify(t.metadata??{})]),n=u(r.rows[0]?.id);return{accepted:!0,duplicate:null===n,webhookEventId:n}}catch(t){if(y(t))return{accepted:!1,duplicate:!1,webhookEventId:null};throw t}}async function v(t){let e=t.client??(0,a.getDbPool)();try{await e.query(`
      UPDATE connector_webhook_events
      SET
        status = $3,
        processed_at = CASE WHEN $3 IN ('processed', 'ignored') THEN NOW() ELSE processed_at END,
        error = $4,
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[t.webhookEventId,t.workspaceId,t.status,t.error??null])}catch(t){if(y(t))return;throw t}}async function w(t){let e=t.client??(0,a.getDbPool)(),r=t.record;try{let t=await e.query(`
      INSERT INTO canonical_records (
        workspace_id,
        business_id,
        provider,
        entity_kind,
        external_id,
        occurred_at,
        direction,
        amount_minor,
        currency_code,
        description,
        counterparty,
        raw_payload,
        normalized_payload,
        transaction_id,
        ingestion_run_id
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6::timestamptz,
        $7::txn_type,
        $8::numeric,
        $9::char(3),
        $10,
        $11,
        $12::jsonb,
        $13::jsonb,
        $14::bigint,
        $15::bigint
      )
      ON CONFLICT (workspace_id, provider, entity_kind, external_id)
      DO UPDATE
      SET
        occurred_at = EXCLUDED.occurred_at,
        direction = EXCLUDED.direction,
        amount_minor = EXCLUDED.amount_minor,
        currency_code = EXCLUDED.currency_code,
        description = EXCLUDED.description,
        counterparty = EXCLUDED.counterparty,
        raw_payload = EXCLUDED.raw_payload,
        normalized_payload = EXCLUDED.normalized_payload,
        transaction_id = COALESCE(EXCLUDED.transaction_id, canonical_records.transaction_id),
        ingestion_run_id = COALESCE(EXCLUDED.ingestion_run_id, canonical_records.ingestion_run_id),
        updated_at = NOW()
      RETURNING id::text
      `,[r.workspaceId,r.businessId,r.provider,r.entityKind,r.externalId??null,l(r.occurredAt),r.direction??null,function(t){if(null==t||""===t)return null;let e="number"==typeof t?t:Number(t);return Number.isFinite(e)?e.toFixed(2):null}(r.amount),function(t){if(!t)return"INR";let e=t.trim().toUpperCase();return 3!==e.length?"INR":e}(r.currencyCode),r.description??null,r.counterparty??null,JSON.stringify(p(r.rawPayload)),JSON.stringify(p(r.normalizedPayload)),r.transactionId??null,r.ingestionRunId??null]);return{stored:!0,canonicalId:u(t.rows[0]?.id)}}catch(t){if(y(t))return{stored:!1,canonicalId:null};throw t}}function k(t){let e=[t.provider,t.workspaceId,t.eventId??"",t.externalId??""].join("|");return(0,n.createHash)("sha256").update(e).digest("hex")}async function D(t){let e=t.client??(0,a.getDbPool)();try{let r=await e.query(`
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
        $2,
        $3,
        $4::jsonb,
        'pending',
        COALESCE($5::timestamptz, NOW())
      )
      ON CONFLICT (workspace_id, event_type, dedupe_key)
      DO UPDATE
      SET
        payload = EXCLUDED.payload,
        status = 'pending',
        available_at = COALESCE(EXCLUDED.available_at, NOW()),
        last_error = NULL,
        updated_at = NOW()
      RETURNING id::text
      `,[t.workspaceId,t.eventType,t.dedupeKey,JSON.stringify(t.payload),l(t.availableAt)]);return u(r.rows[0]?.id)}catch{return null}}function C(t=1){let e=Number.isFinite(t)&&t>0?t:1;return new Date(Date.now()+60*e*6e4).toISOString()}async function S(t){let e=t.runRules??!0,r=t.runAlerts??!0,n=null;if(e)try{let e=await (0,c.applyRulesV0ForWorkspace)({workspaceId:t.workspaceId,businessId:t.businessId,limit:1500,confidenceThreshold:.65});n={ok:!0,scanned:e.scanned,tagged:e.tagged,duplicateSuggestionsOpen:e.duplicateSuggestionsOpen}}catch(t){n={ok:!1,error:t instanceof Error?t.message:"Failed to run categorization rules"}}let o=null;if(r)try{let e=await (0,i.evaluateWorkspaceAlerts)({workspaceId:t.workspaceId,businessId:t.businessId,sendWhatsAppDigest:t.sendWhatsAppDigest??!1}),r=Object.values(e.alerts).filter(t=>"opened"===t.alert.status||"updated"===t.alert.status).length;o={ok:!0,openCount:r}}catch(t){o={ok:!1,error:t instanceof Error?t.message:"Failed to run alert evaluation"}}return{rules:n,alerts:o}}async function $(t){let e=t.client??(0,a.getDbPool)(),r=[],n=["c.status IN ('idle', 'queued', 'error')","(c.next_run_at IS NULL OR c.next_run_at <= NOW())"];t.workspaceId&&(r.push(t.workspaceId),n.push(`c.workspace_id = $${r.length}::uuid`));let i=t.limit??20;r.push(i);let o=await e.query(`
    SELECT
      c.workspace_id::text,
      c.provider,
      c.stream,
      c.cursor,
      c.sync_mode
    FROM connector_sync_cursors c
    WHERE ${n.join(" AND ")}
    ORDER BY c.next_run_at NULLS FIRST, c.updated_at ASC
    LIMIT $${r.length}
    `,r),s=[];for(let t of o.rows)t.provider&&s.push({workspaceId:t.workspace_id,provider:t.provider,stream:t.stream,cursor:t.cursor,mode:t.sync_mode});return s}[i,o,a,c]=d.then?(await d)():d,t.s(["buildWebhookDedupeKey",()=>k,"enqueueConnectorWebhookEvent",()=>N,"enqueueNotificationOutbox",()=>D,"ensureIntegrationSourceAccount",()=>E,"finalizeSourceEvent",()=>f,"finishSyncRun",()=>b,"getDueDeltaSyncTargets",()=>$,"nextDeltaRunAt",()=>C,"runLedgerPipelinePostIngest",()=>S,"startSyncRun",()=>_,"updateConnectorWebhookEventStatus",()=>v,"upsertCanonicalRecord",()=>w,"upsertConnection",()=>g,"upsertConnectorCursor",()=>h,"upsertConnectorToken",()=>m,"upsertSourceEvent",()=>I]),r()}catch(t){r(t)}},!1),49502,t=>{"use strict";var e=t.i(15658),r=t.i(66680);function n(t){return t.toLowerCase().replace(/\s+/g," ").trim()}function i(t){let e="string"==typeof t?t.trim().toLowerCase():"";return["credit","cr","in","incoming","inflow"].includes(e)?"credit":["debit","dr","out","outgoing","outflow"].includes(e)?"debit":"credit"}function o(t){let e="number"==typeof t?t:"string"==typeof t?Number(t.trim()):NaN;return!Number.isFinite(e)||e<=0?1:e}function a(t){if("string"==typeof t&&t.trim()){let e=new Date(t);if(!Number.isNaN(e.getTime()))return e.toISOString()}return new Date().toISOString()}class s{provider;scopes;seeds;constructor(t){this.provider=t.provider,this.scopes=t.scopes,this.seeds=t.seeds}async authorize(t,e){let r=t.token?.trim()??"";return r&&r.length<6?{ok:!1,scopes:[],reason:"Token is too short"}:{ok:!0,scopes:this.scopes,accountLabel:t.accountLabel,metadata:{mode:"adapter_authorize_simulated_v1"}}}async backfill(t,e){return{transactions:this.simulateTransactions({limit:t.limit??20,bucket:"backfill",anchorIso:new Date().toISOString()}),nextCursor:`${e.provider}:backfill:${Date.now()}`,metadata:{mode:"backfill",provider:this.provider,requestedCursor:t.cursor??null}}}async delta(t,e){return{transactions:this.simulateTransactions({limit:t.limit??8,bucket:"delta",anchorIso:new Date().toISOString()}),nextCursor:`${e.provider}:delta:${Date.now()}`,metadata:{mode:"delta",provider:this.provider,requestedCursor:t.cursor??null}}}async webhook_handler(t,e){let n=t.payload,s="string"==typeof n.eventType&&n.eventType.trim()||"string"==typeof n.type&&n.type.trim()||"transaction.created",c="string"==typeof n.externalRef&&n.externalRef.trim()||"string"==typeof n.reference&&n.reference.trim()||"string"==typeof n.id&&n.id.trim()||"string"==typeof n.eventId&&n.eventId.trim()||`${this.provider}:${Date.now()}`,d="string"==typeof n.eventId&&n.eventId.trim()||"string"==typeof n.id&&n.id.trim()||(0,r.createHash)("sha256").update(JSON.stringify({provider:this.provider,payload:n})).digest("hex"),u={externalTxnId:c,occurredAt:a(n.occurredAt??n.timestamp),amount:o(n.amount??n.value??n.amount_minor).toFixed(2),direction:i(n.direction??n.type),description:"string"==typeof n.description&&n.description.trim()||"string"==typeof n.narration&&n.narration.trim()||`${this.provider.toUpperCase()} webhook transaction`,counterparty:"string"==typeof n.counterparty&&n.counterparty.trim()||"string"==typeof n.merchant&&n.merchant.trim()||this.provider.toUpperCase(),currencyCode:"string"==typeof n.currency&&n.currency.trim().toUpperCase()||"INR",gstApplicable:!1,gstRate:null,gstAmount:null,metadata:{rawEventType:s}};return{eventId:d,eventType:s,transactions:[u],metadata:{source:"adapter_webhook_simulated_v1"}}}async normalize(t,e){if(Array.isArray(t))return t.map(t=>this.normalizeSingleRecord(t)).filter(t=>!!t);if(t&&"object"==typeof t){let e=this.normalizeSingleRecord(t);return e?[e]:[]}return[]}async healthcheck(t){let e=Date.now();return{ok:!0,message:"Adapter healthy",latencyMs:Date.now()-e,metadata:{provider:this.provider}}}simulateTransactions(t){if(!this.seeds.length||t.limit<=0)return[];let e=new Date(t.anchorIso);return Array.from({length:t.limit}).map((i,o)=>{var a;let s,c=this.seeds[o%this.seeds.length],d=new Date(e.getTime()-2*o*36e5).toISOString(),u=c.amount.toFixed(2),l=c.gstApplicable?(c.gstRate??18).toFixed(3):null,p=c.gstApplicable&&l?(c.amount*Number(l)/100).toFixed(2):null;return{externalTxnId:(a={provider:this.provider,direction:c.direction,amount:u,description:c.description,counterparty:c.counterparty,bucket:`${t.bucket}:${o%this.seeds.length}`},s=(0,r.createHash)("sha256").update([a.provider,a.direction,a.amount,n(a.description),n(a.counterparty),a.bucket].join("|")).digest("hex").slice(0,20),`SIM-${a.provider.toUpperCase()}-${s}`),occurredAt:d,amount:u,direction:c.direction,description:c.description,counterparty:c.counterparty,currencyCode:"INR",gstApplicable:!!c.gstApplicable,gstRate:l,gstAmount:p,metadata:{mode:t.bucket,provider:this.provider,rowNumber:o+1}}})}normalizeSingleRecord(t){let e="string"==typeof t.externalTxnId&&t.externalTxnId.trim()||"string"==typeof t.externalRef&&t.externalRef.trim()||"string"==typeof t.reference&&t.reference.trim()||"string"==typeof t.id&&t.id.trim()||null;return e?{externalTxnId:e,occurredAt:a(t.occurredAt??t.timestamp),amount:o(t.amount??t.value??t.amount_minor).toFixed(2),direction:i(t.direction??t.type),description:"string"==typeof t.description&&t.description.trim()||"string"==typeof t.narration&&t.narration.trim()||`${this.provider.toUpperCase()} normalized transaction`,counterparty:"string"==typeof t.counterparty&&t.counterparty.trim()||"string"==typeof t.merchant&&t.merchant.trim()||this.provider.toUpperCase(),currencyCode:"string"==typeof t.currencyCode&&t.currencyCode.trim().toUpperCase()||"INR",gstApplicable:!!t.gstApplicable,gstRate:void 0!==t.gstRate&&null!==t.gstRate?Number(t.gstRate).toFixed(3):null,gstAmount:void 0!==t.gstAmount&&null!==t.gstAmount?Number(t.gstAmount).toFixed(2):null,metadata:{normalizedBy:"SimulatedProviderAdapter"}}:null}}let c={hdfc:[{direction:"credit",amount:125e3,description:"NEFT settlement received",counterparty:"Enterprise Client A",gstApplicable:!0,gstRate:18},{direction:"debit",amount:4200,description:"Bank processing fee",counterparty:"HDFC Charges",gstApplicable:!0,gstRate:18},{direction:"debit",amount:32500,description:"Vendor payment batch",counterparty:"Operations Vendor"}],icici:[{direction:"credit",amount:88e3,description:"Collection deposit",counterparty:"Collection Desk",gstApplicable:!0,gstRate:18},{direction:"debit",amount:57e3,description:"Payroll transfer",counterparty:"Salary Account"},{direction:"debit",amount:2200,description:"Internet and utility payment",counterparty:"Utility Provider",gstApplicable:!0,gstRate:18}],razorpay:[{direction:"credit",amount:156400,description:"Razorpay settlement",counterparty:"Razorpay",gstApplicable:!0,gstRate:18},{direction:"debit",amount:5100,description:"Razorpay platform fee",counterparty:"Razorpay",gstApplicable:!0,gstRate:18},{direction:"debit",amount:900,description:"Payment gateway adjustment",counterparty:"Razorpay",gstApplicable:!0,gstRate:18}],gpay:[{direction:"credit",amount:34500,description:"UPI collection",counterparty:"Google Pay",gstApplicable:!0,gstRate:18},{direction:"debit",amount:12800,description:"UPI payout",counterparty:"Google Pay"},{direction:"debit",amount:350,description:"UPI processing charge",counterparty:"Google Pay",gstApplicable:!0,gstRate:18}],stripe:[{direction:"credit",amount:112800,description:"Stripe payout",counterparty:"Stripe",gstApplicable:!0,gstRate:18},{direction:"debit",amount:4100,description:"Stripe fees",counterparty:"Stripe",gstApplicable:!0,gstRate:18},{direction:"debit",amount:1400,description:"Dispute fee reserve",counterparty:"Stripe"}],tally:[{direction:"debit",amount:16e3,description:"Journal import adjustment",counterparty:"Tally Connector"},{direction:"credit",amount:16e3,description:"Ledger balancing entry",counterparty:"Tally Connector"},{direction:"debit",amount:2500,description:"ERP sync service charge",counterparty:"Tally Services",gstApplicable:!0,gstRate:18}],whatsapp:[{direction:"credit",amount:9e3,description:"Payment link collection",counterparty:"WhatsApp Payments",gstApplicable:!0,gstRate:18},{direction:"debit",amount:600,description:"Conversation utility fee",counterparty:"WhatsApp API",gstApplicable:!0,gstRate:18},{direction:"debit",amount:1200,description:"Marketing campaign spend",counterparty:"WhatsApp API",gstApplicable:!0,gstRate:18}],zohobooks:[{direction:"credit",amount:45e3,description:"Invoice receipt sync",counterparty:"Zoho Books",gstApplicable:!0,gstRate:18},{direction:"debit",amount:18e3,description:"Bill payment sync",counterparty:"Zoho Books",gstApplicable:!0,gstRate:18},{direction:"debit",amount:1500,description:"Subscription sync fee",counterparty:"Zoho Books",gstApplicable:!0,gstRate:18}]},d=new Map;for(let t of e.INTEGRATION_PROVIDERS)d.set(t.id,new s({provider:t.id,scopes:"whatsapp"===t.id?["messages:write","contacts:read"]:["transactions:read","balances:read"],seeds:c[t.id]}));function u(t){let e=d.get(t);if(!e)throw Error(`No provider adapter registered for ${t}`);return e}t.s(["getProviderAdapter",()=>u],49502)}];

//# sourceMappingURL=apps_marketing_src_lib_8c2060ca._.js.map