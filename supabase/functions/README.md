# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Courier Integration Platform.

## Setup Instructions

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref wyewfqxsxzakafksexil
   ```

4. Deploy functions:
   ```bash
   supabase functions deploy
   ```

## Available Functions

- `tms-fields`: Handles CRUD operations for TMS fields
- `couriers-missing-fields`: Gets couriers missing specific TMS field mappings

## Local Development

To run functions locally:

```bash
supabase start
supabase functions serve
```

## Testing

You can test functions using curl:

```bash
curl -i --location --request GET 'https://wyewfqxsxzakafksexil.supabase.co/functions/v1/tms-fields' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'
```
