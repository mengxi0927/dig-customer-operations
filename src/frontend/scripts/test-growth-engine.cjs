const { test } = require("node:test"),
  assert = require("node:assert/strict");
const ts = require("typescript"),
  fs = require("node:fs"),
  vm = require("node:vm");
const ctx = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("lib/growth-engine.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  ctx,
);
const { assessAdmission, matchSignal } = ctx.exports;
const facts = {
  name: "测试企业",
  creditCode: "123",
  status: "存续",
  small: "是",
  complete: true,
  fresh: true,
  risks: [],
};
test("unknown information and disabled policy never auto-pass; small enterprise alone is not a penalty", () => {
  assert.equal(assessAdmission(facts).decision, "需人工复核");
  assert.equal(assessAdmission(facts, true).decision, "规则校验通过");
  for (const partial of [
    { complete: false },
    { fresh: false },
    { creditCode: "" },
  ])
    assert.equal(assessAdmission({ ...facts, ...partial }, true).score, null);
  assert.equal(
    assessAdmission({ ...facts, status: "注销" }, true).decision,
    "停止自动准入",
  );
  assert.equal(
    assessAdmission({ ...facts, risks: ["风险命中"] }, true).decision,
    "需人工复核",
  );
  assert.equal(
    assessAdmission({ ...facts, small: "否" }, true).score,
    assessAdmission(facts, true).score,
  );
});
const s = {
  id: "1",
  customer: "A",
  title: "主数据治理建设",
  text: "统一指标和数据整合",
  url: "https://example.com/1",
  published: "2026-11-01",
  deadline: "2026-12-01",
  kind: "招标公告",
};
const now = new Date("2026-11-09T12:00:00+08:00");
test("demand matches evidence-backed capabilities and handles closed, expired and speculative notices", () => {
  assert.equal(matchSignal(s, now).matches[0].id, "data");
  assert.equal(matchSignal(s, now).priority, "优先验证");
  assert.equal(
    matchSignal({ ...s, kind: "中标结果" }, now).priority,
    "采购已结束",
  );
  assert.equal(
    matchSignal({ ...s, deadline: "2026-11-01" }, now).priority,
    "已过截止时间",
  );
  assert.equal(
    matchSignal({ ...s, kind: "公开动态" }, now).priority,
    "方向待验证",
  );
  assert.equal(
    matchSignal({ ...s, title: "办公家具", text: "办公桌采购" }, now).priority,
    "能力待核实",
  );
  assert.equal(
    matchSignal({ ...s, published: "2030-01-01" }, now).priority,
    "日期待核实",
  );
});
