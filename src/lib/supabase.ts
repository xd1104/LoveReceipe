import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubhpjrfwyzlzueduvypt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHBqcmZ3eXpsenVlZHV2eXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3ODY0NDYsImV4cCI6MjA3NDM2MjQ0Nn0.44gSR2Ujk4kaQEw91HxCm3h6vVEdJRQ7b9kwvGXx6Ok';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { 
    persistSession: true, 
    detectSessionInUrl: true,
    autoRefreshToken: true
  }
});



