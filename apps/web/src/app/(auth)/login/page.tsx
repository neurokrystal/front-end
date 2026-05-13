import { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { Card } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
}

export default function LoginPage() {
  return (
    <div className="container relative h-screen flex flex-col items-center justify-center lg:max-w-none lg:px-0">
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px]">
        <div className="flex flex-col space-y-4 text-center">
          <img 
            src="https://dimensionalsystem.com/wp-content/uploads/Dimensional-Spinner.svg" 
            alt="The Dimensional System" 
            className="w-16 h-16 mx-auto mb-2"
          />
          <div>
            <span className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground block mb-2">Welcome</span>
            <h1 className="font-heading text-4xl font-normal leading-tight">
              Sign in to <span className="italic">Dimensional</span>
            </h1>
            <p className="text-sm text-muted-foreground font-light mt-2 italic">
              "The precision approach to psychological intelligence™"
            </p>
          </div>
        </div>
        <Card className="p-8 shadow-card border-border bg-card/50 backdrop-blur-sm">
          <LoginForm />
        </Card>
        <p className="px-8 text-center text-sm text-muted-foreground font-light">
          <Link
            href="/forgot-password"
            className="hover:text-primary transition-colors underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
      
      {/* Background decoration */}
      <img 
        src="https://dimensionalsystem.com/wp-content/uploads/philosophy.svg" 
        className="absolute -left-1/4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none z-0 w-1/2 h-auto"
        alt=""
      />
      <img 
        src="https://dimensionalsystem.com/wp-content/uploads/Group-3072.svg" 
        className="absolute -right-1/4 top-1/4 opacity-15 pointer-events-none z-0 w-1/2 h-auto"
        alt=""
      />
    </div>
  )
}
