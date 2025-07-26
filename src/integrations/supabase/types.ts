export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bicicletas: {
        Row: {
          alias: string
          cliente_id: string
          color: string | null
          created_at: string
          fecha_compra: string | null
          id: string
          marca: string
          modelo: string
          notas: string | null
          numero_de_serie: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          alias: string
          cliente_id: string
          color?: string | null
          created_at?: string
          fecha_compra?: string | null
          id?: string
          marca: string
          modelo: string
          notas?: string | null
          numero_de_serie?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          alias?: string
          cliente_id?: string
          color?: string | null
          created_at?: string
          fecha_compra?: string | null
          id?: string
          marca?: string
          modelo?: string
          notas?: string | null
          numero_de_serie?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bicicletas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          apellidos: string
          created_at: string
          direccion: string | null
          email: string
          fecha_alta: string
          id: string
          nombre: string
          observaciones: string | null
          telefono: string
          updated_at: string
        }
        Insert: {
          apellidos: string
          created_at?: string
          direccion?: string | null
          email: string
          fecha_alta?: string
          id?: string
          nombre: string
          observaciones?: string | null
          telefono: string
          updated_at?: string
        }
        Update: {
          apellidos?: string
          created_at?: string
          direccion?: string | null
          email?: string
          fecha_alta?: string
          id?: string
          nombre?: string
          observaciones?: string | null
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      facturas: {
        Row: {
          archivo_pdf: string | null
          created_at: string
          estado_pago: string
          fecha_emision: string
          id: string
          id_cliente: string
          id_orden: string
          metodo_pago: string | null
          total: number
          updated_at: string
        }
        Insert: {
          archivo_pdf?: string | null
          created_at?: string
          estado_pago?: string
          fecha_emision?: string
          id?: string
          id_cliente: string
          id_orden: string
          metodo_pago?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          archivo_pdf?: string | null
          created_at?: string
          estado_pago?: string
          fecha_emision?: string
          id?: string
          id_cliente?: string
          id_orden?: string
          metodo_pago?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_id_orden_fkey"
            columns: ["id_orden"]
            isOneToOne: false
            referencedRelation: "ordenes_reparacion"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_reparacion: {
        Row: {
          bicicleta_id: string
          cliente_id: string
          costo_estimado: number | null
          created_at: string
          descripcion_trabajo: string | null
          estado: string
          fecha_entrada: string
          fecha_estim_entrega: string | null
          fotos_antes: string[] | null
          fotos_despues: string[] | null
          id: string
          updated_at: string
        }
        Insert: {
          bicicleta_id: string
          cliente_id: string
          costo_estimado?: number | null
          created_at?: string
          descripcion_trabajo?: string | null
          estado?: string
          fecha_entrada?: string
          fecha_estim_entrega?: string | null
          fotos_antes?: string[] | null
          fotos_despues?: string[] | null
          id?: string
          updated_at?: string
        }
        Update: {
          bicicleta_id?: string
          cliente_id?: string
          costo_estimado?: number | null
          created_at?: string
          descripcion_trabajo?: string | null
          estado?: string
          fecha_entrada?: string
          fecha_estim_entrega?: string | null
          fotos_antes?: string[] | null
          fotos_despues?: string[] | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_reparacion_bicicleta_id_fkey"
            columns: ["bicicleta_id"]
            isOneToOne: false
            referencedRelation: "bicicletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_reparacion_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "admin" | "mecanico" | "recepcion" | "auditor"
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
      app_role: ["admin", "mecanico", "recepcion", "auditor"],
    },
  },
} as const
