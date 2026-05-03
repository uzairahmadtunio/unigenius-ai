export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          semester: number
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          semester: number
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          semester?: number
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          subject: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      career_activity: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          points: number
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points?: number
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          subject: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          subject?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          file_names: string[] | null
          file_urls: string[] | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          file_names?: string[] | null
          file_urls?: string[] | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          file_names?: string[] | null
          file_urls?: string[] | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          subject: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_active_date: string
          longest_streak: number
          total_active_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_active_date?: string
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_active_date?: string
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_schedule: {
        Row: {
          created_at: string
          exam_date: string
          exam_type: string
          id: string
          semester: number
          subject: string
        }
        Insert: {
          created_at?: string
          exam_date: string
          exam_type?: string
          id?: string
          semester: number
          subject: string
        }
        Update: {
          created_at?: string
          exam_date?: string
          exam_type?: string
          id?: string
          semester?: number
          subject?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message: string
          status: string
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          status?: string
          user_email?: string
          user_id: string
          user_name?: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          status?: string
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      flashcard_sets: {
        Row: {
          cards: Json
          created_at: string
          id: string
          semester: number
          source_type: string
          subject: string
          title: string
          user_id: string
        }
        Insert: {
          cards?: Json
          created_at?: string
          id?: string
          semester: number
          source_type?: string
          subject: string
          title: string
          user_id: string
        }
        Update: {
          cards?: Json
          created_at?: string
          id?: string
          semester?: number
          source_type?: string
          subject?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      global_alerts: {
        Row: {
          alert_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
        }
        Relationships: []
      }
      group_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          group_id: string
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          group_id: string
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          group_id?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_files_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          file_names: string[] | null
          file_urls: string[] | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_names?: string[] | null
          file_urls?: string[] | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_names?: string[] | null
          file_urls?: string[] | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string
          semester: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id: string
          semester?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          semester?: number | null
        }
        Relationships: []
      }
      note_votes: {
        Row: {
          created_at: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_votes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          semester: number
          subject: string
          title: string
          uploader_name: string
          upvotes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          semester: number
          subject: string
          title: string
          uploader_name?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          semester?: number
          subject?: string
          title?: string
          uploader_name?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: []
      }
      past_papers: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          paper_type: string
          semester: number
          subject: string
          title: string
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          paper_type?: string
          semester: number
          subject: string
          title: string
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          paper_type?: string
          semester?: number
          subject?: string
          title?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          discount_percent: number | null
          id: string
          payment_method: string
          promo_code: string | null
          reviewed_at: string | null
          screenshot_url: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          discount_percent?: number | null
          id?: string
          payment_method?: string
          promo_code?: string | null
          reviewed_at?: string | null
          screenshot_url: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          discount_percent?: number | null
          id?: string
          payment_method?: string
          promo_code?: string | null
          reviewed_at?: string | null
          screenshot_url?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_semester: number | null
          display_name: string | null
          github_url: string | null
          headline: string | null
          id: string
          is_pro: boolean
          linkedin_url: string | null
          roll_number: string | null
          section: string | null
          show_on_leaderboard: boolean | null
          skills: string[] | null
          streak_pro_until: string | null
          university: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_semester?: number | null
          display_name?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          is_pro?: boolean
          linkedin_url?: string | null
          roll_number?: string | null
          section?: string | null
          show_on_leaderboard?: boolean | null
          skills?: string[] | null
          streak_pro_until?: string | null
          university?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_semester?: number | null
          display_name?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          is_pro?: boolean
          linkedin_url?: string | null
          roll_number?: string | null
          section?: string | null
          show_on_leaderboard?: boolean | null
          skills?: string[] | null
          streak_pro_until?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          usage_limit: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          usage_limit?: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          usage_limit?: number
          used_count?: number
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          correct_answer: string
          created_at: string
          created_by: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          semester: number | null
          subject: string
          topic: string
        }
        Insert: {
          correct_answer?: string
          created_at?: string
          created_by: string
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          semester?: number | null
          subject: string
          topic?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          created_by?: string
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          semester?: number | null
          subject?: string
          topic?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          created_at: string
          id: string
          quiz_type: string
          score: number
          semester: number
          subject: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_type?: string
          score: number
          semester: number
          subject: string
          total: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_type?: string
          score?: number
          semester?: number
          subject?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      study_materials: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          semester: number | null
          subject: string
          title: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          semester?: number | null
          subject: string
          title: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          semester?: number | null
          subject?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_role?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      university_notices: {
        Row: {
          category: string
          content: string
          created_at: string
          expires_at: string | null
          id: string
          priority: string
          starts_at: string
          title: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          priority?: string
          starts_at?: string
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          priority?: string
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_icon: string
          badge_id: string
          badge_name: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_icon?: string
          badge_id: string
          badge_name: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_icon?: string
          badge_id?: string
          badge_name?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notice_reads: {
        Row: {
          id: string
          notice_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notice_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notice_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notice_reads_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "university_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          avatar_url: string | null
          avg_percentage: number | null
          best_cv_score: number | null
          current_semester: number | null
          display_name: string | null
          dsa_solved: number | null
          interviews_done: number | null
          perfect_scores: number | null
          quizzes_taken: number | null
          streak_days: number | null
          total_points: number | null
          university: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_group: { Args: { _group_id: string }; Returns: undefined }
      admin_delete_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_get_all_groups: {
        Args: never
        Returns: {
          created_at: string
          description: string
          file_count: number
          group_id: string
          member_count: number
          name: string
          owner_id: string
          owner_name: string
        }[]
      }
      admin_get_all_users: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          current_semester: number
          display_name: string
          email: string
          roll_number: string
          user_id: string
        }[]
      }
      admin_get_payment_requests: {
        Args: never
        Returns: {
          admin_note: string
          amount: number
          created_at: string
          id: string
          payment_method: string
          reviewed_at: string
          screenshot_url: string
          status: string
          user_avatar: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_get_stats: {
        Args: never
        Returns: {
          total_files: number
          total_groups: number
          total_notices: number
          total_quizzes: number
          total_users: number
        }[]
      }
      admin_get_support_tickets: {
        Args: never
        Returns: {
          created_at: string
          last_message: string
          last_message_at: string
          status: string
          subject: string
          ticket_id: string
          unread_count: number
          updated_at: string
          user_avatar: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_handle_payment: {
        Args: { _action: string; _note?: string; _request_id: string }
        Returns: undefined
      }
      admin_manage_user_role: {
        Args: {
          _action: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      find_group_by_invite_code: {
        Args: { _code: string }
        Returns: {
          avatar_url: string
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          semester: number
        }[]
      }
      get_leaderboard_filtered:
        | {
            Args: { time_filter?: string }
            Returns: {
              avatar_url: string
              avg_percentage: number
              best_cv_score: number
              display_name: string
              dsa_solved: number
              interviews_done: number
              perfect_scores: number
              quizzes_taken: number
              total_points: number
              user_id: string
            }[]
          }
        | {
            Args: { semester_filter?: number; time_filter?: string }
            Returns: {
              avatar_url: string
              avg_percentage: number
              best_cv_score: number
              current_semester: number
              display_name: string
              dsa_solved: number
              interviews_done: number
              perfect_scores: number
              quizzes_taken: number
              streak_days: number
              total_points: number
              university: string
              user_id: string
            }[]
          }
      grant_streak_pro_day: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_owner: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      record_daily_activity: {
        Args: { _user_id: string }
        Returns: {
          current_streak: number
          longest_streak: number
          streak_increased: boolean
          total_active_days: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "teacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "teacher"],
    },
  },
} as const
