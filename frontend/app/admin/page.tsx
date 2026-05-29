"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Key, Users, Shield, AlertTriangle, Clock, Plus, Copy, Trash2,
  XCircle, CheckCircle2, RefreshCw, LogOut, ChevronDown, Activity
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface License {
  id: string
  key: string
  status: "unused" | "active" | "expired" | "revoked"
  created_at: string
  activated_at: string | null
  expires_at: string | null
  assigned_user_id: string | null
  assigned_email: string | null
}

interface Stats {
  total_users: number
  total_licenses: number
  active: number
  expired: number
  unused: number
  revoked: number
}

const STATUS_STYLES: Record<string, string> = {
  unused: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  expired: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  revoked: "bg-red-500/20 text-red-300 border-red-500/30",
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function daysRemaining(d: string | null): number {
  if (!d) return 0
  const diff = new Date(d).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [newKey, setNewKey] = useState<License | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getAdminHeaders = () => {
    const token = localStorage.getItem("admin_token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("admin_token")
    if (!token) {
      router.push("/admin-login")
      return
    }

    try {
      const [statsRes, licensesRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: getAdminHeaders() }),
        fetch(`${API_URL}/admin/licenses`, { headers: getAdminHeaders() }),
      ])

      if (statsRes.status === 401 || statsRes.status === 403) {
        localStorage.removeItem("admin_token")
        router.push("/admin-login")
        return
      }

      if (statsRes.ok) setStats(await statsRes.json())
      if (licensesRes.ok) setLicenses(await licensesRes.json())
    } catch (err) {
      showToast("Failed to load data.", "error")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`${API_URL}/admin/licenses/generate`, {
        method: "POST",
        headers: getAdminHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setNewKey(data)
      showToast("License key generated!")
      fetchData()
    } catch (err: any) {
      showToast(err.message, "error")
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this license? The user will lose access immediately.")) return
    try {
      const res = await fetch(`${API_URL}/admin/licenses/revoke`, {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      showToast("License revoked.")
      fetchData()
    } catch (err: any) {
      showToast(err.message, "error")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this unused license key?")) return
    try {
      const res = await fetch(`${API_URL}/admin/licenses/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      showToast("License deleted.")
      fetchData()
    } catch (err: any) {
      showToast(err.message, "error")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast("Copied to clipboard!")
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    router.push("/admin-login")
  }

  const filteredLicenses = filter === "all"
    ? licenses
    : licenses.filter((l) => l.status === filter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                : "bg-red-500/20 border border-red-500/30 text-red-300"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-100">Admin Dashboard</span>
            <span className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              Restricted
            </span>
          </div>
          <button
            id="admin-logout-btn"
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats?.total_users ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Active Licenses", value: stats?.active ?? 0, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Expired", value: stats?.expired ?? 0, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Unused Keys", value: stats?.unused ?? 0, icon: Key, color: "text-slate-400", bg: "bg-slate-500/10" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            >
              <div className={`inline-flex p-2 rounded-xl ${stat.bg} mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* New Key Banner */}
        <AnimatePresence>
          {newKey && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="flex-1">
                <p className="text-emerald-400 font-semibold text-sm mb-1">New License Key Generated</p>
                <p className="font-mono text-lg text-white tracking-widest">{newKey.key}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(newKey.key)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm hover:bg-emerald-600/30 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => setNewKey(null)}
                  className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* License Management */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-100">License Keys</h2>
              <p className="text-sm text-gray-500 mt-0.5">{licenses.length} total keys</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="relative">
                <select
                  id="license-filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All ({licenses.length})</option>
                  <option value="unused">Unused ({stats?.unused ?? 0})</option>
                  <option value="active">Active ({stats?.active ?? 0})</option>
                  <option value="expired">Expired ({stats?.expired ?? 0})</option>
                  <option value="revoked">Revoked ({stats?.revoked ?? 0})</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              {/* Generate Button */}
              <button
                id="generate-key-btn"
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-xl text-sm transition-all duration-150"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {generating ? "Generating…" : "Generate Key"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredLicenses.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <Key className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No license keys found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-medium">Key</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Assigned To</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Activated</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Expires</th>
                    <th className="text-right px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredLicenses.map((license) => (
                    <motion.tr
                      key={license.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-gray-200 tracking-wider text-xs">{license.key}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium ${STATUS_STYLES[license.status]}`}>
                          {license.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-gray-400 text-xs truncate max-w-[180px] block">
                          {license.assigned_email || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-gray-500 text-xs">
                        {formatDate(license.activated_at)}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-xs">
                        {license.expires_at ? (
                          <span className={daysRemaining(license.expires_at) <= 5 && license.status === "active" ? "text-amber-400" : "text-gray-500"}>
                            {formatDate(license.expires_at)}
                            {license.status === "active" && (
                              <span className="ml-1 text-gray-600">({daysRemaining(license.expires_at)}d)</span>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(license.key)}
                            title="Copy key"
                            className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {license.status === "active" && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(license.id)}
                              title="Revoke license"
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {license.status === "unused" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(license.id)}
                              title="Delete key"
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
