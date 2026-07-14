import assert from "node:assert/strict";
import test from "node:test";
import { EvaluationSource } from "@prisma/client";
import {
  createEvaluationErrorState,
  createEvaluationSuccessState,
  getEvaluationActionTone,
  initialEvaluationActionState,
} from "@/lib/evaluations/action-state";

test("OpenRouter success returns success with usedFallback false", () => {
  const state = createEvaluationSuccessState({
    evaluationId: "eval-openrouter",
    source: EvaluationSource.HYBRID,
  });

  assert.equal(state.status, "success");
  assert.equal(state.message, "Candidate evaluation completed.");
  assert.equal(state.evaluationId, "eval-openrouter");
  assert.equal(state.usedFallback, false);
  assert.equal(getEvaluationActionTone(state), "success");
});

test("OpenRouter timeout with deterministic fallback returns informational success", () => {
  const state = createEvaluationSuccessState({
    evaluationId: "eval-timeout",
    source: EvaluationSource.DETERMINISTIC,
  });

  assert.equal(state.status, "success");
  assert.equal(state.usedFallback, true);
  assert.match(state.message, /deterministic scoring/i);
  assert.equal(getEvaluationActionTone(state), "info");
});

test("invalid OpenRouter JSON with deterministic fallback returns success", () => {
  const state = createEvaluationSuccessState({
    evaluationId: "eval-invalid-json",
    source: EvaluationSource.DETERMINISTIC,
  });

  assert.equal(state.status, "success");
  assert.equal(state.usedFallback, true);
});

test("OpenRouter 429 after retries with deterministic fallback returns success", () => {
  const state = createEvaluationSuccessState({
    evaluationId: "eval-rate-limited",
    source: EvaluationSource.DETERMINISTIC,
  });

  assert.equal(state.status, "success");
  assert.equal(state.usedFallback, true);
});

test("permanent provider 4xx with deterministic fallback returns success", () => {
  const state = createEvaluationSuccessState({
    evaluationId: "eval-client-error",
    source: EvaluationSource.DETERMINISTIC,
  });

  assert.equal(state.status, "success");
  assert.equal(state.usedFallback, true);
});

test("database persistence failure returns an error state", () => {
  const state = createEvaluationErrorState("Candidate evaluation could not be completed.");

  assert.equal(state.status, "error");
  assert.equal(state.evaluationId, undefined);
  assert.equal(state.usedFallback, undefined);
  assert.equal(getEvaluationActionTone(state), "error");
});

test("completed evaluations never return an error result", () => {
  const state = createEvaluationSuccessState({
    evaluationId: "eval-completed",
    source: EvaluationSource.HYBRID,
  });

  assert.notEqual(state.status, "error");
  assert.equal(state.evaluationId, "eval-completed");
});

test("legacy compatibility writes are represented by transactional success", () => {
  const state = createEvaluationSuccessState({
    evaluationId: "eval-transactional",
    source: EvaluationSource.HYBRID,
  });

  assert.equal(state.status, "success");
  assert.equal(state.message, "Candidate evaluation completed.");
});

test("successful second submission replaces a previous error state", () => {
  const first = createEvaluationErrorState("Database transaction failed.");
  const second = createEvaluationSuccessState({
    evaluationId: "eval-second",
    source: EvaluationSource.DETERMINISTIC,
  });

  assert.equal(first.status, "error");
  assert.equal(second.status, "success");
  assert.equal(second.evaluationId, "eval-second");
});

test("error styling is only used for status error", () => {
  assert.equal(getEvaluationActionTone(initialEvaluationActionState), "idle");
  assert.equal(getEvaluationActionTone(createEvaluationErrorState("failed")), "error");
  assert.equal(
    getEvaluationActionTone(createEvaluationSuccessState({ evaluationId: "ok", source: EvaluationSource.HYBRID })),
    "success",
  );
  assert.equal(
    getEvaluationActionTone(createEvaluationSuccessState({ evaluationId: "fallback", source: EvaluationSource.DETERMINISTIC })),
    "info",
  );
});
