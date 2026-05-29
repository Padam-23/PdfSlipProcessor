"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Upload, User, Download, LogOut, Loader2, AlertCircle, Menu } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface UserData {
  id: string
  email: string
  pdf_limit: number
  pdf_used: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>(uuidv4())
  const [error, setError] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userStr = localStorage.getItem("user")
    if (!token || !userStr) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userStr))
    fetchUsage()
  }, [router])

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        localStorage.setItem("user", JSON.stringify(data))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const uploadFile = async (field: "slips" | "reports", file: File) => {
    const token = localStorage.getItem("token")
    const formData = new FormData()
    formData.append(field, file)

    const res = await fetch(`${API_URL}/upload/${field}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Session-Id": sessionId
      },
      body: formData
    })

    if (!res.ok) throw new Error("Upload failed")
  }

  const handleProcess = async () => {
    if (!slipFile || !reportFile) {
      setError("Please upload both files")
      return
    }

    setProcessing(true)
    setError("")
    setDownloadUrl(null)

    try {
      await uploadFile("slips", slipFile)
      await uploadFile("reports", reportFile)

      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Session-Id": sessionId
        }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      setDownloadUrl(data.downloadUrl)
      fetchUsage()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const usagePercent = user ? Math.min(100, (user.pdf_used / user.pdf_limit) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">PDF Slip Processor</h1>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-6 w-6 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-16 right-0 left-0 bg-white border-b shadow-lg"
          >
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 pb-3 border-b">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <Button variant="secondary" className="w-full justify-start" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>Your monthly processing limit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{user?.pdf_used} of {user?.pdf_limit} PDFs used</span>
                  <span>{Math.round(usagePercent)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-3 rounded-full ${
                      usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-blue-600"
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Upload Slip PDF</CardTitle>
                <CardDescription>Contains 3 slips per page</CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 mb-2 text-gray-400" />
                    <p className="mb-1 text-sm text-gray-600">
                      {slipFile ? slipFile.name : "Click or drag to upload"}
                    </p>
                  </div>
                  <Input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                  />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upload Deposit Report</CardTitle>
                <CardDescription>Deposit installment report PDF</CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 mb-2 text-gray-400" />
                    <p className="mb-1 text-sm text-gray-600">
                      {reportFile ? reportFile.name : "Click or drag to upload"}
                    </p>
                  </div>
                  <Input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  />
                </label>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <Button
              size="lg"
              className="w-full md:w-auto min-w-[200px]"
              onClick={handleProcess}
              disabled={processing || !slipFile || !reportFile}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Files"
              )}
            </Button>

            {downloadUrl && (
              <div className="flex flex-col items-center space-y-2 w-full">
                <Button asChild size="lg" className="w-full md:w-auto min-w-[200px] bg-green-600 hover:bg-green-700">
                  <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download Output
                  </a>
                </Button>
                <p className="text-sm text-gray-500 font-medium text-center">
                  This file will be automatically deleted in 5 minutes to save memory.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}