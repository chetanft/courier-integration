# Netlify Setup Guide

This document provides instructions for setting up the Courier Integration Platform on Netlify.

## Environment Variables

The application requires the following environment variables to be set in Netlify:

1. `SUPABASE_URL` - Your Supabase project URL (e.g., `https://abcdefghijklm.supabase.co`)
2. `SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Setting Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Navigate to **Site settings** > **Environment variables**
4. Add the following environment variables:
   - Key: `SUPABASE_URL`, Value: Your Supabase project URL
   - Key: `SUPABASE_ANON_KEY`, Value: Your Supabase anonymous key

> **Important**: Make sure the `SUPABASE_URL` is a complete URL starting with `https://` and ending with `.co`. The application will not work if the URL is not properly formatted.

## Supabase Row Level Security (RLS) Configuration

The application requires proper Row Level Security (RLS) configuration in Supabase to work correctly. Follow these steps to set up RLS:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Run the SQL commands from the `fix-rls-policies.sql` file in this repository
4. This will enable RLS and add appropriate policies for all tables

If you encounter a "Row Level Security (RLS) Configuration Issue" error in the Settings page, it means RLS is not properly configured. Follow the instructions provided in the error message to fix the issue.

## Troubleshooting

If you encounter errors like "Only absolute URLs are supported", "Failed to load TMS fields", or "Row Level Security (RLS) Configuration Issue", check the following:

1. Verify that both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correctly set in Netlify environment variables
2. Ensure that `SUPABASE_URL` is a complete URL starting with `https://` and ending with `.co`
3. Check that Row Level Security (RLS) is properly configured in Supabase (see above)
4. Check the Netlify function logs for more detailed error information

## Redeploying

After updating environment variables, you may need to trigger a new deployment:

1. Go to your Netlify dashboard
2. Select your site
3. Navigate to **Deploys**
4. Click **Trigger deploy** > **Deploy site**

This will rebuild your site with the updated environment variables.
