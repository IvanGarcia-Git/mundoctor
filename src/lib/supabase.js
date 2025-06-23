import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvtdxxpckmdevmrpiiyc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGR4eHBja21kZXZtcnBpaXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzA2NjUsImV4cCI6MjA2NTY0NjY2NX0.a42KZrOTyhVM1RF2dSEzLQDuKPT_I4InKf1vLmYaPs4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);