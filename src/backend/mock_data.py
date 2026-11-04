"""企业风险评估演示数据。

五类 source 分别对应 ApiCode 2001、2006、736、740、887。部分记录故意在
cooperation_risk 和 enterprise_risk 中重复，用于验证评估引擎的跨接口去重。
"""


def event(record_id, category, title, date, description, count=1, amount=None, **extra):
    return {"record_id": record_id, "category": category, "title": title, "date": date,
            "description": description, "count": count, "amount": amount, **extra}


COMPANIES = [
    {"id": "qcc-001", "company_name": "上海星海数字科技有限公司", "credit_code": "91310115MA1K4X8A2C", "legal_person": "陈宇", "established_date": "2012-06-12", "company_status": "存续", "address": "上海市浦东新区张江路88号", "registered_capital": "5000万元人民币", "company_scale": "中型", "is_small_micro": False, "insured_count": 286, "historical_names": ["上海星海信息技术有限公司"], "relations": []},
    {"id": "qcc-002", "company_name": "苏州新芽创意科技有限公司", "credit_code": "91320594MAD8N2C31L", "legal_person": "林晨", "established_date": "2026-06-18", "company_status": "存续", "address": "苏州工业园区星湖街288号", "registered_capital": "100万元人民币", "company_scale": "微型", "is_small_micro": True, "insured_count": 3, "historical_names": [], "relations": []},
    {"id": "qcc-003", "company_name": "杭州青禾商业服务有限公司", "credit_code": "91330106MA2B1C3D5F", "legal_person": "王珊", "established_date": "2019-09-26", "company_status": "经营异常", "address": "杭州市西湖区文三路478号", "registered_capital": "1000万元人民币", "company_scale": "小型", "is_small_micro": True, "insured_count": 28, "historical_names": [], "relations": []},
    {"id": "qcc-004", "company_name": "北京远航供应链管理有限公司", "credit_code": "91110105MA01D7UQ6E", "legal_person": "周敏", "established_date": "2016-11-03", "company_status": "存续", "address": "北京市朝阳区建国路128号", "registered_capital": "8000万元人民币", "company_scale": "中型", "is_small_micro": False, "insured_count": 176, "historical_names": [], "relations": []},
    {"id": "qcc-005", "company_name": "广州启明实业发展有限公司", "credit_code": "91440101MA59X7KQ8H", "legal_person": "赵磊", "established_date": "2014-01-15", "company_status": "存续", "address": "广州市天河区珠江新城华夏路10号", "registered_capital": "1亿元人民币", "company_scale": "大型", "is_small_micro": False, "insured_count": 824, "historical_names": [], "relations": []},
    {"id": "qcc-006", "company_name": "深圳云图智能科技有限公司", "credit_code": "91440300MA5F6X2B9D", "legal_person": "黄浩", "established_date": "2020-03-18", "company_status": "存续", "address": "深圳市南山区科苑路15号", "registered_capital": "2000万元人民币", "company_scale": "小型", "is_small_micro": True, "insured_count": 43, "historical_names": [], "relations": []},
    {"id": "qcc-007", "company_name": "宁波海拓贸易有限公司", "credit_code": "91330201MA7F8P6T4Q", "legal_person": "李悦", "established_date": "2022-02-08", "company_status": "存续", "address": "宁波市鄞州区宁穿路1688号", "registered_capital": "500万元人民币", "company_scale": "小型", "is_small_micro": True, "insured_count": 12, "historical_names": [], "relations": []},
    {"id": "qcc-008", "company_name": "成都万盛建筑工程有限公司", "credit_code": "91510107MA6C7R2K9P", "legal_person": "张强", "established_date": "2017-08-21", "company_status": "存续", "address": "成都市武侯区天府三街666号", "registered_capital": "6000万元人民币", "company_scale": "中型", "is_small_micro": False, "insured_count": 96, "historical_names": [], "relations": []},
    {"id": "qcc-009", "company_name": "天津恒通商贸有限公司", "credit_code": "91120116MA06Q8XH7N", "legal_person": "孙伟", "established_date": "2021-05-12", "company_status": "存续", "address": "天津市滨海新区新港路52号", "registered_capital": "300万元人民币", "company_scale": "微型", "is_small_micro": True, "insured_count": 5, "historical_names": [], "relations": []},
]


def sources(*, cooperation=None, scan=None, dishonesty=None, judgments=None):
    return {"cooperation_risk": cooperation or [], "enterprise_risk": scan or [], "dishonesty": dishonesty or [], "judgments": judgments or []}


