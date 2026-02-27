import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://weqphypbqgwxvhfvzlov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlcXBoeXBicWd3eHZoZnZ6bG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDM2NjUsImV4cCI6MjA4NzUxOTY2NX0.87YcF70OUhkHDEQlxBwrksULNSax2QDSPDdVZcP6Ftw';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
