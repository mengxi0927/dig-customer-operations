import os
from copy import deepcopy
from mock_data import COMPANIES, CHANGES
from services.risk_engine import assess_company


class QccService:
    """企查查访问层。Mock 与真实 HTTP 实现的切换仅发生在这里。"""

    def __init__(self):
        self.use_mock = os.getenv("USE_QCC_MOCK", "true").lower() == "true"
        self.search_api_key = os.getenv("QCC_SEARCH_API_KEY", os.getenv("QCC_API_KEY", ""))
        self.search_api_secret = os.getenv("QCC_SEARCH_API_SECRET", os.getenv("QCC_API_SECRET", ""))
        self.risk_api_key = os.getenv("QCC_RISK_API_KEY", "")
        self.risk_api_secret = os.getenv("QCC_RISK_API_SECRET", "")
        self.base_url = os.getenv("QCC_BASE_URL", "https://api.qichacha.com")

    def search_companies(self, keyword):
        self._require_available()
        keyword = keyword.strip().lower()
        if not keyword:
            return []
        results = [c for c in COMPANIES if keyword in c["company_name"].lower() or any(keyword in n.lower() for n in c["historical_names"])]
        return deepcopy(results or COMPANIES[:3])

    def get_company(self, company_id):
        self._require_available()
        return deepcopy(next((c for c in COMPANIES if c["id"] == company_id), None))

    def get_risk(self, company_id):
        self._require_available()
        assessment = assess_company(company_id)
        if not assessment:
            return {"score": 0, "level": "low", "summary": "暂未发现公开风险。", "items": []}
        items = [{"type": item["name"], "status": "danger" if item["level"] == "high" else "warning" if item["level"] == "medium" else "normal", "count": item["count"], "detail": item["description"]} for item in assessment["major_risks"]]
        return {"score": assessment["score"], "level": assessment["level"], "summary": assessment["summary"], "items": items}

    def get_changes(self, company_id):
        self._require_available()
        return deepcopy(CHANGES.get(company_id, []))

    def _require_available(self):
        if not self.use_mock:
            raise NotImplementedError("请在 QccService 中接入真实企查查 API")


qcc_service = QccService()
