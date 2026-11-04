# Quick Start Guide

Get your Hospital ERP system up and running in 5 minutes!

## Prerequisites Check

Before you begin, ensure you have:
- ✅ Node.js 18+ installed
- ✅ PostgreSQL database (local or cloud)
- ✅ A code editor (VS Code recommended)

## Step-by-Step Setup

### 1️⃣ Install Dependencies

```bash
cd hospital-erp
npm install
```

### 2️⃣ Configure Environment

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/hospital_erp?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"
```

**Generate a secret:**
```bash
openssl rand -base64 32
```

### 3️⃣ Initialize Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4️⃣ Start Development Server

```bash
npm run dev
```

### 5️⃣ Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the dashboard!

## What's Next?

Now that your project is running, here's what you can do:

### Explore the Structure

- **Dashboard**: Main landing page at `/dashboard`
- **Clinical Modules**: Navigate through OPD, IPD, OT, EMR
- **Finance**: Billing, Insurance/TPA, GST Configuration
- **Pharmacy**: Inventory and POS
- **Admin**: Users, Audit Logs, Geofencing

### View Database with Prisma Studio

```bash
npm run db:studio
```

This opens a GUI at `http://localhost:5555` to view and edit database records.

### Understand the Architecture

Read these files:
1. `README.md` - Project overview
2. `STRUCTURE.md` - Detailed folder structure
3. `SETUP.md` - Comprehensive environment setup

## Default Structure Created

```
✅ Authentication routes: /login, /reset-password
✅ Dashboard with sidebar navigation
✅ All module placeholders (Clinical, Finance, Pharmacy, Admin)
✅ Prisma schema with all core models
✅ NextAuth v5 configuration
✅ Shadcn/ui components installed
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema to database
npm run db:studio        # Open Prisma Studio GUI

# Code Quality
npm run lint             # Run ESLint
```

## Troubleshooting

### Can't connect to database?
- Verify PostgreSQL is running
- Check your DATABASE_URL in `.env`
- Ensure database exists

### Port 3000 already in use?
```bash
# Change port
PORT=3001 npm run dev
```

### Prisma errors?
```bash
# Regenerate client
npm run db:generate
```

## Next Development Steps

### Phase 1: Authentication
- Implement login form with validation
- Add user registration
- Password reset functionality
- Protected route middleware

### Phase 2: Patient Management
- Patient registration form
- Patient list with search/filter
- Patient profile view/edit
- Medical history display

### Phase 3: Appointments
- Appointment booking form
- Calendar view
- Doctor scheduling
- Status management (Scheduled, Completed, Cancelled)

### Phase 4: Billing
- Bill creation form
- Invoice generation
- Payment processing
- Receipt printing

## Development Tips

1. **Use Server Components**: Next.js 14 App Router uses Server Components by default. Only add `"use client"` when you need interactivity.

2. **Shadcn/ui Only**: Stick to Shadcn/ui components for consistency. Install new components:
   ```bash
   npx shadcn@latest add <component-name>
   ```

3. **Type Safety**: Leverage TypeScript. Use Prisma types:
   ```typescript
   import { User, Patient } from "@prisma/client"
   ```

4. **Server Actions**: For forms and mutations, use Server Actions instead of API routes when possible.

5. **Database Changes**: After modifying `schema.prisma`:
   ```bash
   npm run db:generate
   npm run db:push
   ```

## Getting Help

- **Project Documentation**: Check `STRUCTURE.md` and `SETUP.md`
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Shadcn/ui**: https://ui.shadcn.com
- **NextAuth**: https://next-auth.js.org

## Security Reminders

- ⚠️ Never commit `.env` file
- ⚠️ Use strong database passwords
- ⚠️ Generate secure NEXTAUTH_SECRET
- ⚠️ Keep dependencies updated

---

**Happy Coding! 🚀**

Your Hospital ERP foundation is ready. Start building your first module!
