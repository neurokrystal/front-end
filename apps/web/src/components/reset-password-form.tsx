"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

const resetPasswordSchema = z.object({
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSuccess, setIsSuccess] = React.useState<boolean>(false)

  const token = searchParams.get("token")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  async function onSubmit(data: ResetPasswordValues) {
    if (!token) {
        setError("Invalid or missing reset token.")
        return
    }

    setIsLoading(true)
    setError(null)

    try {
        const { error } = await authClient.resetPassword({
          newPassword: data.password,
          token: token,
        })

        if (error) {
          setError(error.message || "Something went wrong. Please try again.")
          setIsLoading(false)
          return
        }

        setIsSuccess(true)
        setIsLoading(false)
        setTimeout(() => {
            router.push("/login")
        }, 3000)
    } catch (e) {
        setError("An unexpected error occurred.")
        setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-green-600">
          Password reset successful!
        </p>
        <p className="text-xs text-muted-foreground">
          You will be redirected to the login page shortly.
        </p>
      </div>
    )
  }

  if (!token) {
      return (
          <div className="text-center text-red-600">
              Invalid or missing reset token. Please request a new password reset.
          </div>
      )
  }

  return (
    <div className={cn("grid gap-6")}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              New Password
            </Label>
            <Input
              id="password"
              placeholder="New Password"
              type="password"
              disabled={isLoading}
              {...register("password")}
            />
            {errors?.password && (
              <p className="px-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="confirmPassword">
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              placeholder="Confirm New Password"
              type="password"
              disabled={isLoading}
              {...register("confirmPassword")}
            />
            {errors?.confirmPassword && (
              <p className="px-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          {error && (
            <p className="px-1 text-xs text-red-600">
              {error}
            </p>
          )}
          <Button disabled={isLoading}>
            {isLoading && (
              <span className="mr-2 h-4 w-4 animate-spin">...</span>
            )}
            Reset Password
          </Button>
        </div>
      </form>
    </div>
  )
}
