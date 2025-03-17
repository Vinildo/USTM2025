"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

interface AdminRegisterProps {
  onRegister: (username: string, password: string) => Promise<void>
}

export function AdminRegister({ onRegister }: AdminRegisterProps) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("") // Adicionado estado para email
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Update the handleRegister function to validate email
  const handleRegister = async () => {
    // Validate required fields
    if (!username || !email || !password || !confirmPassword) {
      toast({
        title: "Registration failed",
        description: "All fields are required. Please fill in all fields.",
        variant: "destructive",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Registration failed",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Registration failed",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Armazenar o email no localStorage para uso posterior
      localStorage.setItem("adminEmail", email)
      await onRegister(username, password)
      toast({
        title: "Registration successful",
        description: "Administrator account has been created.",
      })
    } catch (err) {
      toast({
        title: "Registration failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-red-700">Register Administrator</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Create the first administrator account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
            </div>
            <Button className="w-full" onClick={handleRegister} disabled={isLoading}>
              {isLoading ? "Registering..." : "Register"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

