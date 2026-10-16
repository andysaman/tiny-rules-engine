import assert from "node:assert/strict";
import { test } from "node:test";
import { createTraceCollector } from "./observability.ts";

test("createTraceCollector records each onMatch event", () => {
  // Arrange
  const trace = createTraceCollector<string>();

  // Act
  trace.hooks.onMatch?.({ name: "alpha", result: "a" });
  trace.hooks.onMatch?.({ name: "beta", result: "b" });

  // Assert
  assert.deepEqual(trace.getTrace().hits, [
    { name: "alpha", result: "a" },
    { name: "beta", result: "b" },
  ]);
});

test("createTraceCollector getTrace returns a copy of hits", () => {
  // Arrange
  const trace = createTraceCollector<number>();
  trace.hooks.onMatch?.({ name: "once", result: 1 });

  // Act
  const first = trace.getTrace();
  first.hits.push({ name: "mutated", result: 99 });
  const second = trace.getTrace();

  // Assert
  assert.deepEqual(second.hits, [{ name: "once", result: 1 }]);
});

test("createTraceCollector starts with an empty trace", () => {
  // Arrange
  const trace = createTraceCollector();

  // Act
  const snapshot = trace.getTrace();

  // Assert
  assert.deepEqual(snapshot.hits, []);
});
