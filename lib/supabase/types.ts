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
      admin_users: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_db_role: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip: unknown
        }
        Insert: {
          action: string
          actor_db_role?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip?: unknown
        }
        Update: {
          action?: string
          actor_db_role?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip?: unknown
        }
        Relationships: []
      }
      booking_travelers: {
        Row: {
          age: number | null
          booking_id: string
          emergency_contact: string | null
          full_name: string
          gender: string | null
          id: string
          is_lead: boolean
          phone: string | null
        }
        Insert: {
          age?: number | null
          booking_id: string
          emergency_contact?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_lead?: boolean
          phone?: string | null
        }
        Update: {
          age?: number | null
          booking_id?: string
          emergency_contact?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_lead?: boolean
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_travelers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_paid_paise: number
          amount_refunded_paise: number
          attributed_creator_id: string | null
          attribution_link_id: string | null
          attribution_source:
            | Database["public"]["Enums"]["attribution_source"]
            | null
          attribution_visitor_id: string | null
          balance_due_date: string | null
          booking_ref: string
          cancel_reason: string | null
          cancellation_policy_snapshot: Json
          cancelled_at: string | null
          cancelled_by: string | null
          confirmed_at: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          coupon_id: string | null
          created_at: string
          creator_commission_pct: number | null
          departure_id: string
          deposit_paise: number
          discount_paise: number
          gst_paise: number
          gst_rate_pct: number
          hold_expires_at: string | null
          id: string
          lead_id: string | null
          org_id: string
          pickup_point_id: string | null
          platform_fee_pct: number
          price_option_id: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          subtotal_paise: number
          taxable_paise: number
          tcs_overseas_paise: number
          total_paise: number
          traveler_user_id: string
          travelers_count: number
          trip_id: string
          unit_price_paise: number
          updated_at: string
        }
        Insert: {
          amount_paid_paise?: number
          amount_refunded_paise?: number
          attributed_creator_id?: string | null
          attribution_link_id?: string | null
          attribution_source?:
            | Database["public"]["Enums"]["attribution_source"]
            | null
          attribution_visitor_id?: string | null
          balance_due_date?: string | null
          booking_ref?: string
          cancel_reason?: string | null
          cancellation_policy_snapshot: Json
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmed_at?: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          coupon_id?: string | null
          created_at?: string
          creator_commission_pct?: number | null
          departure_id: string
          deposit_paise?: number
          discount_paise?: number
          gst_paise: number
          gst_rate_pct: number
          hold_expires_at?: string | null
          id?: string
          lead_id?: string | null
          org_id: string
          pickup_point_id?: string | null
          platform_fee_pct: number
          price_option_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_paise: number
          taxable_paise: number
          tcs_overseas_paise?: number
          total_paise: number
          traveler_user_id: string
          travelers_count: number
          trip_id: string
          unit_price_paise: number
          updated_at?: string
        }
        Update: {
          amount_paid_paise?: number
          amount_refunded_paise?: number
          attributed_creator_id?: string | null
          attribution_link_id?: string | null
          attribution_source?:
            | Database["public"]["Enums"]["attribution_source"]
            | null
          attribution_visitor_id?: string | null
          balance_due_date?: string | null
          booking_ref?: string
          cancel_reason?: string | null
          cancellation_policy_snapshot?: Json
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmed_at?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          coupon_id?: string | null
          created_at?: string
          creator_commission_pct?: number | null
          departure_id?: string
          deposit_paise?: number
          discount_paise?: number
          gst_paise?: number
          gst_rate_pct?: number
          hold_expires_at?: string | null
          id?: string
          lead_id?: string | null
          org_id?: string
          pickup_point_id?: string | null
          platform_fee_pct?: number
          price_option_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_paise?: number
          taxable_paise?: number
          tcs_overseas_paise?: number
          total_paise?: number
          traveler_user_id?: string
          travelers_count?: number
          trip_id?: string
          unit_price_paise?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_attributed_creator_id_fkey"
            columns: ["attributed_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_attribution_link_id_fkey"
            columns: ["attribution_link_id"]
            isOneToOne: false
            referencedRelation: "creator_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "trip_pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_price_option_id_fkey"
            columns: ["price_option_id"]
            isOneToOne: false
            referencedRelation: "departure_price_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_traveler_user_id_fkey"
            columns: ["traveler_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          created_at: string
          deposit_non_refundable: boolean
          id: string
          is_system: boolean
          name: string
          org_id: string | null
          rules: Json
          zero_refund_within_days: number
        }
        Insert: {
          created_at?: string
          deposit_non_refundable?: boolean
          id?: string
          is_system?: boolean
          name: string
          org_id?: string | null
          rules: Json
          zero_refund_within_days: number
        }
        Update: {
          created_at?: string
          deposit_non_refundable?: boolean
          id?: string
          is_system?: boolean
          name?: string
          org_id?: string | null
          rules?: Json
          zero_refund_within_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          created_at: string
          creator_id: string
          id: number
          ip_hash: string | null
          is_bot: boolean
          link_id: string | null
          referrer: string | null
          trip_id: string | null
          ua_hash: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: never
          ip_hash?: string | null
          is_bot?: boolean
          link_id?: string | null
          referrer?: string | null
          trip_id?: string | null
          ua_hash?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: never
          ip_hash?: string | null
          is_bot?: boolean
          link_id?: string | null
          referrer?: string | null
          trip_id?: string | null
          ua_hash?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clicks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "creator_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_overrides: {
        Row: {
          commission_pct: number
          created_at: string
          creator_id: string
          id: string
          trip_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          commission_pct: number
          created_at?: string
          creator_id: string
          id?: string
          trip_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          commission_pct?: number
          created_at?: string
          creator_id?: string
          id?: string
          trip_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_overrides_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_overrides_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount_paise: number
          base_paise: number
          booking_id: string
          booking_ref: string
          confirmable_at: string
          confirmed_at: string | null
          created_at: string
          creator_id: string
          departure_start: string
          hold_reason: string | null
          id: string
          payable_at: string
          payout_id: string | null
          pct: number
          reversed_reason: string | null
          status: Database["public"]["Enums"]["commission_status"]
          travelers_count: number
          trip_title: string
          updated_at: string
        }
        Insert: {
          amount_paise: number
          base_paise: number
          booking_id: string
          booking_ref: string
          confirmable_at: string
          confirmed_at?: string | null
          created_at?: string
          creator_id: string
          departure_start: string
          hold_reason?: string | null
          id?: string
          payable_at: string
          payout_id?: string | null
          pct: number
          reversed_reason?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          travelers_count: number
          trip_title: string
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          base_paise?: number
          booking_id?: string
          booking_ref?: string
          confirmable_at?: string
          confirmed_at?: string | null
          created_at?: string
          creator_id?: string
          departure_start?: string
          hold_reason?: string | null
          id?: string
          payable_at?: string
          payout_id?: string | null
          pct?: number
          reversed_reason?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          travelers_count?: number
          trip_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          purpose: string
          user_id: string
          version: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: string
          purpose: string
          user_id: string
          version: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          purpose?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          funded_by: string
          id: string
          is_active: boolean
          max_discount_paise: number | null
          max_redemptions: number | null
          min_order_paise: number
          org_id: string | null
          redemptions: number
          trip_id: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          funded_by?: string
          id?: string
          is_active?: boolean
          max_discount_paise?: number | null
          max_redemptions?: number | null
          min_order_paise?: number
          org_id?: string | null
          redemptions?: number
          trip_id?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          funded_by?: string
          id?: string
          is_active?: boolean
          max_discount_paise?: number | null
          max_redemptions?: number | null
          min_order_paise?: number
          org_id?: string | null
          redemptions?: number
          trip_id?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_daily_stats: {
        Row: {
          bookings: number
          clicks: number
          commission_paise: number
          creator_id: string
          day: string
          gmv_paise: number
          leads: number
          link_id: string
          unique_visitors: number
        }
        Insert: {
          bookings?: number
          clicks?: number
          commission_paise?: number
          creator_id: string
          day: string
          gmv_paise?: number
          leads?: number
          link_id: string
          unique_visitors?: number
        }
        Update: {
          bookings?: number
          clicks?: number
          commission_paise?: number
          creator_id?: string
          day?: string
          gmv_paise?: number
          leads?: number
          link_id?: string
          unique_visitors?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_daily_stats_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_daily_stats_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "creator_links"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_links: {
        Row: {
          channel: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
          label: string | null
          trip_id: string | null
        }
        Insert: {
          channel?: string | null
          code?: string
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
          label?: string | null
          trip_id?: string | null
        }
        Update: {
          channel?: string | null
          code?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
          label?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_links_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_links_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_private: {
        Row: {
          agreement_accepted_at: string | null
          agreement_version: string | null
          creator_id: string
          gstin: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          pan_encrypted: string | null
          pan_last4: string | null
          pan_name: string | null
          payout_last4: string | null
          payout_method: string | null
          razorpayx_contact_id: string | null
          razorpayx_fund_account_id: string | null
          updated_at: string
        }
        Insert: {
          agreement_accepted_at?: string | null
          agreement_version?: string | null
          creator_id: string
          gstin?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          pan_encrypted?: string | null
          pan_last4?: string | null
          pan_name?: string | null
          payout_last4?: string | null
          payout_method?: string | null
          razorpayx_contact_id?: string | null
          razorpayx_fund_account_id?: string | null
          updated_at?: string
        }
        Update: {
          agreement_accepted_at?: string | null
          agreement_version?: string | null
          creator_id?: string
          gstin?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          pan_encrypted?: string | null
          pan_last4?: string | null
          pan_name?: string | null
          payout_last4?: string | null
          payout_method?: string | null
          razorpayx_contact_id?: string | null
          razorpayx_fund_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_private_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string
          handle: string
          home_city: string | null
          id: string
          instagram_followers: number | null
          instagram_handle: string | null
          instagram_verified: boolean
          languages: string[]
          referral_code: string
          status: Database["public"]["Enums"]["account_status"]
          tier: Database["public"]["Enums"]["creator_tier"]
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name: string
          handle: string
          home_city?: string | null
          id?: string
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_verified?: boolean
          languages?: string[]
          referral_code?: string
          status?: Database["public"]["Enums"]["account_status"]
          tier?: Database["public"]["Enums"]["creator_tier"]
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          home_city?: string | null
          id?: string
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_verified?: boolean
          languages?: string[]
          referral_code?: string
          status?: Database["public"]["Enums"]["account_status"]
          tier?: Database["public"]["Enums"]["creator_tier"]
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_requests: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          kind: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          kind: string
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departure_price_options: {
        Row: {
          departure_id: string
          id: string
          is_default: boolean
          label: string
          price_paise: number
          sort_order: number
        }
        Insert: {
          departure_id: string
          id?: string
          is_default?: boolean
          label: string
          price_paise: number
          sort_order?: number
        }
        Update: {
          departure_id?: string
          id?: string
          is_default?: boolean
          label?: string
          price_paise?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "departure_price_options_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
        ]
      }
      departures: {
        Row: {
          balance_due_days_before: number
          booking_cutoff_days: number
          capacity: number
          created_at: string
          deposit_per_person_paise: number
          end_date: string
          hosted_by_creator_id: string | null
          id: string
          seats_booked: number
          seats_held: number
          start_date: string
          status: Database["public"]["Enums"]["departure_status"]
          trip_id: string
          updated_at: string
        }
        Insert: {
          balance_due_days_before?: number
          booking_cutoff_days?: number
          capacity: number
          created_at?: string
          deposit_per_person_paise?: number
          end_date: string
          hosted_by_creator_id?: string | null
          id?: string
          seats_booked?: number
          seats_held?: number
          start_date: string
          status?: Database["public"]["Enums"]["departure_status"]
          trip_id: string
          updated_at?: string
        }
        Update: {
          balance_due_days_before?: number
          booking_cutoff_days?: number
          capacity?: number
          created_at?: string
          deposit_per_person_paise?: number
          end_date?: string
          hosted_by_creator_id?: string | null
          id?: string
          seats_booked?: number
          seats_held?: number
          start_date?: string
          status?: Database["public"]["Enums"]["departure_status"]
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departures_hosted_by_creator_id_fkey"
            columns: ["hosted_by_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          kind: string
          memo: string | null
          ref_id: string | null
          ref_type: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          kind: string
          memo?: string | null
          ref_id?: string | null
          ref_type?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          memo?: string | null
          ref_id?: string | null
          ref_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          notes: string | null
          owner_id: string
          owner_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          storage_path: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          notes?: string | null
          owner_id: string
          owner_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          storage_path: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          notes?: string | null
          owner_id?: string
          owner_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_admin: string | null
          booking_id: string | null
          created_at: string
          creator_id: string | null
          departure_id: string | null
          email: string | null
          id: string
          link_id: string | null
          message: string | null
          name: string | null
          phone: string
          source: Database["public"]["Enums"]["attribution_source"]
          status: Database["public"]["Enums"]["lead_status"]
          trip_id: string | null
          updated_at: string
          visitor_id: string | null
        }
        Insert: {
          assigned_admin?: string | null
          booking_id?: string | null
          created_at?: string
          creator_id?: string | null
          departure_id?: string | null
          email?: string | null
          id?: string
          link_id?: string | null
          message?: string | null
          name?: string | null
          phone: string
          source: Database["public"]["Enums"]["attribution_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          trip_id?: string | null
          updated_at?: string
          visitor_id?: string | null
        }
        Update: {
          assigned_admin?: string | null
          booking_id?: string | null
          created_at?: string
          creator_id?: string | null
          departure_id?: string | null
          email?: string | null
          id?: string
          link_id?: string | null
          message?: string | null
          name?: string | null
          phone?: string
          source?: Database["public"]["Enums"]["attribution_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          trip_id?: string | null
          updated_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_admin_fkey"
            columns: ["assigned_admin"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_booking_fk"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "creator_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_lines: {
        Row: {
          account: Database["public"]["Enums"]["ledger_account"]
          credit_paise: number
          debit_paise: number
          id: number
          journal_id: string
          party_id: string | null
          party_type: string | null
        }
        Insert: {
          account: Database["public"]["Enums"]["ledger_account"]
          credit_paise?: number
          debit_paise?: number
          id?: never
          journal_id: string
          party_id?: string | null
          party_type?: string | null
        }
        Update: {
          account?: Database["public"]["Enums"]["ledger_account"]
          credit_paise?: number
          debit_paise?: number
          id?: never
          journal_id?: string
          party_id?: string | null
          party_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          payload: Json
          provider_id: string | null
          sent_at: string | null
          status: string
          template: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          template: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          template?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_private: {
        Row: {
          agreement_accepted_at: string | null
          agreement_version: string | null
          bank_last4: string | null
          org_id: string
          pan_encrypted: string | null
          pan_last4: string | null
          pg_fee_bearer: string
          razorpay_account_id: string | null
          settlement_policy: Json
          updated_at: string
        }
        Insert: {
          agreement_accepted_at?: string | null
          agreement_version?: string | null
          bank_last4?: string | null
          org_id: string
          pan_encrypted?: string | null
          pan_last4?: string | null
          pg_fee_bearer?: string
          razorpay_account_id?: string | null
          settlement_policy?: Json
          updated_at?: string
        }
        Update: {
          agreement_accepted_at?: string | null
          agreement_version?: string | null
          bank_last4?: string | null
          org_id?: string
          pan_encrypted?: string | null
          pan_last4?: string | null
          pg_fee_bearer?: string
          razorpay_account_id?: string | null
          settlement_policy?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_private_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          gst_scheme: Database["public"]["Enums"]["gst_scheme"]
          gstin: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          legal_name: string | null
          logo_url: string | null
          name: string
          platform_fee_pct: number
          rating_avg: number
          rating_count: number
          slug: string
          state_code: string | null
          status: Database["public"]["Enums"]["account_status"]
          support_email: string | null
          support_phone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          gst_scheme?: Database["public"]["Enums"]["gst_scheme"]
          gstin?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          legal_name?: string | null
          logo_url?: string | null
          name: string
          platform_fee_pct?: number
          rating_avg?: number
          rating_count?: number
          slug: string
          state_code?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          gst_scheme?: Database["public"]["Enums"]["gst_scheme"]
          gstin?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          platform_fee_pct?: number
          rating_avg?: number
          rating_count?: number
          slug?: string
          state_code?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outbox_events: {
        Row: {
          attempts: number
          created_at: string
          id: number
          last_error: string | null
          next_attempt_at: string
          payload: Json
          status: Database["public"]["Enums"]["outbox_status"]
          topic: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: never
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          status?: Database["public"]["Enums"]["outbox_status"]
          topic: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: never
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          status?: Database["public"]["Enums"]["outbox_status"]
          topic?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_paise: number
          booking_id: string
          captured_at: string | null
          created_at: string
          fee_paise: number | null
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          method: string | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_paise: number
          booking_id: string
          captured_at?: string | null
          created_at?: string
          fee_paise?: number | null
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          method?: string | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          booking_id?: string
          captured_at?: string | null
          created_at?: string
          fee_paise?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          method?: string | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          creator_id: string
          failure_reason: string | null
          fy: string
          gross_paise: number
          id: string
          net_paise: number
          period_end: string
          period_start: string
          processed_at: string | null
          razorpayx_payout_id: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tds_paise: number
          updated_at: string
          utr: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          creator_id: string
          failure_reason?: string | null
          fy: string
          gross_paise: number
          id?: string
          net_paise: number
          period_end: string
          period_start: string
          processed_at?: string | null
          razorpayx_payout_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tds_paise?: number
          updated_at?: string
          utr?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          creator_id?: string
          failure_reason?: string | null
          fy?: string
          gross_paise?: number
          id?: string
          net_paise?: number
          period_end?: string
          period_start?: string
          processed_at?: string | null
          razorpayx_payout_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tds_paise?: number
          updated_at?: string
          utr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          marketing_opt_in: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          marketing_opt_in?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          marketing_opt_in?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_paise: number
          booking_id: string
          created_at: string
          id: string
          initiated_by: string | null
          payment_id: string
          processed_at: string | null
          razorpay_refund_id: string | null
          reason: string | null
          status: Database["public"]["Enums"]["refund_status"]
        }
        Insert: {
          amount_paise: number
          booking_id: string
          created_at?: string
          id?: string
          initiated_by?: string | null
          payment_id: string
          processed_at?: string | null
          razorpay_refund_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
        }
        Update: {
          amount_paise?: number
          booking_id?: string
          created_at?: string
          id?: string
          initiated_by?: string | null
          payment_id?: string
          processed_at?: string | null
          razorpay_refund_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          booking_id: string
          created_at: string
          id: string
          operator_reply: string | null
          org_id: string
          photo_paths: string[]
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          booking_id: string
          created_at?: string
          id?: string
          operator_reply?: string | null
          org_id: string
          photo_paths?: string[]
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          operator_reply?: string | null
          org_id?: string
          photo_paths?: string[]
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          booking_id: string | null
          category: string | null
          created_at: string
          id: string
          org_id: string | null
          priority: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          org_id?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          org_id?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount_paise: number
          booking_id: string
          created_at: string
          id: string
          on_hold_until: string | null
          org_id: string
          payment_id: string
          razorpay_transfer_id: string | null
          reversed_paise: number
          status: Database["public"]["Enums"]["transfer_status"]
          tranche_no: number
          updated_at: string
        }
        Insert: {
          amount_paise: number
          booking_id: string
          created_at?: string
          id?: string
          on_hold_until?: string | null
          org_id: string
          payment_id: string
          razorpay_transfer_id?: string | null
          reversed_paise?: number
          status?: Database["public"]["Enums"]["transfer_status"]
          tranche_no?: number
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          booking_id?: string
          created_at?: string
          id?: string
          on_hold_until?: string | null
          org_id?: string
          payment_id?: string
          razorpay_transfer_id?: string | null
          reversed_paise?: number
          status?: Database["public"]["Enums"]["transfer_status"]
          tranche_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_commercials: {
        Row: {
          creator_commission_pct: number
          host_commission_pct: number | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          creator_commission_pct: number
          host_commission_pct?: number | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          creator_commission_pct?: number
          host_commission_pct?: number | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_commercials_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itinerary_days: {
        Row: {
          day_number: number
          description: string | null
          id: string
          meals: string[]
          stay: string | null
          title: string
          trip_id: string
        }
        Insert: {
          day_number: number
          description?: string | null
          id?: string
          meals?: string[]
          stay?: string | null
          title: string
          trip_id: string
        }
        Update: {
          day_number?: number
          description?: string | null
          id?: string
          meals?: string[]
          stay?: string | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_media: {
        Row: {
          alt: string | null
          id: string
          kind: string
          sort_order: number
          storage_path: string
          trip_id: string
        }
        Insert: {
          alt?: string | null
          id?: string
          kind?: string
          sort_order?: number
          storage_path: string
          trip_id: string
        }
        Update: {
          alt?: string | null
          id?: string
          kind?: string
          sort_order?: number
          storage_path?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_media_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_pickup_points: {
        Row: {
          city: string
          extra_price_paise: number
          id: string
          point: string
          time_note: string | null
          trip_id: string
        }
        Insert: {
          city: string
          extra_price_paise?: number
          id?: string
          point: string
          time_note?: string | null
          trip_id: string
        }
        Update: {
          city?: string
          extra_price_paise?: number
          id?: string
          point?: string
          time_note?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_pickup_points_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cancellation_policy_id: string
          country: string
          cover_image_path: string | null
          created_at: string
          description_md: string | null
          destination: string
          difficulty: string | null
          duration_days: number
          duration_nights: number
          exclusions: string[]
          from_price_paise: number
          highlights: string[]
          hosted_by_creator_id: string | null
          id: string
          inclusions: string[]
          max_group_size: number | null
          min_age: number | null
          org_id: string
          published_at: string | null
          review_notes: string | null
          search: unknown
          slug: string
          start_city: string | null
          state: string | null
          status: Database["public"]["Enums"]["trip_status"]
          summary: string | null
          tags: string[]
          things_to_carry: string[]
          title: string
          trip_type: Database["public"]["Enums"]["trip_type"]
          updated_at: string
        }
        Insert: {
          cancellation_policy_id: string
          country?: string
          cover_image_path?: string | null
          created_at?: string
          description_md?: string | null
          destination: string
          difficulty?: string | null
          duration_days: number
          duration_nights: number
          exclusions?: string[]
          from_price_paise: number
          highlights?: string[]
          hosted_by_creator_id?: string | null
          id?: string
          inclusions?: string[]
          max_group_size?: number | null
          min_age?: number | null
          org_id: string
          published_at?: string | null
          review_notes?: string | null
          search?: unknown
          slug: string
          start_city?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          summary?: string | null
          tags?: string[]
          things_to_carry?: string[]
          title: string
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
        }
        Update: {
          cancellation_policy_id?: string
          country?: string
          cover_image_path?: string | null
          created_at?: string
          description_md?: string | null
          destination?: string
          difficulty?: string | null
          duration_days?: number
          duration_nights?: number
          exclusions?: string[]
          from_price_paise?: number
          highlights?: string[]
          hosted_by_creator_id?: string | null
          id?: string
          inclusions?: string[]
          max_group_size?: number | null
          min_age?: number | null
          org_id?: string
          published_at?: string | null
          review_notes?: string | null
          search?: unknown
          slug?: string
          start_city?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          summary?: string | null
          tags?: string[]
          things_to_carry?: string[]
          title?: string
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_cancellation_policy_id_fkey"
            columns: ["cancellation_policy_id"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_hosted_by_creator_id_fkey"
            columns: ["hosted_by_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          status: string
        }
        Insert: {
          error?: string | null
          event_type: string
          id: string
          payload: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
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
      accept_operator_agreement: {
        Args: { p_org: string; p_version: string }
        Returns: undefined
      }
      advance_lifecycle: { Args: never; Returns: undefined }
      confirm_seats: {
        Args: { p_departure: string; p_qty: number }
        Returns: undefined
      }
      create_organization: {
        Args: { p_city?: string; p_name: string; p_slug: string }
        Returns: string
      }
      departure_trip: { Args: { p_dep: string }; Returns: string }
      expire_holds: { Args: never; Returns: number }
      gen_code: { Args: { p_len: number; p_prefix: string }; Returns: string }
      get_org_contacts: {
        Args: { p_org: string }
        Returns: {
          support_email: string
          support_phone: string
        }[]
      }
      get_public_setting: { Args: { p_key: string }; Returns: Json }
      has_admin_role: {
        Args: { r: Database["public"]["Enums"]["admin_role"] }
        Returns: boolean
      }
      hold_seats: {
        Args: { p_departure: string; p_qty: number }
        Returns: boolean
      }
      is_active_creator: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_end_user: { Args: never; Returns: boolean }
      is_org_manager: { Args: { p_org: string }; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      my_creator_id: { Args: never; Returns: string }
      my_referral_code: { Args: never; Returns: string }
      post_journal: {
        Args: {
          p_booking: string
          p_kind: string
          p_lines: Json
          p_memo: string
          p_ref_id: string
          p_ref_type: string
        }
        Returns: string
      }
      refresh_creator_stats: { Args: { p_day?: string }; Returns: undefined }
      release_booked_seats: {
        Args: { p_departure: string; p_qty: number }
        Returns: undefined
      }
      release_held_seats: {
        Args: { p_departure: string; p_qty: number }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      trip_is_public: { Args: { p_trip: string }; Returns: boolean }
      trip_org: { Args: { p_trip: string }; Returns: string }
    }
    Enums: {
      account_status: "pending" | "active" | "suspended"
      admin_role: "super_admin" | "ops" | "finance" | "support"
      attribution_source:
        | "link"
        | "storefront"
        | "code"
        | "whatsapp"
        | "phone_match"
        | "manual"
      booking_status:
        | "held"
        | "confirmed"
        | "paid_in_full"
        | "completed"
        | "cancelled"
        | "expired"
      commission_status:
        | "pending"
        | "confirmed"
        | "payable"
        | "in_payout"
        | "paid"
        | "reversed"
        | "on_hold"
      creator_tier: "standard" | "pro" | "host"
      departure_status:
        | "open"
        | "sold_out"
        | "closed"
        | "cancelled"
        | "completed"
      gst_scheme: "gst5_no_itc" | "gst18_with_itc"
      kyc_status:
        | "not_started"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
      lead_status:
        | "new"
        | "contacted"
        | "payment_link_sent"
        | "converted"
        | "lost"
      ledger_account:
        | "razorpay_clearing"
        | "operator_payable"
        | "creator_payable"
        | "platform_revenue"
        | "gst_output_payable"
        | "gst_tcs_payable"
        | "it_tds_ecom_payable"
        | "it_tds_commission_payable"
        | "traveler_refund_payable"
        | "pg_fees_expense"
      org_role: "owner" | "manager" | "staff"
      outbox_status: "pending" | "processing" | "done" | "failed"
      payment_kind: "deposit" | "balance" | "full"
      payment_status:
        | "created"
        | "authorized"
        | "captured"
        | "failed"
        | "refunded"
        | "partially_refunded"
      payout_status:
        | "draft"
        | "approved"
        | "processing"
        | "processed"
        | "failed"
        | "reversed"
        | "cancelled"
      refund_status: "pending" | "processed" | "failed"
      review_status: "pending" | "published" | "hidden"
      ticket_status:
        | "open"
        | "pending_user"
        | "pending_operator"
        | "resolved"
        | "closed"
      transfer_status:
        | "created"
        | "on_hold"
        | "released"
        | "settled"
        | "reversed"
        | "partially_reversed"
        | "failed"
      trip_status:
        | "draft"
        | "pending_review"
        | "published"
        | "paused"
        | "rejected"
        | "archived"
      trip_type: "group" | "experiential" | "package" | "creator_hosted"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["pending", "active", "suspended"],
      admin_role: ["super_admin", "ops", "finance", "support"],
      attribution_source: [
        "link",
        "storefront",
        "code",
        "whatsapp",
        "phone_match",
        "manual",
      ],
      booking_status: [
        "held",
        "confirmed",
        "paid_in_full",
        "completed",
        "cancelled",
        "expired",
      ],
      commission_status: [
        "pending",
        "confirmed",
        "payable",
        "in_payout",
        "paid",
        "reversed",
        "on_hold",
      ],
      creator_tier: ["standard", "pro", "host"],
      departure_status: [
        "open",
        "sold_out",
        "closed",
        "cancelled",
        "completed",
      ],
      gst_scheme: ["gst5_no_itc", "gst18_with_itc"],
      kyc_status: [
        "not_started",
        "submitted",
        "in_review",
        "approved",
        "rejected",
      ],
      lead_status: [
        "new",
        "contacted",
        "payment_link_sent",
        "converted",
        "lost",
      ],
      ledger_account: [
        "razorpay_clearing",
        "operator_payable",
        "creator_payable",
        "platform_revenue",
        "gst_output_payable",
        "gst_tcs_payable",
        "it_tds_ecom_payable",
        "it_tds_commission_payable",
        "traveler_refund_payable",
        "pg_fees_expense",
      ],
      org_role: ["owner", "manager", "staff"],
      outbox_status: ["pending", "processing", "done", "failed"],
      payment_kind: ["deposit", "balance", "full"],
      payment_status: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      payout_status: [
        "draft",
        "approved",
        "processing",
        "processed",
        "failed",
        "reversed",
        "cancelled",
      ],
      refund_status: ["pending", "processed", "failed"],
      review_status: ["pending", "published", "hidden"],
      ticket_status: [
        "open",
        "pending_user",
        "pending_operator",
        "resolved",
        "closed",
      ],
      transfer_status: [
        "created",
        "on_hold",
        "released",
        "settled",
        "reversed",
        "partially_reversed",
        "failed",
      ],
      trip_status: [
        "draft",
        "pending_review",
        "published",
        "paused",
        "rejected",
        "archived",
      ],
      trip_type: ["group", "experiential", "package", "creator_hosted"],
    },
  },
} as const
