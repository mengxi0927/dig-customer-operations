import os
import json
import re
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from flask import Flask, jsonify, request
from dotenv import load_dotenv

load_dotenv()

from database import close_db, get_db, init_db, rows
from mock_data import CHANGES
from services.qcc_service import qcc_service
from services.feishu_customer_service import feishu_customer_service
from services.risk_engine import all_assessments, assess_company
from services.qcc_live_assessment_service import load_live_assessments, qcc_live_assessment_service

app = Flask(__name__)
app.teardown_appcontext(close_db)


def resolve_company_id(value):
    """兼容旧版 `/customers/1` 链接，将本地客户 ID 转换为企查查企业 ID。"""
    if value.startswith("qcc-"):
        return value
    if value.isdigit():
        row = get_db().execute("SELECT qcc_id FROM customers WHERE id=%s", (int(value),)).fetchone()
        if row and row["qcc_id"]:
            return row["qcc_id"]
        return f"qcc-{int(value):03d}"
    return value


def current_assessments():
    # 首页与客户风险列表只展示已经真实调用企查查的企业。
    return load_live_assessments()


def normalize_company_name(value):
    value = str(value or "").strip().lower().replace("（", "(").replace("）", ")")
    return re.sub(r"[\s()（）·,，。]", "", value)


# 个别企查查核验结果会返回工商登记主体名称，保留用户实际查询名称用于关联飞书客户。
QCC_QUERY_NAME_ALIASES = {
    "三亚鹿回头旅游区开发有限公司三亚半山半岛洲际度假酒店": "三亚鹿回头旅游区开发有限公司",
    "宁波杭州湾新区海泉湾旅游开发有限公司/宁波杭州湾万怡酒店": "宁波杭州湾新区海泉湾旅游开发有限公司",
    "贵州洪涛文化旅游产业有限公司六盘水福朋喜来登酒店": "贵州洪涛文化旅游产业有限公司",
    "广东佛山珠江科技数码城建设有限公司南海酒店管理分公司": "广东佛山珠江科技数码城建设有限公司",
    "邓州市渠首屠宰场": "邓州市渠首肉食品集团有限公司",
    "西安中新华胜房地产开发有限公司浐漏艾美酒店": "西安中新华胜房地产开发有限公司浐灞艾美酒店",
}


def current_assessment(company_id):
    resolved = resolve_company_id(company_id)
    live = next((item for item in load_live_assessments() if item["company"]["id"] == resolved), None)
    return live or assess_company(resolved)


def customer_payload(row):
    item = dict(row)
    item["has_new_risk"] = bool(item.get("has_new_risk"))
    item["has_company_change"] = bool(item.get("has_company_change"))
    return item


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "mode": "mock" if qcc_service.use_mock else "live"})


@app.get("/api/dashboard")
def dashboard():
    # 展示演示企业，以及已经用企查查真实接口采集并本地缓存的企业。
    assessments = current_assessments()
    alerts = []
    for assessment in assessments:
        risks = [item for item in assessment["major_risks"] if item["category"] != "company_age"]
        item = risks[0] if risks else assessment["major_risks"][0]
        title = item["name"] if risks else "风险评估完成"
        description = item["description"] if risks else assessment["summary"]
        alerts.append({"id": f"{assessment['company']['id']}:{item['id']}", "customer_id": assessment["company"]["id"], "company_name": assessment["company"]["company_name"], "risk_type": title, "risk_level": assessment["level"], "title": title, "description": description, "occurred_at": item["date"], "created_at": assessment["last_evaluated_at"], "is_handled": 0})
    alerts.sort(key=lambda item: item["occurred_at"], reverse=True)
    return jsonify({
        "stats": {"customer_count": len(assessments), "high_risk_count": sum(item["level"] == "high" for item in assessments), "today_new_risks": sum(any(risk["date"] == datetime.now().date().isoformat() and risk["category"] != "company_age" for risk in item["major_risks"]) for item in assessments), "today_changes": 0},
        "alerts": alerts, "customer_source": "real", "risk_source": "real",
    })


@app.get("/api/risk-assessments")
def list_risk_assessments():
    keyword = request.args.get("keyword", "").strip().lower()
    level = request.args.get("risk_level", "").strip()
    items = current_assessments()
    if keyword:
        items = [item for item in items if keyword in item["company"]["company_name"].lower() or keyword in item["company"]["credit_code"].lower()]
    if level:
        items = [item for item in items if item["level"] == level]
    return jsonify(items)


