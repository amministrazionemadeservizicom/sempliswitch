import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronDown } from "lucide-react";

interface MonthYearSelectorProps {
  value?: { month: number; year: number };
  onChange?: (value: { month: number; year: number }) => void;
}

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function MonthYearSelector({ value, onChange }: MonthYearSelectorProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(value?.month ?? currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(value?.year ?? currentDate.getFullYear());
  const [isOpen, setIsOpen] = useState(false);

  // Generate years (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleMonthChange = (month: string) => {
    const monthIndex = parseInt(month);
    setSelectedMonth(monthIndex);
    onChange?.({ month: monthIndex, year: selectedYear });
  };

  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year);
    setSelectedYear(yearNum);
    onChange?.({ month: selectedMonth, year: yearNum });
  };

  const displayText = `${MONTHS[selectedMonth]} ${selectedYear}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-12 px-4 justify-between bg-white border border-gray-200 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-900">{displayText}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Mese
                </label>
                <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Anno
                </label>
                <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Annulla
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Conferma
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
