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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      auth_audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          is_completed: boolean | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          related_application_id: string | null
          reminder_minutes: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_completed?: boolean | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          related_application_id?: string | null
          reminder_minutes?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_completed?: boolean | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          related_application_id?: string | null
          reminder_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          communication_date: string | null
          communication_type: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string
          created_at: string
          direction: string | null
          id: string
          message_content: string | null
          related_application_id: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          communication_date?: string | null
          communication_type?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name: string
          created_at?: string
          direction?: string | null
          id?: string
          message_content?: string | null
          related_application_id?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          communication_date?: string | null
          communication_type?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string
          created_at?: string
          direction?: string | null
          id?: string
          message_content?: string | null
          related_application_id?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      company_dossiers: {
        Row: {
          company_name: string
          created_at: string
          culture_analysis: string | null
          executive_summary: string | null
          headquarters: string | null
          id: string
          interview_questions: Json | null
          key_challenges: string[] | null
          market_cap: string | null
          strategic_opportunities: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          culture_analysis?: string | null
          executive_summary?: string | null
          headquarters?: string | null
          id?: string
          interview_questions?: Json | null
          key_challenges?: string[] | null
          market_cap?: string | null
          strategic_opportunities?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          culture_analysis?: string | null
          executive_summary?: string | null
          headquarters?: string | null
          id?: string
          interview_questions?: Json | null
          key_challenges?: string[] | null
          market_cap?: string | null
          strategic_opportunities?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          application_date: string | null
          company_name: string
          contact_email: string | null
          contact_person: string | null
          created_at: string
          id: string
          job_url: string | null
          location: string | null
          notes: string | null
          position_title: string
          salary_range: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_date?: string | null
          company_name: string
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          id?: string
          job_url?: string | null
          location?: string | null
          notes?: string | null
          position_title: string
          salary_range?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_date?: string | null
          company_name?: string
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          id?: string
          job_url?: string | null
          location?: string | null
          notes?: string | null
          position_title?: string
          salary_range?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          company_name: string
          created_at: string
          id: string
          job_description: string | null
          job_url: string | null
          location: string | null
          match_score: number | null
          notes: string | null
          position_title: string
          posted_date: string | null
          remote_option: boolean | null
          salary_range: string | null
          source: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          job_description?: string | null
          job_url?: string | null
          location?: string | null
          match_score?: number | null
          notes?: string | null
          position_title: string
          posted_date?: string | null
          remote_option?: boolean | null
          salary_range?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          job_description?: string | null
          job_url?: string | null
          location?: string | null
          match_score?: number | null
          notes?: string | null
          position_title?: string
          posted_date?: string | null
          remote_option?: boolean | null
          salary_range?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_path: string
          page_title: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          page_title?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          page_title?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          cv_url: string | null
          email: string
          full_name: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          salary_expectation: string | null
          target_industries: string[] | null
          target_locations: string[] | null
          target_roles: string[] | null
          title: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          cv_url?: string | null
          email: string
          full_name?: string | null
          id: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          salary_expectation?: string | null
          target_industries?: string[] | null
          target_locations?: string[] | null
          target_roles?: string[] | null
          title?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          cv_url?: string | null
          email?: string
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          salary_expectation?: string | null
          target_industries?: string[] | null
          target_locations?: string[] | null
          target_roles?: string[] | null
          title?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      recruiters: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          last_contact_date: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          specialization: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          specialization?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          specialization?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          ended_at: string | null
          id: string
          last_activity_at: string
          pages_visited: number | null
          session_id: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          last_activity_at?: string
          pages_visited?: number | null
          session_id: string
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          last_activity_at?: string
          pages_visited?: number | null
          session_id?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
