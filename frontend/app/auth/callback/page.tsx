"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from Supabase (populated after OAuth redirect)
        const { data, error } = await supabase.auth.getSession()

        if (error) throw error
        if (!data.session) {
          setError("No session found. Please try signing in again.")
          return
        }

        const { session } = data
        const accessToken = session.access_token

        // Tell our backend about this login — it returns license_status
        const res = await fetch(`${API_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        })

        const apiData = await res.json()

        if (!res.ok) {
          throw new Error(apiData.message || "Authentication failed.")
        }

        // Store token and user info
        localStorage.setItem("token", accessToken)
        localStorage.setItem("user", JSON.stringify(apiData.user))

        // Redirect based on license status
        if (apiData.license_status === "active") {
          router.push("/dashboard")
        } else {
          router.push("/activate")
        }
      } catch (err: any) {
        console.error("Auth callback error:", err)
        setError(err.message || "Authentication failed.")
      }
    }

    handleAuthCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
          <div className="text-red-500 text-lg mb-4">Authentication Error</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Completing sign in…</p>
      </div>
    </div>
  )
}