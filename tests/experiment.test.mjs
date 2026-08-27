import test from "node:test";
import assert from "node:assert/strict";
import { anonymousId, ctaCopy, pickVariant } from "../src/experiment.js";

test("query assignment overrides storage and only permits A or B", () => {
  assert.equal(pickVariant("?variant=b", "a"), "b");
  assert.equal(pickVariant("?variant=invalid", "a"), "a");
  assert.match(pickVariant("", ""), /^[ab]$/);
});

test("both languages have two materially different CTA variants", () => {
  assert.notEqual(ctaCopy("zh", "a"), ctaCopy("zh", "b"));
  assert.notEqual(ctaCopy("en", "a"), ctaCopy("en", "b"));
});

test("anonymous experiment ID accepts only constrained stored identifiers", () => {
  assert.equal(anonymousId("safe-anonymous-123"), "safe-anonymous-123");
  assert.notEqual(anonymousId("<script>"), "<script>");
});
