"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Fornecedor, Pagamento } from "@/types/fornecedor"
import type { User } from "@/types/user"
import type { HistoryEntry } from "@/types/history"
import type { Movimento } from "@/components/fundo-maneio"

// Add to the AppContextType interface
interface AppContextType {
  fornecedores: Fornecedor[]
  adicionarFornecedor: (fornecedor: Fornecedor) => void
  adicionarPagamento: (fornecedorId: string, pagamento: Pagamento) => void
  atualizarPagamento: (fornecedorId: string, pagamento: Pagamento) => void
  removerPagamento: (fornecedorId: string, pagamentoId: string) => void
  users: User[]
  addUser: (user: Omit<User, "id">) => void
  updateUser: (user: User) => void
  deleteUser: (userId: string) => void
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  isAdmin: () => boolean
  hasPermission: (permission: string) => boolean
  moverPagamento: (pagamentoId: string, fornecedorOrigemId: string, fornecedorDestinoId: string) => void
  getHistoryForEntity: (entityType: string, entityId: string) => HistoryEntry[]
  adicionarMovimentoFundoManeio: (movimento: Partial<Movimento>) => string | null
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [fundosManeio, setFundosManeio] = useState<any[]>([])

  useEffect(() => {
    // Carregar dados do localStorage
    const storedFornecedores = localStorage.getItem("fornecedores")
    const storedUsers = localStorage.getItem("users")
    const storedCurrentUser = localStorage.getItem("currentUser")
    const storedFundosManeio = localStorage.getItem("fundosManeio")

    if (storedFornecedores) {
      setFornecedores(JSON.parse(storedFornecedores))
    }
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers))
    }
    if (storedCurrentUser) {
      setCurrentUser(JSON.parse(storedCurrentUser))
    }
    if (storedFundosManeio) {
      setFundosManeio(
        JSON.parse(storedFundosManeio, (key, value) => {
          if (key === "mes" || key === "data") {
            return new Date(value)
          }
          return value
        }),
      )
    }
  }, [])

  useEffect(() => {
    // Salvar dados no localStorage sempre que houver mudanças
    localStorage.setItem("fornecedores", JSON.stringify(fornecedores))
    localStorage.setItem("users", JSON.stringify(users))
    localStorage.setItem("fundosManeio", JSON.stringify(fundosManeio))
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser))
    } else {
      localStorage.removeItem("currentUser")
    }
  }, [fornecedores, users, currentUser, fundosManeio])

  // Add the implementation of the getHistoryForEntity function
  const getHistoryForEntity = (entityType: string, entityId: string) => {
    // For payments, find the payment and return its history
    if (entityType === "payment") {
      for (const fornecedor of fornecedores) {
        const pagamento = fornecedor.pagamentos.find((p) => p.id === entityId)
        if (pagamento && pagamento.historico) {
          return pagamento.historico
        }
      }
    }
    return []
  }

  // Modifique a função adicionarPagamento para garantir que use o usuário atual
  const adicionarPagamento = (fornecedorId: string, pagamento: Pagamento) => {
    // Certifique-se de que temos um usuário válido
    const userId = currentUser?.id || "1" // Use ID 1 como fallback (admin)
    const userName = currentUser?.fullName || currentUser?.username || "Admin User" // Use "Admin User" como fallback

    const historyEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      userId: userId,
      username: userName,
      action: "create",
      entityType: "payment",
      entityId: pagamento.id,
      details: `Pagamento criado: ${pagamento.referencia}`,
      newState: pagamento,
    }

    const pagamentoWithHistory = {
      ...pagamento,
      historico: [historyEntry],
    }

    setFornecedores((prev) =>
      prev.map((fornecedor) =>
        fornecedor.id === fornecedorId
          ? { ...fornecedor, pagamentos: [...fornecedor.pagamentos, pagamentoWithHistory] }
          : fornecedor,
      ),
    )
  }

  // Modifique a função atualizarPagamento para garantir que use o usuário atual
  const atualizarPagamento = (fornecedorId: string, pagamento: Pagamento) => {
    setFornecedores((prev) => {
      const fornecedor = prev.find((f) => f.id === fornecedorId)
      if (!fornecedor) return prev

      const oldPagamento = fornecedor.pagamentos.find((p) => p.id === pagamento.id)

      // Certifique-se de que temos um usuário válido
      const userId = currentUser?.id || "1" // Use ID 1 como fallback (admin)
      const userName = currentUser?.fullName || currentUser?.username || "Admin User" // Use "Admin User" como fallback

      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        userId: userId,
        username: userName,
        action: "update",
        entityType: "payment",
        entityId: pagamento.id,
        details: `Pagamento atualizado: ${pagamento.referencia}`,
        previousState: oldPagamento,
        newState: pagamento,
      }

      const historico = oldPagamento?.historico || []

      return prev.map((fornecedor) =>
        fornecedor.id === fornecedorId
          ? {
              ...fornecedor,
              pagamentos: fornecedor.pagamentos.map((p) =>
                p.id === pagamento.id ? { ...pagamento, historico: [...historico, historyEntry] } : p,
              ),
            }
          : fornecedor,
      )
    })
  }

  // Modifique a função removerPagamento para garantir que use o usuário atual
  const removerPagamento = (fornecedorId: string, pagamentoId: string) => {
    setFornecedores((prev) => {
      const fornecedor = prev.find((f) => f.id === fornecedorId)
      if (!fornecedor) return prev

      const pagamento = fornecedor.pagamentos.find((p) => p.id === pagamentoId)

      if (pagamento) {
        // Certifique-se de que temos um usuário válido
        const userId = currentUser?.id || "1" // Use ID 1 como fallback (admin)
        const userName = currentUser?.fullName || currentUser?.username || "Admin User" // Use "Admin User" como fallback

        const historyEntry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: new Date(),
          userId: userId,
          username: userName,
          action: "delete",
          entityType: "payment",
          entityId: pagamentoId,
          details: `Pagamento removido: ${pagamento.referencia}`,
          previousState: pagamento,
        }

        // You could store this history somewhere else since the payment will be removed
        // For now, we'll just log it
        console.log("Payment deletion history:", historyEntry)
      }

      return prev.map((fornecedor) =>
        fornecedor.id === fornecedorId
          ? {
              ...fornecedor,
              pagamentos: fornecedor.pagamentos.filter((p) => p.id !== pagamentoId),
            }
          : fornecedor,
      )
    })
  }

  // Modifique a função adicionarMovimentoFundoManeio para tornar os campos menos restritivos
  const adicionarMovimentoFundoManeio = (movimento: Partial<Movimento>): string | null => {
    // Verificar apenas os campos essenciais
    if (!movimento.tipo || !movimento.valor) {
      return null
    }

    // Definir valores padrão para campos não fornecidos
    const data = movimento.data || new Date()
    const descricao = movimento.descricao || "Movimento automático"

    const novoId = Date.now().toString()
    const novoMovimentoCompleto: Movimento = {
      id: novoId,
      data: data,
      tipo: movimento.tipo,
      valor: movimento.valor,
      descricao: descricao,
      pagamentoId: movimento.pagamentoId,
      pagamentoReferencia: movimento.pagamentoReferencia,
      fornecedorNome: movimento.fornecedorNome,
    }

    let fundoAtualizado = false
    const mesAtual = data.getMonth()
    const anoAtual = data.getFullYear()

    setFundosManeio((fundosAnteriores) => {
      const fundoExistente = fundosAnteriores.find((fundo) => {
        const fundoMes = new Date(fundo.mes).getMonth()
        const fundoAno = new Date(fundo.mes).getFullYear()
        return fundoMes === mesAtual && fundoAno === anoAtual
      })

      if (fundoExistente) {
        // Verificar se há saldo suficiente para saídas
        if (movimento.tipo === "saida" && fundoExistente.saldoFinal < movimento.valor) {
          fundoAtualizado = false
          return fundosAnteriores
        }

        // Atualizar fundo existente
        fundoAtualizado = true
        return fundosAnteriores.map((fundo) =>
          fundo.id === fundoExistente.id
            ? {
                ...fundo,
                movimentos: [...fundo.movimentos, novoMovimentoCompleto],
                saldoFinal:
                  fundo.saldoFinal +
                  (novoMovimentoCompleto.tipo === "entrada"
                    ? novoMovimentoCompleto.valor
                    : -novoMovimentoCompleto.valor),
              }
            : fundo,
        )
      } else {
        // Criar novo fundo para o mês
        fundoAtualizado = true
        const novoFundo = {
          id: novoId,
          mes: new Date(anoAtual, mesAtual, 1),
          movimentos: [novoMovimentoCompleto],
          saldoInicial: 0,
          saldoFinal:
            novoMovimentoCompleto.tipo === "entrada" ? novoMovimentoCompleto.valor : -novoMovimentoCompleto.valor,
        }
        return [...fundosAnteriores, novoFundo]
      }
    })

    if (fundoAtualizado) {
      return novoId
    }

    return null
  }

  const addUser = (newUser: Omit<User, "id">) => {
    setUsers((prevUsers) => [...prevUsers, { ...newUser, id: Date.now().toString() }])
  }

  const atualizarFornecedor = (updatedFornecedor: Fornecedor) => {
    setFornecedores((prevFornecedores) =>
      prevFornecedores.map((fornecedor) => (fornecedor.id === updatedFornecedor.id ? updatedFornecedor : fornecedor)),
    )
  }

  const adicionarFornecedor = (fornecedor: Fornecedor) => {
    setFornecedores((prevFornecedores) => [...prevFornecedores, fornecedor])
  }

  const updateUser = (updatedUser: User) => {
    setUsers((prevUsers) => prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
  }

  const deleteUser = (userId: string) => {
    setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId))
  }

  const isAdmin = () => {
    return currentUser?.role === "admin"
  }

  const hasPermission = (permission: string) => {
    if (!currentUser) return false
    if (currentUser.role === "admin") return true

    // Define permissions for regular users
    const userPermissions = [
      "view_pagamentos",
      "view_relatorio_divida",
      "view_relatorio_fornecedor",
      "view_controlo_cheques",
      "view_fundo_maneio",
    ]

    return userPermissions.includes(permission)
  }

  const moverPagamento = (pagamentoId: string, fornecedorOrigemId: string, fornecedorDestinoId: string) => {
    setFornecedores((prev) => {
      const fornecedorOrigem = prev.find((f) => f.id === fornecedorOrigemId)
      const fornecedorDestino = prev.find((f) => f.id === fornecedorDestinoId)

      if (!fornecedorOrigem || !fornecedorDestino) return prev

      const pagamento = fornecedorOrigem.pagamentos.find((p) => p.id === pagamentoId)

      if (!pagamento) return prev

      return prev.map((fornecedor) => {
        if (fornecedor.id === fornecedorOrigemId) {
          return {
            ...fornecedor,
            pagamentos: fornecedor.pagamentos.filter((p) => p.id !== pagamentoId),
          }
        }
        if (fornecedor.id === fornecedorDestinoId) {
          return {
            ...fornecedor,
            pagamentos: [...fornecedor.pagamentos, { ...pagamento, fornecedorId: fornecedorDestinoId }],
          }
        }
        return fornecedor
      })
    })
  }

  // Add the getHistoryForEntity function to the value object
  const value: AppContextType = {
    fornecedores,
    adicionarFornecedor,
    adicionarPagamento,
    atualizarPagamento,
    removerPagamento,
    users,
    addUser,
    updateUser,
    deleteUser,
    currentUser,
    setCurrentUser,
    isAdmin,
    hasPermission,
    moverPagamento,
    getHistoryForEntity,
    adicionarMovimentoFundoManeio,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

