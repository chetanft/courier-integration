# API Service Consolidation Migration Guide

This guide outlines the process to complete the API service consolidation migration that is currently in progress. The goal is to update all remaining files that reference old services and eventually remove deprecated files.

## Prerequisites

- Node.js 14+ installed
- Access to the project repository
- Ability to run tests on the project

## Migration Process Overview

1. Use the migration script to systematically update all files
2. Run tests after each batch of updates to ensure functionality
3. Move deprecated service files to the `.deprecated` folder
4. After a successful testing period, remove deprecated files completely

## Step 1: Prepare for Migration

1. Ensure you're on the correct branch:

   ```bash
   git checkout feature/platform-improvements
   ```

2. Make sure all dependencies are installed:

   ```bash
   npm install
   ```

3. Run tests to ensure everything is working before migration:
   ```bash
   npm test
   ```

## Step 2: Run the Batch Migration Script

The batch migration script will:

- Update files in batches of 5
- Run tests after each batch
- Ask for confirmation before proceeding to the next batch

```bash
node batch-migration.js
```

The script will guide you through the process. If tests fail after a batch, the script will stop and you'll need to fix the issues before continuing.

### Handling Test Failures

If tests fail after updating a batch:

1. Check the error messages in the test output
2. Restore files from the backups (found in the `migration-backups` directory)
3. Fix the issues manually
4. Run the tests again to verify the fix
5. Continue with the migration

## Step 3: Move Deprecated Files to .deprecated

After all files have been successfully migrated:

```bash
node move-deprecated-files.js move
```

This will:

- Create a `.deprecated` directory in `src/lib` (if it doesn't exist)
- Move all deprecated service files to that directory
- Keep the old files still accessible (but out of the main directory)

## Step 4: Testing Period

Allow for a testing period with the deprecated files moved but not deleted:

1. Build and deploy the application (if applicable)
2. Have team members use the application extensively
3. Monitor for any issues related to the API services
4. If issues are discovered, fix them and extend the testing period

## Step 5: Remove Deprecated Files

After a successful testing period with no issues:

```bash
node move-deprecated-files.js remove
```

This will:

- Ask for confirmation
- Permanently delete the deprecated files from the `src/lib` directory

## List of Deprecated Files

The following files will be moved and eventually removed:

- `supabase-service.js`
- `courier-api-service.js`
- `proxy-service.js`
- `courier-api-service-new.js`
- `supabase-service-proxy.js`
- `supabase-client-proxy.js`
- `api-utils.js`

## Migration Documentation

For more information about the migration, refer to:

- `migration-doc.md` - Contains mapping of old services to new ones
- `migration-suggestions.json` - Contains the list of files that need updates

## Troubleshooting

If you encounter issues during the migration:

1. Check the logs and error messages
2. Review the backups in the `migration-backups` directory
3. Consult the function mapping in `migration-doc.md`
4. If needed, manually update files using the suggestions in `migration-suggestions.json`
