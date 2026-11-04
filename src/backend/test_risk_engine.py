import unittest

from services.risk_engine import all_assessments, assess_company


class RiskEngineTest(unittest.TestCase):
    def test_scores_and_levels_follow_thresholds(self):
        for assessment in all_assessments():
            score = assessment["score"]
            expected = "high" if score >= 60 else "medium" if score >= 30 else "low"
            self.assertEqual(expected, assessment["level"])
            self.assertEqual(score, sum(item["score"] for item in assessment["dimensions"]))

    def test_duplicate_cross_api_records_only_count_once(self):
        assessment = assess_company("qcc-009")
        # 原始 736/740/887/2006 共 8 条，E-901 和 A-902 各重复一次。
        self.assertEqual(6, assessment["deduplicated_risk_count"])

    def test_mock_set_covers_all_risk_levels(self):
        self.assertEqual({"low", "medium", "high"}, {item["level"] for item in all_assessments()})

    def test_small_micro_is_not_a_risk_by_itself(self):
        # 成熟小微企业 qcc-007 不因小微属性增加稳定性分。
        stability = next(item for item in assess_company("qcc-007")["dimensions"] if item["key"] == "stability")
        self.assertEqual(0, stability["score"])


if __name__ == "__main__":
    unittest.main()
