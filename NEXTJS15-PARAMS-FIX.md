# Next.js 15 - Params as Promise Fix

## Issue
Getting `PrismaClientValidationError` when loading dynamic routes because `params` was `undefined`.

## Root Cause
In **Next.js 15**, `params` in dynamic routes are now **Promises** and must be awaited before use. This is a breaking change from Next.js 14.

## Error Message
```
Argument `where` of type AppointmentWhereUniqueInput needs at least one of `id` arguments.
id: undefined
```

## Solution

### Before (Next.js 14 - Doesn't work in Next.js 15):
```typescript
interface ConsultationPageProps {
  params: {
    appointmentId: string
  }
}

export default async function ConsultationPage({ params }: ConsultationPageProps) {
  const { appointmentId } = params  // ❌ appointmentId is undefined
  
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },  // ❌ Error: id is undefined
  })
}
```

### After (Next.js 15 - Correct):
```typescript
interface ConsultationPageProps {
  params: Promise<{
    appointmentId: string
  }>
}

export default async function ConsultationPage({ params }: ConsultationPageProps) {
  const { appointmentId } = await params  // ✅ Await the params promise
  
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },  // ✅ appointmentId is now defined
  })
}
```

## Files Fixed
- ✅ `app/dashboard/clinical/opd/[appointmentId]/page.tsx`

## Key Changes
1. Updated interface to define `params` as `Promise<{ ... }>`
2. Added `await` when destructuring params: `const { appointmentId } = await params`

## References
- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- Breaking change: Dynamic route params are now Promises in Next.js 15

## Status
✅ **FIXED** - Consultation page now loads correctly
