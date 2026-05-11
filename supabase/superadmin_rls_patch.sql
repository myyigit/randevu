-- RLS Politikalarını Superadmin İçin Genişletme
-- Supabase SQL Editor'de çalıştırın

-- 1. USERS Tablosu
DROP POLICY IF EXISTS "Dietitians can view client users" ON public.users;
CREATE POLICY "Dietitians can view client users"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients WHERE clients.id = users.id AND clients.dietitian_id = auth.uid()
  )
  OR public.is_superadmin()
);

-- 2. CLIENTS Tablosu
DROP POLICY IF EXISTS "Dietitians can view their clients" ON public.clients;
CREATE POLICY "Dietitians can view their clients"
ON public.clients FOR SELECT
USING (auth.uid() = dietitian_id OR public.is_superadmin());

-- 3. MEASUREMENTS Tablosu
DROP POLICY IF EXISTS "Dietitians can view client measurements" ON public.measurements;
CREATE POLICY "Dietitians can view client measurements"
ON public.measurements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients WHERE clients.id = measurements.client_id AND clients.dietitian_id = auth.uid()
  )
  OR public.is_superadmin()
);

-- 4. DIET PLANS Tablosu
DROP POLICY IF EXISTS "Dietitians can manage their diet plans" ON public.diet_plans;
CREATE POLICY "Dietitians can manage their diet plans"
ON public.diet_plans FOR ALL
USING (auth.uid() = dietitian_id OR public.is_superadmin());

-- 5. MEALS Tablosu
DROP POLICY IF EXISTS "Dietitians can manage meals" ON public.meals;
CREATE POLICY "Dietitians can manage meals"
ON public.meals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM diet_plans WHERE diet_plans.id = meals.diet_plan_id AND diet_plans.dietitian_id = auth.uid()
  )
  OR public.is_superadmin()
);

-- 6. MEAL FOODS Tablosu (Meals üzerinden erişim)
DROP POLICY IF EXISTS "Meal foods follow meal access" ON public.meal_foods;
CREATE POLICY "Meal foods follow meal access"
ON public.meal_foods FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meals
    JOIN diet_plans ON diet_plans.id = meals.diet_plan_id
    WHERE meals.id = meal_foods.meal_id
    AND (diet_plans.client_id = auth.uid() OR diet_plans.dietitian_id = auth.uid())
  )
  OR public.is_superadmin()
);
