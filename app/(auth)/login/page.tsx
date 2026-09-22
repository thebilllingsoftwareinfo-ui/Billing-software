'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Phone, Mail, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginDemo } from './actions'


type IdentifierType = 'phone' | 'email'
type LoginMethod = 'otp' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [identifierType, setIdentifierType] = useState<IdentifierType>('email')
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('otp')
  
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Reset states when switching tabs
  const handleTabChange = (type: IdentifierType) => {
    setIdentifierType(type)
    setOtpSent(false)
    setOtpCode('')
    setPassword('')
    setErrorMessage('')
  }

  // Generate OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setErrorMessage('')
    setIsLoading(true)
    try {
      if (identifierType === 'phone') {
        const cleaned = phoneNumber.replace(/\D/g, '')
        if (cleaned.length !== 10) {
          toast.error('Please enter a valid 10-digit mobile number')
          return
        }
        const { error } = await supabase.auth.signInWithOtp({
          phone: '+91' + cleaned,
        })
        if (error) throw error
        toast.success(`OTP sent to +91 ${cleaned}!`)
      } else {
        if (!email.includes('@')) {
          toast.error('Please enter a valid email address')
          return
        }
        const { error } = await supabase.auth.signInWithOtp({
          email: email,
        })
        if (error) throw error
        toast.success(`OTP sent to ${email}!`)
      }
      setOtpSent(true)
    } catch (error: any) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('rate limit')) {
        setErrorMessage('Too many requests. Please try again later.')
      } else if (msg.includes('not configured') || msg.includes('disabled')) {
        setErrorMessage('Email/SMS provider is not configured in Supabase. OTP cannot be sent.')
      } else {
        setErrorMessage(error.message || 'Failed to send OTP')
      }
      toast.error(error.message || 'Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    if (!otpCode || otpCode.length < 6) {
      setErrorMessage('Please enter the 6-digit OTP')
      return
    }

    setIsLoading(true)
    try {
      if (identifierType === 'phone') {
        const cleaned = phoneNumber.replace(/\D/g, '')
        const { error } = await supabase.auth.verifyOtp({
          phone: '+91' + cleaned,
          token: otpCode,
          type: 'sms',
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.verifyOtp({
          email: email,
          token: otpCode,
          type: 'email',
        })
        if (error) throw error
      }
      toast.success('Verified successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      setErrorMessage(error.message || 'Invalid OTP')
      toast.error(error.message || 'Invalid OTP')
    } finally {
      setIsLoading(false)
    }
  }

  // Login with Password
  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    if (!password) {
      setErrorMessage('Please enter your password')
      return
    }

    setIsLoading(true)
    try {
      if (identifierType === 'phone') {
        const cleaned = phoneNumber.replace(/\D/g, '')
        if (cleaned.length !== 10) {
          toast.error('Please enter a valid 10-digit mobile number')
          return
        }
        const { error } = await supabase.auth.signInWithPassword({
          phone: '+91' + cleaned,
          password: password,
        })
        if (error) throw error
      } else {
        if (!email.includes('@')) {
          toast.error('Please enter a valid email address')
          return
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })
        if (error) throw error
      }
      toast.success('Signed in successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      setErrorMessage(error.message || 'Invalid login credentials')
      toast.error(error.message || 'Invalid login credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Welcome to VANIRA</h1>
        <p className="text-xs text-gray-500">
          Sign in to access your bills, stock ledger, and GST reports
        </p>
      </div>

      <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-semibold text-gray-600">
        <button
          type="button"
          onClick={() => handleTabChange('phone')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            identifierType === 'phone'
              ? 'bg-white text-red-600 shadow-xs font-bold'
              : 'hover:text-gray-900'
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          Phone
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('email')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            identifierType === 'email'
              ? 'bg-white text-red-600 shadow-xs font-bold'
              : 'hover:text-gray-900'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </button>
      </div>

      <div className="animate-in fade-in duration-200 space-y-4">
        {/* Toggle Login Method */}
        {!otpSent && (
          <div className="flex items-center justify-center gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLoginMethod('otp')}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                loginMethod === 'otp' ? 'text-red-600 border-b-2 border-red-600 pb-0.5' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Login with OTP
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                loginMethod === 'password' ? 'text-red-600 border-b-2 border-red-600 pb-0.5' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Login with Password
            </button>
          </div>
        )}

        {loginMethod === 'otp' ? (
          /* ── OTP FLOW ── */
          !otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  {identifierType === 'phone' ? 'Mobile Number' : 'Email Address'}
                </label>
                {identifierType === 'phone' ? (
                  <div className="flex items-center">
                    <div className="h-10 px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl flex items-center gap-1.5 text-xs font-bold text-gray-700 select-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                      className="w-full h-10 px-3 text-sm rounded-r-xl border border-gray-200 bg-white text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                ) : (
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                )}
              </div>

              {errorMessage && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (identifierType === 'phone' && phoneNumber.length < 10) || (identifierType === 'email' && !email)}
                className="w-full h-10 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending OTP…
                  </>
                ) : (
                  <>
                    <span>Get OTP & Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                <span>OTP sent to <strong>{identifierType === 'phone' ? '+91 ' + phoneNumber : email}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-[11px] text-red-600 hover:underline font-bold cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  className="w-full h-11 text-center tracking-[0.5em] text-lg font-mono font-bold rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>

              {errorMessage && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full h-10 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying OTP…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify & Login
                  </>
                )}
              </button>
            </form>
          )
        ) : (
          /* ── PASSWORD FLOW ── */
          <form onSubmit={handleLoginPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                {identifierType === 'phone' ? 'Mobile Number' : 'Email Address'}
              </label>
              {identifierType === 'phone' ? (
                <div className="flex items-center">
                  <div className="h-10 px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl flex items-center gap-1.5 text-xs font-bold text-gray-700 select-none">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    className="w-full h-10 px-3 text-sm rounded-r-xl border border-gray-200 bg-white text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              ) : (
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 pr-10 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password || (identifierType === 'phone' && phoneNumber.length < 10) || (identifierType === 'email' && !email)}
              className="w-full h-10 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed
                text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in…' : 'Sign in to VANIRA'}
            </button>
          </form>
        )}
      </div>

      <div className="pt-2">
        <form action={loginDemo}>
          <button
            type="submit"
            className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            1-Click Demo Login
          </button>
        </form>
      </div>

      <div className="pt-2 text-center text-xs text-gray-500">
        New to VANIRA The Bill Book?{' '}
        <Link
          href="/register"
          className="text-red-600 hover:text-red-700 font-bold"
        >
          Create Company Free
        </Link>
      </div>
    </div>
  )
}

