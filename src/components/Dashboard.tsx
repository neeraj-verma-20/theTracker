"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Activity, ActivityLog } from "@/lib/types";
import { startOfMonth, endOfMonth, format, addMonths, subMonths, eachDayOfInterval } from "date-fns";
import { LogOut, ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from "lucide-react";
import AnalyticsCards from "./AnalyticsCards";

export default function Dashboard({ session }: { session: Session }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<Record<string, ActivityLog>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // New activity state
  const [newActivityName, setNewActivityName] = useState("");
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const fetchActivities = async () => {
    const { data: acts, error: errActs } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });

    if (!errActs && acts) {
      setActivities(acts);
    }
  };

  const fetchLogs = async (month: Date) => {
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    
    const { data: logsData, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("date", start)
      .lte("date", end);

    if (!error && logsData) {
      const logsMap: Record<string, ActivityLog> = {};
      logsData.forEach(log => {
        const key = `${log.activity_id}-${log.date}`;
        logsMap[key] = log;
      });
      setLogs(logsMap);
    }
  };

  useEffect(() => {
    const loadData = async (month: Date) => {
      setLoading(true);
      await Promise.all([fetchActivities(), fetchLogs(month)]);
      setLoading(false);
    };

    loadData(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;

    const colors = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { error } = await supabase.from("activities").insert([
      {
        user_id: session.user.id,
        name: newActivityName.trim(),
        color: randomColor,
      }
    ]);

    if (!error) {
      setNewActivityName("");
      fetchActivities();
    }
  };

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editingActivity.name.trim()) return;

    const { error } = await supabase
      .from("activities")
      .update({ name: editingActivity.name.trim() })
      .eq("id", editingActivity.id);

    if (!error) {
      setEditingActivity(null);
      fetchActivities();
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;

    await supabase.from("activities").delete().eq("id", id);
    fetchActivities();
  };

  const toggleLog = async (activityId: string, date: string) => {
    const key = `${activityId}-${date}`;
    const existingLog = logs[key];

    if (existingLog) {
      const newStatus = !existingLog.completed;
      
      const { error } = await supabase
        .from("activity_logs")
        .update({ completed: newStatus })
        .eq("id", existingLog.id);

      if (!error) {
        setLogs(prev => ({
          ...prev,
          [key]: { ...existingLog, completed: newStatus }
        }));
      }
    } else {
      const { data, error } = await supabase
        .from("activity_logs")
        .insert([
          {
            user_id: session.user.id,
            activity_id: activityId,
            date,
            completed: true
          }
        ])
        .select()
        .single();
      
      if (!error && data) {
        setLogs(prev => ({
          ...prev,
          [key]: data
        }));
      }
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getStats = (activityId: string) => {
    // Basic stats logic
    let completedDays = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Calculate metrics for current month
    daysInMonth.forEach(day => {
      const dStr = format(day, "yyyy-MM-dd");
      const key = `${activityId}-${dStr}`;
      const log = logs[key];
      if (log?.completed) {
        completedDays++;
        tempStreak++;
        if (tempStreak > currentStreak) currentStreak = tempStreak; // This is a simple streak, actual streak would span months
      } else {
        tempStreak = 0;
      }
    });

    // We only have logs for the current month loaded reliably, so full streak calculation requires complex queries.
    // For now we'll do an approximation or month-only.

    return { completedDays, percent: Math.round((completedDays / daysInMonth.length) * 100) || 0 };
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">theTracker</h1>
          <p className="text-muted-foreground">{session.user.email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4 bg-card border rounded-md p-1">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold min-w-[140px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAddActivity} className="flex flex-1 md:max-w-md w-full gap-2">
          <input
            type="text"
            placeholder="New Activity..."
            value={newActivityName}
            onChange={(e) => setNewActivityName(e.target.value)}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md h-10 px-4 py-2 transition-colors disabled:opacity-50"
            disabled={!newActivityName.trim()}
          >
            <Plus className="w-4 h-4 mr-2" /> Add
          </button>
        </form>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading tracker...</div>
        ) : activities.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <p className="text-sm">No activities yet. Add your first habit above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="min-w-max p-4">
              {/* Header Row */}
              <div className="flex">
                <div className="w-48 shrink-0 pb-4" /> {/* Empty corner */}
                <div className="flex">
                  {daysInMonth.map((day, idx) => {
                    const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    return (
                      <div 
                        key={idx} 
                        className={`w-9 shrink-0 flex flex-col items-center justify-end pb-2 ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                      >
                        <span className="text-xs uppercase opacity-70 mb-1">{format(day, "E").charAt(0)}</span>
                        <span className="text-sm">{format(day, "d")}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="w-32 shrink-0 px-4 flex justify-end items-end pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Stats
                </div>
              </div>

              {/* Activity Rows */}
              <div className="flex flex-col gap-2">
                {activities.map(activity => {
                  const stats = getStats(activity.id);

                  return (
                    <div key={activity.id} className="flex items-center group">
                      <div className="w-48 flex items-center shrink-0 pr-4">
                        {editingActivity?.id === activity.id ? (
                          <form 
                            onSubmit={handleUpdateActivity}
                            className="flex flex-1 items-center gap-1"
                          >
                            <input 
                              type="text" 
                              autoFocus
                              className="w-full text-sm bg-background border px-2 py-1 rounded"
                              value={editingActivity.name}
                              onChange={e => setEditingActivity({...editingActivity, name: e.target.value})}
                              onBlur={handleUpdateActivity}
                            />
                          </form>
                        ) : (
                          <div className="flex flex-1 items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: activity.color }} />
                              <span className="text-sm font-medium truncate" title={activity.name}>{activity.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingActivity(activity)} className="p-1 text-muted-foreground hover:text-foreground">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteActivity(activity.id)} className="p-1 text-destructive hover:text-destructive/80">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex">
                        {daysInMonth.map((day, dIdx) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const key = `${activity.id}-${dateStr}`;
                          const log = logs[key];
                          const completed = log?.completed;
                          const isFuture = day > new Date();

                          return (
                            <div key={dIdx} className="w-9 h-9 shrink-0 flex items-center justify-center p-0.5">
                              <button
                                disabled={isFuture}
                                onClick={() => toggleLog(activity.id, dateStr)}
                                className={`w-full h-full rounded cursor-pointer transition-all duration-200 border ${
                                  completed 
                                  ? 'border-transparent shadow-sm' 
                                  : 'border-border/60 hover:border-border hover:bg-muted/50 bg-secondary/30'
                                } ${isFuture ? 'opacity-30 cursor-not-allowed' : ''}`}
                                style={{
                                  backgroundColor: completed ? activity.color : undefined,
                                  boxShadow: completed ? `0 0 10px ${activity.color}40` : undefined
                                }}
                                title={`${format(day, "MMM d")} - ${activity.name}`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="w-32 shrink-0 px-4 flex items-center justify-end text-sm text-muted-foreground gap-3">
                        <span title={`${stats.completedDays} days this month`} className="flex items-center gap-1">
                          {stats.completedDays}<span className="text-[10px] opacity-70">/{daysInMonth.length}</span>
                        </span>
                        <span title="Completion Rate" className="w-8 text-right font-medium">
                          {stats.percent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && activities.length > 0 && (
        <AnalyticsCards activities={activities} logs={logs} currentMonth={currentMonth} />
      )}
    </div>
  );
}
