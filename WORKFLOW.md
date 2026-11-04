# Development Workflow Guide

## 🎯 Daily Development Routine

### Starting Your Day

1. **Pull latest changes** (if working in a team)
   ```bash
   git pull origin main
   npm install  # If package.json changed
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open Prisma Studio** (in a separate terminal)
   ```bash
   npm run db:studio
   ```

## 🔄 Making Changes

### Adding a New Feature

1. **Create a feature branch**
   ```bash
   git checkout -b feature/patient-registration
   ```

2. **Make your changes**
   - Edit files as needed
   - Follow existing patterns
   - Use TypeScript strictly

3. **Test locally**
   - Verify in browser
   - Check console for errors
   - Test on mobile viewport

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add patient registration form"
   ```

### Modifying the Database Schema

1. **Edit schema**
   ```bash
   # Edit prisma/schema.prisma
   code prisma/schema.prisma
   ```

2. **Generate and push**
   ```bash
   npm run db:generate
   npm run db:push
   ```

3. **Verify in Prisma Studio**
   ```bash
   npm run db:studio
   ```

### Adding a New UI Component

1. **Install from Shadcn/ui**
   ```bash
   npx shadcn@latest add <component-name>
   ```

2. **Import and use**
   ```typescript
   import { ComponentName } from "@/components/ui/component-name"
   ```

### Creating a New Page

1. **Create the page file**
   ```bash
   # Example: Creating a new reports page
   touch app/(dashboard)/reports/page.tsx
   ```

2. **Add the page component**
   ```typescript
   export default function ReportsPage() {
     return (
       <div className="space-y-6">
         <h2 className="text-3xl font-bold">Reports</h2>
         {/* Your content */}
       </div>
     )
   }
   ```

3. **Add to sidebar navigation**
   ```typescript
   // Edit components/app-sidebar.tsx
   // Add new menu item to menuItems array
   ```

### Creating Server Actions

1. **Create actions file**
   ```typescript
   // app/(dashboard)/patients/actions.ts
   "use server"
   
   import { prisma } from "@/lib/prisma"
   
   export async function createPatient(data: PatientData) {
     return await prisma.patient.create({
       data: {
         // ... patient data
       }
     })
   }
   ```

2. **Use in component**
   ```typescript
   import { createPatient } from "./actions"
   
   async function handleSubmit(formData: FormData) {
     await createPatient(data)
   }
   ```

## 🧪 Testing Your Changes

### Manual Testing Checklist

- [ ] Page loads without errors
- [ ] Forms submit correctly
- [ ] Data displays as expected
- [ ] Mobile responsive
- [ ] Dark mode works (if applicable)
- [ ] No console errors
- [ ] Database changes persist

### Browser Testing

Test in multiple browsers:
- Chrome
- Firefox
- Safari
- Edge

### Responsive Testing

Test on different screen sizes:
- Mobile: 375px
- Tablet: 768px
- Desktop: 1280px
- Large: 1920px

## 🐛 Debugging

### Common Issues

**Problem**: TypeScript errors
```bash
# Solution: Check types
npm run lint
```

**Problem**: Prisma Client out of sync
```bash
# Solution: Regenerate
npm run db:generate
```

**Problem**: Database migration needed
```bash
# Solution: Push schema
npm run db:push
```

**Problem**: Port 3000 in use
```bash
# Solution: Kill process or use different port
PORT=3001 npm run dev
```

### Using Browser DevTools

1. **Open DevTools**: F12 or Cmd+Opt+I (Mac)
2. **Check Console**: Look for JavaScript errors
3. **Network Tab**: Verify API calls
4. **React DevTools**: Inspect component state

### Prisma Studio Debugging

```bash
npm run db:studio
```

- View all data
- Edit records directly
- Verify relationships
- Check constraints

## 📋 Code Review Checklist

Before committing:

- [ ] Code follows project conventions
- [ ] TypeScript types are correct
- [ ] No console.log statements (use proper logging)
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Comments on complex logic
- [ ] No hardcoded values (use env vars)
- [ ] Responsive design verified
- [ ] Accessible (proper labels, ARIA)

