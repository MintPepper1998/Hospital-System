# Installation & Setup

This guide walks you through setting up the Hospital ERP on your local machine or server.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **Git**

## 1. Clone the Repository

Clone the project to your local machine:

```bash
git clone https://github.com/your-org/hospital-erp.git
cd hospital-erp
```

## 2. Install Dependencies

Install the required Node.js packages using npm:

```bash
npm install
```

## 3. Environment Variables

Create a `.env` file in the root directory. You can copy the provided `.env.example` if it exists. Configure your database connection string and NextAuth secret:

```env
# Database configuration
DATABASE_URL="postgresql://username:password@localhost:5432/hospital_erp?schema=public"

# NextAuth configuration
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 4. Database Setup

Run the Prisma migrations to initialize your database schema:

```bash
npx prisma migrate dev --name init
```

This command reads your `prisma/schema.prisma` file and creates the corresponding tables in your PostgreSQL database.

## 5. Seeding the Database

To get started quickly, especially for testing or staging environments, you can seed the database with massive amounts of realistic data (including users, medicines, patients, and 3 months of transactions).

Run the custom high-speed seed script:

```bash
npx tsx prisma/seed-3months.ts
```

> **Warning:** The seed script performs a "nuclear cleanup" and will TRUNCATE all existing data in the database before seeding. Do not run this on a production database with real patient data.

### Seed Credentials
After seeding, you can log in using the following credentials:
- **Admin**: `admin@hospital.com` / `Admin123`
- **Doctor**: `doctor1@hospital.com` / `doctor123`

## 6. Start the Application

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).
