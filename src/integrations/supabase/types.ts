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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_semester: number | null
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_semester?: number | null
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_semester?: number | null
          display_name?: string | null
          id?: string
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
