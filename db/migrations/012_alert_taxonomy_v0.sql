-- Alert taxonomy v0 normalization for dashboard "smart alerts".
-- Canonical rule-engine types:
--   gst_due, itc_mismatch, refund_spike, reconciliation_gap,
--   cash_runway_risk, sync_failure, anomaly_detected

-- Map legacy rule-engine rows into the new taxonomy while preserving provenance.
UPDATE alerts
SET
  type = 'cash_runway_risk',
  alert_type = 'cash_runway_risk',
  payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
    'legacyType', 'cash_runway',
    'taxonomyVersion', 'v0'
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'legacyType', 'cash_runway',
    'taxonomyVersion', 'v0'
  )
WHERE type = 'cash_runway';

UPDATE alerts
SET
  type = 'reconciliation_gap',
  alert_type = 'reconciliation_gap',
  payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
    'legacyType', 'vendor_mismatch_risk',
    'taxonomyVersion', 'v0'
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'legacyType', 'vendor_mismatch_risk',
    'taxonomyVersion', 'v0'
  )
WHERE type = 'vendor_mismatch_risk';

UPDATE alerts
SET
  type = 'anomaly_detected',
  alert_type = 'anomaly_detected',
  payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
    'legacyType', type,
    'taxonomyVersion', 'v0'
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'legacyType', type,
    'taxonomyVersion', 'v0'
  )
WHERE type IN ('expense_spike_anomaly', 'itc_available');

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts
  ADD CONSTRAINT alerts_type_check
  CHECK (
    type IN (
      'gst_due',
      'itc_mismatch',
      'refund_spike',
      'reconciliation_gap',
      'cash_runway_risk',
      'sync_failure',
      'anomaly_detected',
      'duplicate',
      'unmatched'
    )
  );
