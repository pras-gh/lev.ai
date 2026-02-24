-- Extend alert types for first-five production alerts and retire legacy open types.

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts
  ADD CONSTRAINT alerts_type_check
  CHECK (
    type IN (
      'gst_due',
      'cash_runway',
      'itc_available',
      'vendor_mismatch_risk',
      'expense_spike_anomaly',
      'itc_mismatch',
      'unmatched',
      'duplicate'
    )
  );

UPDATE alerts
SET
  status = 'resolved',
  resolved_at = NOW(),
  payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
    'resolution',
    jsonb_build_object(
      'action', 'auto_resolve',
      'reason', 'retired by first-five alert engine rollout'
    )
  )
WHERE status IN ('open', 'snoozed')
  AND type IN ('itc_mismatch', 'unmatched', 'duplicate');
