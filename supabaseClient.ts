
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = 'https://opbxaewrtbbehbfwisow.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wYnhhZXdydGJiZWhiZndpc293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzgyNTEsImV4cCI6MjA4Mjc1NDI1MX0.AKClqRJ1cayitb-WLtH_Ps0sQDjxTdD5drQeUpg1LL8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
