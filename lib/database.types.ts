export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          id: string
          member_id: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          member_id?: string | null
          session_id: string
          status: string
        }
        Update: {
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          member_id?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          capacity: number
          created_at: string
          date: string
          id: string
          instructor_id: string
          status: string
          studio_id: string
          template_id: string
        }
        Insert: {
          capacity: number
          created_at?: string
          date: string
          id?: string
          instructor_id: string
          status?: string
          studio_id: string
          template_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          date?: string
          id?: string
          instructor_id?: string
          status?: string
          studio_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "class_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      class_templates: {
        Row: {
          capacity: number
          created_at: string
          day_of_week: number
          duration_min: number
          id: string
          instructor_id: string
          start_time: string
          studio_id: string
          title: string
        }
        Insert: {
          capacity: number
          created_at?: string
          day_of_week: number
          duration_min: number
          id?: string
          instructor_id: string
          start_time: string
          studio_id: string
          title: string
        }
        Update: {
          capacity?: number
          created_at?: string
          day_of_week?: number
          duration_min?: number
          id?: string
          instructor_id?: string
          start_time?: string
          studio_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_templates_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_templates_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          profile_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          profile_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          studio_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          studio_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          studio_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["profile_role"]
          studio_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      member_registrations: {
        Row: {
          agreements: Json
          classes: string[]
          created_at: string
          created_by: string
          email: string
          full_name: string
          id: string
          invite_id: string | null
          paused_at: string | null
          phone: string
          plan: string
          profile_id: string | null
          signature_name: string
          signed_at: string
          start_date: string
          studio_id: string
          term_months: number
          total_price: number
        }
        Insert: {
          agreements: Json
          classes?: string[]
          created_at?: string
          created_by: string
          email: string
          full_name: string
          id?: string
          invite_id?: string | null
          paused_at?: string | null
          phone: string
          plan: string
          profile_id?: string | null
          signature_name: string
          signed_at?: string
          start_date: string
          studio_id: string
          term_months: number
          total_price: number
        }
        Update: {
          agreements?: Json
          classes?: string[]
          created_at?: string
          created_by?: string
          email?: string
          full_name?: string
          id?: string
          invite_id?: string | null
          paused_at?: string | null
          phone?: string
          plan?: string
          profile_id?: string | null
          signature_name?: string
          signed_at?: string
          start_date?: string
          studio_id?: string
          term_months?: number
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_registrations_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_registrations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          image_path: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_path?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_path?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          pin: boolean
          studio_id: string
          target: string
          title: string
          views: number
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          pin?: boolean
          studio_id: string
          target: string
          title: string
          views?: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          pin?: boolean
          studio_id?: string
          target?: string
          title?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contract_status: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
        }
        Insert: {
          contract_status?: string
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
        }
        Update: {
          contract_status?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      withdrawal_feedback: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_feedback_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _ensure_staff_group_membership: { Args: never; Returns: undefined }
      _generate_sessions_internal: {
        Args: { p_template_id: string; p_weeks_ahead: number }
        Returns: {
          capacity: number
          created_at: string
          date: string
          id: string
          instructor_id: string
          status: string
          studio_id: string
          template_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "class_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      _is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      accept_invite: {
        Args: { p_code: string; p_full_name: string }
        Returns: {
          contract_status: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_add_participant: {
        Args: {
          p_guest_name?: string
          p_guest_phone?: string
          p_member_id?: string
          p_session_id: string
        }
        Returns: {
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          id: string
          member_id: string | null
          session_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_session: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          id: string
          member_id: string | null
          session_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_booking: {
        Args: { p_booking_id: string }
        Returns: {
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          id: string
          member_id: string | null
          session_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_studio_and_owner_profile: {
        Args: { p_full_name: string; p_studio_name: string }
        Returns: {
          contract_status: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["profile_role"]
      }
      current_studio_id: { Args: never; Returns: string }
      find_email_by_name_phone: {
        Args: { p_full_name: string; p_phone: string }
        Returns: string
      }
      generate_sessions_for_all_templates: { Args: never; Returns: undefined }
      generate_sessions_for_template: {
        Args: { p_template_id: string; p_weeks_ahead?: number }
        Returns: {
          capacity: number
          created_at: string
          date: string
          id: string
          instructor_id: string
          status: string
          studio_id: string
          template_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "class_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_invite_preview: {
        Args: { p_code: string }
        Returns: {
          role: Database["public"]["Enums"]["profile_role"]
          studio_name: string
          valid: boolean
        }[]
      }
      get_notice: {
        Args: { p_id: string }
        Returns: {
          body: string
          created_at: string
          created_by: string
          id: string
          pin: boolean
          studio_id: string
          target: string
          title: string
          views: number
        }
        SetofOptions: {
          from: "*"
          to: "notices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_dm: {
        Args: { p_other_profile_id: string }
        Returns: string
      }
      list_dm_candidates: {
        Args: never
        Returns: {
          full_name: string
          profile_id: string
          role: Database["public"]["Enums"]["profile_role"]
        }[]
      }
      list_my_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message: string
          last_message_at: string
          other_name: string
          other_role: Database["public"]["Enums"]["profile_role"]
          title: string
          unread_count: number
        }[]
      }
      list_upcoming_sessions_for_member: {
        Args: never
        Returns: {
          booked_count: number
          capacity: number
          date: string
          id: string
          instructor_name: string
          my_status: string
          start_time: string
          title: string
        }[]
      }
      mark_attendance: {
        Args: { p_booking_id: string; p_status: string }
        Returns: {
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          id: string
          member_id: string | null
          session_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      register_member: {
        Args: {
          p_agreements: Json
          p_classes: string[]
          p_code: string
          p_email: string
          p_full_name: string
          p_phone: string
          p_plan: string
          p_signature_name: string
          p_start_date: string
          p_term_months: number
          p_total_price: number
        }
        Returns: {
          invite_id: string
          registration_id: string
        }[]
      }
      send_message: {
        Args: {
          p_body?: string
          p_conversation_id: string
          p_image_path?: string
        }
        Returns: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          image_path: string | null
          sender_id: string
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_profile: {
        Args: { p_full_name: string; p_phone: string }
        Returns: {
          contract_status: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"]
          studio_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      withdraw_my_account: { Args: { p_reason?: string }; Returns: undefined }
    }
    Enums: {
      conversation_kind: "dm" | "group"
      profile_role: "owner" | "instructor" | "member"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      conversation_kind: ["dm", "group"],
      profile_role: ["owner", "instructor", "member"],
    },
  },
} as const

