import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Fuel, 
  Phone, 
  Euro,
  TrendingUp,
  Calculator,
  Target
} from "lucide-react";

interface CommissionPlan {
  luce: number;
  gas: number;
  telefonia: number;
}

interface MonthlyCommissionData {
  month: number;
  year: number;
  contracts: {
    luce: number;
    gas: number;
    telefonia: number;
  };
  commissionPlan: CommissionPlan;
}

interface MonthlyCommissionWidgetProps {
  data: MonthlyCommissionData;
  target?: number; // Monthly target
}

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const SERVICE_CONFIG = [
  {
    key: 'luce' as const,
    label: 'Luce',
    icon: Zap,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100',
    textColor: 'text-blue-700'
  },
  {
    key: 'gas' as const,
    label: 'Gas',
    icon: Fuel,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-100',
    textColor: 'text-amber-700'
  },
  {
    key: 'telefonia' as const,
    label: 'Telefonia',
    icon: Phone,
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    textColor: 'text-green-700'
  }
];

export default function MonthlyCommissionWidget({ data, target = 2000 }: MonthlyCommissionWidgetProps) {
  const calculations = useMemo(() => {
    const services = SERVICE_CONFIG.map(service => {
      const contractCount = data.contracts[service.key];
      const rate = data.commissionPlan[service.key];
      const total = contractCount * rate;
      
      return {
        ...service,
        contractCount,
        rate,
        total
      };
    });

    const totalCommission = services.reduce((sum, service) => sum + service.total, 0);
    const totalContracts = services.reduce((sum, service) => sum + service.contractCount, 0);
    const avgPerContract = totalContracts > 0 ? totalCommission / totalContracts : 0;
    const targetProgress = (totalCommission / target) * 100;

    return {
      services,
      totalCommission,
      totalContracts,
      avgPerContract,
      targetProgress,
      monthName: MONTHS[data.month]
    };
  }, [data, target]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-600" />
              Calcolo Provvigioni
            </CardTitle>
            <CardDescription>
              {calculations.monthName} {data.year} - Piano Compensi Personale
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {calculations.totalContracts} contratti
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Totale Mese</p>
                <p className="text-2xl font-bold text-green-900">€{calculations.totalCommission}</p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Media Contratto</p>
                <p className="text-2xl font-bold text-blue-900">€{Math.round(calculations.avgPerContract)}</p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Obiettivo</p>
                <p className="text-lg font-bold text-purple-900">{Math.round(calculations.targetProgress)}%</p>
                <Progress value={calculations.targetProgress} className="h-2 mt-1" />
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dettaglio per Servizio
          </h4>
          
          {calculations.services.map((service) => {
            const Icon = service.icon;
            const percentage = calculations.totalCommission > 0 
              ? (service.total / calculations.totalCommission) * 100 
              : 0;
              
            return (
              <div key={service.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${service.lightColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${service.textColor}`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{service.label}</div>
                    <div className="text-sm text-gray-500">
                      {service.contractCount} contratti × €{service.rate}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">€{service.total}</div>
                  <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Commission Plan Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-3">Piano Compensi Attuale</h5>
          <div className="grid grid-cols-3 gap-4 text-center">
            {SERVICE_CONFIG.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.key} className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 ${service.lightColor} rounded-full flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${service.textColor}`} />
                  </div>
                  <div className="text-sm font-medium text-gray-900">{service.label}</div>
                  <div className="text-sm font-bold text-gray-700">€{data.commissionPlan[service.key]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Target Progress */}
        {target > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-700">Progresso Obiettivo Mensile</span>
              <span className="text-sm font-bold text-indigo-900">€{calculations.totalCommission} / €{target}</span>
            </div>
            <Progress value={calculations.targetProgress} className="h-3" />
            <div className="mt-2 text-xs text-indigo-600">
              {calculations.targetProgress >= 100 
                ? "🎉 Obiettivo raggiunto!" 
                : `Mancano €${target - calculations.totalCommission} all'obiettivo`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
