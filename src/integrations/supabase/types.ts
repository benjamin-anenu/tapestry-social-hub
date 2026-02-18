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
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_text: string | null
          participant_a: string
          participant_b: string
          vibe_session_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          participant_a: string
          participant_b: string
          vibe_session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          participant_a?: string
          participant_b?: string
          vibe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vibe_session_id_fkey"
            columns: ["vibe_session_id"]
            isOneToOne: false
            referencedRelation: "vibe_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          mutual: boolean
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          mutual?: boolean
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          mutual?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "friendships_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          bio_text: string | null
          city: string | null
          country: string | null
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
          instagram_handle: string | null
          is_bot: boolean
          is_online: boolean
          last_seen: string | null
          real_name: string | null
          tapestry_id: string | null
          total_sol_earned: number | null
          total_sol_staked: number | null
          updated_at: string
          user_id: string
          username: string | null
          vibe_score: number | null
          wallet_address: string
          x_handle: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_find_time?: number | null
          bio_text?: string | null
          city?: string | null
          country?: string | null
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
          instagram_handle?: string | null
          is_bot?: boolean
          is_online?: boolean
          last_seen?: string | null
          real_name?: string | null
          tapestry_id?: string | null
          total_sol_earned?: number | null
          total_sol_staked?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          vibe_score?: number | null
          wallet_address: string
          x_handle?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_find_time?: number | null
          bio_text?: string | null
          city?: string | null
          country?: string | null
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
          instagram_handle?: string | null
          is_bot?: boolean
          is_online?: boolean
          last_seen?: string | null
          real_name?: string | null
          tapestry_id?: string | null
          total_sol_earned?: number | null
          total_sol_staked?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          vibe_score?: number | null
          wallet_address?: string
          x_handle?: string | null
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
      vibe_sessions: {
        Row: {
          chat_log: Json
          created_at: string
          ended_at: string | null
          id: string
          status: string
          user_a_id: string
          user_a_verdict: string | null
          user_b_id: string
          user_b_verdict: string | null
        }
        Insert: {
          chat_log?: Json
          created_at?: string
          ended_at?: string | null
          id?: string
          status?: string
          user_a_id: string
          user_a_verdict?: string | null
          user_b_id: string
          user_b_verdict?: string | null
        }
        Update: {
          chat_log?: Json
          created_at?: string
          ended_at?: string | null
          id?: string
          status?: string
          user_a_id?: string
          user_a_verdict?: string | null
          user_b_id?: string
          user_b_verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vibe_sessions_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_sessions_user_b_id_fkey"
            columns: ["user_b_id"]
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
      increment_vibe_score: { Args: { profile_id: string }; Returns: undefined }
      is_mutual_friend: {
        Args: { _profile_a: string; _profile_b: string }
        Returns: boolean
      }
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
