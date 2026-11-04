from copy import deepcopy
from datetime import date, datetime

from mock_data import COMPANIES, MOCK_SOURCES

DIMENSIONS = {"basic": ("企业基础", 15), "credit": ("信用执行", 30), "judicial": ("司法诉讼", 25), "compliance": ("经营合规", 20), "stability": ("经营稳定性", 10)}


def _years_since(value):
    return max(0, (date.today() - date.fromisoformat(value)).days / 365.25)


def _dedupe(sources):
    """跨 736/740/887/2006 去重：优先使用接口记录 ID，其次使用案号。"""
    seen, result = set(), []
    for source_name in ("dishonesty", "judgments", "cooperation_risk", "enterprise_risk"):
        for raw in sources.get(source_name, []):
            item = deepcopy(raw)
            key = item.get("record_id") or item.get("case_no") or (item.get("category"), item.get("title"), item.get("date"), item.get("amount"))
            if key in seen:
                continue
            seen.add(key)
            item["source"] = source_name
            result.append(item)
    return result


def _level(score):
    return "high" if score >= 60 else "medium" if score >= 30 else "low"


def _event_level(category, amount=0):
    if category in {"dishonesty", "serious_violation"} or amount >= 5_000_000:
        return "high"
    if category in {"enforcement", "high_consumption", "business_abnormal", "tax_risk", "administrative_penalty", "judgment"}:
        return "medium"
    return "low"


def assess_company(company_id):
    company = next((item for item in COMPANIES if item["id"] == company_id), None)
    if not company:
        return None
    return assess_external(company, MOCK_SOURCES.get(company_id, {}), "mock")


def assess_external(company, sources, data_source="real"):
    company, sources = deepcopy(company), deepcopy(sources)
    unique, years = _dedupe(sources), _years_since(company["established_date"])

    basic = (15 if company["company_status"] != "存续" else 0)
    basic = min(15, basic + (8 if years < .5 else 5 if years < 1 else 0))
    credit = 0
    for item in unique:
        category, amount, count = item["category"], item.get("amount") or 0, item.get("count", 1)
        if category == "dishonesty": credit += 18 + min(7, (count - 1) * 4)
        elif category == "enforcement": credit += 6 + min(8, max(0, count - 1) * 2) + (6 if amount >= 5_000_000 else 3 if amount >= 1_000_000 else 1)
        elif category == "high_consumption": credit += 6
    credit = min(30, credit)

    judicial = 0.0
    judgments = [item for item in unique if item["category"] == "judgment"]
    for item in judgments:
        recent, amount = (date.today() - date.fromisoformat(item["date"])).days <= 1095, item.get("amount") or 0
        judicial += (4 if item.get("role") == "被告" else .5) + (3 if recent else 0) + (10 if amount >= 5_000_000 else 4 if amount >= 1_000_000 else 1 if amount >= 100_000 else 0)
    if len(judgments) >= 4: judicial += min(5, len(judgments) - 2)
    judicial = min(25, round(judicial))

    weights = {"administrative_penalty": 5, "business_abnormal": 10, "serious_violation": 15, "tax_risk": 7, "other": 2}
    compliance = min(20, sum(weights.get(item["category"], 0) * item.get("count", 1) for item in unique))
    stability = 3 if years < .5 else 2 if years < 1 else 0
    # 小微企业不单独加分，只在成立短且参保少时计入组合风险。
    if company["is_small_micro"] and years < 3 and company["insured_count"] < 10: stability += 4
    if company["insured_count"] == 0: stability += 3
    elif company["insured_count"] < 5 and years < 3: stability += 2
    stability = min(10, stability)

    scores = {"basic": basic, "credit": credit, "judicial": judicial, "compliance": compliance, "stability": stability}
    total, categories = min(100, sum(scores.values())), {item["category"] for item in unique}
    level = _level(total)
    important = [{"id": item.get("record_id"), "name": item["title"], "category": item["category"], "level": _event_level(item["category"], item.get("amount") or 0), "description": item["description"], "date": item["date"], "count": item.get("count", 1), "amount": item.get("amount")} for item in sorted(unique, key=lambda x: (x["date"], x.get("amount") or 0), reverse=True)]
    if not important or years >= 3:
        important.append({"id": "age", "name": "企业成立时间", "category": "company_age", "level": "low", "description": f"企业成立 {years:.1f} 年，经营时间正常" if years >= 3 else f"企业成立不足 {max(1, round(years * 12))} 个月，建议关注经营稳定性", "date": company["established_date"], "count": 1, "amount": None})

    if level == "low": summary = "企业经营状态正常，目前未发现明显失信、执行或重大经营异常风险。"
    elif "dishonesty" in categories: summary = "该企业目前存在失信及履约风险，整体合作风险较高，建议合作前进一步确认企业履约及付款能力。"
    elif "serious_violation" in categories or "business_abnormal" in categories: summary = "该企业存在经营合规异常，建议核实异常或违法记录的整改状态后再开展合作。"
    elif "enforcement" in categories: summary = "该企业存在被执行风险，建议结合执行金额和履行状态，进一步评估付款能力。"
    else: summary = "该企业存在一定司法诉讼或经营稳定性风险，建议结合案件角色、金额及时间进一步核实。"

    return {"company": company, "score": total, "level": level, "summary": summary, "data_source": data_source,
            "dimensions": [{"key": key, "name": label, "score": scores[key], "max_score": maximum} for key, (label, maximum) in DIMENSIONS.items()],
            "major_risks": important, "details": {"enterprise_info": company, "cooperation_risk": sources.get("cooperation_risk", []), "enterprise_risk": sources.get("enterprise_risk", []), "dishonesty": sources.get("dishonesty", []), "judgments": sources.get("judgments", [])},
            "deduplicated_risk_count": len(unique), "last_evaluated_at": datetime.now().isoformat(timespec="seconds")}


def all_assessments():
    return [assess_company(company["id"]) for company in COMPANIES]
