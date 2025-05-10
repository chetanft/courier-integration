# Centralized API Integration System

This document provides an overview of the centralized API integration system, which is designed to provide a unified way to make API requests, handle authentication, process responses, and map fields across the Courier Integration Platform.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [API Client](#api-client)
4. [cURL Parser](#curl-parser)
5. [Field Extractor](#field-extractor)
6. [Multi-Step API Integration](#multi-step-api-integration)
7. [Field Mapping](#field-mapping)
8. [JS File Generator](#js-file-generator)
9. [UI Components](#ui-components)
10. [Integration with Existing Forms](#integration-with-existing-forms)
11. [Testing](#testing)

## Overview

The centralized API integration system provides a unified way to handle API requests, authentication, response processing, and field mapping across the Courier Integration Platform. It is designed to be flexible, robust, and easy to use, with support for various authentication methods, error handling, and large response processing.

## Core Components

The system consists of the following core components:

- **API Client**: A centralized service for making API requests with standardized authentication, error handling, and response processing.
- **cURL Parser**: An enhanced parser for cURL commands with better error handling, validation, and support for complex commands.
- **Field Extractor**: A utility for extracting field paths from API responses, formatting field paths, and getting values by path.
- **Multi-Step API Integration**: A hook for managing multi-step API workflows, such as authentication followed by API calls, with response storage and field mapping.
- **Field Mapping**: A component for mapping API response fields to FT fields.
- **JS File Generator**: A service for generating JS files from API responses and field mappings.

## API Client

The API client (`src/lib/api-client.js`) provides a unified way to make API requests with standardized authentication, error handling, and response processing.

### Key Features

- **Standardized Request Configuration**: Normalizes request configurations with defaults for method, headers, query parameters, body, and authentication.
- **Authentication Support**: Supports various authentication methods, including Basic Auth, Bearer Token, JWT, and API Key.
- **Error Handling**: Creates standardized error responses with detailed information about the request and error.
- **Response Processing**: Handles large responses that exceed Netlify's 6MB limit.
- **Proxy Support**: Makes requests through Netlify proxy functions to avoid CORS issues.

### Usage

```javascript
import { makeApiRequest } from '../lib/api-client';

// Make a simple GET request
const response = await makeApiRequest({
  url: 'https://api.example.com/endpoint',
  method: 'GET'
});

// Make a request with authentication
const response = await makeApiRequest({
  url: 'https://api.example.com/endpoint',
  method: 'POST',
  headers: [
    { key: 'Content-Type', value: 'application/json' }
  ],
  body: { foo: 'bar' },
  auth: {
    type: 'bearer',
    token: 'my-token'
  }
});
```

## cURL Parser

The enhanced cURL parser (`src/lib/enhanced-curl-parser.js`) provides improved parsing of cURL commands with better error handling, validation, and support for complex commands.

### Key Features

- **Improved Parsing**: Handles complex cURL commands with line continuations, quoted strings, and multiple headers.
- **Authentication Extraction**: Extracts authentication details from cURL commands, including Basic Auth, Bearer Token, and JWT.
- **Validation**: Validates parsed cURL commands to ensure they are complete and valid.
- **Conversion**: Converts request objects back to cURL commands for debugging and sharing.

### Usage

```javascript
import { parseCurl, validateCurlParse, toCurl } from '../lib/enhanced-curl-parser';

// Parse a cURL command
const parsed = parseCurl('curl -X POST -H "Content-Type: application/json" -d \'{"foo":"bar"}\' https://api.example.com/endpoint');

// Validate the parsed result
const validation = validateCurlParse(parsed);
if (!validation.valid) {
  console.error('Invalid cURL command:', validation.issues);
}

// Convert a request object to a cURL command
const curlCommand = toCurl({
  url: 'https://api.example.com/endpoint',
  method: 'POST',
  headers: [
    { key: 'Content-Type', value: 'application/json' }
  ],
  body: { foo: 'bar' }
});
```

## Field Extractor

The field extractor utility (`src/lib/field-extractor.js`) provides functions for extracting field paths from API responses, formatting field paths, and getting values by path.

### Key Features

- **Field Path Extraction**: Extracts all field paths from an API response, including nested objects and arrays.
- **Field Path Formatting**: Formats field paths for display, with support for array notation.
- **Value Extraction**: Gets values from an object using a field path, with support for nested objects and arrays.
- **Field Extraction**: Extracts a subset of fields from an object, creating a new object with only the specified fields.

### Usage

```javascript
import { extractFieldPaths, formatFieldPath, getValueByPath, extractFields } from '../lib/field-extractor';

// Extract field paths from an API response
const paths = extractFieldPaths(apiResponse);

// Format a field path for display
const formattedPath = formatFieldPath('items[0].name');

// Get a value from an object using a field path
const value = getValueByPath(apiResponse, 'items[0].name');

// Extract a subset of fields from an object
const subset = extractFields(apiResponse, ['items[0].name', 'items[0].price']);
```

## Multi-Step API Integration

The multi-step API integration hook (`src/hooks/useMultiStepApiIntegration.js`) provides a way to manage multi-step API workflows, such as authentication followed by API calls, with response storage and field mapping.

### Key Features

- **Step Configuration**: Manages configurations for each step in the workflow.
- **Response Storage**: Stores responses from each step for use in subsequent steps.
- **Token Extraction**: Extracts authentication tokens from responses for use in subsequent steps.
- **Field Mapping**: Manages field mappings for each API type.
- **Error Handling**: Handles errors at each step in the workflow.

### Usage

```javascript
import { useMultiStepApiIntegration } from '../hooks/useMultiStepApiIntegration';

// Initialize the hook with initial configurations
const {
  stepConfigs,
  stepResponses,
  loading,
  errors,
  fieldMappings,
  updateStepConfig,
  executeStep,
  updateFieldMappings,
  getAllResponses
} = useMultiStepApiIntegration([
  { apiIntent: 'generate_auth_token', url: 'https://api.example.com/auth' },
  { apiIntent: 'tracking', url: 'https://api.example.com/tracking' }
]);

// Update a step configuration
updateStepConfig(0, {
  auth: {
    type: 'basic',
    username: 'user',
    password: 'pass'
  }
});

// Execute a step
await executeStep(0);

// Update field mappings
updateFieldMappings('tracking', {
  trackingNumber: 'data.tracking_number',
  status: 'data.status'
});

// Get all responses
const allResponses = getAllResponses();
```

## Field Mapping

The field mapping component (`src/components/api/FieldMappingComponent.jsx`) provides a UI for mapping API response fields to FT fields.

### Key Features

- **Field Path Extraction**: Extracts field paths from API responses for mapping.
- **Field Mapping UI**: Provides a user-friendly interface for mapping API fields to FT fields.
- **Custom Mappings**: Allows users to add custom mappings for fields not in the predefined list.
- **Validation**: Validates mappings to ensure they are complete and valid.

### Usage

```jsx
import FieldMappingComponent from '../components/api/FieldMappingComponent';

// Render the component
<FieldMappingComponent
  apiResponse={apiResponse}
  ftFields={ftFields}
  initialMappings={initialMappings}
  onMappingChange={handleMappingChange}
  onSaveMappings={handleSaveMappings}
/>
```

## JS File Generator

The JS file generator service (`src/lib/js-file-generator.js`) generates JS files from API responses and field mappings.

### Key Features

- **Authentication Functions**: Generates authentication functions based on the authentication configuration.
- **API Functions**: Generates functions for each API type, such as tracking and EPOD.
- **Field Mapping Integration**: Includes field mappings in the generated JS file.
- **Utility Functions**: Generates utility functions for working with the API responses.

### Usage

```javascript
import { generateJsFile } from '../lib/js-file-generator';

// Generate a JS file
const jsFile = generateJsFile(responses, {
  courierName: 'Test Courier',
  clientName: 'Test Client',
  fieldMappings: {
    tracking: {
      trackingNumber: 'data.tracking_number',
      status: 'data.status'
    }
  }
});
```

## UI Components

The system includes several UI components for working with APIs:

- **ApiResponseDisplay**: Displays API responses with copy functionality and handles large responses.
- **AuthenticationForm**: Provides a UI for configuring different authentication methods.
- **FieldMappingComponent**: Provides a UI for mapping API response fields to FT fields.
- **JsFileGenerator**: Provides a UI for generating JS files from API responses and field mappings.
- **MultiStepApiIntegration**: Provides a UI for multi-step API workflows.

## Integration with Existing Forms

The system is integrated with the following existing forms:

- **Add Courier Form**: Uses the multi-step API integration component for authentication, API configuration, field mapping, and JS file generation.
- **Add Available Couriers**: Uses the enhanced API client for fetching available couriers.
- **Add Client Form**: Uses the enhanced API client for adding clients and available couriers.
- **Bulk Upload Form**: Uses the enhanced API client for bulk uploading clients.

## Testing

The system includes unit tests for the core components:

- **API Client Tests**: Tests for the API client service.
- **cURL Parser Tests**: Tests for the enhanced cURL parser.
- **Field Extractor Tests**: Tests for the field extractor utility.

To run the tests, use the following command:

```bash
npm test
```
