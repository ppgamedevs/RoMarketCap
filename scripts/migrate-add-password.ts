import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding password column to users table...");
  
  try {
    // Check if column already exists by trying to query it
    await prisma.$queryRaw`SELECT password FROM users LIMIT 1`;
    console.log("✅ Password column already exists");
  } catch (error: any) {
    // Column doesn't exist, add it
    if (error?.code === "42703" || error?.message?.includes("column") || error?.message?.includes("password")) {
      console.log("Column doesn't exist, adding it...");
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "password" TEXT;
      `);
      console.log("✅ Password column added successfully");
    } else {
      throw error;
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

