import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Ene', income: 2500 },
  { month: 'Feb', income: 3200 },
  { month: 'Mar', income: 2800 },
  { month: 'Abr', income: 3800 },
  { month: 'May', income: 4200 },
  { month: 'Jun', income: 3900 },
];

const MonthlyIncomeChart = () => {
  return (
    <Card className="col-span-full bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <span>Ingresos Mensuales</span>
          <span className="text-sm text-green-500 font-normal">(+15.3% vs mes anterior)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted dark:stroke-gray-700" />
              <XAxis 
                dataKey="month" 
                className="text-muted-foreground dark:text-gray-400"
              />
              <YAxis 
                className="text-muted-foreground dark:text-gray-400"
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem'
                }}
                formatter={(value) => [`€${value}`, 'Ingresos']}
              />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyIncomeChart;
