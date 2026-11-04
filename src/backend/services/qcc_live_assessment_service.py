import hashlib
import json
import os
import re
import time
from datetime import date
from pathlib import Path

import requests

from services.risk_engine import assess_external


LIVE_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "live_assessments.json"
ENDPOINTS = {
    "736": "/ECIInfoOverview/GetInfo",
    "740": "/ShixinCheck/GetList",
    "887": "/JudgmentDocCheck/GetList",
    "2001": "/EnterpriseInfo/Verify",
    "2006": "/RiskControl/Scan",
}


def _number(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0


def _date(value):
    value = str(value or "")
    chinese = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日", value)
    if chinese:
        value = f"{chinese.group(1)}-{int(chinese.group(2)):02d}-{int(chinese.group(3)):02d}"
    else:
        value = value[:10]
    try:
        date.fromisoformat(value)
        return value
    except ValueError:
        return date.today().isoformat()


def _result_data(payload):
    result = payload.get("Result") or {}
    return result.get("Data") if isinstance(result, dict) and "Data" in result else result


class QccLiveAssessmentService:
    def __init__(self):
        self.base_url = os.getenv("QCC_BASE_URL", "https://api.qichacha.com").rstrip("/")
        self.key = os.getenv("QCC_RISK_API_KEY", "")
        self.secret = os.getenv("QCC_RISK_API_SECRET", "")

    def _call(self, code, company_name):
        if not self.key or not self.secret:
            raise RuntimeError("企查查风险账号未配置")
        timespan = str(int(time.time()))
        token = hashlib.md5(f"{self.key}{timespan}{self.secret}".encode()).hexdigest().upper()
        params = {"key": self.key, "searchKey": company_name}
        if code in {"740", "887"}:
            params.update(pageIndex=1, pageSize=20)
        response = requests.get(f"{self.base_url}{ENDPOINTS[code]}", params=params,
                                headers={"Token": token, "Timespan": timespan}, timeout=30)
        response.raise_for_status()
        payload = response.json()
        if str(payload.get("Status")) != "200":
            raise RuntimeError(f"企查查 {code} 返回异常：{payload.get('Message') or payload.get('Status')}")
        return payload

    def fetch_and_save(self, company_name):
        # 各能力仅请求一次，不自动重试或翻页，避免额外计费。
        responses = {code: self._call(code, company_name) for code in ENDPOINTS}
        return self.save_responses(responses, query_name=company_name)

    def save_responses(self, responses, query_name=None):
        assessment = self._normalize(responses)
        saved = load_live_assessments()
        previous = next((item for item in saved if item["company"]["id"] == assessment["company"]["id"]), None)
        query_names = list((previous or {}).get("query_names") or [])
        if query_name and query_name not in query_names:
            query_names.append(query_name)
        assessment["query_names"] = query_names
        existing = [item for item in saved if item["company"]["id"] != assessment["company"]["id"]]
        LIVE_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        LIVE_DATA_PATH.write_text(json.dumps(existing + [assessment], ensure_ascii=False, indent=2), encoding="utf-8")
        return assessment

    def _normalize(self, responses):
        info = _result_data(responses["2001"]) or _result_data(responses["2006"])
        cooperation = _result_data(responses["2006"]) or {}
        scan = _result_data(responses["736"]) or {}
        company_id = f"qcc-live-{info.get('KeyNo')}"
        status_raw = str(info.get("Status") or "")
        status = "存续" if any(word in status_raw for word in ("存续", "在营", "开业")) else status_raw
        scale = {"L": "大型", "M": "中型", "S": "小型", "XS": "微型"}.get(info.get("Scale"), info.get("PersonScope") or "未披露")
        company = {"id": company_id, "company_name": info.get("Name"), "credit_code": info.get("CreditCode"),
                   "legal_person": info.get("OperName"), "established_date": _date(info.get("StartDate")),
                   "company_status": status, "address": info.get("Address") or "", "registered_capital": info.get("RegistCapi") or "",
                   "company_scale": scale, "is_small_micro": str(info.get("IsSmall")) == "1",
                   "insured_count": int(_number(info.get("InsuredCount"))), "historical_names": [], "relations": []}

        cooperation_events = []
        execution = cooperation.get("ZhiXing") or {}
        for item in execution.get("DataList") or []:
            cooperation_events.append({"record_id": item.get("Id"), "category": "enforcement", "title": "被执行信息", "date": _date(item.get("RegisterDate")), "description": f"案号 {item.get('CaseNo')}，执行法院 {item.get('ExecuteCourt')}", "count": 1, "amount": _number(item.get("BiaoDi")), "case_no": item.get("CaseNo"), "court": item.get("ExecuteCourt")})
        limit_info = cooperation.get("Sumptuary") or {}
        if _number(limit_info.get("TotalCount")):
            first = (limit_info.get("DataList") or [{}])[0]
            cooperation_events.append({"record_id": "2006-limit-summary", "category": "high_consumption", "title": "限制高消费", "date": _date(first.get("PublicDate") or first.get("RegisterDate")), "description": f"企查查合作风险排查返回 {int(_number(limit_info.get('TotalCount')))} 条限高记录", "count": int(_number(limit_info.get("TotalCount"))), "amount": _number(limit_info.get("TotalAmount")) * 10000})
        tax_info = cooperation.get("TaxOweNotice") or {}
        if _number(tax_info.get("TotalCount")):
            first = (tax_info.get("DataList") or [{}])[0]
            cooperation_events.append({"record_id": "2006-tax-summary", "category": "tax_risk", "title": "欠税公告", "date": _date(first.get("OweDate") or first.get("PublishDate")), "description": f"企查查合作风险排查返回 {int(_number(tax_info.get('TotalCount')))} 条欠税公告", "count": int(_number(tax_info.get("TotalCount"))), "amount": _number(tax_info.get("TotalAmount")) * 10000})
        for key, title in (("Bankruptcy", "破产案件"), ("JudicialSale", "司法拍卖"), ("TaxHurry", "税收催缴")):
            block = cooperation.get(key) or {}
            if _number(block.get("TotalCount")):
                first = (block.get("DataList") or [{}])[0]
                cooperation_events.append({"record_id": f"2006-{key}", "category": "other", "title": title, "date": _date(first.get("PublicDate") or first.get("RegisterDate") or first.get("PublishDate") or first.get("AuctionTime")), "description": f"企查查合作风险排查返回 {int(_number(block.get('TotalCount')))} 条{title}记录", "count": int(_number(block.get("TotalCount"))), "amount": None})

        scan_events = []
        for item in scan.get("ZhiXingItems") or []:
            scan_events.append({"record_id": item.get("Id"), "category": "enforcement", "title": "被执行信息", "date": _date(item.get("Liandate")), "description": f"案号 {item.get('Anno')}，执行法院 {item.get('ExecuteGov')}", "count": 1, "amount": _number(item.get("Biaodi")), "case_no": item.get("Anno"), "court": item.get("ExecuteGov")})
        dishonesty = []
        shixin = (_result_data(responses["740"]) or {})
        for item in (shixin.get("Data") if isinstance(shixin, dict) else []) or []:
            dishonesty.append({"record_id": item.get("Id"), "category": "dishonesty", "title": "失信被执行", "date": _date(item.get("Publicdate") or item.get("Liandate")), "description": item.get("ActionRemark") or "失信被执行记录", "count": 1, "amount": _number(item.get("Amount")), "case_no": item.get("Anno"), "court": item.get("Executegov"), "performance": item.get("Executestatus")})
        judgments_result = responses["887"].get("Result") or {}
        judgments = []
        total_judgments = int(_number((responses["887"].get("Paging") or {}).get("TotalRecords")))
        for index, item in enumerate(judgments_result.get("Data") or []):
            role = "被告" if str(item.get("IsDefendant")).lower() == "true" else "原告" if str(item.get("IsProsecutor")).lower() == "true" else "其他"
            judgments.append({"record_id": item.get("Id"), "category": "judgment", "title": item.get("CaseName") or "裁判文书", "date": _date(item.get("JudgeDate") or item.get("PublishDate")), "description": item.get("JudgeResult") or "裁判文书记录", "count": total_judgments if index == 0 else 1, "amount": _number(item.get("Amount")), "case_no": item.get("CaseNo"), "role": role, "cause": item.get("CaseReason"), "result": item.get("JudgeResult")})
        assessment = assess_external(company, {"cooperation_risk": cooperation_events, "enterprise_risk": scan_events, "dishonesty": dishonesty, "judgments": judgments}, "real")
        assessment["summary"] += f" 本次真实接口共返回 {total_judgments} 条裁判文书，详情页展示最新 {len(judgments)} 条。"
        assessment["provider"] = "企查查"
        assessment["api_codes"] = ["736", "740", "887", "2001", "2006"]
        return assessment


def load_live_assessments():
    try:
        data = json.loads(LIVE_DATA_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return []


qcc_live_assessment_service = QccLiveAssessmentService()
