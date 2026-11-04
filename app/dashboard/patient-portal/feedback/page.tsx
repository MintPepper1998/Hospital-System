"use client"

import { useState, useEffect } from "react"
import { ChatTeardropText, Plus, X, SpinnerGap, Info, CheckCircle, Clock } from "@phosphor-icons/react/dist/ssr"
import { submitFeedback, getPatientFeedback } from "@/lib/actions/feedback"
import { format } from "date-fns"

export default function PatientFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [type, setType] = useState<"SUGGESTION" | "COMPLAINT">("SUGGESTION")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const fetchFeedbacks = async () => {
    try {
      const data = await getPatientFeedback()
      setFeedbacks(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    
    try {
      await submitFeedback({ type, subject, message })
      setIsModalOpen(false)
      setSubject("")
      setMessage("")
      setType("SUGGESTION")
      await fetchFeedbacks()
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1e293b]">Suggestions & Complaints</h2>
          <p className="text-sm text-[#64748b] mt-1">Help us improve by sharing your thoughts or reporting an issue.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-[#1a56db] to-[#0ea5e9] hover:from-[#1e40af] hover:to-[#0284c7] text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <Plus weight="bold" size={16} />
          New Feedback
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <SpinnerGap className="animate-spin text-[#1a56db]" size={32} />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChatTeardropText weight="fill" size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">No feedback submitted yet</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            If you have a suggestion on how we can improve or a complaint you want us to address, click the button above to let us know!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((f) => (
            <div key={f.id} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    f.type === "COMPLAINT" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {f.type}
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    f.status === "RESOLVED" ? "bg-green-100 text-green-700" :
                    f.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {f.status === "RESOLVED" ? <CheckCircle weight="fill" size={14} /> : <Clock weight="bold" size={14} />}
                    {f.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    {format(new Date(f.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">{f.subject}</h4>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{f.message}</p>
              
              {f.resolveNote && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <h5 className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                    <Info weight="bold" /> RESPONSE FROM HOSPITAL
                  </h5>
                  <p className="text-sm text-gray-800">{f.resolveNote}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-[#f8f9fb]">
              <h3 className="text-lg font-bold text-gray-900">Submit Feedback</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition-colors"
              >
                <X weight="bold" size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Feedback Type</label>
                <div className="flex gap-4">
                  <label className={`flex-1 cursor-pointer flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    type === "SUGGESTION" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}>
                    <input type="radio" className="hidden" checked={type === "SUGGESTION"} onChange={() => setType("SUGGESTION")} />
                    <span className="font-semibold text-sm">Suggestion</span>
                  </label>
                  <label className={`flex-1 cursor-pointer flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    type === "COMPLAINT" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}>
                    <input type="radio" className="hidden" checked={type === "COMPLAINT"} onChange={() => setType("COMPLAINT")} />
                    <span className="font-semibold text-sm">Complaint</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="E.g., Appreciate the fast service, or Waiting time was too long"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-gray-50 focus:bg-white transition-all text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                <textarea 
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Please describe your suggestion or complaint in detail..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-gray-50 focus:bg-white transition-all text-sm font-medium resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#1e293b] hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <SpinnerGap className="animate-spin" size={18} /> : "Submit Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
