# Test Plan for Enhanced Add Courier Flow

## Overview

This test plan outlines the steps to verify the enhanced auth token generation and API testing flow in the Courier Integration application.

## Prerequisites

- Access to the Courier Integration application
- Valid courier API credentials for testing
- API documentation for a courier that uses Bearer token authentication

## Test Scenarios

### 1. Basic Navigation

- [ ] Verify that the stepper navigation works correctly
- [ ] Verify that you can go back and forth between steps
- [ ] Verify that the "Next" button is disabled when required fields are not filled

### 2. Token Generation Flow

- [ ] Enter courier name and proceed to Authentication step
- [ ] Select "JWT Authentication (Generate Token)" as auth type
- [ ] Enter valid auth endpoint, method, headers, and body
- [ ] Specify the correct token path in the response
- [ ] Click "Generate Token" and verify a token is successfully generated
- [ ] Verify the token is displayed in a readable format
- [ ] Verify the copy buttons work for both token and authorization header
- [ ] Verify the success toast notification appears
- [ ] Verify the token is automatically added to the headers in the Test API step

### 3. Token Error Handling

- [ ] Enter an invalid auth endpoint and verify appropriate error handling
- [ ] Enter an invalid token path and verify appropriate error handling
- [ ] Test with malformed request body and verify appropriate error handling

### 4. API Testing with Generated Token

- [ ] After generating a token, proceed to Test API step
- [ ] Verify the authorization header is pre-filled with the generated token
- [ ] Configure and submit a test API request
- [ ] Verify the API response is displayed correctly
- [ ] Verify successful/error toast notifications

### 5. Field Mapping

- [ ] After successful API test, verify fields are extracted from the response
- [ ] Map fields to TMS fields and save mappings
- [ ] Generate JS file and verify it downloads correctly
- [ ] Verify success notifications for mapping and JS generation

### 6. UI and Usability

- [ ] Verify the token generator UI is clear and user-friendly
- [ ] Verify that collapsible sections work correctly
- [ ] Verify that the UI provides clear guidance for non-technical users
- [ ] Verify appropriate focus management when moving between steps
- [ ] Verify the UI is responsive on different screen sizes

## Edge Cases

- [ ] Test with very long tokens to ensure they display properly
- [ ] Test with special characters in the token
- [ ] Test with nested token paths (e.g., "data.auth.token.access_token")
- [ ] Test when token generation succeeds but API test fails
- [ ] Test when token expires during the flow (if possible)

## Notes

- The JWT token auth flow should make it clear to users what's happening at each step
- Error messages should be descriptive and suggest possible fixes
- Success notifications should provide clear confirmation of actions
