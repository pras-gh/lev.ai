module.exports=[54915,e=>e.a(async(t,a)=>{try{var r=e.i(66680),s=e.i(21902),i=e.i(51837),n=t([s,i]);[s,i]=n.then?(await n)():n;let p=["gst_due","itc_mismatch","refund_spike","reconciliation_gap","cash_runway_risk","sync_failure","anomaly_detected"];function o(){return new Date().toISOString()}function d(e){if(null==e||""===e)return null;let t="number"==typeof e?e:Number(String(e).trim());return Number.isFinite(t)?t:null}function l(e){let t=e.toLowerCase();return"critical"===t?0:"warning"===t?1:2}async function u(e){let t=(0,i.getDbPool)();await t.query(`
    UPDATE integrations
    SET
      meta = COALESCE(meta, '{}'::jsonb) || $2::jsonb,
      updated_at = NOW()
    WHERE workspace_id = $1::uuid
      AND provider = 'whatsapp'
    `,[e.workspaceId,JSON.stringify(e.patch)])}async function c(e){var t,a;let s,n,c,h,w,y,E,I,_,b,m=(0,i.getDbPool)(),f=new Date,g=(await m.query(`
    SELECT
      id::text,
      status,
      meta
    FROM integrations
    WHERE workspace_id = $1::uuid
      AND provider = 'whatsapp'
    LIMIT 1
    `,[e.workspaceId])).rows[0],A=(!(t=g?.meta)||"object"!=typeof t||Array.isArray(t)?null:t)??null;if(!g)return{status:"skipped",reason:"whatsapp_integration_not_connected",alertCount:0,preview:"No WhatsApp integration row for workspace"};if("connected"!==(g.status??"").toLowerCase())return{status:"skipped",reason:"whatsapp_integration_not_connected",alertCount:0,preview:"WhatsApp integration status is not connected"};if(!function(e){if(!e)return!0;let t=e.proactiveEnabled;if("boolean"==typeof t)return t;if("string"==typeof t){let e=t.trim().toLowerCase();if("true"===e)return!0;if("false"===e)return!1}return!0}(A))return{status:"skipped",reason:"proactive_digest_disabled",alertCount:0,preview:"Proactive WhatsApp digest is disabled for this workspace"};let S=function(e){if(!e)return null;for(let t of[e.alertPhone,e.recipientPhone,e.phone,e.to,e.recipient,e.recipientNumber,e.mobile]){if("string"!=typeof t)continue;let e=function(e){if(!e)return null;let t=e.replace(/[^\d+]/g,"");if(!t)return null;if(t.startsWith("+")){let e=t.slice(1);return/^\d{8,15}$/.test(e)?`+${e}`:null}return/^\d{10,15}$/.test(t)?`+${t}`:null}(t);if(e)return e}return null}(A);if(!S)return{status:"skipped",reason:"whatsapp_destination_missing",alertCount:0,preview:"Configure recipient phone in integration meta"};let k=await m.query(`
    SELECT
      id::text,
      type,
      severity,
      title,
      body,
      message,
      created_at::text
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND status = 'open'
      AND type = ANY($2::text[])
    ORDER BY created_at DESC, id DESC
    LIMIT 25
    `,[e.workspaceId,p]);if(0===k.rows.length)return{status:"skipped",reason:"no_open_alerts",alertCount:0,preview:"No open proactive alerts to notify"};let{message:D,preview:T,digestHash:N}=(s=[...(a={alerts:k.rows,workspaceId:e.workspaceId,businessId:e.businessId,appBaseUrl:e.appBaseUrl??null}).alerts].sort((e,t)=>{let a=l(e.severity)-l(t.severity);return 0!==a?a:new Date(t.created_at).getTime()-new Date(e.created_at).getTime()}).slice(0,5),n=new Date().toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}),c=s.map((e,t)=>{let a=(e.title??e.message).replace(/\s+/g," ").trim();return`${t+1}. [${e.severity.toUpperCase()}] ${a}`}),w=(h=(a.appBaseUrl??process.env.NEXT_PUBLIC_APP_URL??"").trim()).startsWith("http://")||h.startsWith("https://")?`${h.replace(/\/+$/,"")}/ledger?workspaceId=${encodeURIComponent(a.workspaceId)}&panel=issues`:null,y=[`LEV Alert Digest (${n})`,`Workspace: ${a.workspaceId}`,`Open critical issues: ${a.alerts.length}`,...c],w&&y.push(`Review now: ${w}`),E=y.join("\n"),I=c[0]??"No alert headline",_=a.alerts.map(e=>({id:e.id,type:e.type,severity:e.severity,title:e.title??e.message})),b=(0,r.createHash)("sha256").update(JSON.stringify(_)).digest("hex"),{message:E,preview:I,digestHash:b});if(function(e){let{meta:t}=e;if(!t)return!1;let a="string"==typeof t.lastAlertDigestHash?t.lastAlertDigestHash:null,r="string"==typeof t.lastAlertSentAt?t.lastAlertSentAt:null;if(!a||!r||a!==e.digestHash)return!1;let s=new Date(r);if(!Number.isFinite(s.getTime()))return!1;let i=60*function(e){let t=d(process.env.WHATSAPP_ALERT_COOLDOWN_HOURS);if(null!==t&&t>=0)return t;if(e){let t=d(e.alertCooldownHours);if(null!==t&&t>=0)return t}return 6}(t)*6e4;return!(i<=0)&&e.now.getTime()-s.getTime()<i}({meta:A,digestHash:N,now:f}))return{status:"skipped",reason:"cooldown_active_same_digest",alertCount:k.rows.length,preview:T};let C=function(e){for(let t of[e&&"string"==typeof e.alertWebhookUrl?e.alertWebhookUrl:null,e&&"string"==typeof e.whatsappWebhookUrl?e.whatsappWebhookUrl:null,e&&"string"==typeof e.webhookUrl?e.webhookUrl:null,process.env.WHATSAPP_ALERT_WEBHOOK_URL??null]){if(!t)continue;let e=t.trim();if(e.startsWith("http://")||e.startsWith("https://"))return e}return null}(A);if(!C)return{status:"skipped",reason:"whatsapp_webhook_missing",alertCount:k.rows.length,preview:T};try{let t=await fetch(C,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel:"whatsapp",source:"alert_engine_v0",workspaceId:e.workspaceId,businessId:e.businessId,to:S,message:D,alerts:k.rows.map(e=>({id:e.id,type:e.type,severity:e.severity,title:e.title??e.message})),sentAt:o()}),cache:"no-store"});if(!t.ok){let a=await t.text().catch(()=>""),r=`Webhook responded ${t.status}${a?`: ${a}`:""}`;return await u({workspaceId:e.workspaceId,patch:{lastAlertSendStatus:"error",lastAlertSendAt:o(),lastAlertSendError:r}}),{status:"failed",reason:"whatsapp_webhook_error",alertCount:k.rows.length,preview:T,error:r}}return await u({workspaceId:e.workspaceId,patch:{lastAlertDigestHash:N,lastAlertSentAt:o(),lastAlertSendStatus:"sent",lastAlertDestination:S,lastAlertPreview:T,proactiveMode:"daily_digest_v1"}}),{status:"sent",reason:"sent",alertCount:k.rows.length,destination:S,preview:T,webhook:C}}catch(a){let t=a instanceof Error?a.message:"Unknown WhatsApp webhook error";return await u({workspaceId:e.workspaceId,patch:{lastAlertSendStatus:"error",lastAlertSendAt:o(),lastAlertSendError:t}}),{status:"failed",reason:"whatsapp_webhook_error",alertCount:k.rows.length,preview:T,error:t}}}e.s(["sendProactiveWhatsAppAlertDigest",()=>c]),a()}catch(e){a(e)}},!1),83181,e=>e.a(async(t,a)=>{try{var r=e.i(21902),s=e.i(51837),i=e.i(23796),n=e.i(76617),o=e.i(54915),d=t([r,s,i,n,o]);[r,s,i,n,o]=d.then?(await d)():d;let C="alert_engine_v0",v=["marketing","saas","software","logistics","shipping","rent","utilities","fixed cost","internet","electricity","office","operations","professional","subscription","tax"],$=["%refund%","%chargeback%","%reversal%","%return%","%failed settlement%"],L=["itc_available","vendor_mismatch_risk","cash_runway","expense_spike_anomaly"];function l(e){let t=Number.parseInt(e,10);return Number.isInteger(t)&&t>0?t:null}function u(e){if(null==e)return 0;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t:0}function c(e){return Number(e.toFixed(2))}function p(e){return`₹${Math.abs(e).toLocaleString("en-IN",{maximumFractionDigits:2})}`}function h(e){return!e||"object"!=typeof e||Array.isArray(e)?null:e}function w(e){if("boolean"==typeof e)return e;if("string"==typeof e){let t=e.trim().toLowerCase();if("true"===t)return!0;if("false"===t)return!1}}function y(e,t){for(let a of t){if(!Object.prototype.hasOwnProperty.call(e,a))continue;let t=e[a];if(null!=t&&""!==t)return!0}return!1}function E(e){return Array.isArray(e)&&e.length>0}async function I(e){let t=(0,s.getDbPool)(),a=await t.connect();try{await a.query("BEGIN");let t=await a.query(`
      SELECT
        id::text,
        severity,
        status,
        title,
        body,
        related_transaction_ids,
        payload
      FROM alerts
      WHERE workspace_id = $1::uuid
        AND type = $2
        AND status IN ('open', 'snoozed')
        AND COALESCE(payload->>'source', metadata->>'source', '') = $3
      ORDER BY created_at DESC, id DESC
      `,[e.workspaceId,e.type,C]);if(!e.shouldOpen){if(0===t.rows.length)return await a.query("COMMIT"),{status:"none",alertId:null};let r=await a.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
        WHERE workspace_id = $1::uuid
          AND type = $2
          AND status IN ('open', 'snoozed')
          AND COALESCE(payload->>'source', metadata->>'source', '') = $3
        RETURNING id::text
        `,[e.workspaceId,e.type,C,JSON.stringify({resolution:{action:"auto_resolve",reason:"rule criteria not met",by:C}})]),s=new Map(t.rows.map(e=>[e.id,e]));for(let t of r.rows){let r=s.get(t.id);await (0,i.writeAuditLogSafe)({workspaceId:e.workspaceId,businessId:e.businessId,actorType:"system",actorId:C,entityType:"alert",entityId:t.id,action:"trail.alert.rule_resolved",beforeState:r?{type:e.type,rule:e.rule,severity:r.severity,status:r.status,title:r.title,body:r.body,relatedTransactionIds:r.related_transaction_ids,payload:r.payload}:null,afterState:{type:e.type,rule:e.rule,status:"resolved",reason:"rule criteria not met",evidence:{relatedTransactionIds:e.relatedTransactionIds,source:C}}},a)}return await a.query("COMMIT"),{status:"resolved",alertId:l(t.rows[0]?.id??"")??null}}let r={...e.payload,source:C,rule:e.rule,generatedAt:new Date().toISOString()};if(0===t.rows.length){let t=await a.query(`
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
          payload,
          metadata
        )
        VALUES (
          $1,
          $2::uuid,
          $3,
          $4,
          $4,
          $5,
          'open',
          $6,
          $7,
          $8,
          $9::jsonb,
          $10::jsonb,
          $10::jsonb
        )
        RETURNING id::text
        `,[e.businessId,e.workspaceId,e.relatedTransactionIds[0]??null,e.type,e.severity,e.body,e.title,e.body,JSON.stringify(e.relatedTransactionIds),JSON.stringify(r)]),s=l(t.rows[0]?.id??"")??null;return await (0,i.writeAuditLogSafe)({workspaceId:e.workspaceId,businessId:e.businessId,actorType:"system",actorId:C,entityType:"alert",entityId:t.rows[0]?.id??`${e.type}:opened`,action:"trail.alert.rule_opened",beforeState:null,afterState:{type:e.type,rule:e.rule,severity:e.severity,status:"open",title:e.title,body:e.body,payload:r,evidence:{relatedTransactionIds:e.relatedTransactionIds,source:C}}},a),await a.query("COMMIT"),{status:"opened",alertId:s}}let s=t.rows[0]?.id,n=t.rows[0],o=null;if(s){let t=await a.query(`
        UPDATE alerts
        SET
          severity = $3,
          status = 'open',
          resolved_at = NULL,
          message = $4,
          title = $5,
          body = $6,
          transaction_id = $7,
          related_transaction_ids = $8::jsonb,
          payload = $9::jsonb,
          metadata = $9::jsonb
        WHERE workspace_id = $1::uuid
          AND id = $2::bigint
        RETURNING id::text
        `,[e.workspaceId,s,e.severity,e.body,e.title,e.body,e.relatedTransactionIds[0]??null,JSON.stringify(e.relatedTransactionIds),JSON.stringify(r)]);o=l(t.rows[0]?.id??"")??null}if(s&&await (0,i.writeAuditLogSafe)({workspaceId:e.workspaceId,businessId:e.businessId,actorType:"system",actorId:C,entityType:"alert",entityId:s,action:"trail.alert.rule_updated",beforeState:n?{type:e.type,rule:e.rule,severity:n.severity,status:n.status,title:n.title,body:n.body,relatedTransactionIds:n.related_transaction_ids,payload:n.payload}:null,afterState:{type:e.type,rule:e.rule,severity:e.severity,status:"open",title:e.title,body:e.body,payload:r,evidence:{relatedTransactionIds:e.relatedTransactionIds,source:C}}},a),t.rows.length>1){let r=t.rows.slice(1).map(e=>l(e.id)).filter(e=>null!==e);r.length>0&&(await a.query(`
          UPDATE alerts
          SET
            status = 'resolved',
            resolved_at = NOW(),
            payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
          WHERE workspace_id = $1::uuid
            AND id = ANY($2::bigint[])
          `,[e.workspaceId,r,JSON.stringify({resolution:{action:"auto_resolve",reason:"superseded by latest engine evaluation",by:C}})]),await (0,i.writeAuditLogSafe)({workspaceId:e.workspaceId,businessId:e.businessId,actorType:"system",actorId:C,entityType:"alert",entityId:e.type,action:"trail.alert.rule_superseded",beforeState:{staleAlertIds:r},afterState:{keptAlertId:o,staleAlertIds:r,reason:"superseded by latest engine evaluation"}},a))}return await a.query("COMMIT"),{status:"updated",alertId:o}}catch(e){throw await a.query("ROLLBACK"),e}finally{a.release()}}async function _(e){let t=(0,s.getDbPool)();await t.query(`
    UPDATE alerts
    SET
      status = 'resolved',
      resolved_at = NOW(),
      payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
      metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
    WHERE workspace_id = $1::uuid
      AND status IN ('open', 'snoozed')
      AND type = ANY($3::text[])
    `,[e,JSON.stringify({resolution:{action:"auto_resolve",reason:"replaced by alert-engine v0 taxonomy",by:C}}),L])}async function b(e){var t;let a,r,i,n,o,d,p,I=(n=(t=new Date).getUTCFullYear(),o=t.getUTCMonth(),d=new Date(Date.UTC(n,o,20,0,0,0)),t.getTime()<=d.getTime()?(a=new Date(Date.UTC(n,o-1,1,0,0,0)),r=new Date(Date.UTC(n,o,1,0,0,0)),i=d):(a=new Date(Date.UTC(n,o,1,0,0,0)),r=new Date(Date.UTC(n,o+1,1,0,0,0)),i=new Date(Date.UTC(n,o+1,20,0,0,0))),p=(i.getTime()-t.getTime())/864e5,{cycleStart:a,cycleEnd:r,dueDate:i,dueInDays:p}),_=(0,s.getDbPool)(),b=await _.query(`
    SELECT
      t.id::text,
      t.direction::text AS direction,
      t.amount_minor::text,
      t.gst_amount::text,
      t.gst_rate::text,
      c.name AS category_name,
      t.metadata
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status IN ('posted', 'reversed')
      AND t.gst_applicable = TRUE
      AND t.occurred_at >= $2::timestamptz
      AND t.occurred_at < $3::timestamptz
    `,[e.workspaceId,I.cycleStart.toISOString(),I.cycleEnd.toISOString()]),m=0,f=0,g=0,A=[],S=[],k=[];for(let e of b.rows){let t=l(e.id);if(!t)continue;let a=function(e){let t=u(e.gst_amount);if(t>0)return t;let a=u(e.gst_rate);return a<=0?0:Math.abs(u(e.amount_minor))*a/100}(e);if(a<=0)continue;if("credit"===e.direction){m+=a,A.push(t);continue}let r=function(e){let t=h(e);if(t){for(let e of[t.gst_itc_eligible,t.itcEligible,t.gstItcEligible]){let t=w(e);if(void 0!==t)return t}for(let e of[t.gst,t.tax,t.claims]){let t=h(e);if(t)for(let e of[t.itcEligible,t.gstItcEligible,t.itc_eligible,t.inputCreditEligible]){let t=w(e);if(void 0!==t)return t}}}}(e.metadata),s=function(e){let t=(e??"").toLowerCase().replace(/[^a-z0-9\s/]/g," ").replace(/\s+/g," ").trim();return t.length>0&&v.some(e=>t.includes(e))}(e.category_name);(!0===r||void 0===r&&s)&&(f+=a,S.push(t),!function(e){let t=h(e);if(!t)return!1;if(!0===t.invoiceUploaded||!0===t.hasInvoice||y(t,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","invoice_url"])||E(t.attachments)||E(t.evidence)||E(t.proofs)||E(t.invoices))return!0;for(let e of["evidence","invoice","documents","proof"]){let a=h(t[e]);if(a&&(y(a,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","url"])||E(a.attachments)||E(a.files)))return!0}return!1}(e.metadata)&&(g+=a,k.push(t)))}return{outputGst:c(m),eligibleItc:c(f),dueDateIso:I.dueDate.toISOString(),dueInDays:c(I.dueInDays),dueCycleStartIso:I.cycleStart.toISOString(),dueCycleEndIso:I.cycleEnd.toISOString(),outputTxnIds:A.slice(0,200),itcTxnIds:S.slice(0,200),itcMismatchCount:k.length,itcMismatchAmount:c(g),itcMismatchTxnIds:k.slice(0,200)}}async function m(e){let t=Math.max(0,e.gstState.outputGst-e.gstState.eligibleItc),a=e.gstState.dueInDays,r=a>=0&&a<=e.lookaheadDays&&t>0,s=a<=2||t>=1e5?"critical":"warning",i=[...new Set([...e.gstState.outputTxnIds,...e.gstState.itcTxnIds])],n=e.gstState.dueDateIso.slice(0,10),o=await I({workspaceId:e.workspaceId,businessId:e.businessId,type:"gst_due",rule:"gst_due_v0",shouldOpen:r,severity:s,title:`GST due soon: ${p(t)} by ${n}`,body:`Estimated GST payable ${p(t)} (output ${p(e.gstState.outputGst)} - ITC ${p(e.gstState.eligibleItc)}). Due in ${Math.max(0,Math.ceil(a))} day(s).`,relatedTransactionIds:i,payload:{payableAmount:t,outputGst:e.gstState.outputGst,eligibleItc:e.gstState.eligibleItc,dueDate:e.gstState.dueDateIso,dueInDays:a,lookaheadDays:e.lookaheadDays,formula:"gst_due_when_due_date_within_window"}});return{payableAmount:c(t),dueInDays:c(a),alert:o}}async function f(e){let t=e.gstState.itcMismatchCount,a=e.gstState.itcMismatchAmount,r=t>e.threshold,s=t>=2*e.threshold?"critical":"warning",i=await I({workspaceId:e.workspaceId,businessId:e.businessId,type:"itc_mismatch",rule:"itc_mismatch_count_v0",shouldOpen:r,severity:s,title:`ITC mismatch risk: ${t} invoice(s) unmatched`,body:`${t} eligible ITC transaction(s) are missing invoice evidence. Potential ITC at risk ${p(a)}.`,relatedTransactionIds:e.gstState.itcMismatchTxnIds,payload:{mismatchCount:t,mismatchAmount:a,threshold:e.threshold,cycleStart:e.gstState.dueCycleStartIso,cycleEnd:e.gstState.dueCycleEndIso,formula:"itc_mismatch_when_unmatched_invoice_count_exceeds_threshold",fixAction:{label:"Upload invoice evidence",kind:"open_filter",preset:"itc_mismatch"}}});return{mismatchCount:t,mismatchAmount:a,threshold:e.threshold,alert:i}}async function g(e){let t=(0,s.getDbPool)(),a=(await t.query(`
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN t.occurred_at >= NOW() - INTERVAL '7 days' THEN t.amount_minor
            ELSE 0
          END
        ),
        0
      )::text AS refunds_this_week,
      COALESCE(
        SUM(
          CASE
            WHEN t.occurred_at >= NOW() - INTERVAL '35 days'
              AND t.occurred_at < NOW() - INTERVAL '7 days'
            THEN t.amount_minor
            ELSE 0
          END
        ),
        0
      )::text AS refunds_prev_4w
    FROM transactions t
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.direction = 'debit'
      AND t.occurred_at >= NOW() - INTERVAL '35 days'
      AND (
        COALESCE(t.description, '') ILIKE ANY($2::text[])
        OR COALESCE(t.counterparty, '') ILIKE ANY($2::text[])
        OR COALESCE(t.external_ref, '') ILIKE ANY($2::text[])
      )
    `,[e.workspaceId,$])).rows[0],r=u(a?.refunds_this_week),i=u(a?.refunds_prev_4w)/4,n=i>0&&r>i*e.ratioThreshold,o=i>0&&r>i*Math.max(1.5,e.ratioThreshold+.2)?"critical":"warning",d=(await t.query(`
    SELECT t.id::text
    FROM transactions t
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.direction = 'debit'
      AND t.occurred_at >= NOW() - INTERVAL '7 days'
      AND (
        COALESCE(t.description, '') ILIKE ANY($2::text[])
        OR COALESCE(t.counterparty, '') ILIKE ANY($2::text[])
        OR COALESCE(t.external_ref, '') ILIKE ANY($2::text[])
      )
    ORDER BY t.amount_minor DESC, t.occurred_at DESC
    LIMIT 200
    `,[e.workspaceId,$])).rows.map(e=>l(e.id)).filter(e=>null!==e),h=await I({workspaceId:e.workspaceId,businessId:e.businessId,type:"refund_spike",rule:"refund_spike_v0",shouldOpen:n,severity:o,title:`Refund spike detected: ${p(r)} this week`,body:`Refunds this week ${p(r)} vs 4-week weekly average ${p(i)} (threshold ${e.ratioThreshold.toFixed(2)}x).`,relatedTransactionIds:d,payload:{refundsThisWeek:c(r),avgRefunds4w:c(i),ratioThreshold:e.ratioThreshold,thresholdAmount:c(i*e.ratioThreshold),formula:"refunds_this_week > avg_4w * threshold",suggestedAction:{kind:"review_reversal_candidates",label:"Review potential reversals",evidenceTransactionIds:d.slice(0,50)}}});return{refundsThisWeek:c(r),avgRefunds4w:c(i),ratioThreshold:e.ratioThreshold,alert:h}}async function A(e){let t=(0,s.getDbPool)(),a=(await t.query(`
    SELECT
      COUNT(*) FILTER (WHERE t.status <> 'pending')::text AS total_count,
      COUNT(*) FILTER (WHERE t.status <> 'pending' AND t.matched = FALSE)::text AS unmatched_count
    FROM transactions t
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
    `,[e.workspaceId])).rows[0],r=Math.max(0,Math.trunc(u(a?.total_count))),i=Math.max(0,Math.trunc(u(a?.unmatched_count))),n=r>0?i/r*100:0,o=r>=20&&n>=e.thresholdPct,d=n>=Math.max(1.8*e.thresholdPct,20)?"critical":"warning",p=(await t.query(`
    SELECT t.id::text
    FROM transactions t
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.matched = FALSE
    ORDER BY t.occurred_at DESC, t.id DESC
    LIMIT 200
    `,[e.workspaceId])).rows.map(e=>l(e.id)).filter(e=>null!==e),h=await I({workspaceId:e.workspaceId,businessId:e.businessId,type:"reconciliation_gap",rule:"reconciliation_gap_v0",shouldOpen:o,severity:d,title:`Reconciliation gap: ${c(n)}% unmatched`,body:`${i} of ${r} posted transactions are unmatched (${c(n)}%).`,relatedTransactionIds:p,payload:{totalCount:r,unmatchedCount:i,gapPct:c(n),thresholdPct:e.thresholdPct,formula:"unmatched_pct > threshold_pct",fixAction:{label:"Review unmatched transactions",kind:"open_recon",recon:"unmatched"}}});return{totalCount:r,unmatchedCount:i,gapPct:c(n),thresholdPct:e.thresholdPct,alert:h}}async function S(e){let t=(0,s.getDbPool)(),a=(await t.query(`
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS cash_balance,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '30 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_30d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '60 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_60d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '90 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_90d
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
    `,[e.workspaceId])).rows[0],r=u(a?.cash_balance),i=u(a?.expense_30d)/30,n=u(a?.expense_60d)/60,o=u(a?.expense_90d)/90,d=(i+n+o)/3,l=d>0?r/d:999,h=l<e.thresholdDays,w=l<Math.max(5,e.thresholdDays/2)?"critical":"warning",y=await I({workspaceId:e.workspaceId,businessId:e.businessId,type:"cash_runway_risk",rule:"cash_runway_risk_v0",shouldOpen:h,severity:w,title:`Cash runway risk: ${Math.max(0,l).toFixed(1)} days`,body:`Cash balance ${p(r)} with avg burn ${p(d)}/day gives runway ${Math.max(0,l).toFixed(1)} days (threshold ${e.thresholdDays} days).`,relatedTransactionIds:[],payload:{runwayDays:c(l),thresholdDays:e.thresholdDays,cashBalance:c(r),avgDailyBurn:c(d),burnRateDaily30d:c(i),burnRateDaily60d:c(n),burnRateDaily90d:c(o),formula:"cash / avg_daily_burn < threshold_days"}});return{runwayDays:c(l),thresholdDays:e.thresholdDays,alert:y}}async function k(e){let t=(0,s.getDbPool)(),a=null;try{a=(await t.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'failed'
            AND COALESCE(started_at, created_at) >= NOW() - $2::interval
        )::text AS failed_runs,
        COUNT(*) FILTER (
          WHERE status = 'partial'
            AND COALESCE(started_at, created_at) >= NOW() - $2::interval
        )::text AS partial_runs,
        COALESCE(MAX(finished_at), MAX(started_at), MAX(created_at))::text AS last_run_at,
        MAX(CASE WHEN status = 'failed' THEN COALESCE(error, '') ELSE '' END)::text AS last_error
      FROM ingestion_runs
      WHERE workspace_id = $1::uuid
      `,[e.workspaceId,`${e.lookbackHours} hours`])).rows[0]??null}catch(t){if(function(e,t){if(!e||"object"!=typeof e)return!1;let a="code"in e?String(e.code??""):"";return"42P01"===a||(e instanceof Error?e.message.toLowerCase():"").includes(`relation "${t.toLowerCase()}" does not exist`)}(t,"ingestion_runs"))return{failedRuns:0,partialRuns:0,lookbackHours:e.lookbackHours,alert:{status:"none",alertId:null}};throw t}let r=Math.max(0,Math.trunc(u(a?.failed_runs))),i=Math.max(0,Math.trunc(u(a?.partial_runs))),n=await I({workspaceId:e.workspaceId,businessId:e.businessId,type:"sync_failure",rule:"sync_failure_v0",shouldOpen:r+i>0,severity:r>0?"critical":"warning",title:`Sync failure in last ${e.lookbackHours}h: ${r} failed, ${i} partial`,body:`Detected ${r} failed and ${i} partial ingestion run(s) in the last ${e.lookbackHours} hour(s).`,relatedTransactionIds:[],payload:{failedRuns:r,partialRuns:i,lookbackHours:e.lookbackHours,lastRunAt:a?.last_run_at??null,lastError:a?.last_error??null,formula:"failed_or_partial_ingestion_runs_in_lookback > 0"}});return{failedRuns:r,partialRuns:i,lookbackHours:e.lookbackHours,alert:n}}async function D(e){var t;let a=(0,s.getDbPool)(),r=(t=new Date,new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),1,0,0,0))),i=await a.query(`
    SELECT
      date_trunc('month', occurred_at AT TIME ZONE 'UTC')::date::text AS month_start,
      COALESCE(SUM(amount_minor), 0)::text AS expense
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND direction = 'debit'
      AND occurred_at >= ($2::timestamptz - INTERVAL '3 months')
      AND occurred_at < ($2::timestamptz + INTERVAL '1 month')
    GROUP BY 1
    ORDER BY 1 DESC
    `,[e.workspaceId,r.toISOString()]),n=r.toISOString().slice(0,10),o=0,d=[];for(let e of i.rows){let t=Math.abs(u(e.expense));if(e.month_start===n){o=t;continue}d.length<3&&d.push(t)}let h=d.length>0?d.reduce((e,t)=>e+t,0)/d.length:0,w=h>0?o/h:0,y=o-h,E=h>0&&w>=e.ratioThreshold&&y>=e.minDelta,_=w>=Math.max(1.8,e.ratioThreshold+.4)?"critical":"warning",b=(await a.query(`
    SELECT id::text
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND direction = 'debit'
      AND occurred_at >= $2::timestamptz
    ORDER BY amount_minor DESC, occurred_at DESC
    LIMIT 150
    `,[e.workspaceId,r.toISOString()])).rows.map(e=>l(e.id)).filter(e=>null!==e),m=await I({workspaceId:e.workspaceId,businessId:e.businessId,type:"anomaly_detected",rule:"expense_spike_anomaly_v0",shouldOpen:E,severity:_,title:`Expense anomaly: ${(100*w).toFixed(0)}% of baseline`,body:`Current month expenses ${p(o)} vs 3-month baseline ${p(h)} (${w.toFixed(2)}x).`,relatedTransactionIds:b,payload:{anomalyKind:"expense_spike",currentMonthExpense:c(o),baselineExpense:c(h),ratio:c(w),ratioThreshold:e.ratioThreshold,minDelta:e.minDelta,comparedMonths:d.length}});return{currentMonthExpense:c(o),baselineExpense:c(h),ratio:c(w),ratioThreshold:e.ratioThreshold,alert:m}}async function T(e){let t,a=e.gstDueLookaheadDays??7,r=e.itcMismatchThreshold??2,s=e.refundSpikeRatioThreshold??1.15,i=e.cashRunwayThresholdDays??10,d=e.reconciliationGapThresholdPct??8,l=e.syncFailureLookbackHours??24,u=e.anomalyRatioThreshold??1.35,c=e.anomalyMinDelta??1e4;if(!Number.isInteger(a)||a<=0||a>31)throw Error("gstDueLookaheadDays must be between 1 and 31");if(!Number.isInteger(r)||r<=0)throw Error("itcMismatchThreshold must be a positive integer");if(!Number.isFinite(s)||s<=1)throw Error("refundSpikeRatioThreshold must be greater than 1");if(!Number.isFinite(i)||i<=0)throw Error("cashRunwayThresholdDays must be a positive number");if(!Number.isFinite(d)||d<=0||d>100)throw Error("reconciliationGapThresholdPct must be between 0 and 100");if(!Number.isInteger(l)||l<=0||l>168)throw Error("syncFailureLookbackHours must be between 1 and 168");if(!Number.isFinite(u)||u<=1)throw Error("anomalyRatioThreshold must be greater than 1");if(!Number.isFinite(c)||c<0)throw Error("anomalyMinDelta must be a non-negative number");let p=e.sendWhatsAppDigest??!1,h=await (0,n.computeFinanceHealth)({workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:!1}),w=await b({workspaceId:e.workspaceId}),y=await m({workspaceId:e.workspaceId,businessId:e.businessId,lookaheadDays:a,gstState:w}),E=await f({workspaceId:e.workspaceId,businessId:e.businessId,threshold:r,gstState:w}),I=await g({workspaceId:e.workspaceId,businessId:e.businessId,ratioThreshold:s}),T=await A({workspaceId:e.workspaceId,businessId:e.businessId,thresholdPct:d}),N=await S({workspaceId:e.workspaceId,businessId:e.businessId,thresholdDays:i}),C=await k({workspaceId:e.workspaceId,businessId:e.businessId,lookbackHours:l}),v=await D({workspaceId:e.workspaceId,businessId:e.businessId,ratioThreshold:u,minDelta:c});if(await _(e.workspaceId),p)try{t=await (0,o.sendProactiveWhatsAppAlertDigest)({workspaceId:e.workspaceId,businessId:e.businessId,appBaseUrl:e.appBaseUrl})}catch(e){t={status:"failed",reason:"whatsapp_dispatch_error",alertCount:0,preview:"Failed to send proactive WhatsApp digest",error:e instanceof Error?e.message:"Unknown WhatsApp dispatch error"}}return{workspaceId:e.workspaceId,businessId:e.businessId,health:h,whatsAppDigest:t,alerts:{gstDue:y,itcMismatch:E,refundSpike:I,reconciliationGap:T,cashRunwayRisk:N,syncFailure:C,anomalyDetected:v}}}async function N(e){let t=new Date().toISOString(),a=(0,s.getDbPool)(),r=e?.limit,i=e?.sendWhatsAppDigest??!0;if(void 0!==r&&(!Number.isInteger(r)||r<=0||r>5e3))throw Error("limit must be between 1 and 5000");let n=[],o=void 0!==r?"LIMIT $1":"";void 0!==r&&n.push(r);let d=await a.query(`
    SELECT
      w.id::text AS workspace_id,
      w.business_id::text AS business_id
    FROM workspaces w
    INNER JOIN businesses b ON b.id = w.business_id
    WHERE COALESCE(b.is_active, TRUE) = TRUE
    ORDER BY w.id ASC
    ${o}
    `,n),u=[],c=[];for(let t of d.rows){let a=l(t.business_id);if(!a){c.push({workspaceId:t.workspace_id,businessId:0,error:`Invalid business id on workspace row: ${t.business_id}`});continue}try{let r=await T({workspaceId:t.workspace_id,businessId:a,gstDueLookaheadDays:e?.gstDueLookaheadDays,itcMismatchThreshold:e?.itcMismatchThreshold,refundSpikeRatioThreshold:e?.refundSpikeRatioThreshold,cashRunwayThresholdDays:e?.cashRunwayThresholdDays,reconciliationGapThresholdPct:e?.reconciliationGapThresholdPct,syncFailureLookbackHours:e?.syncFailureLookbackHours,anomalyRatioThreshold:e?.anomalyRatioThreshold,anomalyMinDelta:e?.anomalyMinDelta,sendWhatsAppDigest:i,appBaseUrl:e?.appBaseUrl});u.push(r)}catch(e){c.push({workspaceId:t.workspace_id,businessId:a,error:e instanceof Error?e.message:"Unknown error"})}}return{startedAt:t,finishedAt:new Date().toISOString(),scannedWorkspaces:d.rows.length,successCount:u.length,failureCount:c.length,results:u,failures:c}}e.s(["FIRST_FIVE_ALERT_TYPES",0,["gst_due","itc_mismatch","refund_spike","reconciliation_gap","cash_runway_risk","sync_failure","anomaly_detected"],"evaluateWorkspaceAlerts",()=>T,"runDailyAlertEvaluation",()=>N]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=apps_product_src_lib_0ca7d5d8._.js.map