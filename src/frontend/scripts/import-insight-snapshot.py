"""Read-only Excel import; retain only fields used by the insights prototype."""
import datetime
import json
import re
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / 'Downloads'
def read(name):
    rows = list(openpyxl.load_workbook(DOWNLOADS / name, data_only=True).active.values)
    return [dict(zip(rows[0], row)) for row in rows[1:]]
def text(value):
    return str(value or '').strip()
def key(value):
    return re.sub(r'\s+', '', text(value)).replace('（', '(').replace('）', ')')
def date(value):
    return value.strftime('%Y-%m-%d') if isinstance(value, datetime.datetime) else ''
def number(value):
    try:
        return float(str(value).replace(',', ''))
    except (TypeError, ValueError):
        return 0

customers = []
for row in read('端到端重塑_客户管理-客户信息_表格 (3).xlsx'):
    if not key(row['客户名称']):
        continue
    customers.append(dict(key=key(row['客户名称']), name=text(row['客户名称']), industry=text(row['行业细分名称']) or '未填写', region=text(row['城市名称（不加“市）']) or '未填写', owner=text(row['申请人']) or '未填写', department=text(row['业务对应成本中心']) or '未填写', level=text(row['客户级别']) or '未分级', date=date(row['申请时间']), numbered=bool(row['客户编号'])))
opportunities = []
for row in read('端到端重塑_售前-商机管理_商机原表 (14).xlsx'):
    opportunities.append(dict(id=text(row['商机号']), name=text(row['*商机名称']), customer=key(row['*签约客户名称']), status=text(row['商机状态']), stage=text(row['商机阶段']), amount=number(row['*预计签约金额（元）']), actual=number(row['实际成单金额（元）']), probability=number(row['*预计成单率（%）']), due=date(row['*预计签约时间']), signed=date(row['实际成单时间']), date=date(row['申请日期']), unit=text(row['*交付单元']), owner=text(row['销售员']), department=text(row['*成本中心']), industry=text(row['行业']), region=text(row['商机所属区域'])))
(ROOT / 'lib/insight-snapshot.json').write_text(json.dumps(dict(asOf='2026-11-03', customers=customers, opportunities=opportunities), ensure_ascii=False, separators=(',', ':')))
print(f'Imported {len(customers)} customer rows and {len(opportunities)} opportunities')
