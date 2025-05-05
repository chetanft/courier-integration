module.exports = {
  "*.{js,jsx,ts,tsx}": [
    "npx eslint --fix",
    // Check for potential secrets in code
    "node -e \"const fs=require('fs');const content=fs.readFileSync(process.argv[1],'utf8');if(/eyJ[a-zA-Z0-9_-]{5,}\\.[a-zA-Z0-9_-]{5,}\\.[a-zA-Z0-9_-]{5,}/.test(content)){console.error('Potential JWT found in '+process.argv[1]);process.exit(1)}\"",
  ],
  "*.{json,md}": ["npx prettier --write"],
  // Prevent committing .env files
  ".env*": () => {
    console.error("Prevented committing .env file");
    return Promise.reject("Prevented committing .env file");
  },
};
