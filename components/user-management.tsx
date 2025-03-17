"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Trash2, Edit, Lock, RefreshCw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAppContext } from "@/contexts/AppContext"
import type { User, UserRole } from "@/types/user"

export function UserManagement() {
  const { users, addUser, updateUser, deleteUser } = useAppContext()
  const [newUser, setNewUser] = useState<Omit<User, "id" | "isActive" | "forcePasswordChange">>({
    username: "",
    fullName: "",
    email: "", // Adicionado campo de email
    role: "user",
    password: "",
  })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  // Modificar a função handleAddUser para validar email único
  const handleAddUser = () => {
    if (newUser.username && newUser.fullName && newUser.email && newUser.password) {
      // Check if email is valid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newUser.email)) {
        toast({
          title: "Erro",
          description: "Por favor, insira um email válido.",
          variant: "destructive",
        })
        return
      }

      // Verificar se o email já está em uso
      const emailExists = users.some((user) => user.email.toLowerCase() === newUser.email.toLowerCase())
      if (emailExists) {
        toast({
          title: "Erro",
          description: "Este email já está associado a outro usuário.",
          variant: "destructive",
        })
        return
      }

      // Verificar se o nome de usuário já está em uso
      const usernameExists = users.some((user) => user.username.toLowerCase() === newUser.username.toLowerCase())
      if (usernameExists) {
        toast({
          title: "Erro",
          description: "Este nome de usuário já está em uso.",
          variant: "destructive",
        })
        return
      }

      addUser({ ...newUser, isActive: true, forcePasswordChange: true })
      setNewUser({ username: "", fullName: "", email: "", role: "user", password: "" })
      toast({
        title: "Usuário adicionado",
        description: `${newUser.fullName} foi adicionado com sucesso.`,
      })
    } else {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = (id: string) => {
    deleteUser(id)
    toast({
      title: "Usuário removido",
      description: "O usuário foi removido com sucesso.",
    })
  }

  const handleToggleUserStatus = (user: User) => {
    const updatedUser = { ...user, isActive: !user.isActive }
    updateUser(updatedUser)
    toast({
      title: `Usuário ${updatedUser.isActive ? "ativado" : "desativado"}`,
      description: `${updatedUser.fullName} foi ${updatedUser.isActive ? "ativado" : "desativado"} com sucesso.`,
    })
  }

  // Modificar a função handleEditUser para validar email único durante a edição
  const handleEditUser = () => {
    if (editingUser) {
      // Verificar se o email é válido
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(editingUser.email)) {
        toast({
          title: "Erro",
          description: "Por favor, insira um email válido.",
          variant: "destructive",
        })
        return
      }

      // Verificar se o email já está em uso por outro usuário
      const emailExists = users.some(
        (user) => user.id !== editingUser.id && user.email.toLowerCase() === editingUser.email.toLowerCase(),
      )
      if (emailExists) {
        toast({
          title: "Erro",
          description: "Este email já está associado a outro usuário.",
          variant: "destructive",
        })
        return
      }

      // Verificar se o nome de usuário já está em uso por outro usuário
      const usernameExists = users.some(
        (user) => user.id !== editingUser.id && user.username.toLowerCase() === editingUser.username.toLowerCase(),
      )
      if (usernameExists) {
        toast({
          title: "Erro",
          description: "Este nome de usuário já está em uso.",
          variant: "destructive",
        })
        return
      }

      updateUser(editingUser)
      setIsEditDialogOpen(false)
      setEditingUser(null)
      toast({
        title: "Usuário atualizado",
        description: `${editingUser.fullName} foi atualizado com sucesso.`,
      })
    }
  }

  const handleResetPassword = () => {
    if (editingUser && newPassword) {
      const updatedUser = { ...editingUser, password: newPassword, forcePasswordChange: true }
      updateUser(updatedUser)
      setIsResetPasswordDialogOpen(false)
      setEditingUser(null)
      setNewPassword("")
      toast({
        title: "Senha redefinida",
        description: `A senha de ${editingUser.fullName} foi redefinida com sucesso.`,
      })
    }
  }

  const handleForcePasswordChange = (user: User) => {
    const updatedUser = { ...user, forcePasswordChange: true }
    updateUser(updatedUser)
    toast({
      title: "Alteração de senha forçada",
      description: `${user.fullName} será obrigado a alterar a senha no próximo login.`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Usuários</CardTitle>
        <CardDescription>Adicione e gerencie usuários do sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Função</Label>
              <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleAddUser}>Adicionar Usuário</Button>
        </div>
        <div className="mt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome de Usuário</TableHead>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users &&
                users.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email || "Não definido"}</TableCell>
                    <TableCell>{user.role === "admin" ? "Administrador" : "Usuário"}</TableCell>
                    <TableCell>
                      <Switch checked={user.isActive} onCheckedChange={() => handleToggleUserStatus(user)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Usuário</DialogTitle>
                              <DialogDescription>Faça as alterações necessárias e clique em salvar.</DialogDescription>
                            </DialogHeader>
                            {editingUser && (
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-username" className="text-right">
                                    Nome de usuário
                                  </Label>
                                  <Input
                                    id="edit-username"
                                    value={editingUser.username}
                                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-fullName" className="text-right">
                                    Nome completo
                                  </Label>
                                  <Input
                                    id="edit-fullName"
                                    value={editingUser.fullName}
                                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-email" className="text-right">
                                    Email
                                  </Label>
                                  <Input
                                    id="edit-email"
                                    type="email"
                                    value={editingUser.email || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-role" className="text-right">
                                    Função
                                  </Label>
                                  <Select
                                    value={editingUser.role}
                                    onValueChange={(value: UserRole) => setEditingUser({ ...editingUser, role: value })}
                                  >
                                    <SelectTrigger className="col-span-3">
                                      <SelectValue placeholder="Selecione a função" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">Usuário</SelectItem>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button onClick={handleEditUser}>Salvar alterações</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                              <Lock className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Redefinir Senha</DialogTitle>
                              <DialogDescription>Digite a nova senha para o usuário.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-password" className="text-right">
                                  Nova Senha
                                </Label>
                                <Input
                                  id="new-password"
                                  type="password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleResetPassword}>Redefinir Senha</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" onClick={() => handleForcePasswordChange(user)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

