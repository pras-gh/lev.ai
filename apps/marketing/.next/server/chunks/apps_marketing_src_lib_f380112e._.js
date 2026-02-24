module.exports=[64561,e=>{"use strict";var t=e.i(63021);let r=[{category:"revenue",weight:3,patterns:[/\brazorpay\b.*\bsettlement\b/i,/\bsettlement\b.*\brazorpay\b/i,/\bstripe\b.*\bpayout\b/i,/\bpayout\b.*\bstripe\b/i,/\bpayment received\b/i,/\bpayment\s+rec(?:eive|ei)db?\b/i]},{category:"tax",weight:3,patterns:[/\bgst\b/i,/\bgstr\b/i,/\bcbic\b/i,/\btax payment\b/i,/\bsgst\b/i,/\bcgst\b/i,/\bigst\b/i,/\btax\b/i,/\btds\b/i]},{category:"payroll",weight:3,patterns:[/\bsalary\b/i,/\bpayroll\b/i,/\bpf\b/i,/\besic\b/i,/\besi\b/i,/\bstipend\b/i,/\bwages?\b/i]},{category:"marketing",weight:3,patterns:[/\bfacebook ads\b/i,/\bgoogle ads\b/i,/\bmeta ads\b/i,/\bad spend\b/i,/\badvertising\b/i,/\bfb ads\b/i]},{category:"saas",weight:3,patterns:[/\bzoho\b/i,/\baws\b/i,/\bnotion\b/i,/\bopenai\b/i,/\bsoftware\b/i]},{category:"logistics",weight:3,patterns:[/\bdelhivery\b/i,/\bshiprocket\b/i,/\bcourier\b/i,/\bshipping\b/i]},{category:"rent/utilities",weight:3,patterns:[/\brent\b/i,/\belectricity\b/i,/\binternet\b/i,/\blease\b/i,/\bpower bill\b/i,/\butility\b/i]}];globalThis.prisma??new t.PrismaClient({log:["error"]});let n=e=>e.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim(),a=e=>n(e);function i(e){let t=n([e.description,e.merchant,e.reference].filter(e=>!!(e&&e.trim())).join(" "));if(!t)return{categoryName:null,confidence:0,tags:[]};let a=null;for(let e of r){let r=0;for(let n of e.patterns)n.test(t)&&(r+=1);if(!r)continue;let n=r*(e.weight??1);(!a||n>a.score)&&(a={category:e.category,score:n,matched:e.category})}if(!a)return{categoryName:null,confidence:0,tags:[]};let i=a.score>=6?.9:a.score>=3?.8:.65;return{categoryName:a.category,confidence:i,matchedRule:a.matched,tags:["rules:v0",`bucket:${a.category}`]}}function o(e){return new Map(e.map(e=>[a(e.name),e.id]))}function s(e){let t=a(e.categoryName);for(let r of({tax:["tax","taxes","gst"],payroll:["payroll","salary","salaries"],revenue:["revenue","sales revenue","other income","income"],marketing:["marketing","facebook ads","google ads","advertising","ads"],saas:["saas","software","tools","subscriptions"],logistics:["logistics","shipping","courier","delhivery","shiprocket"],"rent/utilities":["rent/utilities","rent and utilities","rent","utilities","electricity","internet","fixed cost"]})[t]??[t]){let t=e.categoryMap.get(a(r));if(t)return t}return null}e.s(["CATEGORIZE_V0_TARGET_RATE",0,.8,"CATEGORIZE_V0_VERSION",0,"v0","buildCategoryNameIdMap",()=>o,"categorizeTransactionV0",()=>i,"resolveCategoryIdByCategoryName",()=>s])},32469,e=>{"use strict";var t=e.i(66680);let r=["account","accountno","accountnumber","ac","acno","acnumber","acct","acctno","bankaccount","sourceaccount","fromaccount"];function n(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}function a(e){return e.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()}function i(e){return a(e.map(e=>"string"==typeof e?e.trim():"").filter(e=>e.length>0).join(" "))}function o(e){let r,n,i,o,s=(r=function(e){let t=e instanceof Date?e:new Date(e);if(Number.isNaN(t.getTime()))throw Error("date must be a valid date string");return t.toISOString().slice(0,10)}(e.date),n=function(e){if("bigint"==typeof e)return`${e.toString()}.00`;let t=Number(("number"==typeof e?String(e):e).trim().replace(/[,\s]/g,"").replace(/[₹$€£]/g,""));if(!Number.isFinite(t))throw Error("amount must be a valid numeric value");return Math.abs(t).toFixed(2)}(e.amount),i=a(e.description??""),o=a(e.account??""),`${r}|${n}|${i}|${o}`);return(0,t.createHash)("sha256").update(s).digest("hex")}function s(e){for(let[t,n]of Object.entries(e)){let e=t.trim().toLowerCase().replace(/[^a-z0-9]/g,"");if(!r.includes(e))continue;let a=function(e){if("string"==typeof e){let t=e.trim();return t.length>0?t:void 0}if("number"==typeof e||"bigint"==typeof e){let t=String(e).trim();return t.length>0?t:void 0}}(n);if(a)return a}}function c(e){if(!n(e))return;let t=s(e);if(t)return t;for(let t of[e.raw,e.bank,e.account]){if(!n(t))continue;let e=s(t);if(e)return e}}e.s(["buildHashDescription",()=>i,"computeTransactionHash",()=>o,"extractAccountHintFromMetadata",()=>c,"extractAccountHintFromRecord",()=>s])},91268,e=>e.a(async(t,r)=>{try{var n=e.i(33691),a=e.i(34591),i=e.i(84942),o=e.i(64561),s=e.i(32469),c=t([n,a,i]);function d(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}function u(e,t){let r=[...t].sort((e,t)=>e-t);return`dup:${e}:${r.join(",")}`}async function l(e,t){let r=await e.query(`
    SELECT payload->>'fingerprint' AS fingerprint
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND type = 'duplicate'
      AND status IN ('open', 'snoozed')
    `,[t]);return new Set(r.rows.map(e=>e.fingerprint).filter(e=>!!e))}async function p(e){let t=e.limit??1e3,r=e.confidenceThreshold??.65,n=e.includeDeleted??!1;if(!Number.isInteger(t)||t<=0||t>1e4)throw Error("limit must be an integer between 1 and 10000");if(r<0||r>1)throw Error("confidenceThreshold must be between 0 and 1");let c=(0,a.getDbPool)(),p=await c.connect();try{await p.query("BEGIN");let a=await p.query(`
      SELECT id::text, name
      FROM categories
      WHERE workspace_id = $1::uuid
      `,[e.workspaceId]),c=(0,o.buildCategoryNameIdMap)(a.rows.map(e=>{try{return{id:BigInt(e.id),name:e.name}}catch{return null}}).filter(e=>!!e)),y=await p.query(`
      SELECT
        t.id::text,
        t.business_id::text,
        t.occurred_at::text,
        t.amount_minor::text,
        t.description,
        t.counterparty,
        t.external_ref,
        t.category_id::text,
        t.metadata
      FROM transactions t
      WHERE t.workspace_id = $1::uuid
        AND t.status IN ('posted', 'reversed')
        ${n?"":"AND t.is_hidden = FALSE"}
      ORDER BY t.occurred_at DESC, t.id DESC
      LIMIT $2
      `,[e.workspaceId,t]),b=0,_=0,g=new Map;for(let t of y.rows){let n=function(e){let t=Number.parseInt(e,10);return Number.isInteger(t)&&t>0?t:null}(t.id);if(null===n)continue;let a=(0,o.categorizeTransactionV0)({description:t.description,merchant:t.counterparty,reference:t.external_ref}),u=a.categoryName?(0,o.resolveCategoryIdByCategoryName)({categoryName:a.categoryName,categoryMap:c}):null,l=(0,s.buildHashDescription)([t.description,t.counterparty,t.external_ref]),y=(0,s.extractAccountHintFromMetadata)(t.metadata)??t.counterparty??null,E=(0,s.computeTransactionHash)({date:t.occurred_at,amount:t.amount_minor,description:l,account:y}),f=g.get(E)??[];f.push(n),g.set(E,f);let m=d(t.metadata)?t.metadata:{},N=d(m.dedupe)?m.dedupe:{},w=d(m.categorization)?m.categorization:{},I={...m,dedupe:{...N,hash:E,formula:"sha256(date|amount|normalized_desc|account)"}};a.categoryName&&a.confidence>=r&&(I.categorization={...w,version:o.CATEGORIZE_V0_VERSION,autoTagged:null!==u,categoryName:a.categoryName,confidence:a.confidence,matchedRule:a.matchedRule??null,tags:a.tags});let h=JSON.stringify(m)!==JSON.stringify(I),D=null===t.category_id&&null!==u&&a.confidence>=r;if(!h&&!D)continue;let S=[String(n),JSON.stringify(I),e.workspaceId],$=["metadata = $2::jsonb","updated_at = NOW()"];D&&null!==u&&(S.push(u.toString()),$.push(`category_id = $${S.length}`),S.push(a.confidence.toString()),$.push(`confidence = $${S.length}::numeric`),b+=1),await p.query(`
        UPDATE transactions
        SET ${$.join(", ")}
        WHERE id = $1::bigint
          AND workspace_id = $3::uuid
        `,S),_+=1,D&&null!==u&&await (0,i.writeAuditLogSafe)({workspaceId:e.workspaceId,businessId:t.business_id,actorType:"system",actorId:"trail_rules_v0",entityType:"transaction",entityId:t.id,action:"trail.transaction.auto_categorized",beforeState:{categoryId:t.category_id,confidence:null},afterState:{categoryId:u.toString(),confidence:a.confidence,matchedRule:a.matchedRule??null,modelVersion:o.CATEGORIZE_V0_VERSION,evidence:{transactionIds:[n],source:"rules_engine_v0",description:t.description,counterparty:t.counterparty,externalRef:t.external_ref}}},p)}let E=[...g.entries()].map(([e,t])=>({hash:e,ids:[...new Set(t)].sort((e,t)=>e-t)})).filter(e=>e.ids.length>1),f=E.map(e=>u(e.hash,e.ids)),m=await l(p,e.workspaceId),N=0;for(let t of E){let r=u(t.hash,t.ids);m.has(r)||(await p.query(`
        INSERT INTO alerts (
          business_id,
          workspace_id,
          transaction_id,
          alert_type,
          type,
          severity,
          status,
          message,
          title,
          body,
          related_transaction_ids,
          payload
        )
        VALUES (
          $1,
          $2::uuid,
          $3,
          'duplicate',
          'duplicate',
          'warning',
          'open',
          'Potential duplicate transaction detected by rules engine.',
          'Auto-clean suggestion: potential duplicate',
          $4,
          $5::jsonb,
          $6::jsonb
        )
        `,[e.businessId,e.workspaceId,t.ids[0],`${t.ids.length} transaction(s) share the same hash. Action: Merge / Ignore.`,JSON.stringify(t.ids),JSON.stringify({source:"rules_engine_v0",fingerprint:r,hash:t.hash,suggestedAction:"merge",suggestedKeepTransactionId:t.ids[0]??null})]),m.add(r),N+=1)}f.length>0?await p.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
        WHERE workspace_id = $1::uuid
          AND type = 'duplicate'
          AND status = 'open'
          AND COALESCE(payload->>'source', '') = 'rules_engine_v0'
          AND COALESCE(payload->>'fingerprint', '') <> ''
          AND NOT ((payload->>'fingerprint') = ANY($2::text[]))
        `,[e.workspaceId,f,JSON.stringify({resolution:{action:"auto_resolve",reason:"duplicate group no longer active"}})]):await p.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb
        WHERE workspace_id = $1::uuid
          AND type = 'duplicate'
          AND status = 'open'
          AND COALESCE(payload->>'source', '') = 'rules_engine_v0'
        `,[e.workspaceId,JSON.stringify({resolution:{action:"auto_resolve",reason:"no active duplicate groups"}})]);let w=await p.query(`
      SELECT COUNT(*)::text AS count
      FROM alerts
      WHERE workspace_id = $1::uuid
        AND type = 'duplicate'
        AND status = 'open'
      `,[e.workspaceId]),I=Number(w.rows[0]?.count??"0"),h=await p.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_hidden = FALSE)::text AS total,
        COUNT(*) FILTER (WHERE is_hidden = FALSE AND category_id IS NOT NULL)::text AS tagged
      FROM transactions
      WHERE workspace_id = $1::uuid
      `,[e.workspaceId]),D=Number(h.rows[0]?.total??"0"),S=Number(h.rows[0]?.tagged??"0");return await p.query("COMMIT"),{scanned:y.rows.length,updated:_,tagged:b,duplicateSuggestionsCreated:N,duplicateSuggestionsOpen:I,coverage:{total:D,tagged:S,ratio:D>0?S/D:0}}}catch(e){throw await p.query("ROLLBACK"),e}finally{p.release()}}[n,a,i]=c.then?(await c)():c,e.s(["applyRulesV0ForWorkspace",()=>p]),r()}catch(e){r(e)}},!1),15658,e=>{"use strict";let t=[{id:"hdfc",label:"HDFC Bank",kind:"bank",blurb:"Bank statements and balance snapshots"},{id:"icici",label:"ICICI Bank",kind:"bank",blurb:"Bank account feeds for credits and debits"},{id:"razorpay",label:"Razorpay",kind:"payments",blurb:"Settlements, fees, and payout events"},{id:"gpay",label:"Google Pay",kind:"payments",blurb:"UPI transaction stream"},{id:"stripe",label:"Stripe",kind:"payments",blurb:"Payout and charge activity"},{id:"tally",label:"Tally",kind:"erp",blurb:"Ledger sync and posting bridge"},{id:"whatsapp",label:"WhatsApp",kind:"messaging",blurb:"Customer payment notification hooks"},{id:"zohobooks",label:"Zoho Books",kind:"erp",blurb:"Books sync for vouchers and invoices"}],r=new Set(t.map(e=>e.id));function n(e){return r.has(e)}function a(e){let r=t.find(t=>t.id===e);return r?.label??e.toUpperCase()}e.s(["INTEGRATION_PROVIDERS",0,t,"integrationProviderLabel",()=>a,"isIntegrationProviderId",()=>n])},59174,e=>e.a(async(t,r)=>{try{var n=e.i(66680),a=e.i(85635),i=e.i(33691),o=e.i(34591),s=e.i(15658),c=e.i(91268),d=t([a,i,o,c]);function u(e){if(!e)return null;let t=Number.parseInt(e,10);return Number.isInteger(t)&&t>0?t:null}function l(e){if(!e)return null;if(e instanceof Date)return Number.isNaN(e.getTime())?null:e.toISOString();let t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString()}function p(e){return e&&"object"==typeof e&&!Array.isArray(e)?e:{}}function y(e){if(!e||"object"!=typeof e)return!1;let t="code"in e?String(e.code??""):"";if("42P01"===t)return!0;let r=e instanceof Error?e.message.toLowerCase():"";return r.includes('relation "connector_tokens" does not exist')||r.includes('relation "connections" does not exist')||r.includes('relation "sync_runs" does not exist')||r.includes('relation "connector_sync_cursors" does not exist')||r.includes('relation "connector_webhook_events" does not exist')||r.includes('relation "source_events" does not exist')||r.includes('relation "canonical_records" does not exist')}async function b(e){var t;let r,a=(t=e.token,(0,n.createHash)("sha256").update(t).digest("hex")),i=(r=e.token.trim()).length<=6?"••••••":`${r.slice(0,4)}••••${r.slice(-2)}`,s=e.client??(0,o.getDbPool)();try{let t=await s.query(`
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
      `,[e.workspaceId,e.provider,a,i,e.token,JSON.stringify(e.scopes??[]),l(e.expiresAt),JSON.stringify(e.metadata??{})]);return{stored:!0,tokenHash:a,tokenHint:i,tokenId:u(t.rows[0]?.id)}}catch(e){if(y(e))return{stored:!1,tokenHash:a,tokenHint:i,tokenId:null};throw e}}async function _(e){let t=e.client??(0,o.getDbPool)();try{let r=await t.query(`
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
      `,[e.workspaceId,e.provider,e.status,JSON.stringify(e.scopes??[]),e.secretsRef??null,JSON.stringify(e.metadata??{})]);return{stored:!0,connectionId:r.rows[0]?.id??null}}catch(e){if(y(e))return{stored:!1,connectionId:null};throw e}}async function g(e){let t=e.client??(0,o.getDbPool)();try{let r=await t.query(`
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
      `,[e.workspaceId,e.connectionId,e.type,JSON.stringify(e.stats??{})]);return u(r.rows[0]?.id)}catch(e){if(y(e))return null;throw e}}async function E(e){if(!e.syncRunId)return;let t=e.client??(0,o.getDbPool)();try{await t.query(`
      UPDATE sync_runs
      SET
        status = $3,
        finished_at = NOW(),
        error = $4,
        stats_json = COALESCE(stats_json, '{}'::jsonb) || $5::jsonb,
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[e.syncRunId,e.workspaceId,e.status,e.error??null,JSON.stringify(e.stats??{})])}catch(e){if(y(e))return;throw e}}async function f(e){let t=e.client??(0,o.getDbPool)();try{var r;let n,a=await t.query(`
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
      `,[e.workspaceId,e.provider]);if(a.rows[0]?.id)return a.rows[0].id;let i=await t.query(`
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
      `,[e.workspaceId,e.businessId,e.provider,(r=e.provider,!(n=s.INTEGRATION_PROVIDERS.find(e=>e.id===r))?"other":"bank"===n.kind?"bank":"payments"===n.kind?"wallet":"other"),`${(0,s.integrationProviderLabel)(e.provider)} Primary`,JSON.stringify({provider:e.provider,createdBy:"connector_sync_engine"})]);return i.rows[0]?.id??null}catch(e){if(y(e))return null;throw e}}async function m(e){let t=e.client??(0,o.getDbPool)();try{let r=await t.query(`
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
      `,[e.workspaceId,e.businessId,e.connectionId,e.source,e.accountId,e.externalTxnId,e.eventType??"transaction",JSON.stringify(e.payload??{})]);return{stored:!0,sourceEventId:u(r.rows[0]?.id),existingTransactionId:function(e){if(!e)return null;try{let t=BigInt(e);return t>0n?t:null}catch{return null}}(r.rows[0]?.transaction_id)}}catch(e){if(y(e))return{stored:!1,sourceEventId:null,existingTransactionId:null};throw e}}async function N(e){let t=e.client??(0,o.getDbPool)();try{await t.query(`
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
      `,[e.sourceEventId,e.workspaceId,e.transactionId?e.transactionId.toString():null,e.canonicalRecordId?e.canonicalRecordId.toString():null,e.status,e.error??null])}catch(e){if(y(e))return;throw e}}async function w(e){let t=e.client??(0,o.getDbPool)();try{let r=await t.query(`
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
      `,[e.workspaceId,e.provider,e.stream??"transactions",e.cursor??null,e.mode??"delta",e.status??"idle",l(e.lastRunAt),l(e.nextRunAt),e.error??null,JSON.stringify(e.metadata??{})]);return{stored:!0,cursorId:u(r.rows[0]?.id)}}catch(e){if(y(e))return{stored:!1,cursorId:null};throw e}}async function I(e){let t=e.client??(0,o.getDbPool)();try{let r=await t.query(`
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
      `,[e.workspaceId,e.provider,e.eventId,e.eventType,l(e.occurredAt),JSON.stringify(e.payload),JSON.stringify(e.metadata??{})]),n=u(r.rows[0]?.id);return{accepted:!0,duplicate:null===n,webhookEventId:n}}catch(e){if(y(e))return{accepted:!1,duplicate:!1,webhookEventId:null};throw e}}async function h(e){let t=e.client??(0,o.getDbPool)();try{await t.query(`
      UPDATE connector_webhook_events
      SET
        status = $3,
        processed_at = CASE WHEN $3 IN ('processed', 'ignored') THEN NOW() ELSE processed_at END,
        error = $4,
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[e.webhookEventId,e.workspaceId,e.status,e.error??null])}catch(e){if(y(e))return;throw e}}async function D(e){let t=e.client??(0,o.getDbPool)(),r=e.record;try{let e=await t.query(`
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
      `,[r.workspaceId,r.businessId,r.provider,r.entityKind,r.externalId??null,l(r.occurredAt),r.direction??null,function(e){if(null==e||""===e)return null;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t.toFixed(2):null}(r.amount),function(e){if(!e)return"INR";let t=e.trim().toUpperCase();return 3!==t.length?"INR":t}(r.currencyCode),r.description??null,r.counterparty??null,JSON.stringify(p(r.rawPayload)),JSON.stringify(p(r.normalizedPayload)),r.transactionId??null,r.ingestionRunId??null]);return{stored:!0,canonicalId:u(e.rows[0]?.id)}}catch(e){if(y(e))return{stored:!1,canonicalId:null};throw e}}function S(e){let t=[e.provider,e.workspaceId,e.eventId??"",e.externalId??""].join("|");return(0,n.createHash)("sha256").update(t).digest("hex")}async function $(e){let t=e.client??(0,o.getDbPool)();try{let r=await t.query(`
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
      `,[e.workspaceId,e.eventType,e.dedupeKey,JSON.stringify(e.payload),l(e.availableAt)]);return u(r.rows[0]?.id)}catch{return null}}function O(e=1){let t=Number.isFinite(e)&&e>0?e:1;return new Date(Date.now()+60*t*6e4).toISOString()}async function k(e){let t=e.runRules??!0,r=e.runAlerts??!0,n=null;if(t)try{let t=await (0,c.applyRulesV0ForWorkspace)({workspaceId:e.workspaceId,businessId:e.businessId,limit:1500,confidenceThreshold:.65});n={ok:!0,scanned:t.scanned,tagged:t.tagged,duplicateSuggestionsOpen:t.duplicateSuggestionsOpen}}catch(e){n={ok:!1,error:e instanceof Error?e.message:"Failed to run categorization rules"}}let i=null;if(r)try{let t=await (0,a.evaluateWorkspaceAlerts)({workspaceId:e.workspaceId,businessId:e.businessId,sendWhatsAppDigest:e.sendWhatsAppDigest??!1}),r=Object.values(t.alerts).filter(e=>"opened"===e.alert.status||"updated"===e.alert.status).length;i={ok:!0,openCount:r}}catch(e){i={ok:!1,error:e instanceof Error?e.message:"Failed to run alert evaluation"}}return{rules:n,alerts:i}}async function C(e){let t=e.client??(0,o.getDbPool)(),r=[],n=["c.status IN ('idle', 'queued', 'error')","(c.next_run_at IS NULL OR c.next_run_at <= NOW())"];e.workspaceId&&(r.push(e.workspaceId),n.push(`c.workspace_id = $${r.length}::uuid`));let a=e.limit??20;r.push(a);let i=await t.query(`
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
    `,r),s=[];for(let e of i.rows)e.provider&&s.push({workspaceId:e.workspace_id,provider:e.provider,stream:e.stream,cursor:e.cursor,mode:e.sync_mode});return s}[a,i,o,c]=d.then?(await d)():d,e.s(["buildWebhookDedupeKey",()=>S,"enqueueConnectorWebhookEvent",()=>I,"enqueueNotificationOutbox",()=>$,"ensureIntegrationSourceAccount",()=>f,"finalizeSourceEvent",()=>N,"finishSyncRun",()=>E,"getDueDeltaSyncTargets",()=>C,"nextDeltaRunAt",()=>O,"runLedgerPipelinePostIngest",()=>k,"startSyncRun",()=>g,"updateConnectorWebhookEventStatus",()=>h,"upsertCanonicalRecord",()=>D,"upsertConnection",()=>_,"upsertConnectorCursor",()=>w,"upsertConnectorToken",()=>b,"upsertSourceEvent",()=>m]),r()}catch(e){r(e)}},!1)];

//# sourceMappingURL=apps_marketing_src_lib_f380112e._.js.map