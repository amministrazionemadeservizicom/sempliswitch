import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  FileText,
  Calendar,
  Activity,
  RefreshCw,
  Filter
} from "lucide-react";
import { adminApi } from "../utils/admin-api";
import { Contract, ContractStatus, StatusColors } from "../types/contracts";

interface ProcessingStats {
  totalContracts: number;
  byStatus: { [key in ContractStatus]: number };
  avgProcessingTime: number;
  completionRate: number;
  todayProcessed: number;
  pendingReview: number;
}

interface DailyStats {
  date: string;
  processed: number;
  pending: number;
  completed: number;
}

export default function Processing() {
  const { userRole } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("7"); // days
  const [refreshing, setRefreshing] = useState(false);

  // Check access permissions
  const hasAccess = userRole === 'admin' || userRole === 'backoffice' || userRole === 'master';

  const loadData = async () => {
    if (!hasAccess) return;
    
    try {
      setRefreshing(true);
      const contractsData = await adminApi.getAllContracts();
      setContracts(contractsData);
      
      // Calculate processing statistics
      const totalContracts = contractsData.length;
      const byStatus = contractsData.reduce((acc, contract) => {
        acc[contract.statoOfferta] = (acc[contract.statoOfferta] || 0) + 1;
        return acc;
      }, {} as { [key in ContractStatus]: number });

      // Calculate completion rate (contracts that reached final states)
      const finalStates: ContractStatus[] = ['Pagato', 'Inserimento OK', 'Inserimento KO', 'Annullato'];
      const completedContracts = contractsData.filter(c => finalStates.includes(c.statoOfferta)).length;
      const completionRate = totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0;

      // Today's processing
      const today = new Date().toISOString().split('T')[0];
      const todayProcessed = contractsData.filter(c => {
        const contractDate = new Date(c.dataCreazione).toISOString().split('T')[0];
        return contractDate === today;
      }).length;

      // Pending review (contracts requiring action)
      const pendingStates: ContractStatus[] = ['Caricato', 'Documenti KO', 'Integrazione'];
      const pendingReview = contractsData.filter(c => pendingStates.includes(c.statoOfferta)).length;

      setStats({
        totalContracts,
        byStatus,
        avgProcessingTime: 2.5, // Mock average days
        completionRate,
        todayProcessed,
        pendingReview
      });

      // Generate daily stats for the chart
      const days = parseInt(timeFilter);
      const dailyData: DailyStats[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayContracts = contractsData.filter(c => {
          const contractDate = new Date(c.dataCreazione).toISOString().split('T')[0];
          return contractDate === dateStr;
        });

        dailyData.push({
          date: dateStr,
          processed: dayContracts.filter(c => c.statoOfferta !== 'Caricato').length,
          pending: dayContracts.filter(c => pendingStates.includes(c.statoOfferta)).length,
          completed: dayContracts.filter(c => finalStates.includes(c.statoOfferta)).length
        });
      }
      
      setDailyStats(dailyData);
      
    } catch (error) {
      console.error('Error loading processing data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFilter, hasAccess]);

  if (!hasAccess) {
    return (
      <AppLayout userRole={userRole || 'consulente'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Accesso Negato</h1>
            <p className="text-gray-600">Non hai i permessi per visualizzare lo stato di lavorazione.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout userRole={userRole || 'consulente'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-500" />
            <p>Caricamento dati di lavorazione...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getStatusIcon = (status: ContractStatus) => {
    switch (status) {
      case 'Caricato': return <FileText className="h-4 w-4" />;
      case 'In Lavorazione': return <Clock className="h-4 w-4" />;
      case 'Documenti OK': return <CheckCircle className="h-4 w-4" />;
      case 'Documenti KO': return <AlertTriangle className="h-4 w-4" />;
      case 'Integrazione': return <RefreshCw className="h-4 w-4" />;
      case 'Inserimento OK': return <CheckCircle className="h-4 w-4" />;
      case 'Inserimento KO': return <AlertTriangle className="h-4 w-4" />;
      case 'Pagato': return <CheckCircle className="h-4 w-4" />;
      case 'Stornato': return <TrendingDown className="h-4 w-4" />;
      case 'Annullato': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout userRole={userRole || 'consulente'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stato Lavorazione</h1>
            <p className="text-gray-600">Monitoraggio e analytics del processo di lavorazione contratti</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 giorni</SelectItem>
                <SelectItem value="14">14 giorni</SelectItem>
                <SelectItem value="30">30 giorni</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={loadData} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contratti Totali</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalContracts || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Attesa Revisione</p>
                  <p className="text-2xl font-bold text-orange-900">{stats?.pendingReview || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processati Oggi</p>
                  <p className="text-2xl font-bold text-green-900">{stats?.todayProcessed || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tasso Completamento</p>
                  <p className="text-2xl font-bold text-purple-900">{stats?.completionRate.toFixed(1) || 0}%</p>
                  <Progress value={stats?.completionRate || 0} className="h-2 mt-2" />
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Pipeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Pipeline di Lavorazione
            </CardTitle>
            <CardDescription>
              Distribuzione dei contratti per stato di lavorazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(stats?.byStatus || {}).map(([status, count]) => {
                const statusKey = status as ContractStatus;
                const colors = StatusColors[statusKey];
                const percentage = stats ? ((count / stats.totalContracts) * 100).toFixed(1) : '0';
                
                return (
                  <div key={status} className={`p-4 rounded-lg border ${colors?.border || 'border-gray-200'} ${colors?.bg || 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(statusKey)}
                        <span className={`text-sm font-medium ${colors?.text || 'text-gray-800'}`}>
                          {status}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-2xl font-bold ${colors?.text || 'text-gray-900'}`}>{count}</p>
                      <p className={`text-xs ${colors?.text || 'text-gray-600'}`}>{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily Processing Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Andamento Giornaliero
            </CardTitle>
            <CardDescription>
              Contratti processati negli ultimi {timeFilter} giorni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyStats.map((day, index) => {
                const maxValue = Math.max(...dailyStats.map(d => d.processed + d.pending + d.completed));
                const date = new Date(day.date);
                const isToday = day.date === new Date().toISOString().split('T')[0];
                
                return (
                  <div key={day.date} className={`p-4 rounded-lg ${isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        {date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {isToday && <Badge variant="secondary" className="ml-2">Oggi</Badge>}
                      </span>
                      <span className="text-xs text-gray-500">
                        Tot: {day.processed + day.pending + day.completed}
                      </span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div 
                        className="bg-green-500 rounded-l" 
                        style={{ width: `${maxValue > 0 ? (day.completed / maxValue) * 100 : 0}%` }}
                        title={`Completati: ${day.completed}`}
                      />
                      <div 
                        className="bg-blue-500" 
                        style={{ width: `${maxValue > 0 ? (day.processed / maxValue) * 100 : 0}%` }}
                        title={`Processati: ${day.processed}`}
                      />
                      <div 
                        className="bg-orange-500 rounded-r" 
                        style={{ width: `${maxValue > 0 ? (day.pending / maxValue) * 100 : 0}%` }}
                        title={`In attesa: ${day.pending}`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Completati: {day.completed}</span>
                      <span>Processati: {day.processed}</span>
                      <span>In attesa: {day.pending}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
