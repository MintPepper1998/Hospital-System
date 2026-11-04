import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"

class OnLeaveError extends CredentialsSignin {
  code = "ON_LEAVE"
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: (() => {
    const s = process.env.AUTH_SECRET
    if (!s && process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable is required in production")
    }
    return s || "dev-only-secret-do-not-use-in-production"
  })(),
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours — hospital staff work long shifts
    updateAge: 30 * 60,   // Refresh token every 30 minutes to keep session alive
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Phone Number or Patient ID", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          return null
        }

        const loginType = (credentials.loginType as string) || "STAFF"
        const password = credentials.password as string

        if (loginType === "PATIENT") {
          const identifier = (credentials.identifier as string)?.trim()
          if (!identifier) return null

          // Normalize phone: strip "+91" prefix and spaces so "9876543210" matches "+91 9876543210"
          const cleanPhone = identifier.replace(/[\s\-\+]/g, '')
          const phoneVariants = [
            identifier,                          // exact (e.g. "+91 9876543210")
            cleanPhone,                          // digits only (e.g. "919876543210")
            cleanPhone.replace(/^91/, ''),       // without country code (e.g. "9876543210")
            `+91 ${cleanPhone}`,                 // with +91 prefix
            `+91 ${cleanPhone.replace(/^91/, '')}`, // +91 + 10 digits
          ]

          const patient = await prisma.patient.findFirst({
            where: {
              OR: [
                { phone: { in: phoneVariants } },
                { patientId: identifier },
                { patientId: identifier.toUpperCase() },
              ]
            },
            include: { user: true }
          })

          // If no patient record found, check if they have an online booking
          // and auto-create a Patient + User record for them
          if (!patient || !patient.user || patient.user.role !== "PATIENT") {
            // Look for an online booking with this phone number
            const cleanPhoneForBooking = cleanPhone.replace(/^91/, '')
            const onlineBooking = await prisma.onlineBooking.findFirst({
              where: {
                OR: [
                  { phone: cleanPhoneForBooking },
                  { phone: cleanPhone },
                ],
              },
              orderBy: { createdAt: 'desc' },
            })

            if (onlineBooking) {
              // Auto-create User + Patient record so they can log in
              const year = new Date().getFullYear()
              const patientCount = await prisma.patient.count()
              const patientIdStr = `PAT-${year}-${String(patientCount + 1).padStart(4, "0")}`

              const newUser = await prisma.user.create({
                data: {
                  name: onlineBooking.patientName,
                  email: `patient_${Date.now()}_${cleanPhoneForBooking}@placeholder.local`,
                  role: "PATIENT",
                  isActive: true,
                },
              })

              const newPatient = await prisma.patient.create({
                data: {
                  userId: newUser.id,
                  patientId: patientIdStr,
                  phone: cleanPhoneForBooking,
                  gender: onlineBooking.gender as "MALE" | "FEMALE" | "OTHER" | undefined,
                },
              })

              // Link the online booking to this patient
              await prisma.onlineBooking.updateMany({
                where: {
                  phone: cleanPhoneForBooking,
                  patientId: null,
                },
                data: {
                  patientId: newPatient.id,
                },
              })

              // Validate password (phone number as default password)
              if (password !== cleanPhoneForBooking && password !== onlineBooking.phone) {
                return null
              }

              // Hash and save the phone as password for future logins
              const { hash } = await import('bcryptjs')
              const hashedPw = await hash(cleanPhoneForBooking, 10)
              await prisma.user.update({
                where: { id: newUser.id },
                data: { password: hashedPw },
              })

              return {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                patientId: newPatient.id,
                patientDisplayId: newPatient.patientId,
              }
            }

            return null
          }

          // If user has a hashed password, validate it
          if (patient.user.password) {
            const isValid = await compare(password, patient.user.password)
            if (!isValid) return null
          } else {
            // No password set — allow login with phone number or Patient ID as password (first-time)
            // Extract raw 10-digit phone from stored value
            const rawPhone = patient.phone?.replace(/[\s\-\+]/g, '').replace(/^91/, '') || ''
            const isPhoneMatch = rawPhone && (password === rawPhone || password === patient.phone)
            const isPatientIdMatch = password === patient.patientId
            if (!isPhoneMatch && !isPatientIdMatch) {
              return null
            }

            // Hash and save the password for future logins
            const { hash } = await import('bcryptjs')
            const hashedPw = await hash(password, 10)
            await prisma.user.update({
              where: { id: patient.user.id },
              data: { password: hashedPw }
            })
          }

          return {
            id: patient.user.id,
            email: patient.user.email,
            name: patient.user.name,
            role: patient.user.role,
            patientId: patient.id,
            patientDisplayId: patient.patientId,
          }
        }

        const email = credentials.email as string
        if (!email) return null

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          return null
        }

        if (user.role === "PATIENT") {
          return null
        }

        const isPasswordValid = await compare(password, user.password)
        if (!isPasswordValid) {
          return null
        }

        // ── ON-LEAVE BLOCK ──
        // Staff marked as "On Leave" cannot log in
        if ((user.role as string) !== "PATIENT" && (user.role as string) !== "SUPER_ADMIN") {
          const staffRecord = await prisma.staff.findFirst({
            where: { userId: user.id },
            select: { isOnLeave: true },
          })
          if (staffRecord?.isOnLeave) {
            // Return a special error signal — next-auth will show "CredentialsSignin"
            // The login page will map this to the on-leave message
            throw new OnLeaveError()
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        if ((user as any).patientId) {
          token.patientId = (user as any).patientId
          token.patientDisplayId = (user as any).patientDisplayId
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        if (token.patientId) {
          ;(session.user as any).patientId = token.patientId as string
          ;(session.user as any).patientDisplayId = token.patientDisplayId as string
        }
      }
      return session
    },
  },
})
