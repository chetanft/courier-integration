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

3. Configure Row Level Security (RLS) policies:

   - Run the SQL in `fix-rls-policies.sql` to enable proper access to tables
   - This is critical for the application to work correctly, especially the Settings page

4. Create a `.env` file with your Supabase credentials:

   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **Important**: Make sure the `VITE_SUPABASE_URL` is a complete URL starting with `https://` and ending with `.co`

5. Start the development server:
   ```
   npm run dev
   ```

### Deployment to Netlify

1. Create a Netlify account at [netlify.com](https://netlify.com)

2. Deploy using the Netlify UI:

   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect to your Git provider (GitHub, GitLab, etc.)
   - Select your repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"

3. Configure environment variables:

   - Go to Site settings > Environment variables
   - Add the following variables:
     - `SUPABASE_URL`: Your Supabase project URL (must start with `https://` and end with `.co`)
     - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - **Important**: Make sure the `SUPABASE_URL` is a complete URL starting with `https://` and ending with `.co`

4. Alternatively, deploy using Netlify CLI:
   ```
   npm install -g netlify-cli
   netlify login
   netlify init
   netlify deploy --prod
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

1. From the home page, click on a courier card
2. View courier details, field mappings, and linked clients
3. Generate JavaScript configuration files

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
│   │   └── CourierDetail.jsx # View courier details
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
const courierXYZMapping = {
  generate_token_request: {
    url: ConfigAccessor.getConfig("third_party_url", "courier_xyz_auth"),
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: (payload) => {
        const username = payload.config.user_name;
        const password = payload.config.password;
        return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
      },
    },
    body: "scope=server/tracking&grant_type=client_credentials",
  },
  track_shipment_response: {
    is_success: (payload) => {
      return payload?.tracking?.status === "success";
    },
    error_message: (payload) => {
      return payload?.tracking?.error || null;
    },
    tracking_provider: "courier_xyz",
    // ... more mappings
  },
};
```

## Courier API Integration

This project uses a CORS-safe backend proxy to handle all courier API requests securely. All credentials are stored in the Supabase database, not in environment variables or frontend code.

### How It Works

1. Users enter courier credentials through a form interface
2. Credentials are securely stored in the Supabase database
3. Frontend calls our Netlify Function proxy
4. The proxy retrieves credentials from the database
5. The proxy makes the API call to the courier service
6. The proxy returns the response to the frontend

This approach solves CORS issues and keeps credentials secure, while providing a user-friendly interface for non-technical users.

### Credential Management for Non-Technical Users

- Users can add and update courier credentials through a simple form interface
- No environment variables or code changes needed
- Supports multiple authentication types:
  - Basic Auth (username/password)
  - API Key
  - Bearer Token
  - JWT Authentication

### Using the Courier API Client

```javascript
import { testCourierApi } from "../lib/api-utils";

// Example tracking a shipment using database credentials
const result = await testCourierApi({
  url: "https://apigateway.safexpress.com/api/shipments/track",
  method: "POST",
  apiIntent: "track_shipment",
  courier: "safexpress", // Used to look up credentials in database
  auth: {
    type: "basic",
    useDbCredentials: true, // Get credentials from database
  },
  body: {
    docNo: "123456789",
    docType: "WB",
  },
});
```

### Security Considerations

- Courier API credentials are stored securely in your Supabase database
- All API calls go through the Netlify Function proxy
- The frontend never directly accesses or stores courier API credentials
- All requests are properly authenticated on the server side

### Adding New Couriers

To add a new courier:

1. Add appropriate environment variables for authentication
2. Update your code to call `testCourierApi` with the correct parameters
3. No changes to the proxy itself are required for most couriers
