"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Clock,
  ArrowUpRight,
  NavigationArrow,
  Envelope,
  FirstAid,
} from "@phosphor-icons/react/dist/ssr";

const contactCards = [
  {
    icon: Phone,
    label: "Call Us",
    value: "+91 9777929827",
    sub: "Available 24/7 for emergencies",
    href: "tel:+919777929827",
    accent: "from-blue-500 to-blue-600",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: MapPin,
    label: "Visit Us",
    value: "Keonjhar, Odisha",
    sub: "PLOT NO-594/3384, Ghatgaon Panikoili Road",
    href: "https://maps.google.com/?q=PLOT+NO-594/3384+Keonjhar+Ghatgaon+Panikoili+Road+755043",
    accent: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: Clock,
    label: "Working Hours",
    value: "Open 24/7",
    sub: "OPD: 9 AM – 2 PM & 5 PM – 8 PM",
    href: null,
    accent: "from-amber-500 to-amber-600",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: FirstAid,
    label: "Emergency",
    value: "24/7 Emergency Care",
    sub: "Immediate trauma & critical support",
    href: "tel:+919777929827",
    accent: "from-red-500 to-red-600",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
];

export default function ContactPage() {
  return (
    <section className="pt-40 pb-32 font-landing bg-[#FAFAFA] text-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8">

        {/* ── Hero / Headline ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 text-xs font-bold uppercase tracking-wider shadow-sm"
          >
            <span>Contact</span>
            <div className="w-1.5 h-1.5 rounded-full bg-black" />
          </motion.div>

          <h1 className="text-5xl md:text-6xl lg:text-[72px] font-medium tracking-tight leading-[1.05] mb-6 max-w-4xl mx-auto">
            We&apos;re Here to{" "}
            <span className="font-bold">Help You Heal</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Reach out for appointments, emergency care, or any questions.
            Our team is available around the clock.
          </p>
        </motion.div>

        {/* ── Contact Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-24">
          {contactCards.map((card, idx) => {
            const Inner = (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.3 + idx * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="group relative"
              >
                {/* Double-Bezel Outer Shell */}
                <div className="bg-white/60 ring-1 ring-black/[0.04] p-1.5 rounded-[2rem]">
                  {/* Inner Core */}
                  <div className="bg-white rounded-[calc(2rem-0.375rem)] p-8 md:p-10 shadow-[0_4px_40px_rgba(0,0,0,0.03)] relative overflow-hidden">
                    {/* Subtle ambient gradient */}
                    <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${card.accent} opacity-[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none`} />

                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex-1">
                        {/* Icon pill */}
                        <div className={`${card.iconBg} w-12 h-12 rounded-[14px] flex items-center justify-center mb-5`}>
                          <card.icon weight="fill" size={22} className={card.iconColor} />
                        </div>

                        {/* Label */}
                        <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-2">
                          {card.label}
                        </p>

                        {/* Value */}
                        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-black mb-1.5 leading-tight">
                          {card.value}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                          {card.sub}
                        </p>
                      </div>

                      {/* Arrow */}
                      {card.href && (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex-shrink-0 mt-1">
                          <ArrowUpRight
                            weight="bold"
                            size={16}
                            className="text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );

            if (card.href) {
              return (
                <a key={card.label} href={card.href} target={card.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block">
                  {Inner}
                </a>
              );
            }
            return <div key={card.label}>{Inner}</div>;
          })}
        </div>

        {/* ── Address Detail Section (Editorial Split) ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-24"
        >
          {/* Left - Embedded Map */}
          <div className="bg-white/60 ring-1 ring-black/[0.04] p-1.5 rounded-[2rem]">
            <div className="bg-white rounded-[calc(2rem-0.375rem)] overflow-hidden h-full min-h-[400px] relative shadow-[0_4px_40px_rgba(0,0,0,0.03)]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3693.123!2d85.58!3d21.51!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDMwJzM2LjAiTiA4NcKwMzQnNDguMCJF!5e0!3m2!1sen!2sin!4v1"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 400 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Shree Kamal Hospital Location"
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>

          {/* Right - Full Address Details */}
          <div className="bg-white/60 ring-1 ring-black/[0.04] p-1.5 rounded-[2rem]">
            <div className="bg-white rounded-[calc(2rem-0.375rem)] p-10 md:p-12 shadow-[0_4px_40px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-black w-10 h-10 rounded-full flex items-center justify-center">
                    <NavigationArrow weight="fill" size={18} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    Find Us
                  </h3>
                </div>

                <div className="space-y-8">
                  {/* Address */}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-3">
                      Full Address
                    </p>
                    <p className="text-lg font-medium text-black leading-relaxed">
                      PLOT NO-594/3384, KHATA NO-475/1101,
                    </p>
                    <p className="text-lg font-medium text-black leading-relaxed">
                      Keonjhar Ghatgaon Panikoili Road,
                    </p>
                    <p className="text-lg font-medium text-black leading-relaxed">
                      Odisha — 755043
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 w-full" />

                  {/* Phone */}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-3">
                      Phone
                    </p>
                    <a
                      href="tel:+919777929827"
                      className="text-2xl font-semibold text-black tracking-tight hover:text-blue-600 transition-colors duration-300"
                    >
                      +91 9777929827
                    </a>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 w-full" />

                  {/* Email placeholder */}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-3">
                      Email
                    </p>
                    <a
                      href="mailto:info@shreekamalhospital.com"
                      className="text-lg font-medium text-black hover:text-blue-600 transition-colors duration-300 flex items-center gap-2"
                    >
                      <Envelope weight="bold" size={18} className="text-gray-400" />
                      info@shreekamalhospital.com
                    </a>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-10">
                <a
                  href="https://maps.google.com/?q=PLOT+NO-594/3384+Keonjhar+Ghatgaon+Panikoili+Road+755043"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-black text-white rounded-full py-3 pl-6 pr-2 hover:bg-gray-900 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  <span className="text-sm font-semibold">Get Directions</span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                    <ArrowUpRight
                      weight="bold"
                      size={14}
                      className="text-white group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                    />
                  </div>
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Bottom CTA Banner ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="bg-white/60 ring-1 ring-black/[0.04] p-1.5 rounded-[2rem]">
            <div className="bg-black rounded-[calc(2rem-0.375rem)] px-10 md:px-16 py-16 md:py-20 shadow-[0_4px_40px_rgba(0,0,0,0.1)] relative overflow-hidden text-center">
              {/* Background mesh */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.02] pointer-events-none" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] translate-y-1/3 pointer-events-none" />

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-white tracking-tight mb-5 max-w-2xl mx-auto leading-tight">
                  Need an Appointment?
                </h2>
                <p className="text-gray-400 text-lg font-medium mb-10 max-w-lg mx-auto">
                  Book online in seconds or call us directly.
                  We&apos;re here for you around the clock.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/book-appointment"
                    className="group inline-flex items-center gap-3 bg-white text-black rounded-full py-3 pl-6 pr-2 hover:bg-gray-100 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  >
                    <span className="text-sm font-bold">Book Appointment</span>
                    <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-300">
                      <ArrowUpRight
                        weight="bold"
                        size={14}
                        className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                  <a
                    href="tel:+919777929827"
                    className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors duration-300"
                  >
                    <Phone weight="fill" size={16} />
                    <span>+91 9777929827</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
