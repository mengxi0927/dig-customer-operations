import json
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import requests
from dotenv import dotenv_values


class FeishuCustomerService:
    """只读访问飞书多维表格客户数据，凭据只保存在环境变量/共享 .env 中。"""

    DEFAULT_APP_TOKEN = ""
    DEFAULT_TABLE_ID = ""
    ALL_CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "feishu_customers_cache.json"
    FIELD_NAMES = [
        "客户名称公式", "客户名称", "客户官方名称（来自企查查）", "申请人", "申请人上级",
        "序号", "申请人itcode", "申请时间", "客户编号", "客户编号状态", "客户属性",
        "客户级别", "客户类型", "行业大类", "行业细分名称", "申请部门", "城市名称（不加“市）",
    ]

    def __init__(self) -> None:
        source_path = Path(__file__).resolve()
        shared_root = source_path.parents[3] if len(source_path.parents) > 3 else source_path.parent.parent
        shared_default = shared_root / "feishu-data-sync-service" / ".env"
        shared_path = Path(os.getenv("FEISHU_SHARED_ENV_FILE", str(shared_default)))
        shared = dotenv_values(shared_path) if shared_path.exists() else {}
        self.base_url = str(os.getenv("FEISHU_BASE_URL") or shared.get("FEISHU_BASE_URL") or "https://open.feishu.cn/open-apis").rstrip("/")
        self.app_id = str(os.getenv("FEISHU_APP_ID") or shared.get("FEISHU_APP_ID") or "")
        self.app_secret = str(os.getenv("FEISHU_APP_SECRET") or shared.get("FEISHU_APP_SECRET") or "")
        self.app_token = os.getenv("FEISHU_CUSTOMER_APP_TOKEN", self.DEFAULT_APP_TOKEN)
        self.table_id = os.getenv("FEISHU_CUSTOMER_TABLE_ID", self.DEFAULT_TABLE_ID)
        self.timeout = float(os.getenv("FEISHU_TIMEOUT_SECONDS", "30"))
        self._token = ""
        self._token_expires_at = 0.0
        self._lock = threading.Lock()
        self._fetch_lock = threading.Lock()
        self._cache: dict[tuple[str, int, str], tuple[float, dict[str, Any]]] = {}
        self._all_cache_ttl = max(int(os.getenv("FEISHU_ALL_CACHE_TTL_SECONDS", "600")), 30)
        self._all_cache: dict[str, Any] | None = None
        self._all_cache_lock = threading.Lock()
        self._all_refresh_lock = threading.Lock()
        self._all_refreshing = False

    @property
    def configured(self) -> bool:
        return bool(self.app_id and self.app_secret and self.app_token and self.table_id)

    def list_customers(self, keyword: str = "", page_size: int = 50, page_token: str = "") -> dict[str, Any]:
        if not self.configured:
            raise RuntimeError("飞书应用凭据未配置")
        page_size = max(1, min(page_size, 500))
        keyword = keyword.strip()
        cache_key = (keyword, page_size, page_token)
        cached = self._cache.get(cache_key)
        if cached and time.monotonic() - cached[0] < 15:
            return cached[1]
        with self._fetch_lock:
            cached = self._cache.get(cache_key)
            if cached and time.monotonic() - cached[0] < 15:
                return cached[1]
            result = self._fetch_customers(keyword, page_size, page_token)
            self._cache[cache_key] = (time.monotonic(), result)
            return result

    def list_all_customers(self, force_refresh: bool = False) -> dict[str, Any]:
        """优先返回全量缓存；过期缓存立即返回，并在后台更新。"""
        cached = self._get_all_cache()
        if cached and not force_refresh:
            age = max(0, int(time.time() - cached["cached_at_epoch"]))
            if age >= self._all_cache_ttl:
                self._start_background_refresh()
            return self._cache_response(cached, "fresh" if age < self._all_cache_ttl else "stale")

        # 首次加载或手动刷新时同步拉取。锁内再次检查，避免开发模式重复请求触发两次全量分页。
        with self._all_refresh_lock:
            if not force_refresh:
                cached = self._get_all_cache()
                if cached:
                    return self._cache_response(cached, "fresh")
            result = self._fetch_all_customers()
            return self._store_all_cache(result)

    def _fetch_all_customers(self) -> dict[str, Any]:
        items: list[dict[str, Any]] = []
        seen_ids: set[str] = set()
        page_token = ""
        synced_at = ""
        for _ in range(1000):
            page = self.list_customers(page_size=500, page_token=page_token)
            synced_at = page["synced_at"]
            for item in page["items"]:
                if item["id"] not in seen_ids:
                    seen_ids.add(item["id"])
                    items.append(item)
            next_token = page.get("page_token", "")
            if not page.get("has_more"):
                break
            if not next_token or next_token == page_token:
                raise RuntimeError("飞书客户分页游标异常")
            page_token = next_token
        else:
            raise RuntimeError("飞书客户分页数量超出安全上限")
        return {
            "items": items,
            "total": len(items),
            "source": "feishu",
            "synced_at": synced_at,
        }

    def _get_all_cache(self) -> dict[str, Any] | None:
        with self._all_cache_lock:
            if self._all_cache:
                return self._all_cache
            try:
                cached = json.loads(self.ALL_CACHE_PATH.read_text(encoding="utf-8"))
                if isinstance(cached, dict) and isinstance(cached.get("items"), list) and cached.get("cached_at_epoch"):
                    self._all_cache = cached
            except (FileNotFoundError, json.JSONDecodeError, OSError):
                return None
            return self._all_cache

    def _store_all_cache(self, result: dict[str, Any]) -> dict[str, Any]:
        cached = {
            **result,
            "cached_at": datetime.now().astimezone().isoformat(timespec="seconds"),
            "cached_at_epoch": time.time(),
        }
        with self._all_cache_lock:
            self._all_cache = cached
            try:
                self.ALL_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
                temp_path = self.ALL_CACHE_PATH.with_suffix(".tmp")
                temp_path.write_text(json.dumps(cached, ensure_ascii=False), encoding="utf-8")
                temp_path.replace(self.ALL_CACHE_PATH)
            except OSError:
                pass
        return self._cache_response(cached, "refreshed")

    def _cache_response(self, cached: dict[str, Any], status: str) -> dict[str, Any]:
        result = {key: value for key, value in cached.items() if key != "cached_at_epoch"}
        result["cache_status"] = status
        result["cache_age_seconds"] = max(0, int(time.time() - cached["cached_at_epoch"]))
        return result

    def _start_background_refresh(self) -> None:
        with self._all_cache_lock:
            if self._all_refreshing:
                return
            self._all_refreshing = True

        def refresh() -> None:
            try:
                with self._all_refresh_lock:
                    self._store_all_cache(self._fetch_all_customers())
            finally:
                with self._all_cache_lock:
                    self._all_refreshing = False

        threading.Thread(target=refresh, name="feishu-customer-cache-refresh", daemon=True).start()

    def _fetch_customers(self, keyword: str, page_size: int, page_token: str) -> dict[str, Any]:
        params: dict[str, Any] = {"page_size": page_size}
        if page_token:
            params["page_token"] = page_token
        # 不限制 field_names，确保飞书公式/查找引用字段（申请人上级、ITCode）正常展开。
        # 对外响应仍只返回 _normalize_record 中明确列出的安全字段。
        body: dict[str, Any] = {"sort": [{"field_name": "申请时间", "desc": True}]}
        if keyword:
            body["filter"] = {
                "conjunction": "or",
                "conditions": [
                    {"field_name": "客户名称", "operator": "contains", "value": [keyword]},
                    {"field_name": "客户官方名称（来自企查查）", "operator": "contains", "value": [keyword]},
                    {"field_name": "客户编号", "operator": "contains", "value": [keyword]},
                ],
            }
        path = f"/bitable/v1/apps/{self.app_token}/tables/{self.table_id}/records"
        # 普通列表接口会完整展开查找引用字段；带关键字时再使用服务端搜索接口。
        data = self._request("POST", f"{path}/search", params=params, json=body) if keyword else self._request("GET", path, params=params)
        page = data.get("data") or {}
        items = [self._normalize_record(record) for record in page.get("items") or []]
        return {
            "items": items,
            "total": int(page.get("total") or 0),
            "has_more": bool(page.get("has_more")),
            "page_token": page.get("page_token") or "",
            "source": "feishu",
            "synced_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        }

    def _get_token(self, force: bool = False) -> str:
        if not force and self._token and time.monotonic() < self._token_expires_at:
            return self._token
        with self._lock:
            if not force and self._token and time.monotonic() < self._token_expires_at:
                return self._token
            response = requests.post(
                f"{self.base_url}/auth/v3/tenant_access_token/internal",
                json={"app_id": self.app_id, "app_secret": self.app_secret}, timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            if data.get("code") != 0 or not data.get("tenant_access_token"):
                raise RuntimeError("获取飞书访问令牌失败")
            self._token = data["tenant_access_token"]
            self._token_expires_at = time.monotonic() + max(int(data.get("expire", 7200)) - 300, 60)
            return self._token

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        for attempt in range(3):
            token = self._get_token(force=False)
            response = requests.request(method, f"{self.base_url}{path}", headers={"Authorization": f"Bearer {token}"}, timeout=self.timeout, **kwargs)
            try:
                data = response.json()
            except ValueError:
                data = {}
            if response.status_code == 429 or response.status_code >= 500 or (response.status_code == 400 and attempt < 2):
                time.sleep(0.5 * (attempt + 1))
                continue
            response.raise_for_status()
            if data.get("code") in {99991663, 99991668, 99991669} and attempt < 2:
                self._token_expires_at = 0
                continue
            if data.get("code") != 0:
                raise RuntimeError(f"读取飞书客户表失败：{data.get('msg', '未知错误')}")
            return data
        raise RuntimeError("读取飞书客户表失败")

    @classmethod
    def _text(cls, value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, (int, float)):
            return str(value)
        if isinstance(value, list):
            parts = []
            for item in value:
                if isinstance(item, dict):
                    parts.append(str(item.get("name") or item.get("text") or item.get("en_name") or ""))
                else:
                    parts.append(str(item))
            return "".join(parts)
        if isinstance(value, dict):
            users = value.get("users") or []
            if users:
                return "、".join(str(user.get("name") or user.get("enName") or "") for user in users)
            return str(value.get("text") or value.get("name") or "")
        return str(value)

    @classmethod
    def _date(cls, value: Any) -> str:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000).astimezone().strftime("%Y-%m-%d")
        return cls._text(value)

    @classmethod
    def _normalize_record(cls, record: dict[str, Any]) -> dict[str, Any]:
        fields = record.get("fields") or {}
        company_name = cls._text(fields.get("客户名称公式")) or cls._text(fields.get("客户官方名称（来自企查查）")) or cls._text(fields.get("客户名称"))
        return {
            "id": record.get("record_id", ""),
            "company_name": company_name or "未填写客户名称",
            "applicant": cls._text(fields.get("申请人")),
            "applicant_manager": cls._text(fields.get("申请人上级")),
            "sequence": cls._text(fields.get("序号")),
            "applicant_itcode": cls._text(fields.get("申请人itcode")),
            "applied_at": cls._date(fields.get("申请时间")),
            "customer_number": cls._text(fields.get("客户编号")),
            "number_status": cls._text(fields.get("客户编号状态")) or "未填写",
            "customer_attribute": cls._text(fields.get("客户属性")),
            "customer_level": cls._text(fields.get("客户级别")),
            "customer_type": cls._text(fields.get("客户类型")),
            "industry": cls._text(fields.get("行业细分名称")) or cls._text(fields.get("行业大类")),
            "department": cls._text(fields.get("申请部门")),
            "city": cls._text(fields.get("城市名称（不加“市）")),
        }


feishu_customer_service = FeishuCustomerService()
