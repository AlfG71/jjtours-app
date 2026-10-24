// Generated from Supabase project jjtours-phase-a (gtifcktipzdeipilywlt). Regenerate after schema changes.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_users: {
        Row: { created_at: string; user_id: string }
        Insert: { created_at?: string; user_id: string }
        Update: { created_at?: string; user_id?: string }
        Relationships: []
      }
      app_settings: {
        Row: { currency: string; default_min_seats: number; id: boolean; seat_hold_minutes: number; updated_at: string }
        Insert: { currency?: string; default_min_seats?: number; id?: boolean; seat_hold_minutes?: number; updated_at?: string }
        Update: { currency?: string; default_min_seats?: number; id?: boolean; seat_hold_minutes?: number; updated_at?: string }
        Relationships: []
      }
      bookings: {
        Row: {
          admin_notes: string | null
          amount_cents: number | null
          cancelled_at: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          departure_id: string
          handled_at: string | null
          handled_by: string | null
          hold_expires_at: string | null
          id: string
          locale: string
          refunded_cents: number
          reminder_sent_at: string | null
          seats: number
          status: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          ticket_code: string
          unit_price_cents: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_cents?: number | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          departure_id: string
          handled_at?: string | null
          handled_by?: string | null
          hold_expires_at?: string | null
          id?: string
          locale?: string
          refunded_cents?: number
          reminder_sent_at?: string | null
          seats: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          ticket_code?: string
          unit_price_cents: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          departure_id?: string
          handled_at?: string | null
          handled_by?: string | null
          hold_expires_at?: string | null
          id?: string
          locale?: string
          refunded_cents?: number
          reminder_sent_at?: string | null
          seats?: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          ticket_code?: string
          unit_price_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          { foreignKeyName: "bookings_departure_id_fkey"; columns: ["departure_id"]; isOneToOne: false; referencedRelation: "departure_availability"; referencedColumns: ["departure_id"] },
          { foreignKeyName: "bookings_departure_id_fkey"; columns: ["departure_id"]; isOneToOne: false; referencedRelation: "departures"; referencedColumns: ["id"] },
        ]
      }
      buses: {
        Row: { created_at: string; id: string; is_phase_a_pool: boolean; name: string; seats: number }
        Insert: { created_at?: string; id?: string; is_phase_a_pool?: boolean; name: string; seats: number }
        Update: { created_at?: string; id?: string; is_phase_a_pool?: boolean; name?: string; seats?: number }
        Relationships: []
      }
      departures: {
        Row: {
          bus_id: string | null
          capacity: number
          created_at: string
          id: string
          min_seats: number | null
          notes: string | null
          quorum_cutoff_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["departure_status"]
          status_changed_at: string | null
          status_changed_by: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          bus_id?: string | null
          capacity?: number
          created_at?: string
          id?: string
          min_seats?: number | null
          notes?: string | null
          quorum_cutoff_at?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["departure_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          bus_id?: string | null
          capacity?: number
          created_at?: string
          id?: string
          min_seats?: number | null
          notes?: string | null
          quorum_cutoff_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["departure_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "departures_bus_id_fkey"; columns: ["bus_id"]; isOneToOne: false; referencedRelation: "buses"; referencedColumns: ["id"] },
          { foreignKeyName: "departures_tour_id_fkey"; columns: ["tour_id"]; isOneToOne: false; referencedRelation: "tours"; referencedColumns: ["id"] },
        ]
      }
      refund_tiers: {
        Row: { id: string; label_en: string | null; label_es: string | null; min_hours_before: number; refund_percent: number }
        Insert: { id?: string; label_en?: string | null; label_es?: string | null; min_hours_before: number; refund_percent: number }
        Update: { id?: string; label_en?: string | null; label_es?: string | null; min_hours_before?: number; refund_percent?: number }
        Relationships: []
      }
      tours: {
        Row: {
          cover_photo_path: string | null
          created_at: string
          description_en: string | null
          description_es: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          min_seats: number | null
          name_en: string
          name_es: string
          photo_paths: string[]
          pickup_info_en: string | null
          pickup_info_es: string | null
          price_cents: number
          slug: string
          sort_order: number
          summary_en: string | null
          summary_es: string | null
          third_party_logistics: boolean
          updated_at: string
        }
        Insert: {
          cover_photo_path?: string | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          min_seats?: number | null
          name_en: string
          name_es: string
          photo_paths?: string[]
          pickup_info_en?: string | null
          pickup_info_es?: string | null
          price_cents: number
          slug: string
          sort_order?: number
          summary_en?: string | null
          summary_es?: string | null
          third_party_logistics?: boolean
          updated_at?: string
        }
        Update: {
          cover_photo_path?: string | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          min_seats?: number | null
          name_en?: string
          name_es?: string
          photo_paths?: string[]
          pickup_info_en?: string | null
          pickup_info_es?: string | null
          price_cents?: number
          slug?: string
          sort_order?: number
          summary_en?: string | null
          summary_es?: string | null
          third_party_logistics?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      departure_availability: {
        Row: {
          bookings_confirmed: number | null
          capacity: number | null
          departure_id: string | null
          min_seats: number | null
          seats_available: number | null
          seats_confirmed: number | null
          seats_held: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["departure_status"] | null
          tour_id: string | null
        }
        Relationships: [
          { foreignKeyName: "departures_tour_id_fkey"; columns: ["tour_id"]; isOneToOne: false; referencedRelation: "tours"; referencedColumns: ["id"] },
        ]
      }
    }
    Functions: {
      create_seat_hold: {
        Args: { p_departure_id: string; p_email: string; p_locale: string; p_name: string; p_phone: string; p_seats: number; p_user_id?: string }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
        SetofOptions: { from: "*"; to: "bookings"; isOneToOne: true; isSetofReturn: false }
      }
      is_admin: { Args: never; Returns: boolean }
      refund_percent_for: { Args: { p_at?: string; p_departure_id: string }; Returns: number }
      tour_availability: {
        Args: { p_from?: string; p_to?: string; p_tour_id: string }
        Returns: {
          capacity: number
          departure_id: string
          seats_available: number
          starts_at: string
          status: Database["public"]["Enums"]["departure_status"]
        }[]
      }
    }
    Enums: {
      booking_status: "pending_payment" | "confirmed" | "cancelled" | "refunded" | "expired"
      departure_status: "scheduled" | "confirmed" | "cancelled" | "completed"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      booking_status: ["pending_payment", "confirmed", "cancelled", "refunded", "expired"],
      departure_status: ["scheduled", "confirmed", "cancelled", "completed"],
    },
  },
} as const
