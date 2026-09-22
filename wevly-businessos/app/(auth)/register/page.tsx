'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { registerSchema, type RegisterFormValues } from '@/lib/validators/auth.schema'
import { createClient } from '@/lib/supabase/client'

function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
  ]

  if (!password) return null

  return (
    <div className="space-y-1 pt-1">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-2">
          <div
            className={`h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
              ${c.pass ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            {c.pass && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
          </div>
          <span className={`text-xs transition-colors ${c.pass ? 'text-green-600' : 'text-gray-500'}`}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password', '')

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
          },
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('An account with this email already exists. Please sign in.')
        } else {
          toast.error(error.message)
        }
        return
      }

      toast.success('Account created! Redirecting to setup…')
      router.push('/setup')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500">
          Get started with Wevly BusinessOS for free
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Amit Sharma"
            {...register('full_name')}
            className={`w-full h-10 px-3 text-sm rounded-lg border bg-white transition-colors
              placeholder:text-gray-400 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              ${errors.full_name ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
          />
          {errors.full_name && (
            <p className="text-xs text-red-600">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register('email')}
            className={`w-full h-10 px-3 text-sm rounded-lg border bg-white transition-colors
              placeholder:text-gray-400 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
          />
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a strong password"
              {...register('password')}
              className={`w-full h-10 px-3 pr-10 text-sm rounded-lg border bg-white transition-colors
                placeholder:text-gray-400 text-gray-900
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrengthIndicator password={password} />
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            {...register('confirm_password')}
            className={`w-full h-10 px-3 text-sm rounded-lg border bg-white transition-colors
              placeholder:text-gray-400 text-gray-900
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              ${errors.confirm_password ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
          />
          {errors.confirm_password && (
            <p className="text-xs text-red-600">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          id="btn-register"
          className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed
            text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
