const fs = require("fs");
const path = require("path");

console.log("🔍 Validating environment variables...\n");

const envFiles = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
];

let hasError = false;

envFiles.forEach((file) => {
  const filePath = path.join(process.cwd(), file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");

    const lines = content.split("\n");

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const [key] = trimmed.split("=");

      if (!key.startsWith("NEXT_PUBLIC_")) {
        console.error(`❌ Invalid env key: ${key}`);
        hasError = true;
      }
    });
  }
});

if (hasError) {
  console.error("\n🚨 Build blocked\n");
  process.exit(1);
}

console.log("✅ Env validation passed\n");
process.exit(0);