import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import MonthYearSelector from "@/components/MonthYearSelector";
import MonthlyCommissionWidget from "@/components/MonthlyCommissionWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  FileText,
  Euro,
  Calculator,
  History
} from "lucide-react";

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function Commissions() {
  const currentDate = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  });

  // Personal commission plan
  const commissionPlan = {
    luce: 30,
    gas: 25,
    telefonia: 15
  };

  // Mock data that changes based on selected period
  const getCommissionData = (month: number, year: number) => {
    const monthName = MONTHS[month];

    // Simulate different contract counts for different months
    const baseContracts = 8 + (month % 4);
    const contracts = {
      luce: baseContracts + Math.floor(month / 3),
      gas: Math.max(1, baseContracts - 2 + (month % 2)),
      telefonia: Math.max(1, Math.floor(baseContracts / 2) + (month % 3))
    };

    const totalCommission =
      (contracts.luce * commissionPlan.luce) +
      (contracts.gas * commissionPlan.gas) +
      (contracts.telefonia * commissionPlan.telefonia);

    const totalPractices = contracts.luce + contracts.gas + contracts.telefonia;

    return {
      monthName,
      contracts,
      commissionPlan,
      totalCommission,
      practicesCount: totalPractices,
      avgCommissionPerPractice: Math.round(totalCommission / totalPractices),
      lightCommission: contracts.luce * commissionPlan.luce,
      gasCommission: contracts.gas * commissionPlan.gas,
      phoneCommission: contracts.telefonia * commissionPlan.telefonia,
      trend: month % 2 === 0 ? 'up' : 'down',
      trendPercentage: 5 + (month % 3) * 3
    };
  };

  const data = getCommissionData(selectedPeriod.month, selectedPeriod.year);

  const handlePeriodChange = (newPeriod: { month: number; year: number }) => {
    setSelectedPeriod(newPeriod);
  };

  return (
    <AppLayout userRole="consulente">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Month/Year Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Provvigioni</h1>
            <p className="text-gray-600">Riepilogo delle tue provvigioni</p>
          </div>
          <MonthYearSelector 
            value={selectedPeriod}
            onChange={handlePeriodChange}
          />
        </div>

        {/* Monthly Commission Calculator Widget */}
        <div className="mb-8">
          <MonthlyCommissionWidget
            data={{
              month: selectedPeriod.month,
              year: selectedPeriod.year,
              contracts: data.contracts,
              commissionPlan: data.commissionPlan
            }}
            target={2000}
          />
        </div>

        {/* Historical Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Panoramica Storica
            </CardTitle>
            <CardDescription>
              Andamento delle provvigioni negli ultimi mesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Anno Corrente</p>
                <p className="text-xl font-bold text-gray-900">€{(data.totalCommission * 8).toLocaleString()}</p>
                <p className="text-xs text-gray-500">8 mesi</p>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700">Mese Migliore</p>
                <p className="text-xl font-bold text-blue-900">€{Math.max(data.totalCommission, 2150)}</p>
                <p className="text-xs text-blue-600">Giugno 2024</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-700">Media Mensile</p>
                <p className="text-xl font-bold text-green-900">€{Math.round(data.totalCommission * 0.85)}</p>
                <p className="text-xs text-green-600">Ultimi 6 mesi</p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-700">Trend</p>
                <div className="flex items-center justify-center gap-1">
                  {data.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-lg font-bold ${data.trend === 'up' ? 'text-green-900' : 'text-red-900'}`}>
                    +{data.trendPercentage}%
                  </span>
                </div>
                <p className="text-xs text-purple-600">vs mese precedente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
