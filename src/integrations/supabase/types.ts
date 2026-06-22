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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      crypto_analyses: {
        Row: {
          access_code: string | null
          ai_model_used: string | null
          created_at: string
          crypto_symbols: string[] | null
          id: string
          period_type: string
          region: string | null
          summary: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          access_code?: string | null
          ai_model_used?: string | null
          created_at?: string
          crypto_symbols?: string[] | null
          id?: string
          period_type?: string
          region?: string | null
          summary?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          access_code?: string | null
          ai_model_used?: string | null
          created_at?: string
          crypto_symbols?: string[] | null
          id?: string
          period_type?: string
          region?: string | null
          summary?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      crypto_analysis_images: {
        Row: {
          ai_interpretation: string | null
          analysis_id: string
          created_at: string
          id: string
          image_name: string | null
          image_url: string
        }
        Insert: {
          ai_interpretation?: string | null
          analysis_id: string
          created_at?: string
          id?: string
          image_name?: string | null
          image_url: string
        }
        Update: {
          ai_interpretation?: string | null
          analysis_id?: string
          created_at?: string
          id?: string
          image_name?: string | null
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_analysis_images_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "crypto_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_mentions: {
        Row: {
          access_code: string | null
          created_at: string
          id: string
          rank: number | null
          region: string
          repetition: number
          report_date: string
          report_time: string | null
          report_type: string
          submission_id: string | null
          symbol: string
          user_id: string | null
          week_number: number
          year: number
        }
        Insert: {
          access_code?: string | null
          created_at?: string
          id?: string
          rank?: number | null
          region?: string
          repetition?: number
          report_date: string
          report_time?: string | null
          report_type: string
          submission_id?: string | null
          symbol: string
          user_id?: string | null
          week_number: number
          year: number
        }
        Update: {
          access_code?: string | null
          created_at?: string
          id?: string
          rank?: number | null
          region?: string
          repetition?: number
          report_date?: string
          report_time?: string | null
          report_type?: string
          submission_id?: string | null
          symbol?: string
          user_id?: string | null
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "crypto_mentions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "crypto_report_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_periodic_reports: {
        Row: {
          access_code: string | null
          ai_analysis: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          rankings: Json
          region: string
          summary: string | null
          user_id: string | null
          week_number: number | null
          year: number
        }
        Insert: {
          access_code?: string | null
          ai_analysis?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type: string
          rankings?: Json
          region?: string
          summary?: string | null
          user_id?: string | null
          week_number?: number | null
          year: number
        }
        Update: {
          access_code?: string | null
          ai_analysis?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          rankings?: Json
          region?: string
          summary?: string | null
          user_id?: string | null
          week_number?: number | null
          year?: number
        }
        Relationships: []
      }
      crypto_report_submissions: {
        Row: {
          access_code: string | null
          analysis_id: string | null
          created_at: string
          id: string
          region: string
          report_date: string
          report_type: string
          session_time: string
          user_id: string | null
        }
        Insert: {
          access_code?: string | null
          analysis_id?: string | null
          created_at?: string
          id?: string
          region?: string
          report_date?: string
          report_type: string
          session_time?: string
          user_id?: string | null
        }
        Update: {
          access_code?: string | null
          analysis_id?: string | null
          created_at?: string
          id?: string
          region?: string
          report_date?: string
          report_type?: string
          session_time?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_report_submissions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "crypto_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data_cache: {
        Row: {
          average_volume: number
          conviction_score: number
          created_at: string
          currency: string
          current_volume: number
          fetched_at: string
          flag: string
          flow_type: string
          historical_volumes: Json | null
          id: string
          name: string
          price: number
          price_change: number
          ticker: string
          updated_at: string
          volume_ratio: number
          z_score: number
        }
        Insert: {
          average_volume: number
          conviction_score: number
          created_at?: string
          currency: string
          current_volume: number
          fetched_at?: string
          flag: string
          flow_type: string
          historical_volumes?: Json | null
          id: string
          name: string
          price: number
          price_change: number
          ticker: string
          updated_at?: string
          volume_ratio: number
          z_score: number
        }
        Update: {
          average_volume?: number
          conviction_score?: number
          created_at?: string
          currency?: string
          current_volume?: number
          fetched_at?: string
          flag?: string
          flow_type?: string
          historical_volumes?: Json | null
          id?: string
          name?: string
          price?: number
          price_change?: number
          ticker?: string
          updated_at?: string
          volume_ratio?: number
          z_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
