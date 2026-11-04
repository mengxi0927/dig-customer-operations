export type RiskLevel = "low" | "medium" | "high";
export interface Company { id:string; company_name:string; credit_code:string; legal_person:string; established_date:string; company_status:string; address:string; registered_capital:string; company_scale?:string; is_small_micro?:boolean; insured_count?:number; historical_names:string[]; relations:string[] }
export interface Customer extends Omit<Company,"id"|"historical_names"|"relations"> { id:number; qcc_id:string; risk_level:RiskLevel; has_new_risk:boolean; has_company_change:boolean; created_at:string; last_checked_at:string }
export interface RiskItem { type:string; status:"normal"|"warning"|"danger"; count:number; detail:string }
export interface RiskCheck { score?:number; level:RiskLevel; summary:string; items:RiskItem[] }
export interface RiskRecord { id:number|string; customer_id:number|string; risk_type:string; risk_level:RiskLevel; title:string; description:string; occurred_at:string; is_handled:number }
export interface CompanyChange { id:number; field_name:string; old_value:string; new_value:string; changed_at:string }
export interface FeishuCustomer {
  id:string; company_name:string; applicant:string; applicant_manager:string; sequence:string;
  applicant_itcode:string; applied_at:string; customer_number:string; number_status:string;
  customer_attribute:string; customer_level:string; customer_type:string; industry:string;
  department:string; city:string;
}
export interface FeishuCustomerPage { items:FeishuCustomer[]; total:number; has_more:boolean; page_token:string; source:"feishu"; synced_at:string }
export interface RiskDimension { key:string; name:string; score:number; max_score:number }
export interface RiskEvent { id?:string; record_id?:string; name?:string; title?:string; category:string; level?:RiskLevel; description:string; date:string; count:number; amount?:number|null; case_no?:string; court?:string; performance?:string; role?:string; cause?:string; result?:string }
export interface RiskAssessment { company:Company; score:number; level:RiskLevel; summary:string; data_source?:"mock"|"real"; provider?:string; api_codes?:string[]; dimensions:RiskDimension[]; major_risks:RiskEvent[]; details:{enterprise_info:Company;cooperation_risk:RiskEvent[];enterprise_risk:RiskEvent[];dishonesty:RiskEvent[];judgments:RiskEvent[]};deduplicated_risk_count:number;last_evaluated_at:string }
export interface CustomerWebProfile { company_name:string; credit_code:string; company_status:string|null; legal_person:string|null; registered_capital:string|null; established_date:string|null; address:string; self_risk_count:number|null; related_risk_count:number|null; source:"qcc_web"; source_url:string; queried_at:string; coverage:"search_result_only" }
export interface CustomerRiskRow { customer:FeishuCustomer; assessment:RiskAssessment|null; web_profile?:CustomerWebProfile|null }
export interface CustomerRiskList { items:CustomerRiskRow[]; total:number; filtered_total:number; queried_count:number; high_risk_count:number; average_risk_score:number|null; source:"feishu"; synced_at:string; cached_at:string; cache_status:"fresh"|"stale"|"refreshed" }
