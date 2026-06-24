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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      discussion_sessions: {
        Row: {
          created_at: string
          ended_by: string | null
          group_id: string
          id: string
          messages: Json
          reading_day: number | null
          summary: Json | null
          summary_status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_by?: string | null
          group_id: string
          id?: string
          messages?: Json
          reading_day?: number | null
          summary?: Json | null
          summary_status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_by?: string | null
          group_id?: string
          id?: string
          messages?: Json
          reading_day?: number | null
          summary?: Json | null
          summary_status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          display_name: string | null
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          author_name: string
          body: string
          created_at: string
          group_id: string
          id: string
          reading_day: number | null
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          group_id: string
          id?: string
          reading_day?: number | null
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          reading_day?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          book: string
          chapter: number
          color: Database["public"]["Enums"]["highlight_color"]
          created_at: string
          id: string
          user_id: string
          verse: number
          verse_reference: string
          verse_text: string
        }
        Insert: {
          book: string
          chapter: number
          color: Database["public"]["Enums"]["highlight_color"]
          created_at?: string
          id?: string
          user_id: string
          verse: number
          verse_reference: string
          verse_text: string
        }
        Update: {
          book?: string
          chapter?: number
          color?: Database["public"]["Enums"]["highlight_color"]
          created_at?: string
          id?: string
          user_id?: string
          verse?: number
          verse_reference?: string
          verse_text?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          book: string
          chapter: number
          created_at: string
          id: string
          note_text: string
          updated_at: string
          user_id: string
          verse: number
          verse_reference: string
          verse_text: string
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string
          id?: string
          note_text: string
          updated_at?: string
          user_id: string
          verse: number
          verse_reference: string
          verse_text: string
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string
          id?: string
          note_text?: string
          updated_at?: string
          user_id?: string
          verse?: number
          verse_reference?: string
          verse_text?: string
        }
        Relationships: []
      }
      reading_plan_items: {
        Row: {
          book: string
          chapter: number
          created_at: string
          day_number: number
          group_id: string
          id: string
          scheduled_date: string | null
          title: string
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string
          day_number: number
          group_id: string
          id?: string
          scheduled_date?: string | null
          title: string
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string
          day_number?: number
          group_id?: string
          id?: string
          scheduled_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_plan_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          book: string | null
          created_at: string
          description: string
          id: string
          is_public: boolean
          name: string
        }
        Insert: {
          book?: string | null
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          name: string
        }
        Update: {
          book?: string | null
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      highlight_color: "yellow" | "green" | "blue"
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
      highlight_color: ["yellow", "green", "blue"],
    },
  },
} as const
