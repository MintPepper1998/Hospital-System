# 🗄️ Database Setup Guide - Quick Start

## Option 1: Docker PostgreSQL (Recommended - Fastest)

### Step 1: Create docker-compose.yml

Create a file named `docker-compose.yml` in your project root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: hospital_erp_db
    environment:
      POSTGRES_USER: hospital_admin
      POSTGRES_PASSWORD: hospital_password
      POSTGRES_DB: hospital_erp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Step 2: Start PostgreSQL

```bash
docker-compose up -d
```

### Step 3: Configure .env

Create a `.env` file in your project root:

```env
DATABASE_URL="postgresql://hospital_admin:hospital_password@localhost:5432/hospital_erp?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-here"
```

**Generate NEXTAUTH_SECRET:**
```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }) -as [byte[]])

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 4: Initialize Database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### Step 5: Start Development Server

```bash
npm run dev
```

### Step 6: Access Application

Open your browser to: `http://localhost:3000`

Login with:
- **Email**: `admin@stulink.com`
- **Password**: `secure-password-123`

---

## Option 2: Local PostgreSQL Installation

### Windows

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 15 installer
   - Run installer (default settings are fine)

2. **Create Database**
   ```cmd
   # Open Command Prompt
   psql -U postgres
   
   # In psql prompt:
   CREATE DATABASE hospital_erp;
   CREATE USER hospital_admin WITH PASSWORD 'hospital_password';
   GRANT ALL PRIVILEGES ON DATABASE hospital_erp TO hospital_admin;
   \q
   ```

3. **Configure .env** (same as Docker option above)

4. **Initialize Database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start Server**
   ```bash
   npm run dev
   ```

---

## Option 3: Cloud Database (Supabase, Neon, Railway)

### Supabase (Free Tier Available)

1. **Sign up**: https://supabase.com
2. **Create new project**
3. **Get connection string**: Project Settings > Database > Connection String
4. **Update .env**:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-generated-secret"
   ```

5. **Initialize Database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

### Neon (Serverless PostgreSQL)

1. **Sign up**: https://neon.tech
2. **Create new project**
3. **Copy connection string**
4. **Update .env** with connection string
5. **Run initialization commands**

---

## Verify Database Connection

```bash
# This should connect successfully
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555` where you can view your data.

---

## Quick Troubleshooting

### Error: Can't reach database server

**Solution:**
- Ensure PostgreSQL is running
- Verify DATABASE_URL in `.env`
- Check port 5432 is not in use
- For Docker: Run `docker-compose ps` to check status

### Error: Authentication failed

**Solution:**
- Check username/password in DATABASE_URL
- Ensure user has proper permissions
- Try connecting with psql directly

### Error: Database does not exist

**Solution:**
```bash
# Create database manually
psql -U postgres -c "CREATE DATABASE hospital_erp;"
```

---

## Recommended: Docker Approach

✅ **Fastest setup**  
✅ **No local installation needed**  
✅ **Consistent across environments**  
✅ **Easy to reset/restart**  

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
npm run db:push
npm run db:seed
```

---

**Need help?** Check `SETUP.md` for more detailed instructions.
