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
      games: {
        Row: {
          bounty_base: number | null
          bounty_total: number | null
          chat_log: Json | null
          clues_dropped: Json | null
          created_at: string
          ended_at: string | null
          hunted_id: string
          hunted_stake: number | null
          hunter_id: string
          hunter_stake: number | null
          hunter_won: boolean | null
          id: string
          is_bot_game: boolean
          puzzle_fields: Json | null
          role_mode: Database["public"]["Enums"]["game_role"]
          solved_at: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["game_status"]
          time_remaining: number | null
        }
        Insert: {
          bounty_base?: number | null
          bounty_total?: number | null
          chat_log?: Json | null
          clues_dropped?: Json | null
          created_at?: string
          ended_at?: string | null
          hunted_id: string
          hunted_stake?: number | null
          hunter_id: string
          hunter_stake?: number | null
          hunter_won?: boolean | null
          id?: string
          is_bot_game?: boolean
          puzzle_fields?: Json | null
          role_mode?: Database["public"]["Enums"]["game_role"]
          solved_at?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          time_remaining?: number | null
        }
        Update: {
          bounty_base?: number | null
          bounty_total?: number | null
          chat_log?: Json | null
          clues_dropped?: Json | null
          created_at?: string
          ended_at?: string | null
          hunted_id?: string
          hunted_stake?: number | null
          hunter_id?: string
          hunter_stake?: number | null
          hunter_won?: boolean | null
          id?: string
          is_bot_game?: boolean
          puzzle_fields?: Json | null
          role_mode?: Database["public"]["Enums"]["game_role"]
          solved_at?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          time_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_hunted_id_fkey"
            columns: ["hunted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_hunter_id_fkey"
            columns: ["hunter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_queue: {
        Row: {
          created_at: string
          id: string
          matched_with: string | null
          profile_id: string
          role: Database["public"]["Enums"]["game_role"]
          stake_amount: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_with?: string | null
          profile_id: string
          role: Database["public"]["Enums"]["game_role"]
          stake_amount?: number | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_with?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["game_role"]
          stake_amount?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_matched_with_fkey"
            columns: ["matched_with"]
            isOneToOne: false
            referencedRelation: "matchmaking_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaking_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_find_time: number | null
          created_at: string
          display_name: string | null
          find_rate: number | null
          find_score: number | null
          games_played: number | null
          games_won: number | null
          hide_score: number | null
          hide_streak: number | null
          hunted_points: number | null
          hunter_points: number | null
          id: string
          is_bot: boolean
          tapestry_id: string | null
          total_sol_earned: number | null
          total_sol_staked: number | null
          updated_at: string
          user_id: string
          username: string | null
          vibe_score: number | null
          wallet_address: string
        }
        Insert: {
          avatar_url?: string | null
          avg_find_time?: number | null
          created_at?: string
          display_name?: string | null
          find_rate?: number | null
          find_score?: number | null
          games_played?: number | null
          games_won?: number | null
          hide_score?: number | null
          hide_streak?: number | null
          hunted_points?: number | null
          hunter_points?: number | null
          id?: string
          is_bot?: boolean
          tapestry_id?: string | null
          total_sol_earned?: number | null
          total_sol_staked?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          vibe_score?: number | null
          wallet_address: string
        }
        Update: {
          avatar_url?: string | null
          avg_find_time?: number | null
          created_at?: string
          display_name?: string | null
          find_rate?: number | null
          find_score?: number | null
          games_played?: number | null
          games_won?: number | null
          hide_score?: number | null
          hide_streak?: number | null
          hunted_points?: number | null
          hunter_points?: number | null
          id?: string
          is_bot?: boolean
          tapestry_id?: string | null
          total_sol_earned?: number | null
          total_sol_staked?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          vibe_score?: number | null
          wallet_address?: string
        }
        Relationships: []
      }
      puzzle_templates: {
        Row: {
          clues: Json
          created_at: string
          fields: Json
          id: string
          is_active: boolean | null
          privacy_level: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          clues?: Json
          created_at?: string
          fields?: Json
          id?: string
          is_active?: boolean | null
          privacy_level?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          clues?: Json
          created_at?: string
          fields?: Json
          id?: string
          is_active?: boolean | null
          privacy_level?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_templates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      game_role: "hunter" | "hunted" | "duel"
      game_status:
        | "waiting"
        | "matched"
        | "in_progress"
        | "completed"
        | "abandoned"
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
      game_role: ["hunter", "hunted", "duel"],
      game_status: [
        "waiting",
        "matched",
        "in_progress",
        "completed",
        "abandoned",
      ],
    },
  },
} as const
