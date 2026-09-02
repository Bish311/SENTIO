export interface CaseItem {
  id: string;
  subscription_id: string;
  customer_id: string;
  state: "opened" | "diagnosed" | "in_recovery" | "settled" | "halted" | "closed";
  kind: "recovery" | "prevention";
  amount_at_risk_paise: number;
  root_cause: string | null;
  arm: "agent" | "baseline";
  batch_id: string | null;
  outcome: "recovered" | "exhausted" | "opted_out" | "prevented" | null;
  recovered_paise: number;
  opened_at: string | null;
}

export interface CaseDetail extends CaseItem {
  closed_at: string | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  timeline: CaseTimelineEvent[];
}

export interface CaseTimelineEvent {
  id: number;
  ts: string;
  actor: "system" | "agent" | "policy" | "reach" | "customer" | "admin" | "sim";
  event_type: string;
  payload: Record<string, unknown>;
}

export interface PolicyReceiptData {
  receipt_id: string;
  case_id: string;
  intervention_id: string;
  verdict: "allow" | "deny";
  evaluated_at: string;
  rules_evaluated: string[];
  violations: string[];
  context: Record<string, unknown>;
}

export interface DenialItem {
  event_id: number;
  case_id: string;
  ts: string;
  receipt: PolicyReceiptData;
}

export interface ArmMetrics {
  name: string;
  total_cases: number;
  recovered_cases: number;
  recovered_paise: number;
  recovery_rate: number;
  median_ttr_s: number;
}

export interface BatchMetricsResponse {
  batch_id: string;
  arm_a: ArmMetrics;
  arm_b: ArmMetrics;
  lift: number;
  guardrail_blocks: number;
}

export interface LedgerRow {
  case_id: string;
  customer_id: string;
  subscription_id: string;
  amount_at_risk_paise: number;
  recovered_paise: number;
  root_cause: string;
  arm: string;
  batch_id: string | null;
  opened_at: string;
  closed_at: string;
  duration_s: number;
}

export interface PreventionMetricsResponse {
  prevented_count: number;
  avoided_paise: number;
  total_prevention_cases: number;
}
