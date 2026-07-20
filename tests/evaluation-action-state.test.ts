import assert from "node:assert/strict";
import test from "node:test";
import { EvaluationSource } from "@prisma/client";
import {
  createEvaluationErrorState,
  createEvaluationSuccessState,
  getEvaluationActionTone,
  initialEvaluationActionState,
} from "@/lib/evaluations/action-state";

test("semantic AI and narrative AI success report a hybrid evaluation", () => {
  const state = createEvaluationSuccessState({ evaluationId: "eval-hybrid", source: EvaluationSource.HYBRID, narrativeSource: "openrouter" });
  assert.equal(state.status, "success");
  assert.equal(state.message, "AI-assisted evaluation completed.");
  assert.equal(getEvaluationActionTone(state), "success");
});

test("semantic AI success with narrative fallback remains hybrid", () => {
  const state = createEvaluationSuccessState({ evaluationId: "eval-hybrid-fallback-narrative", source: EvaluationSource.HYBRID, narrativeSource: "deterministic" });
  assert.match(state.message, /AI-assisted scoring completed/i);
  assert.equal(getEvaluationActionTone(state), "info");
});

test("semantic fallback with narrative AI success reports deterministic scoring and AI commentary", () => {
  const state = createEvaluationSuccessState({ evaluationId: "eval-deterministic-ai-narrative", source: EvaluationSource.DETERMINISTIC, narrativeSource: "openrouter" });
  assert.equal(state.message, "Evaluation completed using deterministic scoring with AI-generated commentary.");
  assert.equal(getEvaluationActionTone(state), "info");
});

test("semantic and narrative fallback report fully deterministic analysis", () => {
  const state = createEvaluationSuccessState({ evaluationId: "eval-deterministic", source: EvaluationSource.DETERMINISTIC, narrativeSource: "deterministic" });
  assert.match(state.message, /AI analysis was unavailable/i);
  assert.equal(getEvaluationActionTone(state), "info");
});

test("error styling is reserved for failed evaluations", () => {
  assert.equal(getEvaluationActionTone(initialEvaluationActionState), "idle");
  assert.equal(getEvaluationActionTone(createEvaluationErrorState("failed")), "error");
});
