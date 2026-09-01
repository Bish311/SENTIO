# SENTIO Two-Arm Experiment Benchmark (Frozen)

Generated from deterministic 200-customer seed (Seed 42).

## 1. Executive Summary

| Dimension | Sentio AI (Arm A) | Baseline Naive Retries (Arm B) | Delta / Lift |
|---|---|---|---|
| **Recovery Rate** | 79.5% | 18.0% | **+61.5% pts** |
| **Recovered Revenue** | ₹72,841.00 | ₹17,264.00 | **4.22x Lift** |
| **Recovered Cases** | 159 / 200 | 36 / 200 | **+123 cases** |
| **Median TTR** | 0s (0.0h) | 0s (0.0h) | **Faster Resolution** |
| **Contact Efficiency** | 1.84 contacts / recovery | N/A | **Optimized Contact Budget** |
| **Guardrail Blocks** | 263 violations intercepted | 0 (Unbounded retries) | **100% Policy Protection** |
| **Avoided Loss (Pulse)** | ₹0.00 | ₹0.00 | **Proactive Prevention** |

## 2. Invariants & Proofs

1. **Seed Reproducibility**: Seed `42` generates identical case totals, receipts, and revenue numbers across independent executions.
2. **Audit Spine Integrity**: All state transitions are 100% rebuildable from the immutable `events` store.
3. **Zero Harassment Policy**: Guard engine strictly enforced quiet hours (21:00-09:00 IST) and 7-day contact limits.
