export type Activity = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  activity_id: string;
  date: string;
  completed: boolean;
};
