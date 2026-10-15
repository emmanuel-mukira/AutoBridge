-- Add unique indexes to materialized views to enable CONCURRENT refresh
-- PostgreSQL requires a unique index on materialized views for concurrent refresh

-- Drop existing materialized views and recreate with unique indexes
DROP MATERIALIZED VIEW IF EXISTS crm.active_leads_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS crm.sales_rep_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS crm.company_dashboard_summary CASCADE;

-- 1. Active Leads Summary (by customer)
CREATE MATERIALIZED VIEW crm.active_leads_summary AS
SELECT 
  c.id as customer_id,
  c.company_name,
  c.company_id,
  COUNT(l.id) as total_active_leads,
  COUNT(CASE WHEN l.status = 'OPEN' THEN 1 END) as open_leads,
  COUNT(CASE WHEN l.status = 'DRAFT' THEN 1 END) as draft_leads,
  MAX(l.created_at) as latest_lead_date,
  c.sales_rep_id
FROM crm.customers c
LEFT JOIN crm.leads l ON c.id = l.customer_id 
  AND l.status IN ('OPEN', 'DRAFT')
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.company_name, c.company_id, c.sales_rep_id;

-- Create UNIQUE index (required for CONCURRENTLY)
CREATE UNIQUE INDEX idx_active_leads_summary_customer_unique ON crm.active_leads_summary(customer_id);
-- Additional indexes for performance
CREATE INDEX idx_active_leads_summary_company ON crm.active_leads_summary(company_id);
CREATE INDEX idx_active_leads_summary_salesrep ON crm.active_leads_summary(sales_rep_id);

-- 2. Sales Rep Performance Summary
CREATE MATERIALIZED VIEW crm.sales_rep_performance AS
SELECT 
  u.id as sales_rep_id,
  u."firstName" as first_name,
  u."lastName" as last_name,
  u.company_id,
  COUNT(DISTINCT c.id) as total_customers,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(CASE WHEN l.status = 'WON' THEN 1 END) as won_leads,
  COUNT(CASE WHEN l.status = 'LOST' THEN 1 END) as lost_leads,
  COUNT(CASE WHEN l.status = 'OPEN' THEN 1 END) as open_leads,
  COUNT(DISTINCT i.id) as total_interactions,
  MAX(i.interaction_date) as last_interaction_date,
  COUNT(DISTINCT q.id) as total_quotations
FROM auth.users u
LEFT JOIN crm.customers c ON u.id = c.sales_rep_id AND c.deleted_at IS NULL
LEFT JOIN crm.leads l ON u.id = l.sales_rep_id
LEFT JOIN crm.interactions i ON u.id = i.sales_rep_id
LEFT JOIN crm.quotations q ON u.id = q.sales_rep_id
WHERE u.status = 'ACTIVE'
GROUP BY u.id, u."firstName", u."lastName", u.company_id;

-- Create UNIQUE index (required for CONCURRENTLY)
CREATE UNIQUE INDEX idx_sales_rep_performance_salesrep_unique ON crm.sales_rep_performance(sales_rep_id);
-- Additional indexes for performance
CREATE INDEX idx_sales_rep_performance_company ON crm.sales_rep_performance(company_id);

-- 3. Company Dashboard Summary
CREATE MATERIALIZED VIEW crm.company_dashboard_summary AS
SELECT 
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT cust.id) FILTER (WHERE cust.deleted_at IS NULL) as total_active_customers,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status IN ('OPEN', 'DRAFT')) as active_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'WON') as won_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'LOST') as lost_leads,
  COUNT(DISTINCT i.id) as total_interactions,
  COUNT(DISTINCT q.id) as total_quotations,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'ACTIVE') as active_users
FROM auth.companies c
LEFT JOIN crm.customers cust ON c.id = cust.company_id
LEFT JOIN crm.leads l ON c.id = l.company_id
LEFT JOIN crm.interactions i ON c.id = i.company_id
LEFT JOIN crm.quotations q ON c.id = q.company_id
LEFT JOIN auth.users u ON c.id = u.company_id
GROUP BY c.id, c.name;

-- Create UNIQUE index (required for CONCURRENTLY)
CREATE UNIQUE INDEX idx_company_dashboard_summary_company_unique ON crm.company_dashboard_summary(company_id);

-- Grant permissions
GRANT SELECT ON crm.active_leads_summary TO PUBLIC;
GRANT SELECT ON crm.sales_rep_performance TO PUBLIC;
GRANT SELECT ON crm.company_dashboard_summary TO PUBLIC;

-- Initial refresh (non-concurrent first time)
REFRESH MATERIALIZED VIEW crm.active_leads_summary;
REFRESH MATERIALIZED VIEW crm.sales_rep_performance;
REFRESH MATERIALIZED VIEW crm.company_dashboard_summary;
