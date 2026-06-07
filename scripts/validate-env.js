const sensitivePatterns = [
  "private_key",
  "secret",
  "supabase_secret",
  "github_token",
  "token",
  "password",
  "api_key",
  "apikey",
];

let hasErrors = false;

console.log("🔍 Validating environment variables...");

for (const key of Object.keys(process.env)) {
  const lowerKey = key.toLowerCase();

  const isSensitive = sensitivePatterns.some((pattern) =>
    lowerKey.includes(pattern)
  );

  if (isSensitive && !key.startsWith("NEXT_PUBLIC_")) {
    console.error(`❌ Sensitive environment variable detected: ${key}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("\n🚨 Build blocked: Private credentials detected.");
  process.exit(1);
}

console.log("✅ Environment validation passed.");
const { loadEnvConfig } = require('@next/env');

// Load environment variables exactly as Next.js does
loadEnvConfig(process.cwd());

const BLOCKED_KEYWORDS = [
  'private_key',
  'supabase_secret',
  'database_url',
  'service_role',
  'admin_key',
  'jwt_secret',
];

let hasError = false;

console.log('🔒 Validating environment variables...');

for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith('NEXT_PUBLIC_')) {
    const lowerKey = key.toLowerCase();
    const lowerValue = (value || '').toLowerCase();

    // Check if the key name contains any blocked private keywords
    const isLeakingName = BLOCKED_KEYWORDS.some(kw => lowerKey.includes(kw));
    
    // Check if the value looks like a raw private key string
    const isLeakingValue = lowerValue.includes('-----begin private key-----') || lowerValue.includes('-----begin rsa private key-----');

    if (isLeakingName || isLeakingValue) {
      console.error(`\n🚨 SECURITY ERROR: Potentially private secret leaked into public variable: ${key}`);
      console.error(`   NEXT_PUBLIC_ prefix makes this variable visible to the browser!`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('\n❌ Build halted due to environment variable security check failure.\n');
  process.exit(1);
} else {
  console.log('✅ Environment variable security check passed.\n');
}
