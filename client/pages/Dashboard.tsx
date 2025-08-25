import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Euro,
  Target,
  TrendingUp,
  Calendar,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import MonthYearSelector from "@/components/MonthYearSelector";
import MonthlyCommissionWidget from "@/components/MonthlyCommissionWidget";
import ConsultantCommissionWidget from "@/components/ConsultantCommissionWidget";
import ContractStatsWidget from "@/components/ContractStatsWidget";

interface DashboardProps {
  userRole?: string;
}

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function Dashboard({ userRole = "consulente" }: DashboardProps) {
  const currentDate = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  });

  const handlePeriodChange = (newPeriod: { month: number; year: number }) => {
    setSelectedPeriod(newPeriod);
    console.log('Dashboard data updated for:', newPeriod);
  };

  // Commission data for the selected period
  const getCommissionData = (month: number, year: number) => {
    const baseContracts = 6 + (month % 3);
    return {
      month,
      year,
      contracts: {
        luce: baseContracts + Math.floor(month / 4),
        gas: Math.max(1, baseContracts - 1 + (month % 2)),
        telefonia: Math.max(1, Math.floor(baseContracts / 2) + (month % 2))
      },
      commissionPlan: {
        luce: 30,
        gas: 25,
        telefonia: 15
      }
    };
  };

  const commissionData = getCommissionData(selectedPeriod.month, selectedPeriod.year);

  // Mock data for various stats
  const statsData = {
    totalContracts: 127 + selectedPeriod.month * 5,
    todayContracts: 3 + (selectedPeriod.month % 3),
    yesterdayContracts: 2 + (selectedPeriod.month % 2),
    completedContracts: 95 + selectedPeriod.month * 3,
    pendingContracts: 23 + selectedPeriod.month * 2,
    toSignContracts: 9 + (selectedPeriod.month % 4),
    consultantActive: 18,
    consultantTotal: 24,
    boProcessing: 12,
    boTotal: 15,
    offerAccepted: 78,
    offerTotal: 100
  };

  const CustomCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div 
      className={`bg-gray-50 rounded-2xl shadow-sm border border-gray-100 ${className}`}
      style={{ 
        backgroundColor: '#FAFAFA',
        boxShadow: '0px 2px 6px rgba(0,0,0,0.1)',
        borderRadius: '16px'
      }}
    >
      {children}
    </div>
  );

  return (
    <AppLayout userRole={userRole}>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Period Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Panoramica delle tue attività - {MONTHS[selectedPeriod.month]} {selectedPeriod.year}</p>
            </div>
            <MonthYearSelector
              value={selectedPeriod}
              onChange={handlePeriodChange}
            />
          </div>

          {/* Top Row - Main Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Commission Widget - Large */}
            <CustomCard className="lg:col-span-1">
              <div className="p-6">
                {userRole === "consulente" ? (
                  <ConsultantCommissionWidget
                    selectedMonth={selectedPeriod.month}
                    selectedYear={selectedPeriod.year}
                    currentUserId="user1"
                  />
                ) : (
                  <MonthlyCommissionWidget
                    data={commissionData}
                    target={1800}
                  />
                )}
              </div>
            </CustomCard>

            {/* Total Contracts Widget */}
            <CustomCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5" style={{ color: '#F2C927' }} />
                    <h3 className="text-lg font-semibold text-gray-900">Contratti Totali</h3>
                  </div>
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold mb-2" style={{ color: '#E6007E' }}>
                    {statsData.totalContracts}
                  </div>
                  <div className="text-sm text-gray-600">Contratti nel mese</div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Obiettivo mensile:</span>
                    <span className="font-medium">150</span>
                  </div>
                  <Progress 
                    value={(statsData.totalContracts / 150) * 100} 
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500 text-center">
                    {Math.round((statsData.totalContracts / 150) * 100)}% del target raggiunto
                  </div>
                </div>
              </div>
            </CustomCard>
          </div>

          {/* Middle Row - Status Widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Today */}
            <CustomCard>
              <div className="p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2" style={{ color: '#F2C927' }} />
                <div className="text-2xl font-bold mb-1" style={{ color: '#E6007E' }}>
                  {statsData.todayContracts}
                </div>
                <div className="text-xs text-gray-600">Oggi</div>
              </div>
            </CustomCard>

            {/* Yesterday */}
            <CustomCard>
              <div className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                <div className="text-2xl font-bold mb-1 text-gray-700">
                  {statsData.yesterdayContracts}
                </div>
                <div className="text-xs text-gray-600">Ieri</div>
              </div>
            </CustomCard>

            {/* Completed */}
            <CustomCard>
              <div className="p-4 text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold mb-1 text-green-700">
                  {statsData.completedContracts}
                </div>
                <div className="text-xs text-gray-600">Chiusi</div>
              </div>
            </CustomCard>

            {/* To Sign */}
            <CustomCard>
              <div className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold mb-1 text-orange-700">
                  {statsData.toSignContracts}
                </div>
                <div className="text-xs text-gray-600">Da Firmare</div>
              </div>
            </CustomCard>
          </div>

          {/* Bottom Row - Pie Chart Style Status Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Consultant Status */}
            <CustomCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Stato Consulenti
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray={`${(statsData.consultantActive / statsData.consultantTotal) * 100}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">
                        {Math.round((statsData.consultantActive / statsData.consultantTotal) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  {statsData.consultantActive} di {statsData.consultantTotal} attivi
                </div>
              </div>
            </CustomCard>

            {/* BO Status */}
            <CustomCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Stato BO
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        strokeDasharray={`${(statsData.boProcessing / statsData.boTotal) * 100}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">
                        {Math.round((statsData.boProcessing / statsData.boTotal) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  {statsData.boProcessing} di {statsData.boTotal} in lavorazione
                </div>
              </div>
            </CustomCard>

            {/* Offer Status */}
            <CustomCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Stato Offerte
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeDasharray={`${(statsData.offerAccepted / statsData.offerTotal) * 100}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">
                        {Math.round((statsData.offerAccepted / statsData.offerTotal) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  {statsData.offerAccepted} di {statsData.offerTotal} accettate
                </div>
              </div>
            </CustomCard>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Link to="/new-practice">
              <Button 
                size="lg" 
                className="px-8 py-3 text-lg"
                style={{ backgroundColor: '#F2C927', color: '#333333' }}
              >
                <Plus className="h-6 w-6 mr-2" />
                Nuova Pratica
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
