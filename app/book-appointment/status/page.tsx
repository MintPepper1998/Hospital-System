import { BookingStatusChecker } from "@/components/booking/booking-status-checker"
import Header from "@/components/landing/header"
import Footer from "@/components/landing/footer"

export const metadata = {
  title: "Check Booking Status | Shree Kamal Hospital",
  description: "Check the status of your online appointment booking at Shree Kamal Hospital.",
}

export default function BookingStatusPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <BookingStatusChecker />
      </main>
      <Footer />
    </div>
  )
}
