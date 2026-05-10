"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { env } from "@/config"

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSuccess, setIsSuccess] = React.useState<boolean>(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordValues) {
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
        const { error } = await (authClient as any).forgetPassword({
          email: data.email,
          redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password`,
        })

        if (error) {
          setError(error.message || "Something went wrong. Please try again.")
          setIsLoading(false)
          return
        }

        setIsSuccess(true)
        setIsLoading(false)
    } catch (e) {
        setError("An unexpected error occurred.")
        setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-green-600">
          Check your email for a reset link.
        </p>
        <p className="text-xs text-muted-foreground">
          We've sent a password reset link to your email address.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("grid gap-6")}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              {...register("email")}
            />
            {errors?.email && (
              <p className="px-1 text-xs text-red-600">
                {errors.email.message}
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
            Send Reset Link
          </Button>
        </div>
      </form>
    </div>
  )
}
