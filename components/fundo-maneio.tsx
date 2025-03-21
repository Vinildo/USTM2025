"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, addMonths, subMonths } from "date-fns"
import { pt } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { PrintLayout } from "@/components/print-layout"
import { Trash2, Printer, FileDown, ChevronLeft, ChevronRight, FileText } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import * as XLSX from "xlsx"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"

export type Movimento = {
  id: string
  data: Date
  tipo: "entrada" | "saida"
  valor: number
  descricao: string
  pagamentoId?: string // Referência ao pagamento, se aplicável
  pagamentoReferencia?: string // Referência do pagamento, se aplicável
  fornecedorNome?: string // Nome do fornecedor, se aplicável
}

type FundoManeioMensal = {
  id: string
  mes: Date
  movimentos: Movimento[]
  saldoInicial: number
  saldoFinal: number
}

export function FundoManeio() {
  const { user } = useAuth()
  const [fundosManeio, setFundosManeio] = useState<FundoManeioMensal[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<Date>(startOfMonth(new Date()))
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetalhesDialogOpen, setIsDetalhesDialogOpen] = useState(false)
  const [movimentoSelecionado, setMovimentoSelecionado] = useState<Movimento | null>(null)
  const [novoMovimento, setNovoMovimento] = useState<Partial<Movimento>>({
    tipo: "entrada",
  })
  const [saldoInicial, setSaldoInicial] = useState(0)

  useEffect(() => {
    // Carregar dados do localStorage ao iniciar
    const dadosSalvos = localStorage.getItem("fundosManeio")
    if (dadosSalvos) {
      const dados = JSON.parse(dadosSalvos, (key, value) => {
        if (key === "mes" || key === "data") {
          return new Date(value)
        }
        return value
      })
      setFundosManeio(dados)
    }
  }, [])

  useEffect(() => {
    // Salvar dados no localStorage sempre que fundosManeio for atualizado
    localStorage.setItem("fundosManeio", JSON.stringify(fundosManeio))
  }, [fundosManeio])

  const fundoManeioAtual = fundosManeio.find(
    (fundo) => format(fundo.mes, "yyyy-MM") === format(mesSelecionado, "yyyy-MM"),
  )

  const handleAddMovimento = () => {
    if (!novoMovimento.tipo || !novoMovimento.valor) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o tipo e o valor do movimento.",
        variant: "destructive",
      })
      return
    }

    // Usar valores padrão para campos não preenchidos
    const data = novoMovimento.data || new Date()
    const descricao = novoMovimento.descricao || "Movimento manual"

    const novoId = Date.now().toString()
    const novoMovimentoCompleto: Movimento = {
      id: novoId,
      data: data,
      tipo: novoMovimento.tipo,
      valor: novoMovimento.valor,
      descricao: descricao,
    }

    setFundosManeio((fundosAnteriores) => {
      const fundoExistente = fundosAnteriores.find(
        (fundo) => format(fundo.mes, "yyyy-MM") === format(mesSelecionado, "yyyy-MM"),
      )

      if (fundoExistente) {
        // Atualizar fundo existente
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
        const novoFundo: FundoManeioMensal = {
          id: novoId,
          mes: startOfMonth(mesSelecionado),
          movimentos: [novoMovimentoCompleto],
          saldoInicial: saldoInicial,
          saldoFinal:
            saldoInicial +
            (novoMovimentoCompleto.tipo === "entrada" ? novoMovimentoCompleto.valor : -novoMovimentoCompleto.valor),
        }
        return [...fundosAnteriores, novoFundo]
      }
    })

    setIsAddDialogOpen(false)
    setNovoMovimento({ tipo: "entrada" })
    setSaldoInicial(0)
    toast({
      title: "Movimento adicionado",
      description: "O novo movimento foi adicionado com sucesso.",
    })

    return novoId
  }

  const adicionarMovimentoFundoManeio = (movimento: Partial<Movimento>): string | null => {
    if (!movimento.data || !movimento.tipo || !movimento.valor || !movimento.descricao) {
      toast({
        title: "Erro",
        description: "Dados incompletos para adicionar movimento ao fundo de maneio.",
        variant: "destructive",
      })
      return null
    }

    const novoId = Date.now().toString()
    const novoMovimentoCompleto: Movimento = {
      id: novoId,
      data: movimento.data,
      tipo: movimento.tipo,
      valor: movimento.valor,
      descricao: movimento.descricao,
      pagamentoId: movimento.pagamentoId,
      pagamentoReferencia: movimento.pagamentoReferencia,
      fornecedorNome: movimento.fornecedorNome,
    }

    let fundoAtualizado = false

    setFundosManeio((fundosAnteriores) => {
      const fundoExistente = fundosAnteriores.find(
        (fundo) => format(fundo.mes, "yyyy-MM") === format(movimento.data, "yyyy-MM"),
      )

      if (fundoExistente) {
        // Verificar se há saldo suficiente para saídas
        if (movimento.tipo === "saida" && fundoExistente.saldoFinal < movimento.valor) {
          toast({
            title: "Erro",
            description: "Saldo insuficiente no fundo de maneio para realizar este pagamento.",
            variant: "destructive",
          })
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
        // Para saídas, verificar se há saldo inicial
        if (movimento.tipo === "saida" && saldoInicial < movimento.valor) {
          toast({
            title: "Erro",
            description: "Saldo inicial insuficiente para realizar este pagamento.",
            variant: "destructive",
          })
          fundoAtualizado = false
          return fundosAnteriores
        }

        fundoAtualizado = true
        const novoFundo: FundoManeioMensal = {
          id: novoId,
          mes: startOfMonth(movimento.data),
          movimentos: [novoMovimentoCompleto],
          saldoInicial: saldoInicial,
          saldoFinal:
            saldoInicial +
            (novoMovimentoCompleto.tipo === "entrada" ? novoMovimentoCompleto.valor : -novoMovimentoCompleto.valor),
        }
        return [...fundosAnteriores, novoFundo]
      }
    })

    if (fundoAtualizado) {
      toast({
        title: "Movimento adicionado",
        description: "O movimento foi adicionado ao fundo de maneio com sucesso.",
      })
      return novoId
    }

    return null
  }

  const handleDeleteMovimento = (movimentoId: string) => {
    setFundosManeio((fundosAnteriores) =>
      fundosAnteriores.map((fundo) => {
        if (format(fundo.mes, "yyyy-MM") === format(mesSelecionado, "yyyy-MM")) {
          const movimentoRemovido = fundo.movimentos.find((m) => m.id === movimentoId)
          const novosMovimentos = fundo.movimentos.filter((m) => m.id !== movimentoId)
          const novoSaldoFinal = movimentoRemovido
            ? fundo.saldoFinal -
              (movimentoRemovido.tipo === "entrada" ? movimentoRemovido.valor : -movimentoRemovido.valor)
            : fundo.saldoFinal

          return {
            ...fundo,
            movimentos: novosMovimentos,
            saldoFinal: novoSaldoFinal,
          }
        }
        return fundo
      }),
    )

    toast({
      title: "Movimento eliminado",
      description: "O movimento foi removido com sucesso.",
    })
  }

  const calcularSaldo = () => {
    if (!fundoManeioAtual) return 0
    return fundoManeioAtual.saldoFinal
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.text(`Fundo de Maneio - ${format(mesSelecionado, "MMMM yyyy", { locale: pt })}`, 14, 15)

    // @ts-ignore
    doc.autoTable({
      head: [["Data", "Tipo", "Valor", "Descrição"]],
      body:
        fundoManeioAtual?.movimentos.map((movimento) => [
          format(movimento.data, "dd/MM/yyyy", { locale: pt }),
          movimento.tipo === "entrada" ? "Entrada" : "Saída",
          `${movimento.valor.toFixed(2)} MZN`,
          movimento.descricao,
        ]) || [],
    })

    // Adicionar informações do usuário e espaço para assinatura
    const pageHeight = doc.internal.pageSize.height
    doc.text(`Preparado por: ${user?.fullName || "N/A"}`, 14, pageHeight - 50)
    doc.text("Assinatura: ____________________", 14, pageHeight - 40)
    doc.text(`Data: ${format(new Date(), "dd/MM/yyyy", { locale: pt })}`, 14, pageHeight - 30)

    doc.save(`fundo-maneio-${format(mesSelecionado, "yyyy-MM")}.pdf`)
  }

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      fundoManeioAtual?.movimentos.map((movimento) => ({
        Data: format(movimento.data, "dd/MM/yyyy", { locale: pt }),
        Tipo: movimento.tipo === "entrada" ? "Entrada" : "Saída",
        Valor: movimento.valor,
        Descrição: movimento.descricao,
      })) || [],
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Movimentos")

    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = window.URL.createObjectURL(data)
    const link = document.createElement("a")
    link.href = url
    link.download = `fundo-maneio-${format(mesSelecionado, "yyyy-MM")}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleMesAnterior = () => {
    setMesSelecionado((mesAtual) => subMonths(mesAtual, 1))
  }

  const handleProximoMes = () => {
    setMesSelecionado((mesAtual) => addMonths(mesAtual, 1))
  }

  const handleTransportarSaldo = () => {
    const mesAtual = fundoManeioAtual
    if (!mesAtual) {
      toast({
        title: "Erro",
        description: "Não há fundo de maneio para o mês atual.",
        variant: "destructive",
      })
      return
    }

    const proximoMes = addMonths(mesSelecionado, 1)
    const fundoProximoMes = fundosManeio.find((fundo) => format(fundo.mes, "yyyy-MM") === format(proximoMes, "yyyy-MM"))

    if (fundoProximoMes) {
      toast({
        title: "Erro",
        description: "Já existe um fundo de maneio para o próximo mês.",
        variant: "destructive",
      })
      return
    }

    const novoFundoProximoMes: FundoManeioMensal = {
      id: Date.now().toString(),
      mes: startOfMonth(proximoMes),
      movimentos: [],
      saldoInicial: mesAtual.saldoFinal,
      saldoFinal: mesAtual.saldoFinal,
    }

    setFundosManeio((fundosAnteriores) => [...fundosAnteriores, novoFundoProximoMes])
    setMesSelecionado(proximoMes)

    toast({
      title: "Saldo transportado",
      description: `O saldo de ${mesAtual.saldoFinal.toFixed(2)} MZN foi transportado para ${format(
        proximoMes,
        "MMMM yyyy",
        {
          locale: pt,
        },
      )}.`,
    })
  }

  const handleVerDetalhes = (movimento: Movimento) => {
    setMovimentoSelecionado(movimento)
    setIsDetalhesDialogOpen(true)
  }

  return (
    <PrintLayout title="Fundo de Maneio">
      <Card>
        <CardHeader className="bg-red-700 text-white">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Fundo de Maneio</CardTitle>
              <CardDescription className="text-red-100">Gerencie os movimentos do fundo de maneio</CardDescription>
            </div>
            <div className="space-x-2">
              <Button onClick={handlePrint} className="print:hidden bg-red-600 text-white hover:bg-red-500">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handleExportPDF} className="print:hidden bg-red-600 text-white hover:bg-red-500">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={handleExportExcel} className="print:hidden bg-red-600 text-white hover:bg-red-500">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Button onClick={handleMesAnterior}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold">{format(mesSelecionado, "MMMM yyyy", { locale: pt })}</span>
              <Button onClick={handleProximoMes}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-x-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Adicionar Movimento</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Adicionar Novo Movimento</DialogTitle>
                    <DialogDescription>Preencha os detalhes do novo movimento</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="data" className="text-sm font-medium mb-2 block">
                          Data (opcional)
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                              {novoMovimento.data ? (
                                format(novoMovimento.data, "dd/MM/yyyy", { locale: pt })
                              ) : (
                                <span>Data atual</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={novoMovimento.data}
                              onSelect={(date) => setNovoMovimento({ ...novoMovimento, data: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="tipo" className="text-sm font-medium mb-2 block">
                          Tipo <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={novoMovimento.tipo}
                          onValueChange={(value) =>
                            setNovoMovimento({ ...novoMovimento, tipo: value as "entrada" | "saida" })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="saida">Saída</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="valor" className="text-sm font-medium mb-2 block">
                          Valor <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="valor"
                          type="number"
                          value={novoMovimento.valor || ""}
                          onChange={(e) => setNovoMovimento({ ...novoMovimento, valor: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label htmlFor="descricao" className="text-sm font-medium mb-2 block">
                          Descrição (opcional)
                        </Label>
                        <Input
                          id="descricao"
                          value={novoMovimento.descricao || ""}
                          onChange={(e) => setNovoMovimento({ ...novoMovimento, descricao: e.target.value })}
                          className="w-full"
                          placeholder="Descrição do movimento"
                        />
                      </div>
                      {!fundoManeioAtual && (
                        <div>
                          <Label htmlFor="saldoInicial" className="text-sm font-medium mb-2 block">
                            Saldo Inicial
                          </Label>
                          <Input
                            id="saldoInicial"
                            type="number"
                            value={saldoInicial}
                            onChange={(e) => setSaldoInicial(Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                      <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-md border border-gray-200">
                        <p>
                          <span className="text-red-500">*</span> Campos obrigatórios
                        </p>
                        <p className="mt-1">Se a data não for especificada, será usada a data atual.</p>
                        <p className="mt-1">Se a descrição não for fornecida, será usado um texto padrão.</p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddMovimento}>Adicionar Movimento</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={handleTransportarSaldo}>Transportar Saldo</Button>
            </div>
          </div>
          <div className="text-2xl font-bold mb-4">Saldo Atual: {calcularSaldo().toFixed(2)} MZN</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Origem</TableHead>
                <TableHead className="font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fundoManeioAtual?.movimentos.map((movimento, index) => (
                <TableRow key={movimento.id}>
                  <TableCell>{format(movimento.data, "dd/MM/yyyy", { locale: pt })}</TableCell>
                  <TableCell>{movimento.tipo === "entrada" ? "Entrada" : "Saída"}</TableCell>
                  <TableCell>{movimento.valor.toFixed(2)} MZN</TableCell>
                  <TableCell>{movimento.descricao}</TableCell>
                  <TableCell>
                    {movimento.pagamentoId ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Pagamento
                      </Badge>
                    ) : (
                      "Manual"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {movimento.pagamentoId ? (
                        <Button variant="outline" size="sm" onClick={() => handleVerDetalhes(movimento)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteMovimento(movimento.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Diálogo de detalhes do movimento */}
          <Dialog open={isDetalhesDialogOpen} onOpenChange={setIsDetalhesDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Detalhes do Movimento</DialogTitle>
                <DialogDescription>Informações sobre o movimento relacionado a um pagamento</DialogDescription>
              </DialogHeader>
              {movimentoSelecionado && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-semibold">Data:</Label>
                    <div className="col-span-3">{format(movimentoSelecionado.data, "dd/MM/yyyy", { locale: pt })}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-semibold">Tipo:</Label>
                    <div className="col-span-3">{movimentoSelecionado.tipo === "entrada" ? "Entrada" : "Saída"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-semibold">Valor:</Label>
                    <div className="col-span-3">{movimentoSelecionado.valor.toFixed(2)} MZN</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-semibold">Descrição:</Label>
                    <div className="col-span-3">{movimentoSelecionado.descricao}</div>
                  </div>
                  {movimentoSelecionado.pagamentoId && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-semibold">Pagamento:</Label>
                        <div className="col-span-3">{movimentoSelecionado.pagamentoReferencia}</div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-semibold">Fornecedor:</Label>
                        <div className="col-span-3">{movimentoSelecionado.fornecedorNome}</div>
                      </div>
                    </>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setIsDetalhesDialogOpen(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Adicione esta seção no final do CardContent */}
          <div className="mt-8 print:block hidden">
            <div className="flex justify-between items-center">
              <div>
                <p>Preparado por: {user?.fullName || "N/A"}</p>
                <p>Data: {format(new Date(), "dd/MM/yyyy", { locale: pt })}</p>
              </div>
              <div>
                <p>Assinatura: ____________________</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PrintLayout>
  )
}

