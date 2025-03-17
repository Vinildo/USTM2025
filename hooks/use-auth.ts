"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

interface User {
  id: string
  username: string
  role: "user" | "admin"
  password: string
  fullName: string
  email?: string // Add email field
  isActive: boolean
  forcePasswordChange: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [hasAdmin, setHasAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      try {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }

        let users = JSON.parse(localStorage.getItem("users") || "[]")
        console.log("Stored users:", users) // Log for debugging

        // If no users are stored, initialize with default users
        if (users.length === 0) {
          users = [
            {
              id: "1",
              username: "admin",
              fullName: "Admin User",
              email: "admin@example.com", // Add email
              role: "admin",
              password: "admin123",
              isActive: true,
              forcePasswordChange: false,
            },
            {
              id: "2",
              username: "user",
              fullName: "Regular User",
              email: "user@example.com", // Add email
              role: "user",
              password: "user123",
              isActive: true,
              forcePasswordChange: false,
            },
            {
              id: "3",
              username: "Benigna Magaia",
              fullName: "Benigna Magaia",
              email: "benigna.magaia@example.com", // Add email
              role: "user",
              password: "01",
              isActive: true,
              forcePasswordChange: false,
            },
            {
              id: "4",
              username: "Vinildo Mondlane",
              fullName: "Vinildo Mondlane",
              email: "vinildo.mondlane@example.com", // Add email
              role: "admin",
              password: "Vinildo123456",
              isActive: true,
              forcePasswordChange: false,
            },
          ]
          localStorage.setItem("users", JSON.stringify(users))
          console.log("Initialized default users:", users) // Log for debugging
        }

        const adminExists = users.some((u: User) => u.role === "admin")
        setHasAdmin(adminExists)
        localStorage.setItem("adminExists", adminExists.toString())

        console.log("Initial auth state:", { storedUser, adminExists, users })
      } catch (error) {
        console.error("Error during initialization:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Modificar a função login para verificar se o usuário está ativo
  const login = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      // Get users from localStorage or use default array if empty
      const usersString = localStorage.getItem("users")
      console.log("Raw users string from localStorage:", usersString)

      let users = []
      if (usersString) {
        try {
          users = JSON.parse(usersString)
        } catch (e) {
          console.error("Error parsing users from localStorage:", e)
          // Initialize with default users if parsing fails
          users = getDefaultUsers()
          localStorage.setItem("users", JSON.stringify(users))
        }
      } else {
        // Initialize with default users if no users in localStorage
        users = getDefaultUsers()
        localStorage.setItem("users", JSON.stringify(users))
      }

      console.log("Login attempt:", { username, password })
      console.log("Available users:", users)

      // Find user with case-insensitive username match
      const foundUser = users.find(
        (u: User) => u.username.toLowerCase() === username.toLowerCase() && u.password === password,
      )

      if (foundUser) {
        if (!foundUser.isActive) {
          toast({
            title: "Conta desativada",
            description: "Esta conta de usuário está desativada. Contacte o administrador.",
            variant: "destructive",
          })
          throw new Error("Conta desativada")
        }

        console.log("User found:", foundUser)
        const { password: _, ...userWithoutPassword } = foundUser
        setUser(userWithoutPassword)
        localStorage.setItem("user", JSON.stringify(userWithoutPassword))
        toast({
          title: "Login bem-sucedido",
          description: `Bem-vindo, ${foundUser.fullName}!`,
        })
        return userWithoutPassword
      } else {
        console.log("User not found or password incorrect")
        throw new Error("Credenciais inválidas")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Erro no login",
        description: "Nome de usuário ou senha incorretos. Por favor, tente novamente.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    })
  }

  // Modificar a função register para incluir o email do localStorage
  const register = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]")
      if (users.some((u: User) => u.role === "admin")) {
        throw new Error("Administrador já existe")
      }

      // Obter o email do localStorage ou usar um padrão
      const email = localStorage.getItem("adminEmail") || `${username}@example.com`

      const newAdmin: User = {
        id: Date.now().toString(),
        username,
        password,
        role: "admin",
        fullName: "Admin User",
        email: email, // Usar o email armazenado
        isActive: true,
        forcePasswordChange: false,
      }

      users.push(newAdmin)
      localStorage.setItem("users", JSON.stringify(users))
      setHasAdmin(true)
      localStorage.setItem("adminExists", "true")

      // Limpar o email temporário
      localStorage.removeItem("adminEmail")

      console.log("New admin registered:", newAdmin)
      console.log("Updated users:", users)

      const { password: _, ...adminWithoutPassword } = newAdmin
      setUser(adminWithoutPassword)
      localStorage.setItem("user", JSON.stringify(adminWithoutPassword))

      toast({
        title: "Registro bem-sucedido",
        description: "Conta de administrador criada com sucesso.",
      })
      return adminWithoutPassword
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        title: "Erro no registro",
        description: "Não foi possível criar a conta. Por favor, tente novamente.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const hasPermission = (permission: string) => {
    if (!user) return false
    if (user.role === "admin") return true

    const userPermissions = [
      "view_pagamentos",
      "view_relatorio_divida",
      "view_relatorio_fornecedor",
      "view_controlo_cheques",
      "view_fundo_maneio",
    ]

    return userPermissions.includes(permission)
  }

  const resetPassword = async (username: string, newPassword: string) => {
    setIsLoading(true)
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]")
      console.log("Usuários armazenados:", users) // Log para depuração
      console.log("Tentando redefinir senha para o usuário:", username) // Log para depuração

      const userIndex = users.findIndex((u: User) => u.username.toLowerCase() === username.toLowerCase())

      if (userIndex === -1) {
        console.log("Usuário não encontrado:", username) // Log para depuração
        throw new Error("Usuário não encontrado")
      }

      users[userIndex].password = newPassword
      users[userIndex].forcePasswordChange = false

      localStorage.setItem("users", JSON.stringify(users))
      console.log("Senha redefinida com sucesso para:", username) // Log para depuração

      toast({
        title: "Senha redefinida",
        description: "Sua senha foi redefinida com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao redefinir senha:", error)
      toast({
        title: "Erro ao redefinir senha",
        description:
          error instanceof Error ? error.message : "Não foi possível redefinir a senha. Por favor, tente novamente.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultUsers = () => {
    return [
      {
        id: "1",
        username: "admin",
        fullName: "Admin User",
        email: "admin@example.com", // Add email
        role: "admin",
        password: "admin123",
        isActive: true,
        forcePasswordChange: false,
      },
      {
        id: "2",
        username: "user",
        fullName: "Regular User",
        email: "user@example.com", // Add email
        role: "user",
        password: "user123",
        isActive: true,
        forcePasswordChange: false,
      },
      {
        id: "3",
        username: "Benigna Magaia",
        fullName: "Benigna Magaia",
        email: "benigna.magaia@example.com", // Add email
        role: "user",
        password: "01",
        isActive: true,
        forcePasswordChange: false,
      },
      {
        id: "4",
        username: "Vinildo Mondlane",
        fullName: "Vinildo Mondlane",
        email: "vinildo.mondlane@example.com", // Add email
        role: "admin",
        password: "Vinildo123456",
        isActive: true,
        forcePasswordChange: false,
      },
    ]
  }

  return { user, login, logout, register, hasAdmin, isLoading, hasPermission, resetPassword }
}