@app.get("/api/customer-risk-list")
def customer_risk_list():
    """以飞书客户为全集，关联本地已真实查询的企查查评估结果。"""
    try:
        force_refresh = request.args.get("refresh", "").strip() == "1"
        feishu_result = feishu_customer_service.list_all_customers(force_refresh=force_refresh)
        assessments = load_live_assessments()
        by_name = {}
        for assessment in assessments:
            names = [assessment["company"].get("company_name", ""), *(assessment.get("query_names") or [])]
            for name in names:
                if name:
                    by_name[normalize_company_name(name)] = assessment
        for query_name, registered_name in QCC_QUERY_NAME_ALIASES.items():
            assessment = by_name.get(normalize_company_name(registered_name))
            if assessment:
                by_name[normalize_company_name(query_name)] = assessment

        # Web profiles supplement identity data only; they are not API risk assessments.
        profile_table = get_db().execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='customer_web_profiles'").fetchone()
        web_profiles = {r["customer_id"]: json.loads(r["profile_json"]) for r in get_db().execute("SELECT customer_id, profile_json FROM customer_web_profiles")} if profile_table else {}
        all_merged = []
        for customer in feishu_result["items"]:
            assessment = by_name.get(normalize_company_name(customer["company_name"]))
            all_merged.append({"customer": customer, "assessment": assessment, "web_profile": web_profiles.get(customer["id"])})

        keyword = request.args.get("keyword", "").strip().lower()
        level = request.args.get("risk_level", "").strip()
        sort_by = request.args.get("sort_by", "score").strip()
        sort_order = request.args.get("sort_order", "desc").strip()
        if sort_by not in {"score", "evaluated_at"}:
            return jsonify({"message": "不支持的排序字段"}), 400
        if sort_order not in {"asc", "desc"}:
            return jsonify({"message": "不支持的排序方向"}), 400

        merged = []
        for item in all_merged:
            customer = item["customer"]
            assessment = item["assessment"]
            if keyword and keyword not in customer["company_name"].lower() and keyword not in customer["customer_number"].lower():
                continue
            if level and (not assessment or assessment["level"] != level):
                continue
            merged.append(item)

        evaluated = [item for item in merged if item["assessment"]]
        unassessed = [item for item in merged if not item["assessment"]]
        if sort_by == "score":
            evaluated.sort(
                key=lambda item: (item["assessment"]["score"], item["assessment"]["last_evaluated_at"]),
                reverse=sort_order == "desc",
            )
        else:
            evaluated.sort(
                key=lambda item: item["assessment"]["last_evaluated_at"],
                reverse=sort_order == "desc",
            )
        merged = evaluated + unassessed
        queried = [item["assessment"] for item in all_merged if item["assessment"]]
        return jsonify({
            "items": merged,
            "total": len(all_merged),
            "filtered_total": len(merged),
            "queried_count": len(queried),
            "high_risk_count": sum(item["level"] == "high" for item in queried),
            "average_risk_score": round(sum(item["score"] for item in queried) / len(queried)) if queried else None,
            "source": "feishu",
            "synced_at": feishu_result["synced_at"],
            "cache_status": feishu_result.get("cache_status", "fresh"),
            "cached_at": feishu_result.get("cached_at", feishu_result["synced_at"]),
        })
    except (ValueError, RuntimeError) as exc:
        return jsonify({"message": str(exc)}), 503
    except Exception:
        app.logger.exception("读取飞书客户风险列表失败")
        return jsonify({"message": "飞书客户数据暂时不可用"}), 503


@app.get("/api/risk-assessments/<company_id>")
def get_risk_assessment(company_id):
    assessment = current_assessment(company_id)
    return jsonify(assessment) if assessment else (jsonify({"message": "企业不存在"}), 404)


@app.post("/api/risk-assessments/<company_id>/refresh")
def refresh_risk_assessment(company_id):
    resolved = resolve_company_id(company_id)
    existing = current_assessment(resolved)
    if existing and existing.get("data_source") == "real":
        assessment = qcc_live_assessment_service.fetch_and_save(existing["company"]["company_name"])
    else:
        assessment = assess_company(resolved)
    return jsonify(assessment) if assessment else (jsonify({"message": "企业不存在"}), 404)


@app.get("/api/company/search")
def search_company():
    return jsonify(qcc_service.search_companies(request.args.get("keyword", "")))


@app.get("/api/feishu/customers")
def list_feishu_customers():
    try:
        page_size = int(request.args.get("page_size", "50"))
        result = feishu_customer_service.list_customers(
            keyword=request.args.get("keyword", ""),
            page_size=page_size,
            page_token=request.args.get("page_token", ""),
        )
        return jsonify(result)
    except (ValueError, RuntimeError) as exc:
        return jsonify({"message": str(exc)}), 503
    except Exception:
        app.logger.exception("读取飞书客户数据失败")
        return jsonify({"message": "飞书客户数据暂时不可用"}), 503


@app.get("/api/company/<company_id>/risk")
def company_risk(company_id):
    company = qcc_service.get_company(company_id)
    if not company:
        return jsonify({"message": "企业不存在"}), 404
    return jsonify({"company": company, "risk": qcc_service.get_risk(company_id)})