MOCK_SOURCES = {
    "qcc-001": sources(cooperation=[event("P-001", "administrative_penalty", "轻微行政处罚", "2023-04-12", "一般程序行政处罚，已完成整改", amount=20000)], judgments=[event("J-001", "judgment", "技术服务合同纠纷", "2022-08-19", "企业作为原告胜诉，案件已结", amount=120000, case_no="（2022）沪0115民初8821号", role="原告", cause="技术服务合同纠纷", court="上海市浦东新区人民法院", result="胜诉，已结案")]),
    "qcc-002": sources(),
    "qcc-003": sources(cooperation=[event("A-301", "business_abnormal", "经营异常", "2026-07-02", "未按规定期限公示年度报告，尚未移出"), event("P-302", "administrative_penalty", "行政处罚", "2026-03-14", "因广告内容违规被处罚", amount=80000)], scan=[event("A-301", "business_abnormal", "经营异常", "2026-07-02", "未按规定期限公示年度报告，尚未移出")]),
    "qcc-004": sources(cooperation=[event("E-401", "enforcement", "被执行信息", "2026-06-20", "执行标的 2860 万元，尚未履行完毕", amount=28600000, case_no="（2026）京0105执891号", court="北京市朝阳区人民法院"), event("H-402", "high_consumption", "限制高消费", "2026-07-11", "企业及法定代表人被采取限制高消费措施")], scan=[event("E-401", "enforcement", "被执行信息", "2026-06-20", "执行标的 2860 万元，尚未履行完毕", amount=28600000, case_no="（2026）京0105执891号")], dishonesty=[event("D-403", "dishonesty", "失信被执行", "2026-07-28", "有履行能力而拒不履行生效法律文书确定义务", amount=28600000, case_no="（2026）京0105执891号", court="北京市朝阳区人民法院", performance="全部未履行")], judgments=[event("J-404", "judgment", "买卖合同纠纷", "2026-05-18", "企业作为被告，判令支付货款及违约金", amount=28600000, case_no="（2026）京0105民初2155号", role="被告", cause="买卖合同纠纷", result="被告败诉")]),
    "qcc-005": sources(),
    "qcc-006": sources(cooperation=[event("P-605", "administrative_penalty", "行政处罚", "2025-09-18", "因信息公示不完整被责令整改")], judgments=[event("J-601", "judgment", "软件开发合同纠纷", "2026-07-08", "企业作为被告，案件尚在审理", amount=680000, case_no="（2026）粤0305民初4421号", role="被告", cause="软件开发合同纠纷", result="一审判决"), event("J-602", "judgment", "劳动合同纠纷", "2025-11-20", "企业作为被告，判令支付经济补偿", amount=95000, case_no="（2025）粤0305民初9210号", role="被告", cause="劳动合同纠纷", result="部分败诉"), event("J-603", "judgment", "服务合同纠纷", "2025-06-03", "企业作为原告，案件已结", amount=210000, case_no="（2025）粤0305民初5108号", role="原告", cause="服务合同纠纷", result="胜诉"), event("J-604", "judgment", "软件开发合同纠纷", "2024-12-12", "企业作为被告，调解结案", amount=360000, case_no="（2024）粤0305民初7732号", role="被告", cause="软件开发合同纠纷", result="调解")]),
    "qcc-007": sources(cooperation=[event("E-701", "enforcement", "被执行信息", "2026-01-16", "执行标的 36.8 万元，尚未履行完毕", amount=368000, case_no="（2026）浙30212执127号", court="宁波市鄞州区人民法院")]),
    "qcc-008": sources(cooperation=[event("P-801", "administrative_penalty", "安全生产行政处罚", "2026-05-09", "施工现场安全防护不符合规定", amount=180000), event("T-802", "tax_risk", "税务异常", "2026-04-22", "存在欠税公告记录", amount=760000)], scan=[event("P-801", "administrative_penalty", "安全生产行政处罚", "2026-05-09", "施工现场安全防护不符合规定", amount=180000), event("V-803", "serious_violation", "严重违法", "2026-06-30", "因提供虚假材料被列入严重违法企业名单")]),
    "qcc-009": sources(cooperation=[event("E-901", "enforcement", "被执行信息", "2026-07-19", "两笔执行记录，标的合计 185 万元", count=2, amount=1850000, case_no="（2026）浙10116执421号"), event("A-902", "business_abnormal", "经营异常", "2026-02-10", "通过登记住所无法联系，尚未移出"), event("P-903", "administrative_penalty", "行政处罚", "2025-12-06", "因产品质量问题被处罚", amount=240000)], scan=[event("E-901", "enforcement", "被执行信息", "2026-07-19", "两笔执行记录，标的合计 185 万元", count=2, amount=1850000, case_no="（2026）浙10116执421号"), event("A-902", "business_abnormal", "经营异常", "2026-02-10", "通过登记住所无法联系，尚未移出")], dishonesty=[event("D-904", "dishonesty", "失信被执行", "2026-08-03", "违反财产报告制度，全部未履行", amount=1850000, case_no="（2026）浙10116执421号", court="天津市滨海新区人民法院", performance="全部未履行")], judgments=[event("J-905", "judgment", "买卖合同纠纷", "2026-06-01", "企业作为被告，判令支付货款", amount=1850000, case_no="（2026）浙10116民初3108号", role="被告", cause="买卖合同纠纷", result="被告败诉"), event("J-906", "judgment", "金融借款合同纠纷", "2025-10-16", "企业作为被告，判令归还借款", amount=3200000, case_no="（2025）浙10116民初8812号", role="被告", cause="金融借款合同纠纷", result="被告败诉")]),
}

CHANGES = {company["id"]: [] for company in COMPANIES}
CHANGES["qcc-003"] = [{"field_name": "企业经营状态", "old_value": "存续", "new_value": "经营异常", "changed_at": "2026-07-02"}]
CHANGES["qcc-004"] = [{"field_name": "注册地址", "old_value": "北京市朝阳区望京街8号", "new_value": "北京市朝阳区建国路128号", "changed_at": "2026-08-02"}]
