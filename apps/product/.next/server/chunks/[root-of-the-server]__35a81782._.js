module.exports=[66680,(e,t,a)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},23796,e=>e.a(async(t,a)=>{try{var i=e.i(21902),n=e.i(51837),r=t([i,n]);function o(e){return void 0===e?null:JSON.stringify(e)}async function s(e,t){let a=t??(0,n.getDbPool)();await a.query(`
    INSERT INTO audit_logs (
      workspace_id,
      business_id,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      action,
      before_state,
      after_state,
      request_id,
      ip_address,
      user_agent
    )
    VALUES (
      $1::uuid,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8::jsonb,
      $9::jsonb,
      $10,
      $11::inet,
      $12
    )
    `,[e.workspaceId,e.businessId??null,e.actorType,e.actorId??null,e.entityType,String(e.entityId),e.action,o(e.beforeState),o(e.afterState),e.requestId??null,e.ipAddress??null,e.userAgent??null])}async function c(e,t){try{await s(e,t)}catch(e){if(function(e){if(!e||"object"!=typeof e)return!1;let t="code"in e?String(e.code??""):"";return"42P01"===t||(e instanceof Error?e.message.toLowerCase():"").includes('relation "audit_logs" does not exist')}(e))return}}[i,n]=r.then?(await r)():r,e.s(["writeAuditLogSafe",()=>c]),a()}catch(e){a(e)}},!1),76617,e=>e.a(async(t,a)=>{try{var i=e.i(21902),n=e.i(51837),r=t([i,n]);[i,n]=r.then?(await r)():r;let f=["marketing","saas","software","logistics","shipping","rent","utilities","fixed cost","internet","electricity","office","operations","professional","subscription"];function o(e){if(null==e)return 0;let t="number"==typeof e?e:Number(e);return Number.isFinite(t)?t:0}function s(e){return Number(e.toFixed(2))}function c(e,t,a){return Math.min(a,Math.max(t,e))}function u(e,t){for(let a of t)if(Object.prototype.hasOwnProperty.call(e,a)){let t=e[a];if(null!=t&&""!==t)return!0}return!1}function d(e){return!!Array.isArray(e)&&e.length>0}function l(e){return!e||"object"!=typeof e||Array.isArray(e)?null:e}function p(e){return`₹${Math.abs(e).toLocaleString("en-IN",{maximumFractionDigits:2})}`}function g(e){let t=l(e);if(!t)return null;for(let e of["bank_balance","bankBalance","cash_balance","cashBalance","closing_balance","closingBalance","balance"]){let a=t[e],i=o("string"==typeof a||"number"==typeof a?a:null);if(i>0)return i}for(let e of[t.manual,t.bank,t.summary]){let t=g(e);if(null!==t&&t>0)return t}return null}async function y(e){try{for(let t of(await e.client.query(`
      SELECT meta
      FROM integrations
      WHERE workspace_id = $1::uuid
        AND status IN ('connected', 'syncing')
      ORDER BY updated_at DESC
      LIMIT 10
      `,[e.workspaceId])).rows){let e=g(t.meta);if(null!==e&&e>0)return e}}catch{}for(let t of(await e.client.query(`
    SELECT metadata
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
    ORDER BY occurred_at DESC, id DESC
    LIMIT 200
    `,[e.workspaceId])).rows){let e=g(t.metadata);if(null!==e&&e>0)return e}return Math.max(0,e.fallbackFromLedger)}async function b(e){let t=await e.client.query(`
    SELECT id::text
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND type = $2
      AND status IN ('open', 'snoozed')
    ORDER BY created_at DESC, id DESC
    `,[e.workspaceId,e.type]);if(!e.shouldOpen){if(0===t.rows.length)return;await e.client.query(`
      UPDATE alerts
      SET
        status = 'resolved',
        resolved_at = NOW(),
        payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
        metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
      WHERE workspace_id = $1::uuid
        AND type = $2
        AND status IN ('open', 'snoozed')
      `,[e.workspaceId,e.type,JSON.stringify({resolution:{action:"auto_resolve",reason:"metric back within threshold"}})]);return}let a=e.relatedTransactionIds??[],i={...e.payload,explainable:!0,generatedAt:new Date().toISOString()};if(0===t.rows.length)return void await e.client.query(`
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
      `,[e.businessId,e.workspaceId,a[0]??null,e.type,e.severity,e.body,e.title,e.body,JSON.stringify(a),JSON.stringify(i)]);let n=t.rows[0]?.id;if(n&&await e.client.query(`
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
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,[n,e.workspaceId,e.severity,e.body,e.title,e.body,a[0]??null,JSON.stringify(a),JSON.stringify(i)]),t.rows.length>1){let a=t.rows.slice(1).map(e=>Number.parseInt(e.id,10)).filter(e=>Number.isInteger(e)&&e>0);a.length>0&&await e.client.query(`
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE workspace_id = $1::uuid
          AND id = ANY($2::bigint[])
        `,[e.workspaceId,a,JSON.stringify({resolution:{action:"auto_resolve",reason:"superseded by latest computed alert"}})])}}async function m(e){var t;let a,i,n,r,g,m,E,_=(r=(t=new Date).getUTCFullYear(),g=t.getUTCMonth(),m=new Date(Date.UTC(r,g,20,0,0,0)),t.getTime()<=m.getTime()?(a=new Date(Date.UTC(r,g-1,1,0,0,0)),i=new Date(Date.UTC(r,g,1,0,0,0)),n=m):(a=new Date(Date.UTC(r,g,1,0,0,0)),i=new Date(Date.UTC(r,g+1,1,0,0,0)),n=new Date(Date.UTC(r,g+1,20,0,0,0))),E=(n.getTime()-t.getTime())/864e5,{cycleStart:a,cycleEnd:i,dueDate:n,dueInDays:E}),w=(await e.client.query(`
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS all_credit,
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS all_debit,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '30 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_30d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '60 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_60d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '90 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_90d,
      COUNT(*) FILTER (WHERE status <> 'pending')::text AS total_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND matched = TRUE)::text AS matched_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND category_id IS NOT NULL)::text AS categorized_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND gst_applicable = TRUE)::text AS gst_applicable_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND gst_applicable = TRUE AND gst_amount IS NOT NULL)::text AS gst_tagged_count
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
    `,[e.workspaceId])).rows[0];if(!w)throw Error("Failed to compute aggregates");let h=await e.client.query(`
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
    ORDER BY t.occurred_at DESC, t.id DESC
    `,[e.workspaceId,_.cycleStart.toISOString(),_.cycleEnd.toISOString()]),N=0,S=0,I=0,A=[];for(let e of h.rows){let t=Number.parseInt(e.id,10);if(!Number.isInteger(t)||t<=0)continue;let a=function(e){let t=o(e.gst_amount);if(t>0)return t;let a=o(e.gst_rate);return a<=0?0:Math.abs(o(e.amount_minor))*a/100}(e);if(!(a<=0)){if("credit"===e.direction){N+=a;continue}"debit"===e.direction&&function(e){let t=(e??"").toLowerCase().replace(/[^a-z0-9\s/]/g," ").replace(/\s+/g," ").trim();return!!t&&f.some(e=>t.includes(e))}(e.category_name)&&(S+=a,!function(e){let t=l(e);if(!t)return!1;if(!0===t.invoiceUploaded||!0===t.hasInvoice||u(t,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","invoice_url"])||d(t.attachments)||d(t.evidence)||d(t.proofs)||d(t.invoices))return!0;for(let e of["evidence","invoice","documents","proof"]){let a=l(t[e]);if(a&&(u(a,["invoiceId","invoiceNo","invoiceNumber","invoiceUrl","url"])||d(a.attachments)||d(a.files)))return!0}return!1}(e.metadata)&&(I+=a,A.push(t)))}}let T=Math.max(0,N-S),$=_.dueInDays>=0&&_.dueInDays<=7,D=$?T:0,O=o(w.all_credit),C=o(w.all_debit),R=await y({client:e.client,workspaceId:e.workspaceId,fallbackFromLedger:O-C}),v=o(w.expense_30d),k=o(w.expense_60d),L=o(w.expense_90d),x=v/30,M=k/60,H=L/90,U=(x+M+H)/3,F=30*U,W=F>0?R/F:99,j=o(w.total_count),q=o(w.matched_count),z=o(w.categorized_count),B=o(w.gst_applicable_count),V=o(w.gst_tagged_count),J=j>0?q/j*100:100,G=B>0?V/B*100:100,P=A.length,Y=c(4*P,0,50),Z=10*(W<3),K=c(.45*(j>0?z/j*100:100)+.45*J+.1*G-.2*Y-Z,0,100),Q=c(.7*G+(100-Y)*.3,0,100);if(e.syncAlerts){let t=T>=1e4?"critical":"warning",a=$&&T>5e3;await b({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"gst_due",shouldOpen:a,severity:t,title:`GST net due ${p(T)} by ${_.dueDate.toISOString().slice(0,10)}`,body:`Output GST ${p(N)} - Input GST ${p(S)} = Net due ${p(T)}. Due date ${_.dueDate.toISOString().slice(0,10)} (${Math.max(0,Math.ceil(_.dueInDays))} day(s)). Threshold ${p(5e3)}.`,relatedTransactionIds:[],payload:{netDue:s(T),outputGst:s(N),inputGst:s(S),threshold:5e3,dueDate:_.dueDate.toISOString(),dueInDays:s(_.dueInDays),fixAction:{label:"Review GST transactions",kind:"open_filter",preset:"gst_due"}}}),await b({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"itc_mismatch",shouldOpen:P>0,severity:P>=10?"critical":"warning",title:`ITC mismatch: ${P} transaction(s) missing invoice evidence`,body:`${P} input-GST transaction(s) have no invoice evidence. Potential blocked ITC ${p(I)} in current cycle.`,relatedTransactionIds:A.slice(0,200),payload:{mismatchCount:P,mismatchAmount:s(I),cycleStart:_.cycleStart.toISOString(),cycleEnd:_.cycleEnd.toISOString(),fixAction:{label:"Upload invoices",kind:"open_filter",preset:"itc_mismatch"}}});let i=W<1.5?"critical":"warning";await b({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,type:"cash_runway_risk",shouldOpen:W<3,severity:i,title:`Cash runway ${W.toFixed(1)} month(s)`,body:`Cash balance ${p(R)}. Burn (30/60/90d): ${p(v/30)}/${p(k/60)}/${p(L/90)} per day. Weighted monthly burn ${p(F)}. Runway ${W.toFixed(1)} months.`,relatedTransactionIds:[],payload:{cashBalance:s(R),burnRateDaily30d:s(x),burnRateDaily60d:s(M),burnRateDaily90d:s(H),monthlyBurn:s(F),runwayMonths:s(W),warningThresholdMonths:3,criticalThresholdMonths:1.5,fixAction:{label:"Review unmatched cash drivers",kind:"open_recon",recon:"unmatched"}}})}let X=await e.client.query(`
    SELECT COUNT(*)::text AS count
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND status = 'open'
      AND severity = 'critical'
    `,[e.workspaceId]),ee=o(X.rows[0]?.count),et=c(K-5*ee,0,100);return{cash_runway_months:s(W),gst_due_amount_next_7d:s(D),itc_mismatch_count:P,recon_match_pct:s(J),month_close_readiness_pct:s(et),compliance_confidence:s(Q)}}async function E(e){let t=e.syncAlerts??!0;if(e.client)return m({client:e.client,workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:t});let a=(0,n.getDbPool)(),i=await a.connect();try{await i.query("BEGIN");let a=await m({client:i,workspaceId:e.workspaceId,businessId:e.businessId,syncAlerts:t});return await i.query("COMMIT"),a}catch(e){throw await i.query("ROLLBACK"),e}finally{i.release()}}e.s(["computeFinanceHealth",()=>E]),a()}catch(e){a(e)}},!1),86610,e=>{"use strict";var t=e.i(63021);let a=[{category:"revenue",weight:3,patterns:[/\brazorpay\b.*\bsettlement\b/i,/\bsettlement\b.*\brazorpay\b/i,/\bstripe\b.*\bpayout\b/i,/\bpayout\b.*\bstripe\b/i,/\bpayment received\b/i,/\bpayment\s+rec(?:eive|ei)db?\b/i]},{category:"tax",weight:3,patterns:[/\bgst\b/i,/\bgstr\b/i,/\bcbic\b/i,/\btax payment\b/i,/\bsgst\b/i,/\bcgst\b/i,/\bigst\b/i,/\btax\b/i,/\btds\b/i]},{category:"payroll",weight:3,patterns:[/\bsalary\b/i,/\bpayroll\b/i,/\bpf\b/i,/\besic\b/i,/\besi\b/i,/\bstipend\b/i,/\bwages?\b/i]},{category:"marketing",weight:3,patterns:[/\bfacebook ads\b/i,/\bgoogle ads\b/i,/\bmeta ads\b/i,/\bad spend\b/i,/\badvertising\b/i,/\bfb ads\b/i]},{category:"saas",weight:3,patterns:[/\bzoho\b/i,/\baws\b/i,/\bnotion\b/i,/\bopenai\b/i,/\bsoftware\b/i]},{category:"logistics",weight:3,patterns:[/\bdelhivery\b/i,/\bshiprocket\b/i,/\bcourier\b/i,/\bshipping\b/i]},{category:"rent/utilities",weight:3,patterns:[/\brent\b/i,/\belectricity\b/i,/\binternet\b/i,/\blease\b/i,/\bpower bill\b/i,/\butility\b/i]}];globalThis.prisma??new t.PrismaClient({log:["error"]});let i=e=>e.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim(),n=e=>i(e);function r(e){let t=i([e.description,e.merchant,e.reference].filter(e=>!!(e&&e.trim())).join(" "));if(!t)return{categoryName:null,confidence:0,tags:[]};let n=null;for(let e of a){let a=0;for(let i of e.patterns)i.test(t)&&(a+=1);if(!a)continue;let i=a*(e.weight??1);(!n||i>n.score)&&(n={category:e.category,score:i,matched:e.category})}if(!n)return{categoryName:null,confidence:0,tags:[]};let r=n.score>=6?.9:n.score>=3?.8:.65;return{categoryName:n.category,confidence:r,matchedRule:n.matched,tags:["rules:v0",`bucket:${n.category}`]}}function o(e){return new Map(e.map(e=>[n(e.name),e.id]))}function s(e){let t=n(e.categoryName);for(let a of({tax:["tax","taxes","gst"],payroll:["payroll","salary","salaries"],revenue:["revenue","sales revenue","other income","income"],marketing:["marketing","facebook ads","google ads","advertising","ads"],saas:["saas","software","tools","subscriptions"],logistics:["logistics","shipping","courier","delhivery","shiprocket"],"rent/utilities":["rent/utilities","rent and utilities","rent","utilities","electricity","internet","fixed cost"]})[t]??[t]){let t=e.categoryMap.get(n(a));if(t)return t}return null}e.s(["CATEGORIZE_V0_TARGET_RATE",0,.8,"CATEGORIZE_V0_VERSION",0,"v0","buildCategoryNameIdMap",()=>o,"categorizeTransactionV0",()=>r,"resolveCategoryIdByCategoryName",()=>s])},25417,e=>{"use strict";var t=e.i(66680);let a=["account","accountno","accountnumber","ac","acno","acnumber","acct","acctno","bankaccount","sourceaccount","fromaccount"];function i(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}function n(e){return e.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()}function r(e){return n(e.map(e=>"string"==typeof e?e.trim():"").filter(e=>e.length>0).join(" "))}function o(e){let a,i,r,o,s=(a=function(e){let t=e instanceof Date?e:new Date(e);if(Number.isNaN(t.getTime()))throw Error("date must be a valid date string");return t.toISOString().slice(0,10)}(e.date),i=function(e){if("bigint"==typeof e)return`${e.toString()}.00`;let t=Number(("number"==typeof e?String(e):e).trim().replace(/[,\s]/g,"").replace(/[₹$€£]/g,""));if(!Number.isFinite(t))throw Error("amount must be a valid numeric value");return Math.abs(t).toFixed(2)}(e.amount),r=n(e.description??""),o=n(e.account??""),`${a}|${i}|${r}|${o}`);return(0,t.createHash)("sha256").update(s).digest("hex")}function s(e){for(let[t,i]of Object.entries(e)){let e=t.trim().toLowerCase().replace(/[^a-z0-9]/g,"");if(!a.includes(e))continue;let n=function(e){if("string"==typeof e){let t=e.trim();return t.length>0?t:void 0}if("number"==typeof e||"bigint"==typeof e){let t=String(e).trim();return t.length>0?t:void 0}}(i);if(n)return n}}function c(e){if(!i(e))return;let t=s(e);if(t)return t;for(let t of[e.raw,e.bank,e.account]){if(!i(t))continue;let e=s(t);if(e)return e}}e.s(["buildHashDescription",()=>r,"computeTransactionHash",()=>o,"extractAccountHintFromMetadata",()=>c,"extractAccountHintFromRecord",()=>s])},79661,e=>e.a(async(t,a)=>{try{var i=e.i(21902),n=e.i(51837),r=e.i(23796),o=e.i(86610),s=e.i(25417),c=t([i,n,r]);function u(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}function d(e,t){let a=[...t].sort((e,t)=>e-t);return`dup:${e}:${a.join(",")}`}async function l(e,t){let a=await e.query(`
    SELECT payload->>'fingerprint' AS fingerprint
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND type = 'duplicate'
      AND status IN ('open', 'snoozed')
    `,[t]);return new Set(a.rows.map(e=>e.fingerprint).filter(e=>!!e))}async function p(e){let t=e.limit??1e3,a=e.confidenceThreshold??.65,i=e.includeDeleted??!1;if(!Number.isInteger(t)||t<=0||t>1e4)throw Error("limit must be an integer between 1 and 10000");if(a<0||a>1)throw Error("confidenceThreshold must be between 0 and 1");let c=(0,n.getDbPool)(),p=await c.connect();try{await p.query("BEGIN");let n=await p.query(`
      SELECT id::text, name
      FROM categories
      WHERE workspace_id = $1::uuid
      `,[e.workspaceId]),c=(0,o.buildCategoryNameIdMap)(n.rows.map(e=>{try{return{id:BigInt(e.id),name:e.name}}catch{return null}}).filter(e=>!!e)),g=await p.query(`
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
        ${i?"":"AND t.is_hidden = FALSE"}
      ORDER BY t.occurred_at DESC, t.id DESC
      LIMIT $2
      `,[e.workspaceId,t]),y=0,b=0,m=new Map;for(let t of g.rows){let i=function(e){let t=Number.parseInt(e,10);return Number.isInteger(t)&&t>0?t:null}(t.id);if(null===i)continue;let n=(0,o.categorizeTransactionV0)({description:t.description,merchant:t.counterparty,reference:t.external_ref}),d=n.categoryName?(0,o.resolveCategoryIdByCategoryName)({categoryName:n.categoryName,categoryMap:c}):null,l=(0,s.buildHashDescription)([t.description,t.counterparty,t.external_ref]),g=(0,s.extractAccountHintFromMetadata)(t.metadata)??t.counterparty??null,E=(0,s.computeTransactionHash)({date:t.occurred_at,amount:t.amount_minor,description:l,account:g}),f=m.get(E)??[];f.push(i),m.set(E,f);let _=u(t.metadata)?t.metadata:{},w=u(_.dedupe)?_.dedupe:{},h=u(_.categorization)?_.categorization:{},N={..._,dedupe:{...w,hash:E,formula:"sha256(date|amount|normalized_desc|account)"}};n.categoryName&&n.confidence>=a&&(N.categorization={...h,version:o.CATEGORIZE_V0_VERSION,autoTagged:null!==d,categoryName:n.categoryName,confidence:n.confidence,matchedRule:n.matchedRule??null,tags:n.tags});let S=JSON.stringify(_)!==JSON.stringify(N),I=null===t.category_id&&null!==d&&n.confidence>=a;if(!S&&!I)continue;let A=[String(i),JSON.stringify(N),e.workspaceId],T=["metadata = $2::jsonb","updated_at = NOW()"];I&&null!==d&&(A.push(d.toString()),T.push(`category_id = $${A.length}`),A.push(n.confidence.toString()),T.push(`confidence = $${A.length}::numeric`),y+=1),await p.query(`
        UPDATE transactions
        SET ${T.join(", ")}
        WHERE id = $1::bigint
          AND workspace_id = $3::uuid
        `,A),b+=1,I&&null!==d&&await (0,r.writeAuditLogSafe)({workspaceId:e.workspaceId,businessId:t.business_id,actorType:"system",actorId:"trail_rules_v0",entityType:"transaction",entityId:t.id,action:"trail.transaction.auto_categorized",beforeState:{categoryId:t.category_id,confidence:null},afterState:{categoryId:d.toString(),confidence:n.confidence,matchedRule:n.matchedRule??null,modelVersion:o.CATEGORIZE_V0_VERSION,evidence:{transactionIds:[i],source:"rules_engine_v0",description:t.description,counterparty:t.counterparty,externalRef:t.external_ref}}},p)}let E=[...m.entries()].map(([e,t])=>({hash:e,ids:[...new Set(t)].sort((e,t)=>e-t)})).filter(e=>e.ids.length>1),f=E.map(e=>d(e.hash,e.ids)),_=await l(p,e.workspaceId),w=0;for(let t of E){let a=d(t.hash,t.ids);_.has(a)||(await p.query(`
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
        `,[e.businessId,e.workspaceId,t.ids[0],`${t.ids.length} transaction(s) share the same hash. Action: Merge / Ignore.`,JSON.stringify(t.ids),JSON.stringify({source:"rules_engine_v0",fingerprint:a,hash:t.hash,suggestedAction:"merge",suggestedKeepTransactionId:t.ids[0]??null})]),_.add(a),w+=1)}f.length>0?await p.query(`
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
        `,[e.workspaceId,JSON.stringify({resolution:{action:"auto_resolve",reason:"no active duplicate groups"}})]);let h=await p.query(`
      SELECT COUNT(*)::text AS count
      FROM alerts
      WHERE workspace_id = $1::uuid
        AND type = 'duplicate'
        AND status = 'open'
      `,[e.workspaceId]),N=Number(h.rows[0]?.count??"0"),S=await p.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_hidden = FALSE)::text AS total,
        COUNT(*) FILTER (WHERE is_hidden = FALSE AND category_id IS NOT NULL)::text AS tagged
      FROM transactions
      WHERE workspace_id = $1::uuid
      `,[e.workspaceId]),I=Number(S.rows[0]?.total??"0"),A=Number(S.rows[0]?.tagged??"0");return await p.query("COMMIT"),{scanned:g.rows.length,updated:b,tagged:y,duplicateSuggestionsCreated:w,duplicateSuggestionsOpen:N,coverage:{total:I,tagged:A,ratio:I>0?A/I:0}}}catch(e){throw await p.query("ROLLBACK"),e}finally{p.release()}}[i,n,r]=c.then?(await c)():c,e.s(["applyRulesV0ForWorkspace",()=>p]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__35a81782._.js.map