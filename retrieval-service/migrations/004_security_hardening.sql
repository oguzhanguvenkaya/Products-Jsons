-- Advisor fix: function_search_path_mutable
ALTER FUNCTION public.touch_updated_at() SET search_path = public, pg_temp;