## 🚀 Deployment Workflow

### Pre-deployment

1. **Run build locally**
   ```bash
   npm run build
   ```

2. **Fix any build errors**

3. **Test production build**
   ```bash
   npm run start
   ```

### Environment Setup

1. **Set production environment variables**
   ```env
   DATABASE_URL="production-db-url"
   NEXTAUTH_URL="https://yourdomain.com"
   NEXTAUTH_SECRET="production-secret"
   NODE_ENV="production"
   ```

2. **Run migrations**
   ```bash
   npm run db:push
   ```

### Deployment Platforms

**Vercel** (Recommended for Next.js):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Manual Deployment**:
```bash
npm run build
# Upload .next folder and required files
# Start with: npm run start
```

## 🎨 Code Style Guide

### Component Structure

```typescript
// 1. Imports
import { useState } from "react"
import { Button } from "@/components/ui/button"

// 2. Types/Interfaces
interface Props {
  title: string
}

// 3. Component
export default function MyComponent({ title }: Props) {
  // 4. State
  const [count, setCount] = useState(0)
  
  // 5. Effects
  // useEffect...
  
  // 6. Handlers
  function handleClick() {
    setCount(count + 1)
  }
  
  // 7. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Count: {count}</Button>
    </div>
  )
}
```

### Naming Conventions

- **Components**: PascalCase (`PatientForm.tsx`)
- **Functions**: camelCase (`handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ITEMS`)
- **Files**: kebab-case (`patient-form.tsx`)
- **Database**: snake_case (`patient_id`)

### TypeScript Best Practices

```typescript
// ✅ DO: Explicit types
function getPatient(id: string): Promise<Patient | null> {
  return prisma.patient.findUnique({ where: { id } })
}

// ❌ DON'T: Implicit any
function getPatient(id) {
  return prisma.patient.findUnique({ where: { id } })
}

// ✅ DO: Use Prisma types
import { Patient } from "@prisma/client"

// ✅ DO: Define interfaces
interface PatientFormData {
  name: string
  email: string
  phone: string
}
```

## 📊 Performance Tips

### Optimize Database Queries

```typescript
// ✅ DO: Select only needed fields
const patients = await prisma.patient.findMany({
  select: {
    id: true,
    name: true,
    email: true
  }
})

// ❌ DON'T: Fetch all fields
const patients = await prisma.patient.findMany()
```

### Use Server Components

```typescript
// ✅ DO: Server Component (default)
export default async function PatientsPage() {
  const patients = await prisma.patient.findMany()
  return <PatientList patients={patients} />
}

// Only use "use client" when you need interactivity
```

### Optimize Images

```typescript
import Image from "next/image"

// ✅ DO: Use Next.js Image
<Image
  src="/avatar.jpg"
  alt="User"
  width={100}
  height={100}
/>
```

## 🔐 Security Best Practices

### Environment Variables

```typescript
// ✅ DO: Use env vars
const apiKey = process.env.API_KEY

// ❌ DON'T: Hardcode secrets
const apiKey = "sk_live_xxxxx"
```

### Input Validation

```typescript
import { z } from "zod"

// ✅ DO: Validate inputs
const schema = z.object({
  email: z.string().email(),
  phone: z.string().min(10)
})

const result = schema.safeParse(formData)
```

### Authentication

```typescript
// ✅ DO: Check auth in Server Actions
import { auth } from "@/auth"

export async function createPatient(data: PatientData) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  
  // ... create patient
}
```

## 📚 Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://prisma.io/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [NextAuth](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools
- [Prisma Studio](http://localhost:5555) - Database GUI
- [VS Code Extensions](https://marketplace.visualstudio.com/):
  - Prisma
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier

### Community
- [Next.js Discord](https://nextjs.org/discord)
- [Prisma Discord](https://pris.ly/discord)

---

**Happy Coding! 🚀**

Keep this guide handy for daily reference.
