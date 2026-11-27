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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          target_id: string
          target_label: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: number
          target_id: string
          target_label?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: number
          target_id?: string
          target_label?: string | null
          target_type?: string
        }
        Relationships: []
      }
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
            referencedRelation: "marketplace_kitchens"
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
            referencedRelation: "marketplace_kitchens"
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
            referencedRelation: "marketplace_kitchens"
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
            referencedRelation: "marketplace_kitchens"
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
      hygiene_scores_hourly: {
        Row: {
          bucket: string
          environmental_n: number
          environmental_sum: number
          food_prep_n: number
          food_prep_sum: number
          kitchen_id: string
          overall_sum: number
          personal_n: number
          personal_sum: number
          samples: number
        }
        Insert: {
          bucket: string
          environmental_n?: number
          environmental_sum?: number
          food_prep_n?: number
          food_prep_sum?: number
          kitchen_id: string
          overall_sum: number
          personal_n?: number
          personal_sum?: number
          samples: number
        }
        Update: {
          bucket?: string
          environmental_n?: number
          environmental_sum?: number
          food_prep_n?: number
          food_prep_sum?: number
          kitchen_id?: string
          overall_sum?: number
          personal_n?: number
          personal_sum?: number
          samples?: number
        }
        Relationships: [
          {
            foreignKeyName: "hygiene_scores_hourly_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hygiene_scores_hourly_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "marketplace_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hygiene_scores_hourly_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
      }
      kitchens: {
        Row: {
          published_at: string | null
          closes_at: string
          code: string
          created_at: string
          cuisine: string | null
          delivery_fee_lkr: number
          description: string | null
          emoji: string | null
          id: string
          is_public: boolean
          location: string | null
          name: string
          opens_at: string
          prep_minutes: number
          timezone: string
          banner_path: string | null
        }
        Insert: {
          published_at?: string | null
          closes_at?: string
          code: string
          created_at?: string
          cuisine?: string | null
          delivery_fee_lkr?: number
          description?: string | null
          emoji?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          name: string
          opens_at?: string
          prep_minutes?: number
          timezone?: string
          banner_path?: string | null
        }
        Update: {
          published_at?: string | null
          closes_at?: string
          code?: string
          created_at?: string
          cuisine?: string | null
          delivery_fee_lkr?: number
          description?: string | null
          emoji?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          name?: string
          opens_at?: string
          prep_minutes?: number
          timezone?: string
          banner_path?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          is_available: boolean
          kitchen_id: string
          name: string
          price_lkr: number
          sort_order: number
          image_path: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_available?: boolean
          kitchen_id: string
          name: string
          price_lkr: number
          sort_order?: number
          image_path?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_available?: boolean
          kitchen_id?: string
          name?: string
          price_lkr?: number
          sort_order?: number
          image_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "marketplace_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
      }
      order_feedback: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string | null
          kitchen_id: string
          order_id: string
          problem: string | null
          rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          kitchen_id: string
          order_id: string
          problem?: string | null
          rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          kitchen_id?: string
          order_id?: string
          problem?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          line_total_lkr: number | null
          menu_item_id: string | null
          name: string
          order_id: string
          quantity: number
          unit_price_lkr: number
        }
        Insert: {
          line_total_lkr?: number | null
          menu_item_id?: string | null
          name: string
          order_id: string
          quantity: number
          unit_price_lkr: number
        }
        Update: {
          line_total_lkr?: number | null
          menu_item_id?: string | null
          name?: string
          order_id?: string
          quantity?: number
          unit_price_lkr?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          contact_phone: string
          customer_name: string | null
          customer_id: string
          delivered_at: string | null
          delivery_address: string
          delivery_fee_lkr: number
          hygiene_grade_at_order: string | null
          hygiene_status_at_order: string
          id: string
          kitchen_id: string
          note: string | null
          on_the_way_at: string | null
          payment_method: string
          placed_at: string
          preparing_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_lkr: number
          total_lkr: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          contact_phone: string
          customer_name?: string | null
          customer_id: string
          delivered_at?: string | null
          delivery_address: string
          delivery_fee_lkr: number
          hygiene_grade_at_order?: string | null
          hygiene_status_at_order?: string
          id?: string
          kitchen_id: string
          note?: string | null
          on_the_way_at?: string | null
          payment_method?: string
          placed_at?: string
          preparing_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_lkr?: number
          total_lkr?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          contact_phone?: string
          customer_name?: string | null
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string
          delivery_fee_lkr?: number
          hygiene_grade_at_order?: string | null
          hygiene_status_at_order?: string
          id?: string
          kitchen_id?: string
          note?: string | null
          on_the_way_at?: string | null
          payment_method?: string
          placed_at?: string
          preparing_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_lkr?: number
          total_lkr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "marketplace_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
      }
      profiles: {
        Row: {
          disabled_at: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          disabled_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          disabled_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      public_ratings: {
        Row: {
          computed_at: string
          config_version: string
          coverage: number
          details: Json
          environmental_score: number | null
          expected_hours: number
          food_prep_score: number | null
          grade: string | null
          kitchen_id: string
          last_score_at: string | null
          monitored_hours: number
          personal_score: number | null
          rating: number | null
          status: string
        }
        Insert: {
          computed_at?: string
          config_version: string
          coverage: number
          details?: Json
          environmental_score?: number | null
          expected_hours?: number
          food_prep_score?: number | null
          grade?: string | null
          kitchen_id: string
          last_score_at?: string | null
          monitored_hours?: number
          personal_score?: number | null
          rating?: number | null
          status: string
        }
        Update: {
          computed_at?: string
          config_version?: string
          coverage?: number
          details?: Json
          environmental_score?: number | null
          expected_hours?: number
          food_prep_score?: number | null
          grade?: string | null
          kitchen_id?: string
          last_score_at?: string | null
          monitored_hours?: number
          personal_score?: number | null
          rating?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_ratings_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: true
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_ratings_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: true
            referencedRelation: "marketplace_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_ratings_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: true
            referencedRelation: "public_kitchen_scores"
            referencedColumns: ["kitchen_id"]
          },
        ]
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
            referencedRelation: "marketplace_kitchens"
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
            referencedRelation: "marketplace_kitchens"
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
            referencedRelation: "marketplace_kitchens"
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
      marketplace_kitchens: {
        Row: {
          closes_at: string | null
          coverage: number | null
          cuisine: string | null
          delivery_fee_lkr: number | null
          description: string | null
          emoji: string | null
          environmental_score: number | null
          food_prep_score: number | null
          grade: string | null
          id: string | null
          is_open: boolean | null
          last_score_at: string | null
          location: string | null
          monitored_now: boolean | null
          banner_path: string | null
          name: string | null
          opens_at: string | null
          personal_score: number | null
          prep_minutes: number | null
          rating: number | null
          rating_status: string | null
          rating_updated_at: string | null
          timezone: string | null
        }
        Relationships: []
      }
      marketplace_rating_history: {
        Row: {
          day: string | null
          environmental_score: number | null
          food_prep_score: number | null
          kitchen_id: string | null
          overall_score: number | null
          personal_score: number | null
          samples: number | null
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
            referencedRelation: "marketplace_kitchens"
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
            referencedRelation: "marketplace_kitchens"
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
      admin_create_kitchen: {
        Args: {
          p_closes_at: string
          p_cuisine: string | null
          p_delivery_fee_lkr: number
          p_description: string | null
          p_emoji: string | null
          p_location: string | null
          p_name: string
          p_opens_at: string
          p_prep_minutes: number
          p_timezone: string
        }
        Returns: string
      }
      admin_link_staff: {
        Args: { p_kitchen: string; p_user: string }
        Returns: undefined
      }
      admin_list_accounts: {
        Args: { p_user?: string }
        Returns: {
          created_at: string
          disabled_at: string | null
          email: string
          email_confirmed_at: string | null
          full_name: string | null
          invited_at: string | null
          kitchens: Json
          last_sign_in_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      admin_note_account_event: {
        Args: { p_action: string; p_user: string }
        Returns: undefined
      }
      admin_onboard_staff: {
        Args: {
          p_kitchen?: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_user: string
        }
        Returns: undefined
      }
      admin_register_device: {
        Args: {
          p_kitchen: string
          p_name: string
          p_type: Database["public"]["Enums"]["device_type"]
        }
        Returns: string
      }
      admin_remove_device: { Args: { p_device: string }; Returns: undefined }
      admin_rename_device: {
        Args: { p_device: string; p_name: string }
        Returns: undefined
      }
      admin_set_account_disabled: {
        Args: { p_disabled: boolean; p_user: string }
        Returns: undefined
      }
      admin_set_kitchen_published: {
        Args: { p_kitchen: string; p_published: boolean }
        Returns: undefined
      }
      admin_set_staff_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"]; p_user: string }
        Returns: undefined
      }
      admin_unlink_staff: {
        Args: { p_kitchen: string; p_user: string }
        Returns: undefined
      }
      admin_update_kitchen: {
        Args: {
          p_closes_at: string
          p_cuisine: string | null
          p_delivery_fee_lkr: number
          p_description: string | null
          p_emoji: string | null
          p_location: string | null
          p_name: string
          p_opens_at: string
          p_prep_minutes: number
          p_timezone: string
          p_kitchen: string
        }
        Returns: undefined
      }
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
      cancel_order: {
        Args: { p_order: string }
        Returns: Database["public"]["Enums"]["order_status"]
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
      is_open_at: {
        Args: {
          p_at: string
          p_closes: string
          p_opens: string
          p_timezone: string
        }
        Returns: boolean
      }
      is_public_kitchen: { Args: { p_kitchen: string }; Returns: boolean }
      kitchen_readiness: {
        Args: { p_kitchen: string }
        Returns: {
          blocking: boolean
          detail: string
          item: string
          label: string
          ok: boolean
        }[]
      }
      place_order: {
        Args: {
          p_contact_phone: string
          p_delivery_address: string
          p_items: Json
          p_kitchen: string
          p_note?: string
        }
        Returns: string
      }
      purge_old_evidence: {
        Args: { p_keep?: string }
        Returns: {
          deleted_detections: number
          deleted_readings: number
          deleted_scores: number
          rolled_up_rows: number
        }[]
      }
      sensor_reading_series: {
        Args: {
          p_bucket?: string
          p_from: string
          p_kitchen: string
          p_to: string
        }
        Returns: {
          ambient_avg: number
          ambient_max: number
          ambient_min: number
          bucket: string
          fridge_avg: number
          fridge_max: number
          fridge_min: number
          humidity_avg: number
          humidity_max: number
          humidity_min: number
          pressure_avg: number
          samples: number
        }[]
      }
      update_order_status: {
        Args: {
          p_order: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Database["public"]["Enums"]["order_status"]
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
      order_status:
        | "placed"
        | "accepted"
        | "preparing"
        | "on_the_way"
        | "delivered"
        | "cancelled"
      user_role: "operator" | "phi" | "admin" | "customer"
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
      order_status: [
        "placed",
        "accepted",
        "preparing",
        "on_the_way",
        "delivered",
        "cancelled",
      ],
      user_role: ["operator", "phi", "admin", "customer"],
      violation_severity: ["low", "medium", "high", "critical"],
      violation_status: ["active", "acknowledged", "resolved"],
    },
  },
} as const
