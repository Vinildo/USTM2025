"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { useAppContext } from "@/contexts/AppContext"
import { LembreteDocumentos } from "@/components/lembrete-documentos"
import { FileCheck, FileX, Receipt, AlertTriangle } from "lucide-react"

export function DocumentosPendentes() {
  const { fornecedores } = useAppContext()
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<any | null>(null)

  // Obter todos os pagamentos pagos que precisam de documentos
  // Apenas pagamentos com estado "pago" são considerados
  const pagamentosPendentesDocumentos = fornecedores.flatMap((fornecedor) =>
    fornecedor.pagamentos
      .filter(
        (pagamento) =>
          pagamento.estado === "pago" && (pagamento.facturaRecebida !== true || pagamento.reciboRecebido !== true),
      )
      .map((pagamento) => ({
        ...pagamento,
        fornecedorId: fornecedor.id,
        fornecedorNome: fornecedor.nome,
      })),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos Fiscais Pendentes</CardTitle>
        <CardDescription>Pagamentos que necessitam de factura e/ou recibo do fornecedor</CardDescription>
      </CardHeader>
      <CardContent>
        {pagamentosPendentesDocumentos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">Referência</TableHead>
                <TableHead className="font-semibold">Fornecedor</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Data Pagamento</TableHead>
                <TableHead className="font-semibold">Factura</TableHead>
                <TableHead className="font-semibold">Recibo</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagamentosPendentesDocumentos.map((pagamento, index) => (
                <TableRow key={pagamento.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <TableCell className="font-medium">{pagamento.referencia}</TableCell>
                  <TableCell>{pagamento.fornecedorNome}</TableCell>
                  <TableCell>
                    {pagamento.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                  </TableCell>
                  <TableCell>
                    {pagamento.dataPagamento
                      ? format(new Date(pagamento.dataPagamento), "dd/MM/yyyy", { locale: pt })
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {pagamento.facturaRecebida ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <FileCheck className="mr-1 h-4 w-4" />
                        Recebida
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <FileX className="mr-1 h-4 w-4" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {pagamento.reciboRecebido ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Receipt className="mr-1 h-4 w-4" />
                        Recebido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <FileX className="mr-1 h-4 w-4" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setPagamentoSelecionado(pagamento)}>
                      <AlertTriangle className="mr-1 h-4 w-4" />
                      Atualizar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Sem documentos pendentes</h3>
            <p className="mt-1 text-sm text-gray-500">Todos os pagamentos têm os documentos fiscais necessários.</p>
          </div>
        )}

        {pagamentoSelecionado && (
          <LembreteDocumentos
            pagamento={pagamentoSelecionado}
            isOpen={!!pagamentoSelecionado}
            onClose={() => setPagamentoSelecionado(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}

