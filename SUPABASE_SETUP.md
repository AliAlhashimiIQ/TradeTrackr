# Supabase Setup Guide for TradeJournal

This guide will walk you through setting up your Supabase project for the TradeJournal application.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in or create a new account
2. Click "New Project" and fill in the details:
   - Organization: Create a new organization or select an existing one
   - Name: TradeJournal
   - Database Password: Create a strong password and save it securely
   - Region: Choose the region closest to your users
   - Pricing Plan: Free tier to start

## 2. Configure Authentication

1. In your Supabase dashboard, go to "Authentication" → "Providers"
2. Enable Email authentication
3. Enable Google OAuth (optional):
   - Create a Google OAuth app in the [Google Cloud Console](https://console.cloud.google.com/)
   - Configure the redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Add your Google client ID and secret to Supabase

## 3. Set Up Database Tables

1. Go to the "SQL Editor" in your Supabase dashboard
2. Copy and paste the contents of `supabase/schema.sql` from this project
3. Run the SQL to create all tables and policies

## 4. Create Storage Buckets

1. Go to "Storage" in your Supabase dashboard
2. Create a new bucket called "avatars" for user profile pictures
3. Set the access control:
   - Make it private (not public)
   - Add the following policy:
   ```sql
   CREATE POLICY "Allow users to access their own avatars" 
   ON storage.objects FOR SELECT 
   USING (auth.uid()::text = (storage.foldername(name))[1]);

   CREATE POLICY "Allow users to upload their own avatars" 
   ON storage.objects FOR INSERT 
   WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

   CREATE POLICY "Allow users to update their own avatars" 
   ON storage.objects FOR UPDATE 
   USING (auth.uid()::text = (storage.foldername(name))[1]);

   CREATE POLICY "Allow users to delete their own avatars" 
   ON storage.objects FOR DELETE 
   USING (auth.uid()::text = (storage.foldername(name))[1]);
   ```

## 5. Environment Variables Setup

1. Copy the `.env.local.example` file to `.env.local`
2. Go to your Supabase project dashboard → "Settings" → "API"
3. Copy the "Project URL" and "anon public" key to your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## 6. Create a Service Role Key (for admin functions)

If you need server-side admin access:

1. Go to your Supabase project dashboard → "Settings" → "API"
2. Copy the "service_role secret" key
3. Add it to your `.env.local` file (but keep it server-side only):
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## 7. Testing Authentication

1. Start your Next.js development server
2. Navigate to the signup page and create a test account
3. Verify that a new row is created in the `profiles` table
4. Test login/logout functionality

## 8. Migrate from Mock Data to Real Data

The application currently falls back to mock data when Supabase data is not available. To fully migrate:

1. Add some test trades to your database:
   ```sql
   INSERT INTO trades (id, user_id, symbol, type, entry_price, exit_price, entry_time, exit_time, quantity, profit_loss, created_at, updated_at)
   VALUES 
   (uuid_generate_v4(), 'your_user_id', 'EURUSD', 'Long', 1.0845, 1.0862, '2023-05-15T09:30:00Z', '2023-05-15T10:15:00Z', 1, 342.50, now(), now());
   ```
2. Add test open positions:
   ```sql
   INSERT INTO open_positions (id, user_id, symbol, type, entry_price, entry_time, quantity, current_price, unrealized_pnl, created_at, updated_at)
   VALUES 
   (uuid_generate_v4(), 'your_user_id', 'NVDA', 'Long', 924.58, '2023-05-16T09:45:00Z', 5, 930.25, 28.35, now(), now());
   ```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/with-nextjs)
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) 