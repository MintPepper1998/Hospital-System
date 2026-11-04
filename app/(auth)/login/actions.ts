"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    const loginType = (formData.get("loginType") as string) || "STAFF"
    const password = formData.get("password") as string

    const isPatient = loginType === "PATIENT"
    const identifier = isPatient ? formData.get("identifier") as string : undefined
    const email = !isPatient ? formData.get("email") as string : undefined

    await signIn("credentials", {
      ...(isPatient ? { identifier } : { email }),
      password,
      loginType,
      redirect: true,
      redirectTo: isPatient ? "/dashboard/patient-portal" : "/dashboard",
    })

    return "success"
    } catch (error: any) {
    if (error instanceof AuthError) {
      // With custom CredentialsSignin, the code is passed in the error cause
      const isOnLeave = 
        (error as any).type === "ON_LEAVE" || 
        (error as any).cause?.err?.code === "ON_LEAVE" || 
        (error as any).cause?.err?.message === "ON_LEAVE" || 
        error.message.includes("ON_LEAVE")

      if (isOnLeave) {
        return "Access Denied: You are currently marked as On Leave."
      }

      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials"
        default:
          return "Something went wrong"
      }
    }
    throw error
  }
}

import { PrismaClient } from "@prisma/client"
import { sendSMS } from "@/lib/sms"

const prisma = new PrismaClient()

export async function generateStaffOTP(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    throw new Error("Invalid user")
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

  // Save OTP to DB
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: otpCode,
      expires: new Date(Date.now() + 5 * 60 * 1000)
    }
  })

  // Lookup phone
  if (!user.phone) {
    throw new Error("No mobile number registered for this staff account.")
  }

  // Send SMS
  await sendSMS(user.phone, otpCode)
  return { success: true }
}
