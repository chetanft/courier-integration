# Courier Upload Components

This directory contains components for uploading couriers through CSV, JSON, and API integration.

## Components

- `CourierUploadTabs.jsx`: Main component that provides tabs for the three upload methods
- `CourierCsvUploadForm.jsx`: Form for uploading couriers via CSV file
- `CourierJsonUploadForm.jsx`: Form for uploading couriers via JSON file
- `CourierApiIntegrationForm.jsx`: Form for fetching couriers from an API

## Usage

The `CourierUploadTabs` component can be used in two contexts:

1. In the Add Client form - When adding a new client, users can specify couriers
2. In the Client Detail page - Via an "Add Available Couriers" dialog for existing clients

### Props

- `clientId`: The ID of the client (optional, only needed when adding couriers to an existing client)
- `clientName`: The name of the client (optional, used for display purposes)
- `onSuccess`: Callback function called when couriers are successfully added
- `onError`: Callback function called when an error occurs
- `initialTab`: The initial active tab ('csv', 'json', or 'api', default: 'api')
- `onParsedData`: Callback function called when data is successfully parsed (before submission)

## Data Formats

### CSV Format

The CSV file should have the following columns:
- `name` (required): The name of the courier
- `api_url`: The API URL for the courier
- `auth_type`: The authentication type (basic, bearer, apikey)
- `auth_token`: The authentication token (for bearer auth)
- `auth_username`: The username (for basic auth)
- `auth_password`: The password (for basic auth)
- `api_key`: The API key (for apikey auth)
- `api_key_name`: The name of the API key header (default: X-API-Key)
- `api_key_location`: Where to place the API key (header, query, default: header)
- `supports_ptl`: Whether the courier supports PTL (true/false)
- `services`: Comma-separated list of services
- `description`: Description of the courier
- `logo_url`: URL to the courier's logo
- `active`: Whether the courier is active (true/false, default: true)

Example:
```csv
name,api_url,auth_type,auth_token
Courier 1,https://api.example.com/courier1,bearer,token123
Courier 2,https://api.example.com/courier2,basic,
```

### JSON Format

The JSON file should have the following structure:
```json
{
  "couriers": [
    {
      "name": "Courier 1",
      "api_url": "https://api.example.com/courier1",
      "auth_type": "bearer",
      "auth_token": "token123"
    },
    {
      "name": "Courier 2",
      "api_url": "https://api.example.com/courier2",
      "auth_type": "basic",
      "auth_username": "user",
      "auth_password": "pass"
    }
  ]
}
```

### API Integration

The API integration form allows users to specify an API endpoint and authentication details to fetch couriers. The API response should be an array of courier objects with at least a `name` property.

Example API response:
```json
[
  {
    "name": "Courier 1",
    "api_url": "https://api.example.com/courier1",
    "auth_type": "bearer",
    "auth_token": "token123"
  },
  {
    "name": "Courier 2",
    "api_url": "https://api.example.com/courier2",
    "auth_type": "basic",
    "auth_username": "user",
    "auth_password": "pass"
  }
]
```

## Implementation Notes

- The components handle both file uploads and direct text input
- Validation is performed on the client side before submission
- When adding couriers to a new client (in the Add Client form), the parsed data is stored temporarily and added after the client is created
- When adding couriers to an existing client, they are added immediately upon submission
