import type { Company, Customer, RiskCheck, RiskRecord, CompanyChange, FeishuCustomerPage, RiskAssessment, CustomerRiskList } from "./types";
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";
async function request<T>(path:string, options?:RequestInit):Promise<T> {
  const response = await fetch(`${BASE}${path}`, { ...options, headers:{"Content-Type":"application/json", ...options?.headers}, cache:"no-store" });
  if (!response.ok) { const data = await response.json().catch(()=>({})); throw new Error(data.message || "请求失败，请稍后重试"); }
  return response.json();
}
export const api = {
  dashboard:()=>request<{stats:{customer_count:number;high_risk_count:number;today_new_risks:number;today_changes:number};alerts:(RiskRecord&{company_name:string})[]}>("/dashboard"),
  feishuCustomers:(keyword="",pageToken="",pageSize=50)=>request<FeishuCustomerPage>(`/feishu/customers?keyword=${encodeURIComponent(keyword)}&page_token=${encodeURIComponent(pageToken)}&page_size=${pageSize}`),
  customerRiskList:(keyword="",risk="",sortBy="score",sortOrder="desc",refresh=false)=>request<CustomerRiskList>(`/customer-risk-list?keyword=${encodeURIComponent(keyword)}&risk_level=${encodeURIComponent(risk)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}&refresh=${refresh?"1":"0"}`),
  searchCompanies:(keyword:string)=>request<Company[]>(`/company/search?keyword=${encodeURIComponent(keyword)}`),
  companyRisk:(id:string)=>request<{company:Company;risk:RiskCheck}>(`/company/${id}/risk`),
  checkDuplicate:(company:Company)=>request<{status:"exists"|"suspected"|"new";message:string;similarity?:number;customer?:Customer}>("/customers/check-duplicate",{method:"POST",body:JSON.stringify(company)}),
  createCustomer:(company:Company)=>request<{id:number;message:string}>("/customers",{method:"POST",body:JSON.stringify({...company,qcc_id:company.id})}),
  customers:(keyword="",risk="")=>request<Customer[]>(`/customers?keyword=${encodeURIComponent(keyword)}&risk_level=${risk}`),
  customer:(id:string)=>request<Customer>(`/customers/${id}`),
  risks:(id:string)=>request<RiskRecord[]>(`/customers/${id}/risks`),
  changes:(id:string)=>request<CompanyChange[]>(`/customers/${id}/changes`),
  refresh:(id:string)=>request<{message:string}>(`/customers/${id}/refresh`,{method:"POST"})
  ,assessments:(keyword="",risk="")=>request<RiskAssessment[]>(`/risk-assessments?keyword=${encodeURIComponent(keyword)}&risk_level=${risk}`)
  ,assessment:(id:string)=>request<RiskAssessment>(`/risk-assessments/${id}`)
  ,refreshAssessment:(id:string)=>request<RiskAssessment>(`/risk-assessments/${id}/refresh`,{method:"POST"})
};
