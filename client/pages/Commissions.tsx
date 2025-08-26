import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import MonthYearSelector from "@/components/MonthYearSelector";
import MonthlyCommissionWidget from "@/components/MonthlyCommissionWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { getCommissionData } from "@/utils/commission-api";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Users,
  Euro,
  Building2,
  User
} from "lucide-react";

interface UserCommissionSummary {
  userId: string;
  userName: string;
  planName: string;
  monthlyData: {
    month: number;
    year: number;
    contracts: {
      luce: number;
      gas: number;
      telefonia: number;
    };
    commissionPlan: {
      luce: number;
      gas: number;
      telefonia: number;
    };
  };
  comparisons: {
    previousMonth: {
      commission: number;
      percentage: number;
    };
    sameMonthLastYear: {
      commission: number;
      percentage: number;
    };
  };
  contractsByProvider: {
    [provider: string]: {
      luce: number;
      gas: number;
      telefonia: number;
      totalCommission: number;
    };
  };
}

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function Commissions() {
  const { userRole, userData } = useAuth();
  const currentDate = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  });
  const [commissionData, setCommissionData] = useState<{
    currentUser?: UserCommissionSummary;
    allUsers?: UserCommissionSummary[];
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCommissionData = async () => {
      if (!userRole || !userData?.uid) return;
      
      setLoading(true);
      try {
        const data = await getCommissionData(
          userRole, 
          userData.uid, 
          selectedPeriod.month, 
          selectedPeriod.year
        );
        setCommissionData(data);
      } catch (error) {
        console.error('Error loading commission data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCommissionData();
  }, [userRole, userData?.uid, selectedPeriod]);

  const handlePeriodChange = (newPeriod: { month: number; year: number }) => {
    setSelectedPeriod(newPeriod);
  };

  const calculateTotalCommission = (summary: UserCommissionSummary): number => {
    const { contracts, commissionPlan } = summary.monthlyData;
    return (contracts.luce * commissionPlan.luce) +
           (contracts.gas * commissionPlan.gas) +
           (contracts.telefonia * commissionPlan.telefonia);
  };

  const getTotalContracts = (summary: UserCommissionSummary): number => {
    const { contracts } = summary.monthlyData;
    return contracts.luce + contracts.gas + contracts.telefonia;
  };

  // Determine user role access
  const hasCommissionAccess = userRole === 'admin' || userRole === 'consulente' || userRole === 'master';
  
  if (!hasCommissionAccess) {
    return (
      <AppLayout userRole={userRole || 'consulente'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Accesso Negato</h1>
            <p className="text-gray-600">Non hai i permessi per visualizzare le provvigioni.</p>
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
            <p>Caricamento dati provvigioni...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userRole={userRole || 'consulente'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Month/Year Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Provvigioni</h1>
            <p className="text-gray-600">
              {userRole === 'admin' 
                ? 'Riepilogo provvigioni di tutti gli utenti' 
                : 'Riepilogo delle tue provvigioni'}
            </p>
          </div>
          <MonthYearSelector 
            value={selectedPeriod}
            onChange={handlePeriodChange}
          />
        </div>

        {/* Admin View - All Users */}
        {userRole === 'admin' && commissionData.allUsers && (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Totale Sistema</p>
                      <p className="text-2xl font-bold text-green-900">
                        €{commissionData.allUsers.reduce((sum, user) => sum + calculateTotalCommission(user), 0)}
                      </p>
                    </div>
                    <Euro className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Consulenti Attivi</p>
                      <p className="text-2xl font-bold text-blue-900">{commissionData.allUsers.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Contratti Totali</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {commissionData.allUsers.reduce((sum, user) => sum + getTotalContracts(user), 0)}
                      </p>
                    </div>
                    <Coins className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Dettaglio per Consulente
                </CardTitle>
                <CardDescription>
                  {MONTHS[selectedPeriod.month]} {selectedPeriod.year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consulente</TableHead>
                      <TableHead>Piano Compensi</TableHead>
                      <TableHead>Contratti</TableHead>
                      <TableHead>Provvigioni</TableHead>
                      <TableHead>vs Mese Prec.</TableHead>
                      <TableHead>vs Anno Prec.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionData.allUsers.map((user) => {
                      const totalCommission = calculateTotalCommission(user);
                      const totalContracts = getTotalContracts(user);
                      const prevMonthClass = user.comparisons.previousMonth.percentage >= 0 ? 'text-green-600' : 'text-red-600';
                      const lastYearClass = user.comparisons.sameMonthLastYear.percentage >= 0 ? 'text-green-600' : 'text-red-600';
                      
                      return (
                        <TableRow key={user.userId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{user.userName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.planName}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Luce: {user.monthlyData.contracts.luce}</div>
                              <div>Gas: {user.monthlyData.contracts.gas}</div>
                              <div>Tel: {user.monthlyData.contracts.telefonia}</div>
                              <div className="font-medium">Tot: {totalContracts}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">€{totalCommission}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {user.comparisons.previousMonth.percentage >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                              )}
                              <span className={`text-xs ${prevMonthClass}`}>
                                {user.comparisons.previousMonth.percentage >= 0 ? '+' : ''}
                                {user.comparisons.previousMonth.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {user.comparisons.sameMonthLastYear.percentage >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                              )}
                              <span className={`text-xs ${lastYearClass}`}>
                                {user.comparisons.sameMonthLastYear.percentage >= 0 ? '+' : ''}
                                {user.comparisons.sameMonthLastYear.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Consultant/Master View - Personal Data */}
        {(userRole === 'consulente' || userRole === 'master') && commissionData.currentUser && (
          <div className="space-y-6">
            {/* Monthly Commission Widget */}
            <MonthlyCommissionWidget
              data={commissionData.currentUser.monthlyData}
              comparisons={commissionData.currentUser.comparisons}
              commissionPlanName={commissionData.currentUser.planName}
            />

            {/* Contracts by Provider */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dettaglio per Gestore
                </CardTitle>
                <CardDescription>
                  Contratti suddivisi per provider - {MONTHS[selectedPeriod.month]} {selectedPeriod.year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(commissionData.currentUser.contractsByProvider).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gestore</TableHead>
                        <TableHead>Luce</TableHead>
                        <TableHead>Gas</TableHead>
                        <TableHead>Telefonia</TableHead>
                        <TableHead>Totale Contratti</TableHead>
                        <TableHead>Provvigioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(commissionData.currentUser.contractsByProvider).map(([provider, data]) => {
                        const totalContracts = data.luce + data.gas + data.telefonia;
                        
                        return (
                          <TableRow key={provider}>
                            <TableCell className="font-medium">{provider}</TableCell>
                            <TableCell>{data.luce}</TableCell>
                            <TableCell>{data.gas}</TableCell>
                            <TableCell>{data.telefonia}</TableCell>
                            <TableCell className="font-medium">{totalContracts}</TableCell>
                            <TableCell className="font-bold">€{data.totalCommission}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun contratto per il periodo selezionato</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* No data message */}
        {!commissionData.currentUser && !commissionData.allUsers && (
          <Card>
            <CardContent className="text-center py-8">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun dato disponibile</h3>
              <p className="text-gray-500">
                Non ci sono dati di provvigioni per il periodo selezionato.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
