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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_semester: number | null
          display_name: string | null
          github_url: string | null
          headline: string | null
          id: string
          linkedin_url: string | null
          roll_number: string | null
          section: string | null
          show_on_leaderboard: boolean | null
          skills: string[] | null
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
          linkedin_url?: string | null
          roll_number?: string | null
          section?: string | null
          show_on_leaderboard?: boolean | null
          skills?: string[] | null
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
          linkedin_url?: string | null
          roll_number?: string | null
          section?: string | null
          show_on_leaderboard?: boolean | null
          skills?: string[] | null
          university?: string | null
          updated_at?: string
          user_id?: string
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
          display_name: string | null
          dsa_solved: number | null
          interviews_done: number | null
          perfect_scores: number | null
          quizzes_taken: number | null
          total_points: number | null
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
      get_leaderboard_filtered: {
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
