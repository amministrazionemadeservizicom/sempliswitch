import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthYearSelector from "@/components/MonthYearSelector";
import ConsultantCommissionWidget from "@/components/ConsultantCommissionWidget";
import MonthlyCommissionWidget from "@/components/MonthlyCommissionWidget";

export default function WidgetTest() {
  const currentDate = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear()
  });

  const handlePeriodChange = (newPeriod: { month: number; year: number }) => {
    setSelectedPeriod(newPeriod);
  };

  // Commission data for admin widget
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Widget Test - Role Comparison</h1>
          <MonthYearSelector 
            value={selectedPeriod}
            onChange={handlePeriodChange}
          />
        </div>

        {/* Consultant Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">🎯 Consulente View</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsultantCommissionWidget
              selectedMonth={selectedPeriod.month}
              selectedYear={selectedPeriod.year}
              currentUserId="user1"
            />
          </CardContent>
        </Card>

        {/* Admin Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">🔧 Admin View</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyCommissionWidget
              data={commissionData}
              target={1800}
            />
          </CardContent>
        </Card>

        {/* Explanation */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">📋 Difference Explanation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-700">Consulente Widget:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Simple commission total display</li>
                <li>Yellow border and fuchsia numbers</li>
                <li>Only shows earned commission amount</li>
                <li>No detailed breakdown or navigation</li>
                <li>Cannot access full Provvigioni page</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700">Admin Widget:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Detailed commission breakdown</li>
                <li>Shows contract counts and rates</li>
                <li>Target progress tracking</li>
                <li>Commission plan details</li>
                <li>Full access to Provvigioni page</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
