-- ============================================================================
-- WEVLY BUSINESSOS — Seed Data for Local Development & Demo Tenant
-- ============================================================================

-- Fixed UUIDs for predictable reference
-- Tenant Org ID: 00000000-0000-0000-0000-000000000001
-- Demo User ID: 00000000-0000-0000-0000-000000000002

-- 1. Default Plans
INSERT INTO public.plans (id, name, code, description, price_monthly, price_yearly, max_users, max_invoices_per_month, features, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Starter', 'starter', 'Perfect for small shops & single freelancers', 499.00, 4990.00, 2, 100, '{"gst_reports": false, "multi_warehouse": false, "e_invoicing": false}', true),
  ('22222222-2222-2222-2222-222222222222', 'Growth', 'growth', 'Designed for growing small businesses', 999.00, 9990.00, 5, 1000, '{"gst_reports": true, "multi_warehouse": true, "e_invoicing": false}', true),
  ('33333333-3333-3333-3333-333333333333', 'Enterprise', 'enterprise', 'Unlimited power for multi-branch operations', 2499.00, 24990.00, 99, 999999, '{"gst_reports": true, "multi_warehouse": true, "e_invoicing": true}', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Demo User Profile
INSERT INTO public.user_profiles (id, full_name, email, phone, avatar_url)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Rajesh Sharma', 'demo@wevly.in', '+919876543210', 'https://avatar.iran.liara.run/public/boy')
ON CONFLICT (id) DO NOTHING;

-- 3. Demo Organization
INSERT INTO public.organizations (id, name, slug, legal_name, tax_id, phone, email, currency, timezone, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Apex Traders & Electronics', 'apex-traders', 'Apex Electronics India Pvt Ltd', '27AAACA12341Z5', '+919876543210', 'contact@apextraders.com', 'INR', 'Asia/Kolkata', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Organization Member
INSERT INTO public.organization_members (id, organization_id, user_id, role, is_active)
VALUES 
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Business Profile
INSERT INTO public.business_profiles (id, organization_id, gstin, pan, state_code, state_name, address_line1, address_line2, city, state, postal_code, country, is_composition_scheme)
VALUES 
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000001', '27AAACA12341Z5', 'AAACA1234', '27', 'Maharashtra', 'Plot 42, MIDC Industrial Area', 'Andheri East', 'Mumbai', 'Maharashtra', '400093', 'India', false)
ON CONFLICT (organization_id) DO NOTHING;

-- 6. Product Categories
INSERT INTO public.product_categories (id, organization_id, name, code, description)
VALUES 
  ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Smartphones & Accessories', 'CAT-MOB', 'Mobile phones, chargers, and cases'),
  ('c2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Computers & Laptops', 'CAT-COMP', 'Laptops, desktops, and peripherals'),
  ('c3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Home Appliances', 'CAT-APP', 'TVs, refrigerators, and washing machines')
ON CONFLICT DO NOTHING;

-- 7. Product Units
INSERT INTO public.product_units (id, organization_id, name, code, precision_places)
VALUES 
  ('u1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Pieces', 'PCS', 0),
  ('u2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Boxes', 'BOX', 0),
  ('u3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Kilograms', 'KGS', 2)
ON CONFLICT DO NOTHING;

-- 8. Products
INSERT INTO public.products (id, organization_id, category_id, unit_id, name, sku, hsn_sac_code, barcode, selling_price, purchase_price, tax_rate, current_stock, min_stock_alert, is_active)
VALUES 
  ('p1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111', 'u1111111-1111-1111-1111-111111111111', 'Samsung Galaxy S24 Ultra (256GB)', 'MOB-SAM-S24U', '8517', '8806095000000', 129999.00, 115000.00, 18.00, 15, 3, true),
  ('p2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'c2222222-2222-2222-2222-222222222222', 'u1111111-1111-1111-1111-111111111111', 'Dell XPS 15 Laptop (Intel i9, 32GB)', 'COMP-DELL-XPS15', '8471', '8841160000000', 189990.00, 165000.00, 18.00, 8, 2, true),
  ('p3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111', 'u1111111-1111-1111-1111-111111111111', '65W Fast Charger Type-C', 'ACC-CHG-65W', '8504', '8901234567890', 1499.00, 850.00, 18.00, 45, 10, true)
ON CONFLICT DO NOTHING;

-- 9. Customers
INSERT INTO public.customers (id, organization_id, name, company_name, email, phone, gstin, credit_limit, opening_balance, current_balance, is_active)
VALUES 
  ('cust1111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Amit Kumar', 'Infosys Tech Solutions', 'amit.k@infosys-tech.com', '+919812345678', '27AABCU9603R1ZM', 500000.00, 0.00, 153398.82, true),
  ('cust2222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Priya Desai', 'Desai Retail Store', 'desai.retail@gmail.com', '+919823456789', '27AAACD5678E1Z2', 100000.00, 0.00, 0.00, true)
ON CONFLICT DO NOTHING;

-- 10. Customer Address
INSERT INTO public.customer_addresses (id, customer_id, address_type, address_line1, city, state, postal_code, country, is_default)
VALUES 
  ('ca111111-1111-1111-1111-111111111111', 'cust1111-1111-1111-1111-111111111111', 'billing', '102 Tech Park, BKC', 'Mumbai', 'Maharashtra', '400051', 'India', true)
ON CONFLICT DO NOTHING;

-- 11. Suppliers
INSERT INTO public.suppliers (id, organization_id, name, company_name, email, phone, gstin, opening_balance, current_balance, is_active)
VALUES 
  ('supp1111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Suresh Patel', 'National Electronics Distributors', 'sales@nationalelectronics.in', '+919834567890', '27AAACN1234D1Z9', 0.00, -250000.00, true)
ON CONFLICT DO NOTHING;

-- 12. Expense Categories
INSERT INTO public.expense_categories (id, organization_id, name, code, description)
VALUES 
  ('ec111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Office Rent & Maintenance', 'RENT', 'Monthly office rent and maintenance fees'),
  ('ec222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Electricity & Utilities', 'UTIL', 'Power, water, and internet bills'),
  ('ec333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Staff Salary & Perks', 'SALARY', 'Employee wages and allowances')
ON CONFLICT DO NOTHING;
