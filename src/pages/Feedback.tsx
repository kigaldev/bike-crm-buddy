import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeedbackForm } from '@/components/FeedbackForm';
import { FeedbackList } from '@/components/FeedbackList';
import { FeedbackStats } from '@/components/FeedbackStats';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquarePlus, List, BarChart3, Filter } from 'lucide-react';

export default function Feedback() {
  const [activeTab, setActiveTab] = useState('enviar');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const { profile } = useAuth();

  const isAdmin = profile?.rol === 'admin';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Feedback</h1>
          <p className="text-muted-foreground">
            Envía sugerencias, reporta problemas y ayúdanos a mejorar la plataforma
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="enviar" className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Enviar Feedback
          </TabsTrigger>
          <TabsTrigger value="mis-feedback" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Mi Feedback
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="administrar" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Administrar
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="enviar" className="space-y-6">
          <FeedbackForm onSuccess={() => setActiveTab('mis-feedback')} />
        </TabsContent>

        <TabsContent value="mis-feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Mi Feedback Enviado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_revision">En Revisión</SelectItem>
                    <SelectItem value="aceptado">Aceptado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                    <SelectItem value="implementado">Implementado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    <SelectItem value="bug">Bug/Error</SelectItem>
                    <SelectItem value="sugerencia">Sugerencia</SelectItem>
                    <SelectItem value="mejora">Mejora</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>

                {(filtroEstado !== 'todos' || filtroTipo !== 'todos') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFiltroEstado('todos');
                      setFiltroTipo('todos');
                    }}
                  >
                    Limpiar Filtros
                  </Button>
                )}
              </div>

              <FeedbackList 
                showAdminActions={false}
                filtroEstado={filtroEstado}
                filtroTipo={filtroTipo}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="administrar" className="space-y-6">
            <FeedbackStats />
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Administrar Feedback
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filtros:</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_revision">En Revisión</SelectItem>
                      <SelectItem value="aceptado">Aceptado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                      <SelectItem value="implementado">Implementado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los tipos</SelectItem>
                      <SelectItem value="bug">Bug/Error</SelectItem>
                      <SelectItem value="sugerencia">Sugerencia</SelectItem>
                      <SelectItem value="mejora">Mejora</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>

                  {(filtroEstado !== 'todos' || filtroTipo !== 'todos') && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFiltroEstado('todos');
                        setFiltroTipo('todos');
                      }}
                    >
                      Limpiar Filtros
                    </Button>
                  )}
                </div>

                <FeedbackList 
                  showAdminActions={true}
                  filtroEstado={filtroEstado}
                  filtroTipo={filtroTipo}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}