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
      admin_invites: {
        Row: {
          activated_at: string | null
          created_at: string
          email: string
          id: string
          institution_id: string | null
          invited_by: string
          status: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          email: string
          id?: string
          institution_id?: string | null
          invited_by: string
          status?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          email?: string
          id?: string
          institution_id?: string | null
          invited_by?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invites_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          institution_id: string | null
          is_active: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          is_active?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          is_active?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_keys_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          threshold_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          slug: string
          threshold_value?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          threshold_value?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          room_id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          room_id: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          room_id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      course_members: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          is_hidden: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          is_hidden?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          is_hidden?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          id: string
          label: string
          phase: string
          room_id: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          label: string
          phase: string
          room_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          label?: string
          phase?: string
          room_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          archived: boolean | null
          created_at: string | null
          criterion_id: string
          grade: string | null
          id: string
          problem_number: number | null
          professor_id: string
          room_id: string
          session_id: string | null
          student_id: string
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          criterion_id: string
          grade?: string | null
          id?: string
          problem_number?: number | null
          professor_id: string
          room_id: string
          session_id?: string | null
          student_id: string
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          criterion_id?: string
          grade?: string | null
          id?: string
          problem_number?: number | null
          professor_id?: string
          room_id?: string
          session_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_student_id_profiles_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      groups: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          is_hidden: boolean
          module_id: string | null
          name: string
          professor_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean
          module_id?: string | null
          name: string
          professor_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean
          module_id?: string | null
          name?: string
          professor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_professor_id_profiles_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      institutions: {
        Row: {
          brand_accent_color: string | null
          brand_logo_url: string | null
          brand_platform_name: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          created_at: string
          id: string
          is_hidden: boolean
          name: string
          owner_id: string | null
        }
        Insert: {
          brand_accent_color?: string | null
          brand_logo_url?: string | null
          brand_platform_name?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          name: string
          owner_id?: string | null
        }
        Update: {
          brand_accent_color?: string | null
          brand_logo_url?: string | null
          brand_platform_name?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      learning_objectives: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_essential: boolean
          module_id: string
          source_session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_essential?: boolean
          module_id: string
          source_session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_essential?: boolean
          module_id?: string
          source_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_objectives_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_objectives_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          is_hidden: boolean
          name: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          name: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_sessions: {
        Row: {
          confirmed_by: string
          created_at: string
          id: string
          objective_id: string
          session_id: string
        }
        Insert: {
          confirmed_by: string
          created_at?: string
          id?: string
          objective_id: string
          session_id: string
        }
        Update: {
          confirmed_by?: string
          created_at?: string
          id?: string
          objective_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_sessions_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_evaluations: {
        Row: {
          archived: boolean
          created_at: string | null
          criterion_id: string
          evaluator_id: string
          grade: string | null
          id: string
          is_self: boolean
          problem_number: number | null
          room_id: string
          session_id: string | null
          target_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string | null
          criterion_id: string
          evaluator_id: string
          grade?: string | null
          id?: string
          is_self?: boolean
          problem_number?: number | null
          room_id: string
          session_id?: string | null
          target_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string | null
          criterion_id?: string
          evaluator_id?: string
          grade?: string | null
          id?: string
          is_self?: boolean
          problem_number?: number | null
          room_id?: string
          session_id?: string | null
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_evaluations_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_evaluations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          professor_id: string
          session_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          professor_id: string
          session_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          professor_id?: string
          session_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_hidden: boolean
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_hidden?: boolean
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_hidden?: boolean
          user_id?: string
        }
        Relationships: []
      }
      room_scenarios: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          room_id: string
          scenario_content: string
          scenario_id: string | null
          sort_order: number | null
          tutor_glossary: Json | null
          tutor_questions: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          room_id: string
          scenario_content?: string
          scenario_id?: string | null
          sort_order?: number | null
          tutor_glossary?: Json | null
          tutor_questions?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          room_id?: string
          scenario_content?: string
          scenario_id?: string | null
          sort_order?: number | null
          tutor_glossary?: Json | null
          tutor_questions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "room_scenarios_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_scenarios_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          coordinator_id: string | null
          created_at: string | null
          current_step: number | null
          group_id: string
          id: string
          is_scenario_released: boolean | null
          is_scenario_visible_to_professor: boolean
          name: string
          professor_id: string
          reporter_id: string | null
          scenario: string | null
          status: string | null
          timer_end_at: string | null
          timer_running: boolean | null
          tutor_glossary: Json | null
          tutor_questions: Json | null
        }
        Insert: {
          coordinator_id?: string | null
          created_at?: string | null
          current_step?: number | null
          group_id: string
          id?: string
          is_scenario_released?: boolean | null
          is_scenario_visible_to_professor?: boolean
          name: string
          professor_id: string
          reporter_id?: string | null
          scenario?: string | null
          status?: string | null
          timer_end_at?: string | null
          timer_running?: boolean | null
          tutor_glossary?: Json | null
          tutor_questions?: Json | null
        }
        Update: {
          coordinator_id?: string | null
          created_at?: string | null
          current_step?: number | null
          group_id?: string
          id?: string
          is_scenario_released?: boolean | null
          is_scenario_visible_to_professor?: boolean
          name?: string
          professor_id?: string
          reporter_id?: string | null
          scenario?: string | null
          status?: string | null
          timer_end_at?: string | null
          timer_running?: boolean | null
          tutor_glossary?: Json | null
          tutor_questions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          id: string
          is_hidden: boolean
          module_id: string | null
          title: string
          tutor_glossary: Json | null
          tutor_questions: Json | null
          updated_at: string
        }
        Insert: {
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          module_id?: string | null
          title: string
          tutor_glossary?: Json | null
          tutor_questions?: Json | null
          updated_at?: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          module_id?: string | null
          title?: string
          tutor_glossary?: Json | null
          tutor_questions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      session_minutes: {
        Row: {
          content: Json
          created_at: string
          generated_by: string
          id: string
          is_released: boolean
          room_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          generated_by: string
          id?: string
          is_released?: boolean
          room_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          generated_by?: string
          id?: string
          is_released?: boolean
          room_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_minutes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_minutes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_references: {
        Row: {
          author_id: string
          created_at: string | null
          id: string
          ref_type: string
          room_id: string
          session_id: string | null
          title: string
          url: string
        }
        Insert: {
          author_id: string
          created_at?: string | null
          id?: string
          ref_type?: string
          room_id: string
          session_id?: string | null
          title?: string
          url: string
        }
        Update: {
          author_id?: string
          created_at?: string | null
          id?: string
          ref_type?: string
          room_id?: string
          session_id?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_references_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "session_references_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_references_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      step_items: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          room_id: string
          session_id: string | null
          step: number
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          room_id: string
          session_id?: string | null
          step: number
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          room_id?: string
          session_id?: string | null
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "step_items_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "step_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutorial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          ai_enabled: boolean | null
          cancel_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          institution_id: string
          max_rooms: number | null
          max_students: number | null
          owner_id: string
          plan_name: string | null
          status: string
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          whitelabel_enabled: boolean | null
        }
        Insert: {
          ai_enabled?: boolean | null
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          institution_id: string
          max_rooms?: number | null
          max_students?: number | null
          owner_id: string
          plan_name?: string | null
          status?: string
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          whitelabel_enabled?: boolean | null
        }
        Update: {
          ai_enabled?: boolean | null
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          institution_id?: string
          max_rooms?: number | null
          max_students?: number | null
          owner_id?: string
          plan_name?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          whitelabel_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_sessions: {
        Row: {
          coordinator_id: string | null
          current_step: number | null
          ended_at: string | null
          id: string
          label: string
          reporter_id: string | null
          room_id: string
          room_scenario_id: string
          started_at: string | null
          status: string | null
          timer_end_at: string | null
          timer_running: boolean | null
        }
        Insert: {
          coordinator_id?: string | null
          current_step?: number | null
          ended_at?: string | null
          id?: string
          label?: string
          reporter_id?: string | null
          room_id: string
          room_scenario_id: string
          started_at?: string | null
          status?: string | null
          timer_end_at?: string | null
          timer_running?: boolean | null
        }
        Update: {
          coordinator_id?: string | null
          current_step?: number | null
          ended_at?: string | null
          id?: string
          label?: string
          reporter_id?: string | null
          room_id?: string
          room_scenario_id?: string
          started_at?: string | null
          status?: string | null
          timer_end_at?: string | null
          timer_running?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_sessions_room_scenario_id_fkey"
            columns: ["room_scenario_id"]
            isOneToOne: false
            referencedRelation: "room_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          metadata: Json | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      is_course_in_admin_institution: {
        Args: { _admin_id: string; _course_id: string }
        Returns: boolean
      }
      is_course_member: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_in_admin_institution: {
        Args: { _admin_id: string; _group_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _student_id: string }
        Returns: boolean
      }
      is_group_professor: {
        Args: { _group_id: string; _professor_id: string }
        Returns: boolean
      }
      is_institution_admin: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_institution_member: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_effectively_hidden: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_user_in_admin_institution: {
        Args: { _admin_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "professor" | "student" | "institution_admin"
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
      app_role: ["admin", "professor", "student", "institution_admin"],
    },
  },
} as const
