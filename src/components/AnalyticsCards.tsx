"use client";

import { useMemo } from "react";
import { Activity, ActivityLog } from "@/lib/types";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  startOfMonth, 
  endOfMonth 
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Props {
  activities: Activity[];
  logs: Record<string, ActivityLog>;
  currentMonth: Date;
}

export default function AnalyticsCards({ activities, logs, currentMonth }: Props) {
  // 1. Weekly Completion Bar Chart
  const weeklyData = useMemo(() => {
    const today = new Date();
    // If viewing the current month, show the current week.
    // Otherwise, show the first week of the selected month.
    const referenceDate = isSameMonth(today, currentMonth) ? today : startOfMonth(currentMonth);
    const start = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(referenceDate, { weekStartsOn: 1 });     // Sunday
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      let completedCount = 0;
      activities.forEach(act => {
        const key = `${act.id}-${dateStr}`;
        if (logs[key]?.completed) completedCount++;
      });
      return {
        name: format(day, "EEE"), // Mon, Tue...
        completed: completedCount,
      };
    });
  }, [activities, logs, currentMonth]);

  // 2. Monthly Progress Line Chart
  const monthlyData = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      let completedCount = 0;
      activities.forEach(act => {
        const key = `${act.id}-${dateStr}`;
        if (logs[key]?.completed) completedCount++;
      });
      return {
        date: format(day, "MMM d"),
        completed: completedCount,
      };
    });
  }, [activities, logs, currentMonth]);

  // 3. Activity Completion Pie Chart
  const pieData = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    const data = activities.map(act => {
      let completedCount = 0;
      days.forEach(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const key = `${act.id}-${dateStr}`;
        if (logs[key]?.completed) completedCount++;
      });
      return {
        name: act.name,
        value: completedCount,
        color: act.color,
      };
    }).filter(d => d.value > 0);
    return data;
  }, [activities, logs, currentMonth]);

  // Tooltip custom styling for dark mode compatibility
  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    borderColor: 'var(--border)',
    color: 'var(--card-foreground)',
    borderRadius: '0.375rem',
  };

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Weekly Bar Chart */}
      <div className="bg-card border rounded-lg p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Weekly Progress</h3>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={tooltipStyle} />
              <Bar dataKey="completed" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Line Chart */}
      <div className="bg-card border rounded-lg p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Monthly Trend</h3>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="completed" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Pie Chart */}
      <div className="bg-card border rounded-lg p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Activity Share</h3>
        <div className="flex-1 min-h-[250px]">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={tooltipStyle} 
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    `${value} completions`, 
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No completed activities this month.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
