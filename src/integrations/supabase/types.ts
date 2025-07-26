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
      logs: {
        Row: {
          created_at: string
          descripcion: string
          detalles_adicionales: Json | null
          entidad_afectada: Database["public"]["Enums"]["entidad_tipo"]
          fecha_hora: string
          id: string
          id_entidad: string | null
          tipo_accion: Database["public"]["Enums"]["tipo_accion"]
          usuario_email: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          descripcion: string
          detalles_adicionales?: Json | null
          entidad_afectada: Database["public"]["Enums"]["entidad_tipo"]
          fecha_hora?: string
          id?: string
          id_entidad?: string | null
          tipo_accion: Database["public"]["Enums"]["tipo_accion"]
          usuario_email: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string
          detalles_adicionales?: Json | null
          entidad_afectada?: Database["public"]["Enums"]["entidad_tipo"]
          fecha_hora?: string
          id?: string
          id_entidad?: string | null
          tipo_accion?: Database["public"]["Enums"]["tipo_accion"]
          usuario_email?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      orden_productos: {
        Row: {
          cantidad: number
          created_at: string
          es_inventariado: boolean
          id: string
          nombre: string
          orden_id: string
          precio_unitario: number
          producto_inventario_id: string | null
          subtotal: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          es_inventariado?: boolean
          id?: string
          nombre: string
          orden_id: string
          precio_unitario: number
          producto_inventario_id?: string | null
          subtotal?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          es_inventariado?: boolean
          id?: string
          nombre?: string
          orden_id?: string
          precio_unitario?: number
          producto_inventario_id?: string | null
          subtotal?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orden_productos_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_reparacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_productos_producto_inventario_id_fkey"
            columns: ["producto_inventario_id"]
            isOneToOne: false
            referencedRelation: "productos_inventario"
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
          total_productos: number | null
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
          total_productos?: number | null
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
          total_productos?: number | null
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
      productos_inventario: {
        Row: {
          cantidad_actual: number
          cantidad_minima: number
          categoria: Database["public"]["Enums"]["categoria_producto"]
          codigo_barras: string | null
          costo_unitario: number
          created_at: string
          fecha_actualizacion: string
          id: string
          imagen: string | null
          margen: number
          nombre: string
          notas: string | null
          proveedor: string | null
          updated_at: string
        }
        Insert: {
          cantidad_actual?: number
          cantidad_minima?: number
          categoria: Database["public"]["Enums"]["categoria_producto"]
          codigo_barras?: string | null
          costo_unitario?: number
          created_at?: string
          fecha_actualizacion?: string
          id?: string
          imagen?: string | null
          margen?: number
          nombre: string
          notas?: string | null
          proveedor?: string | null
          updated_at?: string
        }
        Update: {
          cantidad_actual?: number
          cantidad_minima?: number
          categoria?: Database["public"]["Enums"]["categoria_producto"]
          codigo_barras?: string | null
          costo_unitario?: number
          created_at?: string
          fecha_actualizacion?: string
          id?: string
          imagen?: string | null
          margen?: number
          nombre?: string
          notas?: string | null
          proveedor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
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
      calcular_total_productos_orden: {
        Args: { orden_id_param: string }
        Returns: number
      }
      descontar_stock_orden: {
        Args: { orden_id_param: string }
        Returns: undefined
      }
      promote_user_to_admin: {
        Args: { user_email: string; user_full_name: string }
        Returns: undefined
      }
      registrar_log: {
        Args: {
          p_tipo_accion: Database["public"]["Enums"]["tipo_accion"]
          p_entidad_afectada: Database["public"]["Enums"]["entidad_tipo"]
          p_id_entidad: string
          p_descripcion: string
          p_detalles_adicionales?: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "tecnico" | "recepcion" | "auditor"
      categoria_producto:
        | "Piezas"
        | "Herramientas"
        | "Lubricantes"
        | "Neumaticos"
        | "Accesorios"
        | "Cables"
        | "Frenos"
        | "Cadenas"
        | "Otros"
      entidad_tipo:
        | "cliente"
        | "bicicleta"
        | "orden"
        | "factura"
        | "producto"
        | "sistema"
      tipo_accion:
        | "CREAR_CLIENTE"
        | "ACTUALIZAR_CLIENTE"
        | "ELIMINAR_CLIENTE"
        | "CREAR_BICICLETA"
        | "ACTUALIZAR_BICICLETA"
        | "ELIMINAR_BICICLETA"
        | "CREAR_ORDEN"
        | "ACTUALIZAR_ORDEN"
        | "ELIMINAR_ORDEN"
        | "CREAR_FACTURA"
        | "ACTUALIZAR_FACTURA"
        | "ELIMINAR_FACTURA"
        | "CREAR_PRODUCTO"
        | "ACTUALIZAR_PRODUCTO"
        | "ELIMINAR_PRODUCTO"
        | "LOGIN"
        | "LOGOUT"
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
      app_role: ["admin", "tecnico", "recepcion", "auditor"],
      categoria_producto: [
        "Piezas",
        "Herramientas",
        "Lubricantes",
        "Neumaticos",
        "Accesorios",
        "Cables",
        "Frenos",
        "Cadenas",
        "Otros",
      ],
      entidad_tipo: [
        "cliente",
        "bicicleta",
        "orden",
        "factura",
        "producto",
        "sistema",
      ],
      tipo_accion: [
        "CREAR_CLIENTE",
        "ACTUALIZAR_CLIENTE",
        "ELIMINAR_CLIENTE",
        "CREAR_BICICLETA",
        "ACTUALIZAR_BICICLETA",
        "ELIMINAR_BICICLETA",
        "CREAR_ORDEN",
        "ACTUALIZAR_ORDEN",
        "ELIMINAR_ORDEN",
        "CREAR_FACTURA",
        "ACTUALIZAR_FACTURA",
        "ELIMINAR_FACTURA",
        "CREAR_PRODUCTO",
        "ACTUALIZAR_PRODUCTO",
        "ELIMINAR_PRODUCTO",
        "LOGIN",
        "LOGOUT",
      ],
    },
  },
} as const
