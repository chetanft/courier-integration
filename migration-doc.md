# API Service Migration Documentation

## Overview

This document maps the functions from old service files to their new equivalents in the consolidated architecture.

## Service Mapping

| Old Service                | New Service                                    |
| -------------------------- | ---------------------------------------------- |
| supabase-service.js        | db-service.js (Database operations)            |
| courier-api-service.js     | courier-api-client.js (Courier API operations) |
| proxy-service.js           | api-service.js (Generic API operations)        |
| courier-api-service-new.js | courier-api-client.js + api-service.js         |
| supabase-service-proxy.js  | db-service.js                                  |
| supabase-client-proxy.js   | auth-service.js                                |
| api-utils.js               | utils.js + api-service.js                      |

## Function Mapping

### supabase-service.js → db-service.js

| Old Function          | New Function                              | Notes                              |
| --------------------- | ----------------------------------------- | ---------------------------------- |
| getClients            | getClients                                | Same functionality                 |
| getClientById         | getClientById                             | Same functionality                 |
| addClient             | createClient                              | Same parameters                    |
| updateClient          | updateClient                              | Same functionality                 |
| deleteClient          | deleteClient                              | Same functionality                 |
| getCouriers           | getCouriers                               | Same functionality                 |
| getCourierById        | getCourierById                            | Same functionality                 |
| addCourier            | createCourier                             | Same parameters                    |
| updateCourier         | updateCourier                             | Same functionality                 |
| deleteCourier         | deleteCourier                             | Same functionality                 |
| getCouriersByClientId | getCourierClients                         | Now expects courierId as parameter |
| getCourierMappings    | getCourierMappings                        | Same functionality                 |
| addFieldMapping       | createFieldMapping                        | Same parameters                    |
| uploadJsFile          | uploadJsFile (courier-api-client.js)      | Moved to courier-api-client        |
| linkClientsToCourier  | linkClientsToCourier                      | Same functionality                 |
| saveApiTestResult     | testApiConnection (courier-api-client.js) | Moved to courier-api-client        |

### courier-api-service.js → courier-api-client.js

| Old Function       | New Function          | Notes                   |
| ------------------ | --------------------- | ----------------------- |
| fetchCourierData   | fetchData             | More consistent naming  |
| makeCourierRequest | makeRequest           | Same functionality      |
| processResponse    | processApiResponse    | Enhanced error handling |
| extractFields      | extractResponseFields | Same functionality      |

### proxy-service.js → api-service.js

| Old Function        | New Function        | Notes                                         |
| ------------------- | ------------------- | --------------------------------------------- |
| directFetch         | makeApiRequest      | Enhanced functionality                        |
| proxyFetch          | makeProxyRequest    | Same functionality with better error handling |
| createErrorResponse | createErrorResponse | Enhanced with more error details              |

## Parameter Changes

Some functions may have slightly different parameter requirements:

- Most create functions now automatically add timestamps
- Error responses follow a standardized format
- Authentication is handled uniformly across all API calls

## Error Handling

The new services use a standardized error format:

```javascript
{
  error: true,
  message: "Human-readable error message",
  status: 400, // HTTP status code when applicable
  statusText: "Bad Request",
  details: {}, // Additional error details
  operation: "operation name",
  timestamp: "2023-01-01T00:00:00.000Z"
}
```
