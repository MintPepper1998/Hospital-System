"use client"

import React, { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Link from 'next/link'
import { ArrowUpRight, Database, ShieldCheck, HardDrive, Cpu, Lightning, Key, Network } from '@phosphor-icons/react'

gsap.registerPlugin(ScrollTrigger)

export function ClientArchitecture() {
  const container = useRef<HTMLDivElement>(null)
  
  useGSAP(() => {
    // 1. Initial Hero Stagger
    gsap.from(".hero-elem", {
      y: 100,
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
      ease: "power4.out",
      delay: 0.2
    })

    // 2. Artistic Image Float
    gsap.to(".hero-image", {
      y: -20,
      rotation: 2,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    })

    // 3. Scrubbing Text Reveal
    const textReveal = gsap.utils.toArray('.scrub-text span')
    gsap.fromTo(textReveal, 
      { opacity: 0.1 },
      {
        opacity: 1,
        stagger: 0.1,
        scrollTrigger: {
          trigger: ".scrub-container",
          start: "top center",
          end: "bottom center",
          scrub: true,
        }
      }
    )

    // 4. Bento Grid Entry
    gsap.from(".bento-cell", {
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 80%",
      }
    })

    // 5. Scroll Pinning Split
    ScrollTrigger.create({
      trigger: ".pin-section",
      start: "top top",
      end: "+=100%",
      pin: ".pin-left",
    })

  }, { scope: container })

  return (
    <main ref={container} className="w-full bg-[#FAFAFA] text-zinc-950 font-sans overflow-x-hidden selection:bg-zinc-900 selection:text-white">
      
      {/* 1. NAVIGATION */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/50 rounded-full px-6 py-3 flex items-center gap-8 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)]">
          <span className="font-semibold text-sm tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5" weight="duotone" />
            System Architecture
          </span>
          <Link href="/dashboard" className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            Return to App
          </Link>
        </div>
      </nav>

      {/* 2. ATTENTION (HERO) - Artistic Asymmetry */}
      <section className="relative min-h-[100dvh] w-full max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col justify-center pb-24 pt-32">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          
          <div className="w-full md:w-3/5">
            <h1 className="hero-elem w-full max-w-[13ch] text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.95] tracking-tighter font-medium text-zinc-950 mb-8">
              Backend Infrastructure Analysis.
            </h1>
            <p className="hero-elem text-lg md:text-xl text-zinc-600 max-w-[45ch] leading-relaxed mb-10">
              An architectural breakdown of the Hospital ERP core. Examining the Server Component boundaries, Prisma ORM data modeling, and NextAuth security validations.
            </p>
            <div className="hero-elem flex gap-4">
              <Link href="#architecture" className="group flex items-center gap-3 bg-zinc-950 text-white px-8 py-4 rounded-full font-medium hover:bg-zinc-800 transition-colors">
                Explore Core
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="hero-image relative w-full md:w-2/5 aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-100 border border-zinc-200 shadow-2xl">
            {/* Abstract aesthetic placeholder representing backend/database structure */}
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/serverrack/800/1000')] bg-cover bg-center mix-blend-luminosity opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900/40 to-transparent" />
            <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <Database className="w-8 h-8 mb-4 text-zinc-900" weight="duotone" />
              <p className="font-medium tracking-tight">PostgreSQL Relational Core</p>
              <p className="text-sm text-zinc-500 mt-1">Neon Tech Serverless</p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. INTEREST (BENTO GRID) - Gapless Implementation */}
      <section id="architecture" className="w-full max-w-[1400px] mx-auto px-6 md:px-12 py-32 md:py-48">
        
        <h2 className="text-3xl md:text-4xl tracking-tight font-medium mb-16">The Engine Room</h2>

        <div className="bento-grid grid grid-cols-1 md:grid-cols-4 grid-rows-3 gap-4 grid-flow-dense h-[900px] md:h-[600px]">
          
          {/* A: Database (col-span-2, row-span-2) */}
          <div className="bento-cell col-span-1 md:col-span-2 row-span-1 md:row-span-2 group relative overflow-hidden rounded-[2.5rem] bg-zinc-950 text-white p-10 flex flex-col justify-end">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/data/800/800')] bg-cover bg-center opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-1000 ease-out" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="relative z-10">
              <HardDrive className="w-10 h-10 mb-6 text-zinc-300" weight="duotone" />
              <h3 className="text-2xl font-medium tracking-tight mb-3">Prisma & PostgreSQL</h3>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-[35ch]">
                The persistence layer leverages Prisma Client against a serverless Neon database. 
                Strict schema design enforces referential integrity across deeply interconnected modules 
                (Clinical, Pharmacy, Finance).
              </p>
            </div>
          </div>

          {/* B: Auth (col-span-1, row-span-2) */}
          <div className="bento-cell col-span-1 row-span-1 md:row-span-2 group relative overflow-hidden rounded-[2.5rem] bg-zinc-100 border border-zinc-200 p-8 flex flex-col justify-between">
            <ShieldCheck className="w-8 h-8 text-zinc-900" weight="duotone" />
            <div>
              <h3 className="text-xl font-medium tracking-tight mb-2">NextAuth RBAC</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Centralized authentication gating. The `requireAuthSafe` utility intercepts all mutations, verifying JWT tokens and evaluating granular permission arrays (e.g., PHARMACY_FINANCE) before execution.
              </p>
            </div>
          </div>

          {/* C: Storage (col-span-1, row-span-1) */}
          <div className="bento-cell col-span-1 row-span-1 group relative overflow-hidden rounded-[2.5rem] bg-zinc-100 border border-zinc-200 p-8 flex flex-col justify-center items-center text-center">
            <CloudIcon />
            <h3 className="text-lg font-medium tracking-tight mt-4">S3 Protocol</h3>
          </div>

          {/* D: Server Actions (col-span-2, row-span-1) */}
          <div className="bento-cell col-span-1 md:col-span-2 row-span-1 group relative overflow-hidden rounded-[2.5rem] bg-emerald-950 text-emerald-50 p-8 flex items-center justify-between">
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-emerald-500/30 transition-colors duration-700" />
            <div className="relative z-10 max-w-[30ch]">
              <h3 className="text-xl font-medium tracking-tight mb-2">RPC Server Actions</h3>
              <p className="text-emerald-200/80 text-sm leading-relaxed">
                Eliminating REST controllers. Client components invoke strongly-typed TypeScript functions directly over the network via POST payload.
              </p>
            </div>
            <Lightning className="w-12 h-12 text-emerald-400 relative z-10 hidden sm:block" weight="duotone" />
          </div>

          {/* E: Caching (col-span-2, row-span-1) */}
          <div className="bento-cell col-span-1 md:col-span-2 row-span-1 group relative overflow-hidden rounded-[2.5rem] bg-zinc-100 border border-zinc-200 p-8 flex items-center">
            <div>
              <h3 className="text-xl font-medium tracking-tight mb-2">Aggressive Caching</h3>
              <p className="text-zinc-600 text-sm leading-relaxed max-w-[40ch]">
                Leveraging Next.js App Router Data Cache. Mutations trigger surgically precise `revalidatePath` calls, instantly invalidating the stale RSC payloads without full client reloads.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. DESIRE (GSAP SCRUBBING REVEAL) */}
      <section className="scrub-container relative w-full min-h-[150vh] bg-zinc-950 text-white flex items-center px-6 md:px-12 py-32">
        <div className="max-w-[1000px] mx-auto sticky top-1/2 -translate-y-1/2">
          <p className="scrub-text text-[clamp(2rem,5vw,4.5rem)] leading-[1.1] tracking-tight font-medium text-zinc-100/10">
            {`The true power of this architecture lies in its boundary separation. By migrating the heavy computational lifting to the server environment, the client remains exceptionally lightweight, ensuring that the critical hospital operations process reliably regardless of the end user's device capabilities.`
              .split(" ").map((word, idx) => (
                <span key={idx} className="inline-block mr-[0.25em]">{word}</span>
            ))}
          </p>
        </div>
      </section>

      {/* 5. PINNED SECTION (GSAP SPLIT) */}
      <section className="pin-section w-full max-w-[1400px] mx-auto flex flex-col md:flex-row px-6 md:px-12 py-32 md:py-48 gap-16 relative">
        <div className="pin-left w-full md:w-1/3 self-start">
          <Cpu className="w-10 h-10 mb-6 text-zinc-900" weight="duotone" />
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none font-medium mb-6">
            Component <br/> Separation.
          </h2>
          <p className="text-zinc-600 leading-relaxed max-w-[30ch]">
            The strict decoupling of visual layer physics from the underlying data management. 
            Interactive client boundaries exist purely at the leaf nodes.
          </p>
        </div>
        
        <div className="pin-right w-full md:w-2/3 flex flex-col gap-12">
          {/* Scrollable Gallery */}
          <div className="group w-full rounded-[2rem] overflow-hidden relative">
            <div className="w-full aspect-video bg-zinc-200 relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/code1/1200/800')] bg-cover bg-center grayscale opacity-80 group-hover:scale-105 transition-transform duration-1000" />
            </div>
            <div className="p-8 bg-zinc-100 border border-t-0 border-zinc-200 rounded-b-[2rem]">
              <h3 className="text-xl font-medium tracking-tight mb-2">React Server Components (RSC)</h3>
              <p className="text-zinc-600 text-sm max-w-[50ch]">
                Defaulting to server-side generation. The UI is built near the database, streaming serialized HTML to the browser and executing zero client-side JavaScript for layout logic.
              </p>
            </div>
          </div>

          <div className="group w-full rounded-[2rem] overflow-hidden relative">
            <div className="w-full aspect-video bg-zinc-200 relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/code2/1200/800')] bg-cover bg-center grayscale opacity-80 group-hover:scale-105 transition-transform duration-1000" />
            </div>
            <div className="p-8 bg-zinc-100 border border-t-0 border-zinc-200 rounded-b-[2rem]">
              <h3 className="text-xl font-medium tracking-tight mb-2">Client Leaf Nodes</h3>
              <p className="text-zinc-600 text-sm max-w-[50ch]">
                Strict usage of the 'use client' directive. Complex state arrays, GSAP physics, and rapid user inputs are isolated into specific components, preventing unnecessary root-level re-renders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ACTION (FOOTER CTA) */}
      <footer className="w-full bg-zinc-950 text-white px-6 md:px-12 py-32 flex flex-col items-center justify-center text-center">
        <h2 className="text-4xl md:text-6xl font-medium tracking-tighter mb-8 max-w-[15ch]">
          Ready to deploy clinical operations.
        </h2>
        <Link href="/dashboard" className="bg-white text-zinc-950 px-8 py-4 rounded-full font-medium hover:scale-105 active:scale-95 transition-transform">
          Return to Dashboard
        </Link>
        <p className="mt-16 text-zinc-600 text-sm">
          System Architecture Audit Complete.
        </p>
      </footer>

    </main>
  )
}

function CloudIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-900 opacity-80">
      <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
