# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the root of your project with the following variables:

```env
# Database Configuration
# Replace with your PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/hospital_erp?schema=public"

# NextAuth Configuration
# For production, change this to your actual domain
NEXTAUTH_URL="http://localhost:3000"

# NextAuth Secret
# Generate a secure secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Optional: OAuth Providers
# Uncomment and fill these if you want to enable social login

# Google OAuth
# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth
# GITHUB_ID="your-github-client-id"
# GITHUB_SECRET="your-github-client-secret"

# Optional: Email Configuration (for password reset, notifications)
# EMAIL_SERVER_HOST="smtp.gmail.com"
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER="your-email@gmail.com"
# EMAIL_SERVER_PASSWORD="your-app-password"
# EMAIL_FROM="noreply@yourhospital.com"

# Optional: WhatsApp/SMS Integration
# TWILIO_ACCOUNT_SID="your-twilio-account-sid"
# TWILIO_AUTH_TOKEN="your-twilio-auth-token"
# TWILIO_PHONE_NUMBER="+1234567890"

# Optional: Payment Gateway
# RAZORPAY_KEY_ID="your-razorpay-key-id"
# RAZORPAY_KEY_SECRET="your-razorpay-key-secret"

# Optional: Storage (AWS S3 for document storage)
# AWS_ACCESS_KEY_ID="your-aws-access-key"
# AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
# AWS_REGION="ap-south-1"
# AWS_S3_BUCKET="hospital-erp-documents"

# Optional: Application Settings
# NODE_ENV="development"
# LOG_LEVEL="debug"
```

## PostgreSQL Database Setup

### Option 1: Local PostgreSQL Installation

1. **Install PostgreSQL**
   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. **Create Database**
   ```bash
   # Access PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE hospital_erp;
   
   # Create user (optional)
   CREATE USER hospital_admin WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE hospital_erp TO hospital_admin;
   ```

3. **Update DATABASE_URL**
   ```env
   DATABASE_URL="postgresql://hospital_admin:secure_password@localhost:5432/hospital_erp?schema=public"
   ```

### Option 2: Docker PostgreSQL

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15-alpine
       container_name: hospital_erp_db
       environment:
         POSTGRES_USER: hospital_admin
         POSTGRES_PASSWORD: secure_password
         POSTGRES_DB: hospital_erp
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Start the container**
   ```bash
   docker-compose up -d
   ```

3. **Update DATABASE_URL**
   ```env
   DATABASE_URL="postgresql://hospital_admin:secure_password@localhost:5432/hospital_erp?schema=public"
   ```

### Option 3: Cloud Database (Supabase, Neon, etc.)

1. **Sign up for a service**
   - Supabase: https://supabase.com
   - Neon: https://neon.tech
   - Railway: https://railway.app

2. **Create a PostgreSQL database**

3. **Copy the connection string**

4. **Update DATABASE_URL** with the provided connection string

## NextAuth Secret Generation

Generate a secure secret for NextAuth:

```bash
# Using OpenSSL (macOS/Linux)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }) -as [byte[]])
```

Copy the output and set it as `NEXTAUTH_SECRET` in your `.env` file.

## Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

## Verifying Your Setup

1. **Check environment variables**
   ```bash
   # The app should not start if required env vars are missing
   npm run dev
   ```

2. **Test database connection**
   ```bash
   # Generate Prisma client and push schema
   npm run db:generate
   npm run db:push
   ```

3. **Open Prisma Studio** (Database GUI)
   ```bash
   npm run db:studio
   ```

4. **Access the application**
   - Open browser to http://localhost:3000
   - Should redirect to dashboard

## Security Checklist

- [ ] Never commit `.env` file to version control
- [ ] Use strong passwords for database
- [ ] Generate secure `NEXTAUTH_SECRET`
- [ ] Use HTTPS in production
- [ ] Rotate secrets regularly
- [ ] Use different credentials for dev/staging/production
- [ ] Enable database backups
- [ ] Monitor database access logs

## Troubleshooting

### Database Connection Errors

**Error**: `Can't reach database server`
- Check if PostgreSQL is running
- Verify connection string format
- Check firewall settings
- Ensure database exists

**Error**: `Authentication failed`
- Verify username and password
- Check user permissions
- Ensure user has access to the database

### NextAuth Errors

**Error**: `[next-auth][error][NO_SECRET]`
- Add `NEXTAUTH_SECRET` to `.env`

**Error**: `[next-auth][error][SIGNIN_EMAIL_ERROR]`
- Check email server configuration
- Verify SMTP credentials

### Prisma Errors

**Error**: `Prisma Client could not locate the Query Engine`
- Run `npm run db:generate`

**Error**: `Migration failed`
- Check database permissions
- Verify schema syntax
- Check for existing tables

## Production Deployment

### Environment Variables for Production

```env
DATABASE_URL="postgresql://user:password@production-host:5432/hospital_erp?schema=public"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="long-secure-production-secret"
NODE_ENV="production"
```

### Deployment Platforms

- **Vercel**: Automatic Next.js deployment
- **AWS**: Full control with EC2/ECS
- **DigitalOcean**: App Platform
- **Railway**: Easy deployment with PostgreSQL

### Pre-deployment Checklist

- [ ] Update all environment variables
- [ ] Enable database SSL in production
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Set up error tracking (Sentry)
- [ ] Enable rate limiting
- [ ] Configure CDN for static assets
- [ ] Set up domain and SSL certificate

---

**Need help?** Contact the development team or refer to the documentation.
