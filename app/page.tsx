import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Header from "@/components/landing/header"
import Hero from "@/components/landing/hero"
import { MobileBottomNav } from "@/components/landing/mobile-bottom-nav"
import AboutSection from "@/components/landing/specialty-showcase"
import ExcellenceSection from "@/components/landing/stats-section"
import FacilitiesSection from "@/components/landing/facilities-section"
import { DiseaseDirectory } from "@/components/landing/disease-directory"
import NearbyHospitals from "@/components/landing/nearby-hospitals"
import TestimonialSection from "@/components/landing/testimonial-section"
import { FloatingChatbot } from "@/components/landing/floating-chatbot"
import Footer from "@/components/landing/footer"

export default async function HomePage() {
  const session = await auth()

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-landing selection:bg-black selection:text-white">
      {/* Header - Fixed transparent */}
      <Header />

      {/* Main Content */}
      <main>
        {/* 1. Hero Section - Full viewport image */}
        <Hero />

        {/* 2. About / Explore Options - Bento grid */}
        <AboutSection />

        {/* 3. Featured Excellence - Stats + Doctors */}
        <ExcellenceSection />

        {/* 4. Facilities Carousel */}
        <FacilitiesSection />

        {/* 5. Disease Directory - Left unchanged but part of flow */}
        <DiseaseDirectory />

        {/* 6. Nearby Hospitals / CTA */}
        <NearbyHospitals />

        {/* 7. Testimonial */}
        <TestimonialSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Elements */}
      <FloatingChatbot />
      <MobileBottomNav />
    </div>
  )
}