@app.post("/api/customers/check-duplicate")
def check_duplicate():
    data = request.get_json() or {}
    db = get_db()
    exact = db.execute("SELECT * FROM customers WHERE credit_code=%s", (data.get("credit_code"),)).fetchone()
    if exact:
        return jsonify({"status": "exists", "message": "客户已存在", "customer": customer_payload(exact)})
    candidates = rows(db.execute("SELECT * FROM customers").fetchall())
    query_names = [data.get("company_name", "")] + data.get("historical_names", []) + data.get("relations", [])
    best = None
    best_score = 0
    for customer in candidates:
        score = max(SequenceMatcher(None, name, customer["company_name"]).ratio() for name in query_names if name)
        if score > best_score:
            best, best_score = customer, score
    if best_score >= 0.68:
        return jsonify({"status": "suspected", "message": "疑似重复客户，请核实后继续", "similarity": round(best_score, 2), "customer": best})
    return jsonify({"status": "new", "message": "未发现重复客户"})


@app.post("/api/customers")
def create_customer():
    data = request.get_json() or {}
    required = ["qcc_id", "company_name", "credit_code"]
    if any(not data.get(field) for field in required):
        return jsonify({"message": "缺少必要企业信息"}), 400
    db = get_db()
    if db.execute("SELECT id FROM customers WHERE credit_code=%s", (data["credit_code"],)).fetchone():
        return jsonify({"message": "客户已存在"}), 409
    risk = qcc_service.get_risk(data["qcc_id"])
    now = datetime.now().isoformat(timespec="seconds")
    cur = db.execute("""INSERT INTO customers
      (qcc_id, company_name, credit_code, legal_person, company_status, address, registered_capital,
       established_date, risk_level, has_new_risk, has_company_change, created_at, last_checked_at)
      VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 0, %s, %s) RETURNING id""",
      (data["qcc_id"], data["company_name"], data["credit_code"], data.get("legal_person"), data.get("company_status"),
       data.get("address"), data.get("registered_capital"), data.get("established_date"), risk["level"], now, now))
    customer_id = cur.fetchone()["id"]
    for item in risk["items"]:
        if item["status"] == "normal":
            continue
        db.execute("""INSERT INTO risk_records
          (customer_id, risk_type, risk_level, title, description, occurred_at, created_at, is_handled)
          VALUES (%s, %s, %s, %s, %s, %s, %s, 0)""", (customer_id, item["type"],
          "high" if item["status"] == "danger" else "medium", f"存量{item['type']}风险", item["detail"], now, now))
    changes = qcc_service.get_changes(data["qcc_id"])
    for change in changes:
        db.execute("""INSERT INTO company_changes
          (customer_id, field_name, old_value, new_value, changed_at, created_at)
          VALUES (%s, %s, %s, %s, %s, %s)""", (customer_id, change["field_name"], change["old_value"],
          change["new_value"], change["changed_at"], now))
    if changes:
        db.execute("UPDATE customers SET has_company_change=1 WHERE id=%s", (customer_id,))
    db.commit()
    return jsonify({"id": customer_id, "message": "客户创建成功"}), 201


@app.get("/api/customers")
def list_customers():
    keyword = request.args.get("keyword", "").strip()
    risk_level = request.args.get("risk_level", "").strip()
    clauses, params = [], []
    if keyword:
        clauses.append("(company_name LIKE %s OR credit_code LIKE %s)")
        params.extend([f"%{keyword}%", f"%{keyword}%"])
    if risk_level:
        clauses.append("risk_level=%s")
        params.append(risk_level)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    items = get_db().execute(f"SELECT * FROM customers{where} ORDER BY last_checked_at DESC", params).fetchall()
    return jsonify([customer_payload(item) for item in items])


@app.get("/api/customers/<int:customer_id>")
def get_customer(customer_id):
    row = get_db().execute("SELECT * FROM customers WHERE id=%s", (customer_id,)).fetchone()
    return jsonify(customer_payload(row)) if row else (jsonify({"message": "客户不存在"}), 404)


@app.get("/api/customers/<int:customer_id>/risks")
def get_customer_risks(customer_id):
    items = get_db().execute("SELECT * FROM risk_records WHERE customer_id=%s ORDER BY occurred_at DESC", (customer_id,)).fetchall()
    return jsonify(rows(items))


@app.get("/api/customers/<int:customer_id>/changes")
def get_customer_changes(customer_id):
    items = get_db().execute("SELECT * FROM company_changes WHERE customer_id=%s ORDER BY changed_at DESC", (customer_id,)).fetchall()
    return jsonify(rows(items))


@app.post("/api/customers/<int:customer_id>/refresh")
def refresh_customer(customer_id):
    db = get_db()
    customer = db.execute("SELECT * FROM customers WHERE id=%s", (customer_id,)).fetchone()
    if not customer:
        return jsonify({"message": "客户不存在"}), 404
    risk = qcc_service.get_risk(customer["qcc_id"])
    now = datetime.now().isoformat(timespec="seconds")
    db.execute("UPDATE customers SET risk_level=%s, last_checked_at=%s, has_new_risk=0 WHERE id=%s", (risk["level"], now, customer_id))
    db.commit()
    return jsonify({"message": "风险信息已刷新", "risk_level": risk["level"], "last_checked_at": now})


with app.app_context():
    init_db()


if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "5001")), debug=os.getenv("FLASK_ENV") == "development")
