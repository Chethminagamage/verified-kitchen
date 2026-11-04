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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_detections: {
        Row: {
          compliant: boolean
          confidence: number
          created_at: string
          detected_at: string
          device_id: string | null
          id: number
          indicator: string
          inference_ms: number | null
          kitchen_id: string
          metadata: Json
          model_version: string
          pillar: Database["public"]["Enums"]["hygiene_pillar"]
        }
        Insert: {
          compliant: boolean
          confidence: number
          created_at?: string
          detected_at: string
          device_id?: string | null
          id?: never
          indicator: string
          inference_ms?: number | null
          kitchen_id: string
          metadata?: Json
          model_version: string
          pillar: Database["public"]["Enums"]["hygiene_pillar"]
        }
        Update: {
          compliant?: boolean
          confidence?: number
          created_at?: string
          detected_at?: string
          device_id?: string | null
          id?: never
          indicator?: string
          inference_ms?: number | null
          kitchen_id?: string
          metadata?: Json
          model_version?: string
          pillar?: Database["public"]["Enums"]["hygiene_pillar"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_detections_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_detections_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_detections_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
      }
      audit_records: {
        Row: {
          anchored_at: string | null
          chain_seq: number
          created_at: string
          event_hash: string
          event_payload: Json
          event_type: string
          fabric_block: number | null
          fabric_tx_id: string | null
          id: number
          kitchen_id: string
          prev_hash: string
          status: Database["public"]["Enums"]["audit_status"]
          violation_id: string | null
        }
        Insert: {
          anchored_at?: string | null
          chain_seq: number
          created_at?: string
          event_hash: string
          event_payload: Json
          event_type: string
          fabric_block?: number | null
          fabric_tx_id?: string | null
          id?: never
          kitchen_id: string
          prev_hash: string
          status?: Database["public"]["Enums"]["audit_status"]
          violation_id?: string | null
        }
        Update: {
          anchored_at?: string | null
          chain_seq?: number
          created_at?: string
          event_hash?: string
          event_payload?: Json
          event_type?: string
          fabric_block?: number | null
          fabric_tx_id?: string | null
          id?: never
          kitchen_id?: string
          prev_hash?: string
          status?: Database["public"]["Enums"]["audit_status"]
          violation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_records_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_records_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
          {
            foreignKeyName: "audit_records_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "violations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          id: string
          kitchen_id: string
          last_seen_at: string | null
          last_status: Json | null
          name: string
          type: Database["public"]["Enums"]["device_type"]
        }
        Insert: {
          created_at?: string
          id: string
          kitchen_id: string
          last_seen_at?: string | null
          last_status?: Json | null
          name: string
          type: Database["public"]["Enums"]["device_type"]
        }
        Update: {
          created_at?: string
          id?: string
          kitchen_id?: string
          last_seen_at?: string | null
          last_status?: Json | null
          name?: string
          type?: Database["public"]["Enums"]["device_type"]
        }
        Relationships: [
          {
            foreignKeyName: "devices_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
      }
      hygiene_scores: {
        Row: {
          computed_at: string
          config_id: number
          details: Json
          environmental_score: number | null
          food_prep_score: number | null
          id: number
          kitchen_id: string
          overall_score: number
          personal_score: number | null
          window_end: string
          window_start: string
        }
        Insert: {
          computed_at?: string
          config_id: number
          details?: Json
          environmental_score?: number | null
          food_prep_score?: number | null
          id?: never
          kitchen_id: string
          overall_score: number
          personal_score?: number | null
          window_end: string
          window_start: string
        }
        Update: {
          computed_at?: string
          config_id?: number
          details?: Json
          environmental_score?: number | null
          food_prep_score?: number | null
          id?: never
          kitchen_id?: string
          overall_score?: number
          personal_score?: number | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "hygiene_scores_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "scoring_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hygiene_scores_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hygiene_scores_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
      }
      kitchens: {
        Row: {
          code: string
          created_at: string
          id: string
          is_public: boolean
          location: string | null
          name: string
          timezone: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_public?: boolean
          location?: string | null
          name: string
          timezone?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_public?: boolean
          location?: string | null
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      scoring_configs: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          notes: string | null
          thresholds: Json
          version: string
          w_environmental: number
          w_food_prep: number
          w_personal: number
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          notes?: string | null
          thresholds?: Json
          version: string
          w_environmental: number
          w_food_prep: number
          w_personal: number
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          notes?: string | null
          thresholds?: Json
          version?: string
          w_environmental?: number
          w_food_prep?: number
          w_personal?: number
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          ambient_temp_c: number | null
          device_id: string
          device_ts: string
          fridge_temp_c: number | null
          humidity_pct: number | null
          id: number
          kitchen_id: string
          pressure_hpa: number | null
          received_at: string
          rssi: number | null
          sensor_status: Json | null
          seq: number | null
        }
        Insert: {
          ambient_temp_c?: number | null
          device_id: string
          device_ts: string
          fridge_temp_c?: number | null
          humidity_pct?: number | null
          id?: never
          kitchen_id: string
          pressure_hpa?: number | null
          received_at?: string
          rssi?: number | null
          sensor_status?: Json | null
          seq?: number | null
        }
        Update: {
          ambient_temp_c?: number | null
          device_id?: string
          device_ts?: string
          fridge_temp_c?: number | null
          humidity_pct?: number | null
          id?: never
          kitchen_id?: string
          pressure_hpa?: number | null
          received_at?: string
          rssi?: number | null
          sensor_status?: Json | null
          seq?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
      }
      user_kitchens: {
        Row: {
          kitchen_id: string
          user_id: string
        }
        Insert: {
          kitchen_id: string
          user_id: string
        }
        Update: {
          kitchen_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_kitchens_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_kitchens_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
          {
            foreignKeyName: "user_kitchens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          ai_confidence: number | null
          created_at: string
          description: string | null
          detection_id: number | null
          id: string
          indicator: string
          kitchen_id: string
          occurred_at: string
          pillar: Database["public"]["Enums"]["hygiene_pillar"]
          reading_id: number | null
          resolved_at: string | null
          score_impact: number | null
          sensor_unit: string | null
          sensor_value: number | null
          severity: Database["public"]["Enums"]["violation_severity"]
          source: Database["public"]["Enums"]["evidence_source"]
          status: Database["public"]["Enums"]["violation_status"]
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          ai_confidence?: number | null
          created_at?: string
          description?: string | null
          detection_id?: number | null
          id?: string
          indicator: string
          kitchen_id: string
          occurred_at: string
          pillar: Database["public"]["Enums"]["hygiene_pillar"]
          reading_id?: number | null
          resolved_at?: string | null
          score_impact?: number | null
          sensor_unit?: string | null
          sensor_value?: number | null
          severity: Database["public"]["Enums"]["violation_severity"]
          source: Database["public"]["Enums"]["evidence_source"]
          status?: Database["public"]["Enums"]["violation_status"]
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          ai_confidence?: number | null
          created_at?: string
          description?: string | null
          detection_id?: number | null
          id?: string
          indicator?: string
          kitchen_id?: string
          occurred_at?: string
          pillar?: Database["public"]["Enums"]["hygiene_pillar"]
          reading_id?: number | null
          resolved_at?: string | null
          score_impact?: number | null
          sensor_unit?: string | null
          sensor_value?: number | null
          severity?: Database["public"]["Enums"]["violation_severity"]
          source?: Database["public"]["Enums"]["evidence_source"]
          status?: Database["public"]["Enums"]["violation_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_detection_id_fkey"
            columns: ["detection_id"]
            isOneToOne: false
            referencedRelation: "ai_detections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
          {
            foreignKeyName: "violations_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "sensor_readings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_kitchen_scores: {
        Row: {
          code: string | null
          environmental_score: number | null
          food_prep_score: number | null
          kitchen_id: string | null
          last_updated: string | null
          location: string | null
          name: string | null
          overall_score: number | null
          personal_score: number | null
        }
        Relationships: []
      }
      public_score_history: {
        Row: {
          environmental_score: number | null
          food_prep_score: number | null
          hour: string | null
          kitchen_id: string | null
          overall_score: number | null
          personal_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hygiene_scores_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hygiene_scores_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
      }
    }
    Functions: {
      audit_hash: {
        Args: {
          p_created: string
          p_kitchen: string
          p_payload: Json
          p_prev: string
          p_type: string
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_kitchen_access: { Args: { p_kitchen: string }; Returns: boolean }
      hygiene_score_series: {
        Args: {
          p_bucket?: string
          p_from: string
          p_kitchen: string
          p_to: string
        }
        Returns: {
          bucket: string
          environmental_score: number
          food_prep_score: number
          overall_score: number
          personal_score: number
          samples: number
        }[]
      }
      verify_audit_chain: {
        Args: { p_kitchen: string }
        Returns: {
          audit_id: number
          chain_seq: number
          ok: boolean
          reason: string
        }[]
      }
    }
    Enums: {
      audit_status: "pending" | "verified" | "failed"
      device_type: "env_node" | "camera"
      evidence_source: "ai" | "sensor" | "system"
      hygiene_pillar: "personal" | "food_prep" | "environmental"
      user_role: "operator" | "phi" | "admin"
      violation_severity: "low" | "medium" | "high" | "critical"
      violation_status: "active" | "acknowledged" | "resolved"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      audit_status: ["pending", "verified", "failed"],
      device_type: ["env_node", "camera"],
      evidence_source: ["ai", "sensor", "system"],
      hygiene_pillar: ["personal", "food_prep", "environmental"],
      user_role: ["operator", "phi", "admin"],
      violation_severity: ["low", "medium", "high", "critical"],
      violation_status: ["active", "acknowledged", "resolved"],
    },
  },
} as const
