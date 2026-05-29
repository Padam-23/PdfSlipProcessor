"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Key, Loader2, MessageCircle, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const WHATSAPP_NUMBER = "+919343263924" // ← Replace with your WhatsApp number
const WHATSAPP_MESSAGE = encodeURIComponent("Hi! I'd like to purchase a license key for PDF Slip Processor.")

export default function ActivatePage() {
  const router = useRouter()
  const [key, setKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) {
      setError("Please enter your license key.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/")
        return
      }

      const res = await fetch(`${API_URL}/license/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: key.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Activation failed.")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Failed to activate. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatKey = (value: string) => {
    // Auto-format as XXXX-XXXX-XXXX-XXXX
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.slice(0, 4).join("-")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Icon + Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-5 shadow-lg shadow-indigo-500/30"
            >
              <Key className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Activate Your License</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Enter your license key to unlock full access to PDF Slip Processor.
            </p>
          </div>

          {/* Success State */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-3"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-semibold text-sm">License Activated!</p>
                <p className="text-emerald-400/70 text-xs">Redirecting you to the dashboard…</p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleActivate} className="space-y-5">
            <div>
              <label htmlFor="license-key-input" className="block text-sm font-medium text-slate-300 mb-2">
                License Key
              </label>
              <input
                id="license-key-input"
                type="text"
                value={key}
                onChange={(e) => setKey(formatKey(e.target.value))}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 font-mono text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <button
              id="activate-btn"
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activating…
                </>
              ) : success ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Activated!
                </>
              ) : (
                <>
                  Activate License
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-xs">Need a key?</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* WhatsApp Contact */}
          <a
            id="whatsapp-contact-btn"
            href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${WHATSAPP_MESSAGE}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3 px-5 rounded-xl border border-white/10 bg-white/5 hover:bg-green-500/10 hover:border-green-500/30 transition-all duration-200 group"
          >
            <MessageCircle className="w-5 h-5 text-green-400" />
            <span className="text-slate-300 group-hover:text-green-400 text-sm font-medium transition-colors">
              Contact us on WhatsApp to get a key
            </span>
          </a>

          <p className="text-center text-slate-600 text-xs mt-5">
            Each license is valid for <span className="text-slate-400">30 days</span> from activation.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
