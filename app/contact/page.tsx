import ContactPage from "@/components/landing/contact-page"
import Header from "@/components/landing/header"
import Footer from "@/components/landing/footer"
import { MobileBottomNav } from "@/components/landing/mobile-bottom-nav"

export const metadata = {
  title: "Contact Us | Shree Kamal Hospital",
  description: "Get in touch with Shree Kamal Hospital. Located at Keonjhar Ghatgaon Panikoili Road. Call +91 9777929827 for appointments.",
}

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] font-landing selection:bg-black selection:text-white">
      <Header />
      <main>
        <ContactPage />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
