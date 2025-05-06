# Supabase Edge Functions Setup Guide

This guide explains how to set up and deploy Supabase Edge Functions for the Courier Integration Platform.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/) (installed automatically with Supabase CLI)
- Access to your Supabase project

## Setup Steps

### 1. Install the Supabase CLI

```bash
# Using npm
npm install -g supabase

# Or using Homebrew on macOS
brew install supabase/tap/supabase
```

### 2. Login to Supabase

```bash
supabase login
```

Follow the prompts to authenticate with your Supabase account.

### 3. Link Your Project

```bash
# Replace 'wyewfqxsxzakafksexil' with your actual project reference
supabase link --project-ref wyewfqxsxzakafksexil
```

### 4. Deploy the Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy a specific function
supabase functions deploy tms-fields
supabase functions deploy couriers-missing-fields
```

## Testing Edge Functions

You can test your Edge Functions using curl:

```bash
# Replace 'YOUR_ANON_KEY' with your actual Supabase anon key
curl -i --location --request GET 'https://wyewfqxsxzakafksexil.supabase.co/functions/v1/tms-fields' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'
```

Or using the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to "Edge Functions"
3. Select a function
4. Click "Invoke" to test it

## Troubleshooting

### CORS Issues

If you encounter CORS issues when calling Edge Functions from your frontend, make sure:

1. The `corsHeaders` in `_shared/cors.ts` include all necessary headers
2. Your frontend is sending the correct `Authorization` header

### Authorization Issues

If you get "Unauthorized" errors:

1. Check that you're including the correct `Authorization: Bearer YOUR_ANON_KEY` header
2. Verify that your anon key has the necessary permissions

### RLS Issues

If you encounter RLS (Row Level Security) errors:

1. Make sure RLS is enabled for your tables
2. Add appropriate policies to allow the operations you need
3. Run the SQL in `fix-rls-policies.sql` to set up the correct policies

## Updating Edge Functions

To update an Edge Function:

1. Make your changes to the function code
2. Deploy the updated function:

```bash
supabase functions deploy function-name
```

## Local Development

To develop and test Edge Functions locally:

```bash
# Start the local Supabase stack
supabase start

# Serve functions locally
supabase functions serve
```

Your functions will be available at `http://localhost:54321/functions/v1/function-name`.
