"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronRight, Activity } from "lucide-react"
import Link from "next/link"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

const diseases: Record<string, string[]> = {
  A: ["Asthma", "Arthritis", "Anemia", "Appendicitis", "Anxiety"],
  B: ["Back Pain", "Bronchitis", "Blood Pressure", "Breast Cancer"],
  C: ["Cancer", "COVID-19", "Cholesterol", "COPD", "Cataracts"],
  D: ["Diabetes", "Dengue", "Depression", "Diarrhea"],
  E: ["Epilepsy", "Eczema", "Ear Infection"],
  F: ["Fever", "Flu", "Fractures", "Fatty Liver"],
  G: ["Gastritis", "Glaucoma", "Gout"],
  H: ["Heart Disease", "Hepatitis", "Hernia", "Hypertension", "HIV/AIDS"],
  I: ["Influenza", "Insomnia", "IBS"],
  J: ["Jaundice", "Joint Pain"],
  K: ["Kidney Disease", "Knee Pain"],
  L: ["Liver Disease", "Leukemia", "Lupus"],
  M: ["Migraine", "Malaria", "Multiple Sclerosis"],
  N: ["Nausea", "Neurological Disorders"],
  O: ["Obesity", "Osteoporosis", "Ovarian Cancer"],
  P: ["Pneumonia", "Parkinson's Disease", "Psoriasis", "Prostate Cancer"],
  R: ["Rheumatoid Arthritis", "Respiratory Infections"],
  S: ["Stroke", "Sinusitis", "Skin Cancer", "Sleep Apnea"],
  T: ["Thyroid Disorders", "Tuberculosis", "Typhoid"],
  U: ["Ulcers", "Urinary Tract Infection", "Uterine Fibroids"],
  V: ["Varicose Veins", "Vertigo", "Vitamin Deficiency"],
  W: ["Weight Loss", "Whooping Cough"],
}

const popularConditions = [
  "Diabetes",
  "Heart Disease",
  "Hypertension",
  "Cancer",
  "COVID-19",
  "Thyroid",
  "Arthritis",
  "Asthma",
]

export function DiseaseDirectory() {
  const [selectedLetter, setSelectedLetter] = useState("A")
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250)

  const filteredDiseases = debouncedSearchTerm
    ? Object.values(diseases)
        .flat()
        .filter((d) =>
          d.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
    : diseases[selectedLetter] || []

  return (
    <section id="services" className="py-24 bg-[#F7F8FA]">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-[2px] bg-[#13A89E]" />
            <span className="text-[#13A89E] text-sm font-semibold tracking-wider uppercase">
              Health Directory
            </span>
            <div className="w-8 h-[2px] bg-[#13A89E]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0B2545] mb-3">
            Disease <span className="text-[#13A89E]">Directory</span>
          </h2>
          <p className="text-[#6B7280] max-w-lg mx-auto">
            Find information about various diseases, symptoms, and treatment
            options available at our hospitals
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for diseases, conditions..."
              className="w-full pl-13 pr-5 h-13 text-[15px] text-[#1A1A2E] placeholder:text-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-2xl outline-none focus:border-[#13A89E] focus:ring-2 focus:ring-[#13A89E]/10 transition-all pl-14 h-14"
            />
          </div>
        </div>

        {/* Popular Conditions */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="text-xs text-[#6B7280] mr-1 self-center font-medium">
            Popular:
          </span>
          {popularConditions.map((condition) => (
            <button
              key={condition}
              onClick={() => setSearchTerm(condition)}
              className="text-xs font-medium text-[#0B2545] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-full hover:border-[#13A89E] hover:text-[#13A89E] hover:bg-[#E6F7F6] transition-all"
            >
              {condition}
            </button>
          ))}
        </div>

        {/* A-Z Filter */}
        {!searchTerm && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-8">
            {alphabet.map((letter) => (
              <button
                key={letter}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectedLetter === letter
                    ? "bg-[#0B2545] text-white shadow-md"
                    : diseases[letter]
                    ? "bg-white text-[#1A1A2E] border border-[#E5E7EB] hover:border-[#13A89E] hover:text-[#13A89E]"
                    : "bg-[#F7F8FA] text-[#D1D5DB] cursor-not-allowed"
                }`}
                onClick={() =>
                  diseases[letter] && setSelectedLetter(letter)
                }
                disabled={!diseases[letter]}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {/* Disease List */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-sm border border-[#E5E7EB] p-6 md:p-8">
            {searchTerm && (
              <p className="text-sm text-[#6B7280] mb-4">
                Showing results for &ldquo;{searchTerm}&rdquo;
              </p>
            )}

            {filteredDiseases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {filteredDiseases.map((disease) => (
                  <Link
                    key={disease}
                    href={`/diseases/${disease
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "-")}`}
                    className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#F7F8FA] group transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Activity className="h-4 w-4 text-[#13A89E] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[14px] text-[#1A1A2E] group-hover:text-[#13A89E] font-medium transition-colors">
                        {disease}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#D1D5DB] group-hover:text-[#13A89E] group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#6B7280]">
                <Activity className="h-8 w-8 mx-auto mb-3 text-[#D1D5DB]" />
                <p>No diseases found for &ldquo;{searchTerm}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* View All Link */}
        <div className="text-center mt-10">
          <Button
            variant="outline"
            className="rounded-full px-8 h-12 font-semibold border-[#0B2545] text-[#0B2545] hover:bg-[#0B2545] hover:text-white transition-all"
            asChild
          >
            <Link href="/diseases">
              View Complete Directory
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
