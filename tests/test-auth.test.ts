import assert from "node:assert/strict";
import test from "node:test";
import { canEnableTestAuth, isTestAuthUserKey } from "@/lib/test-auth";

test("test authentication requires its explicit flag and is disabled in production", () => {
  assert.equal(canEnableTestAuth({ nodeEnv: "test", enabled: "true" }), true);
  assert.equal(canEnableTestAuth({ nodeEnv: "development", enabled: "true" }), true);
  assert.equal(canEnableTestAuth({ nodeEnv: "production", enabled: "true" }), false);
  assert.equal(canEnableTestAuth({ nodeEnv: "test", enabled: "false" }), false);
  assert.equal(isTestAuthUserKey("admin"), true);
  assert.equal(isTestAuthUserKey("arbitrary-user"), false);
});
