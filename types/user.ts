export type UserRole = "user" | "admin"

export interface User {
  id: string
  username: string
  fullName: string
  email: string // Adicionado campo de email
  role: UserRole
  password: string
  isActive: boolean
  forcePasswordChange: boolean
}

