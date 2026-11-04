import type { NextAuthConfig } from "next-auth"

/** Role → landing page mapping for the auth config callback */
function getRoleHomeForConfig(role?: string): string {
  switch (role) {
    case "DOCTOR":
      return "/dashboard/doctor"
    case "PHARMACIST":
      return "/dashboard/pharmacy"
    case "ACCOUNTANT":
      return "/dashboard/finance/billing"
    case "LAB_TECHNICIAN":
      return "/dashboard/lab/queue"
    case "PATIENT":
      return "/dashboard/patient-portal"
    case "NURSE":
      return "/dashboard"
    case "RECEPTIONIST":
      return "/dashboard/reception"
    case "CANTEEN_STAFF":
      return "/dashboard/canteen"
    case "AMBULANCE_DRIVER":
      return "/dashboard/ambulance"
    default:
      return "/dashboard"
  }
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login", // Updated to use the premium login page
  },
  callbacks: {
    // 1. Check if user is allowed to visit the page
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnLogin = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/login")

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnLogin) {
        // Redirect logged-in users away from the login page to their role's home
        const role = (auth?.user as { role?: string })?.role
        const destination = getRoleHomeForConfig(role)
        return Response.redirect(new URL(destination, nextUrl))
      }
      return true
    },

    // 2. Add Role to the Token (Critical for Middleware)
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },

    // 3. Make the Role available to the Session
    async session({ session, token }) {
      if (session.user && token) {
        // @ts-ignore - Ignore type error if types aren't fully set up
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [], // Providers are configured in auth.ts
}
