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
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    locale?: string;
  } | null;
  subscription?: {
    plan_id?: string;
    amount_paise?: number;
    status?: string;
    retry_budget_used?: number;
  } | null;
  interventions?: Array<{
    id: string;
    seq: number;
    type: string;
    channel: string;
    status: string;
    policy_receipt?: {
      receipt_id?: string;
      verdict?: string;
      [key: string]: unknown;
    };
  }>;
  promises?: Array<{
    id: string;
    promised_date: string;
    status: string;
    confidence?: number;
  }>;
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

export interface VerifyCategory {
  name: string;
  tests_count: number;
  status: "passed" | "failed";
  proof: string;
}

export interface SystemVerifyResponse {
  total_tests: number;
  passing_tests: number;
  failed_tests: number;
  ast_invariants_proven: boolean;
  hmac_verified: boolean;
  openrouter_status: string;
  primary_model: string;
  fallback_model: string;
  categories: VerifyCategory[];
}

export interface StepItem {
  stage: string;
  actor: string;
  detail: string;
  proof: Record<string, unknown>;
}

export interface SingleStepResult {
  case_id: string;
  batch_id: string;
  customer?: string;
  amount?: string;
  order_id?: string;
  steps: StepItem[];
}

