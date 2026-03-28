import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://rmtgyottfwbgklhzggji.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TShg_sZeOr0DKECGNhxKWg_AhZtBYNt';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_URL, SUPABASE_ANON_KEY };
