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
      calendar_event_notification_deliveries: {
        Row: {
          attempt_number: number
          attempted_at: string
          channel: Database["public"]["Enums"]["reminder_channel"]
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json
          provider_message_id: string | null
          reminder_id: string
          status: Database["public"]["Enums"]["notification_delivery_status"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          attempt_number: number
          attempted_at?: string
          channel: Database["public"]["Enums"]["reminder_channel"]
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          reminder_id: string
          status: Database["public"]["Enums"]["notification_delivery_status"]
          user_id: string
          workspace_id: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          channel?: Database["public"]["Enums"]["reminder_channel"]
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          reminder_id?: string
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_deliveries_membership_fk"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
          {
            foreignKeyName: "calendar_event_notification_deliveries_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "calendar_event_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_participants: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_participants_event_fk"
            columns: ["event_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "calendar_event_participants_membership_fk"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
        ]
      }
      calendar_event_reminders: {
        Row: {
          attempt_count: number
          channel: Database["public"]["Enums"]["reminder_channel"]
          created_at: string
          event_id: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          offset_minutes: number
          preset: Database["public"]["Enums"]["reminder_preset"]
          remind_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          attempt_count?: number
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          event_id: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          offset_minutes: number
          preset: Database["public"]["Enums"]["reminder_preset"]
          remind_at: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          attempt_count?: number
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          event_id?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          offset_minutes?: number
          preset?: Database["public"]["Enums"]["reminder_preset"]
          remind_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_reminders_event_fk"
            columns: ["event_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "calendar_event_reminders_membership_fk"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_routine_occurrence: boolean
          routine_id: string | null
          routine_occurrence_date: string | null
          starts_at: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_routine_occurrence?: boolean
          routine_id?: string | null
          routine_occurrence_date?: string | null
          starts_at: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["calendar_event_category"]
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_routine_occurrence?: boolean
          routine_id?: string | null
          routine_occurrence_date?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "calendar_routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_routine_participants: {
        Row: {
          created_at: string
          routine_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          routine_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          routine_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_routine_participants_membership_fk"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
          {
            foreignKeyName: "calendar_routine_participants_routine_fk"
            columns: ["routine_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "calendar_routines"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      calendar_routine_reminder_presets: {
        Row: {
          created_at: string
          preset: Database["public"]["Enums"]["reminder_preset"]
          routine_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          preset: Database["public"]["Enums"]["reminder_preset"]
          routine_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          preset?: Database["public"]["Enums"]["reminder_preset"]
          routine_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_routine_presets_routine_fk"
            columns: ["routine_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "calendar_routines"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      calendar_routines: {
        Row: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at: string
          created_by: string
          day_of_month: number | null
          days_of_week: number[] | null
          description: string | null
          end_time: string | null
          ends_on: string | null
          id: string
          is_active: boolean
          recurrence_interval: number
          recurrence_type: Database["public"]["Enums"]["calendar_routine_recurrence"]
          start_time: string
          starts_on: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at?: string
          created_by: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          description?: string | null
          end_time?: string | null
          ends_on?: string | null
          id?: string
          is_active?: boolean
          recurrence_interval?: number
          recurrence_type: Database["public"]["Enums"]["calendar_routine_recurrence"]
          start_time: string
          starts_on: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["calendar_event_category"]
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          description?: string | null
          end_time?: string | null
          ends_on?: string | null
          id?: string
          is_active?: boolean
          recurrence_interval?: number
          recurrence_type?: Database["public"]["Enums"]["calendar_routine_recurrence"]
          start_time?: string
          starts_on?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_routines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_routines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mushroom_board_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          note_date: string
          priority: number
          request_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          note_date: string
          priority?: number
          request_id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          note_date?: string
          priority?: number
          request_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mushroom_board_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mushroom_board_notes_creator_membership_fk"
            columns: ["workspace_id", "created_by"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
          {
            foreignKeyName: "mushroom_board_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempt_number: number
          attempted_at: string
          channel: Database["public"]["Enums"]["reminder_channel"]
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json
          provider_message_id: string | null
          reminder_id: string
          status: Database["public"]["Enums"]["notification_delivery_status"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          attempt_number: number
          attempted_at?: string
          channel: Database["public"]["Enums"]["reminder_channel"]
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          reminder_id: string
          status: Database["public"]["Enums"]["notification_delivery_status"]
          user_id: string
          workspace_id: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          channel?: Database["public"]["Enums"]["reminder_channel"]
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          reminder_id?: string
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "task_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_user_membership_fk"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          telegram_chat_id: string | null
          telegram_connected_at: string | null
          telegram_username: string | null
          theme_preference: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          telegram_chat_id?: string | null
          telegram_connected_at?: string | null
          telegram_username?: string | null
          theme_preference?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          telegram_chat_id?: string | null
          telegram_connected_at?: string | null
          telegram_username?: string | null
          theme_preference?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_workspace_fk"
            columns: ["company_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_links: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          note: string | null
          project_id: string | null
          task_id: string | null
          title: string
          type: Database["public"]["Enums"]["resource_link_type"]
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          project_id?: string | null
          task_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["resource_link_type"]
          updated_at?: string
          url: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          project_id?: string | null
          task_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["resource_link_type"]
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_links_company_workspace_fk"
            columns: ["company_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "resource_links_creator_membership_fk"
            columns: ["workspace_id", "created_by"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
          {
            foreignKeyName: "resource_links_project_workspace_fk"
            columns: ["project_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "resource_links_task_workspace_fk"
            columns: ["task_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "resource_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activities: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          request_id: string | null
          task_id: string | null
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description: string
          entity_id: string
          entity_type?: string
          event_type: string
          id?: string
          metadata?: Json
          request_id?: string | null
          task_id?: string | null
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json
          request_id?: string | null
          task_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activities_task_workspace_fk"
            columns: ["task_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "task_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders: {
        Row: {
          attempt_count: number
          channel: Database["public"]["Enums"]["reminder_channel"]
          created_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          offset_minutes: number
          preset: Database["public"]["Enums"]["reminder_preset"]
          remind_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          task_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          attempt_count?: number
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          offset_minutes: number
          preset: Database["public"]["Enums"]["reminder_preset"]
          remind_at: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          task_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          attempt_count?: number
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          offset_minutes?: number
          preset?: Database["public"]["Enums"]["reminder_preset"]
          remind_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          task_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_task_workspace_fk"
            columns: ["task_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "task_reminders_user_membership_fk"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          cancellation_note: string | null
          cancellation_reason:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at: string | null
          checklist: Json
          company_id: string
          completed_at: string | null
          completion_note: string | null
          created_at: string
          created_by: string | null
          delivered: boolean
          description: string
          due_at: string | null
          feedback_received: boolean
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          result_note: string | null
          revisions_completed: boolean
          size: Database["public"]["Enums"]["task_size"]
          status: Database["public"]["Enums"]["task_status"]
          successfully_closed: boolean
          tags: string[]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          cancellation_note?: string | null
          cancellation_reason?:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at?: string | null
          checklist?: Json
          company_id: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          delivered?: boolean
          description?: string
          due_at?: string | null
          feedback_received?: boolean
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          result_note?: string | null
          revisions_completed?: boolean
          size?: Database["public"]["Enums"]["task_size"]
          status?: Database["public"]["Enums"]["task_status"]
          successfully_closed?: boolean
          tags?: string[]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          cancellation_note?: string | null
          cancellation_reason?:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at?: string | null
          checklist?: Json
          company_id?: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          delivered?: boolean
          description?: string
          due_at?: string | null
          feedback_received?: boolean
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          result_note?: string | null
          revisions_completed?: boolean
          size?: Database["public"]["Enums"]["task_size"]
          status?: Database["public"]["Enums"]["task_status"]
          successfully_closed?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_membership_fk"
            columns: ["workspace_id", "assignee_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_workspace_company_fk"
            columns: ["project_id", "workspace_id", "company_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "workspace_id", "company_id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
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
      apply_bulk_task_action: {
        Args: {
          action_request_id: string
          action_type: string
          target_assignee_id?: string
          target_cancellation_note?: string
          target_cancellation_reason?: Database["public"]["Enums"]["cancellation_reason"]
          target_due_at?: string
          target_priority?: Database["public"]["Enums"]["task_priority"]
          target_status?: Database["public"]["Enums"]["task_status"]
          target_task_id: string
        }
        Returns: {
          assignee_id: string | null
          cancellation_note: string | null
          cancellation_reason:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at: string | null
          checklist: Json
          company_id: string
          completed_at: string | null
          completion_note: string | null
          created_at: string
          created_by: string | null
          delivered: boolean
          description: string
          due_at: string | null
          feedback_received: boolean
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          result_note: string | null
          revisions_completed: boolean
          size: Database["public"]["Enums"]["task_size"]
          status: Database["public"]["Enums"]["task_status"]
          successfully_closed: boolean
          tags: string[]
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_task_secure: {
        Args: {
          action_request_id: string
          target_cancellation_note: string
          target_cancellation_reason: Database["public"]["Enums"]["cancellation_reason"]
          target_task_id: string
        }
        Returns: {
          assignee_id: string | null
          cancellation_note: string | null
          cancellation_reason:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at: string | null
          checklist: Json
          company_id: string
          completed_at: string | null
          completion_note: string | null
          created_at: string
          created_by: string | null
          delivered: boolean
          description: string
          due_at: string | null
          feedback_received: boolean
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          result_note: string | null
          revisions_completed: boolean
          size: Database["public"]["Enums"]["task_size"]
          status: Database["public"]["Enums"]["task_status"]
          successfully_closed: boolean
          tags: string[]
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_due_calendar_event_reminders: {
        Args: { batch_size?: number }
        Returns: {
          attempt_number: number
          channel: Database["public"]["Enums"]["reminder_channel"]
          event_id: string
          event_title: string
          preset: Database["public"]["Enums"]["reminder_preset"]
          reminder_id: string
          starts_at: string
          user_id: string
          workspace_id: string
        }[]
      }
      claim_due_reminders: {
        Args: { batch_size?: number }
        Returns: {
          attempt_number: number
          channel: Database["public"]["Enums"]["reminder_channel"]
          company_name: string
          due_at: string
          project_name: string
          reminder_id: string
          task_id: string
          task_title: string
          user_id: string
          workspace_id: string
        }[]
      }
      complete_task_secure: {
        Args: {
          action_request_id: string
          target_completed_at: string
          target_completion_note: string
          target_delivered: boolean
          target_feedback_received: boolean
          target_result_note: string
          target_revisions_completed: boolean
          target_successfully_closed: boolean
          target_task_id: string
        }
        Returns: {
          assignee_id: string | null
          cancellation_note: string | null
          cancellation_reason:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at: string | null
          checklist: Json
          company_id: string
          completed_at: string | null
          completion_note: string | null
          created_at: string
          created_by: string | null
          delivered: boolean
          description: string
          due_at: string | null
          feedback_received: boolean
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          result_note: string | null
          revisions_completed: boolean
          size: Database["public"]["Enums"]["task_size"]
          status: Database["public"]["Enums"]["task_status"]
          successfully_closed: boolean
          tags: string[]
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_primary_workspace: {
        Args: { target_workspace_id: string }
        Returns: string
      }
      consume_telegram_link_token: {
        Args: {
          target_chat_id: string
          target_token_hash: string
          target_username?: string
        }
        Returns: string
      }
      create_calendar_event: {
        Args: {
          event_category: Database["public"]["Enums"]["calendar_event_category"]
          event_description: string
          event_ends_at?: string
          event_starts_at: string
          event_title: string
          participant_ids: string[]
          reminder_presets: Database["public"]["Enums"]["reminder_preset"][]
        }
        Returns: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_routine_occurrence: boolean
          routine_id: string | null
          routine_occurrence_date: string | null
          starts_at: string
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "calendar_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_calendar_routine: {
        Args: {
          participant_ids: string[]
          reminder_presets: Database["public"]["Enums"]["reminder_preset"][]
          routine_category: Database["public"]["Enums"]["calendar_event_category"]
          routine_day_of_month?: number
          routine_days_of_week?: number[]
          routine_description?: string
          routine_end_time?: string
          routine_ends_on?: string
          routine_recurrence_interval?: number
          routine_recurrence_type: Database["public"]["Enums"]["calendar_routine_recurrence"]
          routine_start_time: string
          routine_starts_on: string
          routine_title: string
        }
        Returns: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at: string
          created_by: string
          day_of_month: number | null
          days_of_week: number[] | null
          description: string | null
          end_time: string | null
          ends_on: string | null
          id: string
          is_active: boolean
          recurrence_interval: number
          recurrence_type: Database["public"]["Enums"]["calendar_routine_recurrence"]
          start_time: string
          starts_on: string
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "calendar_routines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_mushroom_board_note: {
        Args: {
          note_content: string
          note_priority: number
          note_request_id: string
          target_note_date: string
          target_workspace_id: string
        }
        Returns: {
          content: string
          created_at: string
          created_by: string
          id: string
          note_date: string
          priority: number
          request_id: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "mushroom_board_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_task_activity: {
        Args: {
          action_request_id?: string
          target_description: string
          target_event_type: string
          target_metadata?: Json
          target_task_id: string
        }
        Returns: {
          actor_id: string | null
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          request_id: string | null
          task_id: string | null
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "task_activities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_calendar_event: {
        Args: { target_event_id: string }
        Returns: undefined
      }
      delete_calendar_routine: {
        Args: { target_routine_id: string }
        Returns: undefined
      }
      delete_mistaken_task: {
        Args: { target_task_id: string }
        Returns: undefined
      }
      ensure_primary_workspace_membership: {
        Args: { configured_primary_workspace_id: string }
        Returns: string
      }
      finish_calendar_event_reminder_attempt: {
        Args: {
          delivery_error?: string
          delivery_metadata?: Json
          delivery_succeeded: boolean
          external_message_id?: string
          target_attempt_number: number
          target_reminder_id: string
        }
        Returns: Database["public"]["Enums"]["reminder_status"]
      }
      finish_reminder_attempt: {
        Args: {
          delivery_error?: string
          delivery_metadata?: Json
          delivery_succeeded: boolean
          external_message_id?: string
          target_attempt_number: number
          target_reminder_id: string
        }
        Returns: Database["public"]["Enums"]["reminder_status"]
      }
      get_own_telegram_connection: {
        Args: never
        Returns: {
          connected: boolean
          connected_at: string
          username: string
        }[]
      }
      materialize_calendar_routine_occurrences: {
        Args: { horizon_days?: number }
        Returns: number
      }
      set_calendar_routine_active: {
        Args: { active: boolean; target_routine_id: string }
        Returns: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at: string
          created_by: string
          day_of_month: number | null
          days_of_week: number[] | null
          description: string | null
          end_time: string | null
          ends_on: string | null
          id: string
          is_active: boolean
          recurrence_interval: number
          recurrence_type: Database["public"]["Enums"]["calendar_routine_recurrence"]
          start_time: string
          starts_on: string
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "calendar_routines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_task_reminders:
        | {
            Args: { reminder_offsets: number[]; target_task_id: string }
            Returns: {
              attempt_count: number
              channel: Database["public"]["Enums"]["reminder_channel"]
              created_at: string
              id: string
              last_attempt_at: string | null
              last_error: string | null
              offset_minutes: number
              preset: Database["public"]["Enums"]["reminder_preset"]
              remind_at: string
              sent_at: string | null
              status: Database["public"]["Enums"]["reminder_status"]
              task_id: string
              updated_at: string
              user_id: string
              workspace_id: string
            }[]
            SetofOptions: {
              from: "*"
              to: "task_reminders"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              reminder_presets: Database["public"]["Enums"]["reminder_preset"][]
              target_task_id: string
            }
            Returns: {
              attempt_count: number
              channel: Database["public"]["Enums"]["reminder_channel"]
              created_at: string
              id: string
              last_attempt_at: string | null
              last_error: string | null
              offset_minutes: number
              preset: Database["public"]["Enums"]["reminder_preset"]
              remind_at: string
              sent_at: string | null
              status: Database["public"]["Enums"]["reminder_status"]
              task_id: string
              updated_at: string
              user_id: string
              workspace_id: string
            }[]
            SetofOptions: {
              from: "*"
              to: "task_reminders"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      update_calendar_event: {
        Args: {
          event_category: Database["public"]["Enums"]["calendar_event_category"]
          event_description: string
          event_ends_at?: string
          event_starts_at: string
          event_title: string
          participant_ids: string[]
          reminder_presets: Database["public"]["Enums"]["reminder_preset"][]
          target_event_id: string
        }
        Returns: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_routine_occurrence: boolean
          routine_id: string | null
          routine_occurrence_date: string | null
          starts_at: string
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "calendar_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_calendar_routine: {
        Args: {
          participant_ids: string[]
          reminder_presets: Database["public"]["Enums"]["reminder_preset"][]
          routine_category: Database["public"]["Enums"]["calendar_event_category"]
          routine_day_of_month?: number
          routine_days_of_week?: number[]
          routine_description?: string
          routine_end_time?: string
          routine_ends_on?: string
          routine_recurrence_interval?: number
          routine_recurrence_type: Database["public"]["Enums"]["calendar_routine_recurrence"]
          routine_start_time: string
          routine_starts_on: string
          routine_title: string
          target_routine_id: string
        }
        Returns: {
          category: Database["public"]["Enums"]["calendar_event_category"]
          created_at: string
          created_by: string
          day_of_month: number | null
          days_of_week: number[] | null
          description: string | null
          end_time: string | null
          ends_on: string | null
          id: string
          is_active: boolean
          recurrence_interval: number
          recurrence_type: Database["public"]["Enums"]["calendar_routine_recurrence"]
          start_time: string
          starts_on: string
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "calendar_routines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      calendar_event_category: "work" | "social"
      calendar_routine_recurrence: "daily" | "weekly" | "monthly"
      cancellation_reason:
        | "client_cancelled"
        | "no_longer_needed"
        | "merged"
        | "other"
      notification_delivery_status: "sent" | "failed"
      project_status: "active" | "on_hold" | "wrapping_up"
      reminder_channel: "telegram" | "push" | "email"
      reminder_preset:
        | "one_day_before"
        | "three_hours_before"
        | "at_deadline"
        | "one_hour_before"
        | "six_hours_before"
        | "three_days_before"
        | "five_days_before"
      reminder_status:
        | "pending"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      resource_link_type:
        | "drive"
        | "figma"
        | "github"
        | "vercel"
        | "document"
        | "other"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_size: "s" | "m" | "l" | "xl"
      task_status:
        | "todo"
        | "in_progress"
        | "waiting"
        | "review"
        | "completed"
        | "cancelled"
      workspace_role: "owner" | "member"
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
      calendar_event_category: ["work", "social"],
      calendar_routine_recurrence: ["daily", "weekly", "monthly"],
      cancellation_reason: [
        "client_cancelled",
        "no_longer_needed",
        "merged",
        "other",
      ],
      notification_delivery_status: ["sent", "failed"],
      project_status: ["active", "on_hold", "wrapping_up"],
      reminder_channel: ["telegram", "push", "email"],
      reminder_preset: [
        "one_day_before",
        "three_hours_before",
        "at_deadline",
        "one_hour_before",
        "six_hours_before",
        "three_days_before",
        "five_days_before",
      ],
      reminder_status: ["pending", "processing", "sent", "failed", "cancelled"],
      resource_link_type: [
        "drive",
        "figma",
        "github",
        "vercel",
        "document",
        "other",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_size: ["s", "m", "l", "xl"],
      task_status: [
        "todo",
        "in_progress",
        "waiting",
        "review",
        "completed",
        "cancelled",
      ],
      workspace_role: ["owner", "member"],
    },
  },
} as const
