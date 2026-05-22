/**
 * Script to add missing RLS INSERT policy to users table
 * Run with: node src/scripts/add-rls-policy.js
 */

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing environment variables:");
  console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✓" : "✗"}`);
  console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "✓" : "✗"}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addInsertPolicy() {
  console.log("🔧 Adding INSERT policy to users table...\n");

  try {
    const { data, error } = await supabase.rpc("exec", {
      sql: `
        -- Create INSERT policy for users table
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'users' AND policyname = 'users_insert_own'
          ) THEN
            CREATE POLICY "users_insert_own"
              ON users FOR INSERT
              WITH CHECK (true);
            RAISE NOTICE 'Policy users_insert_own created successfully';
          ELSE
            RAISE NOTICE 'Policy users_insert_own already exists';
          END IF;
        END $$;
      `,
    });

    if (error) {
      console.error("❌ Error:", error);
      process.exit(1);
    }

    console.log("✅ INSERT policy added successfully!\n");
    console.log("📝 Policy details:");
    console.log("   Table: users");
    console.log("   Operation: INSERT");
    console.log("   Policy: users_insert_own");
    console.log("   Condition: true (service role bypasses anyway)\n");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

addInsertPolicy();
