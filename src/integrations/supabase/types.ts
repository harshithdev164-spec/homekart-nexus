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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_completed: boolean
          lead_id: string | null
          property_id: string | null
          scheduled_at: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_completed?: boolean
          lead_id?: string | null
          property_id?: string | null
          scheduled_at?: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          lead_id?: string | null
          property_id?: string | null
          scheduled_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          agent_id: string | null
          call_status: string | null
          call_type: string
          called_by: string
          created_at: string
          duration: number | null
          id: string
          lead_id: string | null
          notes: string | null
          phone_number: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          call_status?: string | null
          call_type: string
          called_by: string
          created_at?: string
          duration?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          phone_number: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          call_status?: string | null
          call_type?: string
          called_by?: string
          created_at?: string
          duration?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          phone_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_called_by_fkey"
            columns: ["called_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          Name: string | null
          Phone: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          Name?: string | null
          Phone?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          Name?: string | null
          Phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      communication_logs: {
        Row: {
          communication_type: string
          external_id: string | null
          id: string
          lead_id: string
          message_content: string | null
          sent_at: string
          sent_by: string
          status: string | null
          template_id: string | null
        }
        Insert: {
          communication_type: string
          external_id?: string | null
          id?: string
          lead_id: string
          message_content?: string | null
          sent_at?: string
          sent_by: string
          status?: string | null
          template_id?: string | null
        }
        Update: {
          communication_type?: string
          external_id?: string | null
          id?: string
          lead_id?: string
          message_content?: string | null
          sent_at?: string
          sent_by?: string
          status?: string | null
          template_id?: string | null
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          achievements: string | null
          call_sheet_attached: boolean | null
          challenges_faced: string | null
          created_at: string
          deals_closed: number | null
          follow_ups_pending: number | null
          id: string
          leads_contacted: number | null
          meetings_scheduled: number | null
          next_day_plan: string | null
          report_date: string
          revenue_generated: number | null
          site_visits: number | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          achievements?: string | null
          call_sheet_attached?: boolean | null
          challenges_faced?: string | null
          created_at?: string
          deals_closed?: number | null
          follow_ups_pending?: number | null
          id?: string
          leads_contacted?: number | null
          meetings_scheduled?: number | null
          next_day_plan?: string | null
          report_date: string
          revenue_generated?: number | null
          site_visits?: number | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          achievements?: string | null
          call_sheet_attached?: boolean | null
          challenges_faced?: string | null
          created_at?: string
          deals_closed?: number | null
          follow_ups_pending?: number | null
          id?: string
          leads_contacted?: number | null
          meetings_scheduled?: number | null
          next_day_plan?: string | null
          report_date?: string
          revenue_generated?: number | null
          site_visits?: number | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      "inventory table": {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string | null
          Price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          Price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          Price?: number | null
        }
        Relationships: []
      }
      lead_property_interests: {
        Row: {
          created_at: string
          id: string
          interest_level: number | null
          lead_id: string
          notes: string | null
          property_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_level?: number | null
          lead_id: string
          notes?: string | null
          property_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_level?: number | null
          lead_id?: string
          notes?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_property_interests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_property_interests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_transfers: {
        Row: {
          from_user_id: string
          id: string
          lead_id: string
          reason: string | null
          to_user_id: string
          transferred_at: string
          transferred_by: string
        }
        Insert: {
          from_user_id: string
          id?: string
          lead_id: string
          reason?: string | null
          to_user_id: string
          transferred_at?: string
          transferred_by: string
        }
        Update: {
          from_user_id?: string
          id?: string
          lead_id?: string
          reason?: string | null
          to_user_id?: string
          transferred_at?: string
          transferred_by?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ai_insights: Json | null
          ai_last_analysis: string | null
          ai_score: number | null
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          last_contacted: string | null
          name: string
          next_followup: string | null
          notes: string | null
          phone: string
          preferred_location: string | null
          project_name: string | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          ai_insights?: Json | null
          ai_last_analysis?: string | null
          ai_score?: number | null
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          last_contacted?: string | null
          name: string
          next_followup?: string | null
          notes?: string | null
          phone: string
          preferred_location?: string | null
          project_name?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          ai_insights?: Json | null
          ai_last_analysis?: string | null
          ai_score?: number | null
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          last_contacted?: string | null
          name?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string
          preferred_location?: string | null
          project_name?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          manager_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[] | null
          area: number | null
          bathrooms: number | null
          bedrooms: number | null
          category: string | null
          city: string
          created_at: string
          created_by: string
          description: string | null
          floor: string | null
          id: string
          images: string[] | null
          latitude: number | null
          location: string
          longitude: number | null
          pincode: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          source_type: string | null
          state: string
          status: Database["public"]["Enums"]["property_status"]
          title: string
          towers: number | null
          updated_at: string
          updated_by: string | null
          wings: number | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string | null
          city: string
          created_at?: string
          created_by: string
          description?: string | null
          floor?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          location: string
          longitude?: number | null
          pincode?: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          source_type?: string | null
          state: string
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          towers?: number | null
          updated_at?: string
          updated_by?: string | null
          wings?: number | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string | null
          city?: string
          created_at?: string
          created_by?: string
          description?: string | null
          floor?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          pincode?: string | null
          price?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          source_type?: string | null
          state?: string
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          towers?: number | null
          updated_at?: string
          updated_by?: string | null
          wings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          data: Json | null
          filters: Json | null
          generated_at: string
          generated_by: string
          id: string
          is_public: boolean | null
          report_type: string
          title: string
        }
        Insert: {
          data?: Json | null
          filters?: Json | null
          generated_at?: string
          generated_by: string
          id?: string
          is_public?: boolean | null
          report_type: string
          title: string
        }
        Update: {
          data?: Json | null
          filters?: Json | null
          generated_at?: string
          generated_by?: string
          id?: string
          is_public?: boolean | null
          report_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          Title: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          Title?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          Title?: string | null
        }
        Relationships: []
      }
      sop_reports: {
        Row: {
          created_at: string
          files: string[] | null
          id: string
          notes: string | null
          report_date: string
          sop_items: Json
          status: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          files?: string[] | null
          id?: string
          notes?: string | null
          report_date: string
          sop_items?: Json
          status?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          files?: string[] | null
          id?: string
          notes?: string | null
          report_date?: string
          sop_items?: Json
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          priority: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          profile_id: string
          team_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          profile_id: string
          team_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          message_type: string | null
          recipient_id: string | null
          sender_id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          message_type?: string | null
          recipient_id?: string | null
          sender_id: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string | null
          recipient_id?: string | null
          sender_id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string
          id: string
          login_time: string | null
          logout_time: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_time?: string | null
          logout_time?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_time?: string | null
          logout_time?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visit_schedules: {
        Row: {
          assigned_to: string
          completion_rating: number | null
          created_at: string
          feedback: string | null
          id: string
          lead_id: string
          notes: string | null
          property_id: string
          scheduled_by: string
          status: string | null
          updated_at: string
          visit_date: string
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          assigned_to: string
          completion_rating?: number | null
          created_at?: string
          feedback?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          property_id: string
          scheduled_by: string
          status?: string | null
          updated_at?: string
          visit_date: string
          visitor_email?: string | null
          visitor_name: string
          visitor_phone: string
        }
        Update: {
          assigned_to?: string
          completion_rating?: number | null
          created_at?: string
          feedback?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          property_id?: string
          scheduled_by?: string
          status?: string | null
          updated_at?: string
          visit_date?: string
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      exec_sql: { Args: { sql_query: string }; Returns: string }
      get_user_profile: {
        Args: { user_uuid?: string }
        Returns: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          manager_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "task"
        | "property_visit"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      property_status:
        | "available"
        | "under_contract"
        | "sold"
        | "rented"
        | "off_market"
      property_type:
        | "apartment"
        | "villa"
        | "plot"
        | "commercial"
        | "office"
        | "warehouse"
      user_role: "admin" | "employee" | "manager"
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
      activity_type: [
        "call",
        "email",
        "meeting",
        "note",
        "task",
        "property_visit",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      property_status: [
        "available",
        "under_contract",
        "sold",
        "rented",
        "off_market",
      ],
      property_type: [
        "apartment",
        "villa",
        "plot",
        "commercial",
        "office",
        "warehouse",
      ],
      user_role: ["admin", "employee", "manager"],
    },
  },
} as const
