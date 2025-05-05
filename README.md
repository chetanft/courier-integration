# Courier Integration Platform

A full-stack internal platform to automate the onboarding and integration of courier partners for a Transportation Management System (TMS) product.

## Features

- Add new courier integrations with API credentials
- Test API connections and display response data
- Map courier API fields to internal TMS fields
- Generate JavaScript configuration files
- Manage client-courier relationships
- Make real API calls to courier services

## Tech Stack

- **Frontend**: React with Vite
- **UI Components**: Tailwind CSS + ShadCN/UI
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API Calls**: Axios for external APIs, Supabase JS client for database
- **Form Handling**: React Hook Form
- **Notifications**: Sonner

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/chetanft/courier-integration.git
   cd courier-integration
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

### Supabase Configuration

This application uses Supabase as its backend. To run the application:

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Set up the database schema using the SQL in `supabase-schema.sql`

3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Usage

### Adding a New Courier

1. Navigate to the "Add Courier" page
2. Fill in the courier details and authentication credentials
3. Enter the API endpoint and test docket number
4. Click "Test API & Continue"
5. Map the API fields to your internal TMS fields
6. Save the mappings
7. Generate the JavaScript configuration file

### Adding Clients to a Courier

1. Navigate to the "Add Client" page
2. Select a courier from the dropdown
3. Select one or more clients to link to the courier
4. Click "Link Clients to Courier"

### Viewing Couriers

1. Navigate to the "View Couriers" page
2. Select a courier from the list
3. View courier details, field mappings, and linked clients
4. Generate JavaScript configuration files

## Project Structure

```
/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/               # UI components
│   │   ├── forms/            # Form components
│   │   ├── tables/           # Table components
│   │   ├── layout/           # Layout components
│   │   └── courier/          # Courier-specific components
│   ├── lib/
│   │   ├── supabase-client.js # Supabase client initialization
│   │   ├── supabase-service.js # Supabase service for data operations
│   │   ├── api-utils.js      # API utilities for external courier APIs
│   │   ├── field-extractor.js # Field path extraction
│   │   └── js-generator.js   # JS file generator
│   ├── pages/
│   │   ├── AddCourier.jsx    # Add new courier
│   │   ├── AddClient.jsx     # Add client to courier
│   │   └── ViewCouriers.jsx  # View existing couriers
│   ├── App.jsx               # Main app component with routing
│   └── main.jsx              # Entry point
├── supabase-schema.sql        # Supabase database schema
├── fix-rls-policies.sql      # SQL to fix RLS policies
├── setup-supabase.md         # Supabase setup instructions
├── package.json
└── README.md
```

## Generated JavaScript Files

The platform generates JavaScript configuration files for each courier integration. These files include:

- Authentication token generation
- API endpoint configuration
- Field mappings
- Response transformation

Example:

```javascript
const safeExpressMapping = {
  "generate_token_request": {
    "url": ConfigAccessor.getConfig('third_party_url', 'safexpress_auth'),
    "method": "POST",
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": (payload) => {
        const username = payload.config.user_name;
        const password = payload.config.password;
        return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      }
    },
    "body": "scope=server/waybillapps&grant_type=client_credentials"
  },
  "track_docket_response": {
    "is_success": (payload) => {
      return payload?.shipment?.result === "success"
    },
    "error_message": (payload) => {
      return payload?.shipment?.error || null
    },
    "tracking_provider": "safexpress",
    // ... more mappings
  }
};
```
