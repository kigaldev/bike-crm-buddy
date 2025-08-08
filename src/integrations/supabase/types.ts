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
      abonos: {
        Row: {
          archivo_pdf: string | null
          archivo_xml: string | null
          creado_por: string | null
          created_at: string | null
          ejercicio_fiscal: number | null
          empresa_id: string | null
          estado: string | null
          factura_original_id: string | null
          fecha_abono: string | null
          hash_actual: string | null
          hash_anterior: string | null
          id: string
          metodo_pago: string | null
          monto: number
          motivo: string | null
          numero_abono: string | null
          observaciones: string | null
          referencia: string | null
          serie_abono: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          archivo_pdf?: string | null
          archivo_xml?: string | null
          creado_por?: string | null
          created_at?: string | null
          ejercicio_fiscal?: number | null
          empresa_id?: string | null
          estado?: string | null
          factura_original_id?: string | null
          fecha_abono?: string | null
          hash_actual?: string | null
          hash_anterior?: string | null
          id?: string
          metodo_pago?: string | null
          monto: number
          motivo?: string | null
          numero_abono?: string | null
          observaciones?: string | null
          referencia?: string | null
          serie_abono?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          archivo_pdf?: string | null
          archivo_xml?: string | null
          creado_por?: string | null
          created_at?: string | null
          ejercicio_fiscal?: number | null
          empresa_id?: string | null
          estado?: string | null
          factura_original_id?: string | null
          fecha_abono?: string | null
          hash_actual?: string | null
          hash_anterior?: string | null
          id?: string
          metodo_pago?: string | null
          monto?: number
          motivo?: string | null
          numero_abono?: string | null
          observaciones?: string | null
          referencia?: string | null
          serie_abono?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abonos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonos_factura_original_id_fkey"
            columns: ["factura_original_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      abonos_log: {
        Row: {
          abono_id: string
          accion: string
          created_at: string | null
          estado: string
          id: string
          mensaje: string | null
          metadatos: Json | null
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          abono_id: string
          accion: string
          created_at?: string | null
          estado: string
          id?: string
          mensaje?: string | null
          metadatos?: Json | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          abono_id?: string
          accion?: string
          created_at?: string | null
          estado?: string
          id?: string
          mensaje?: string | null
          metadatos?: Json | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abonos_log_abono_id_fkey"
            columns: ["abono_id"]
            isOneToOne: false
            referencedRelation: "abonos"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          created_at: string | null
          descripcion: string
          empresa_id: string | null
          enviar_email: boolean | null
          enviar_whatsapp: boolean | null
          es_recurrente: boolean | null
          estado: string
          fecha_recordatorio: string
          fecha_resolucion: string | null
          frecuencia: string | null
          id: string
          id_entidad: string | null
          log_envios: Json | null
          notas: string | null
          prioridad: string
          resuelto_por: string | null
          tipo: string
          tipo_entidad: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          empresa_id?: string | null
          enviar_email?: boolean | null
          enviar_whatsapp?: boolean | null
          es_recurrente?: boolean | null
          estado?: string
          fecha_recordatorio: string
          fecha_resolucion?: string | null
          frecuencia?: string | null
          id?: string
          id_entidad?: string | null
          log_envios?: Json | null
          notas?: string | null
          prioridad?: string
          resuelto_por?: string | null
          tipo: string
          tipo_entidad?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          empresa_id?: string | null
          enviar_email?: boolean | null
          enviar_whatsapp?: boolean | null
          es_recurrente?: boolean | null
          estado?: string
          fecha_recordatorio?: string
          fecha_resolucion?: string | null
          frecuencia?: string | null
          id?: string
          id_entidad?: string | null
          log_envios?: Json | null
          notas?: string | null
          prioridad?: string
          resuelto_por?: string | null
          tipo?: string
          tipo_entidad?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          activa: boolean | null
          badge: string | null
          categoria: string | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          es_core: boolean | null
          es_gratuita: boolean | null
          icono: string | null
          id: string
          nombre: string
          orden_display: number | null
          precio_anual: number | null
          precio_mensual: number | null
          stripe_price_monthly: string | null
          stripe_price_yearly: string | null
          stripe_product_id: string | null
          trial_dias: number | null
        }
        Insert: {
          activa?: boolean | null
          badge?: string | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          es_core?: boolean | null
          es_gratuita?: boolean | null
          icono?: string | null
          id?: string
          nombre: string
          orden_display?: number | null
          precio_anual?: number | null
          precio_mensual?: number | null
          stripe_price_monthly?: string | null
          stripe_price_yearly?: string | null
          stripe_product_id?: string | null
          trial_dias?: number | null
        }
        Update: {
          activa?: boolean | null
          badge?: string | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          es_core?: boolean | null
          es_gratuita?: boolean | null
          icono?: string | null
          id?: string
          nombre?: string
          orden_display?: number | null
          precio_anual?: number | null
          precio_mensual?: number | null
          stripe_price_monthly?: string | null
          stripe_price_yearly?: string | null
          stripe_product_id?: string | null
          trial_dias?: number | null
        }
        Relationships: []
      }
      bicicletas: {
        Row: {
          alias: string
          cliente_id: string
          color: string | null
          created_at: string
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
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
          {
            foreignKeyName: "bicicletas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_empresas: {
        Row: {
          color_primario: string | null
          color_secundario: string | null
          empresa_id: string
          logo_url: string | null
          modo_oscuro: boolean | null
          tipografia_base: string | null
          updated_at: string | null
        }
        Insert: {
          color_primario?: string | null
          color_secundario?: string | null
          empresa_id: string
          logo_url?: string | null
          modo_oscuro?: boolean | null
          tipografia_base?: string | null
          updated_at?: string | null
        }
        Update: {
          color_primario?: string | null
          color_secundario?: string | null
          empresa_id?: string
          logo_url?: string | null
          modo_oscuro?: boolean | null
          tipografia_base?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
          fecha_alta?: string
          id?: string
          nombre?: string
          observaciones?: string | null
          telefono?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      config_apps_empresa: {
        Row: {
          activa: boolean
          app_codigo: string
          configuracion_personalizada: Json | null
          created_at: string | null
          empresa_id: string
          id: string
          limite_uso_mensual: number | null
          modo_demo: boolean
          restricciones: Json | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean
          app_codigo: string
          configuracion_personalizada?: Json | null
          created_at?: string | null
          empresa_id: string
          id?: string
          limite_uso_mensual?: number | null
          modo_demo?: boolean
          restricciones?: Json | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean
          app_codigo?: string
          configuracion_personalizada?: Json | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          limite_uso_mensual?: number | null
          modo_demo?: boolean
          restricciones?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cif: string | null
          configuracion: Json | null
          created_at: string | null
          direccion: string | null
          dominio_personalizado: string | null
          email: string | null
          estado_suscripcion: string | null
          fecha_creacion: string | null
          id: string
          logo: string | null
          nombre_comercial: string
          plan_actual: string | null
          razon_social: string | null
          stripe_customer_id: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          cif?: string | null
          configuracion?: Json | null
          created_at?: string | null
          direccion?: string | null
          dominio_personalizado?: string | null
          email?: string | null
          estado_suscripcion?: string | null
          fecha_creacion?: string | null
          id?: string
          logo?: string | null
          nombre_comercial: string
          plan_actual?: string | null
          razon_social?: string | null
          stripe_customer_id?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          cif?: string | null
          configuracion?: Json | null
          created_at?: string | null
          direccion?: string | null
          dominio_personalizado?: string | null
          email?: string | null
          estado_suscripcion?: string | null
          fecha_creacion?: string | null
          id?: string
          logo?: string | null
          nombre_comercial?: string
          plan_actual?: string | null
          razon_social?: string | null
          stripe_customer_id?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      empresas_apps: {
        Row: {
          activa: boolean | null
          app_id: string | null
          configuracion: Json | null
          created_at: string | null
          empresa_id: string | null
          fecha_activacion: string | null
          fecha_vencimiento: string | null
          id: string
          trial_activo: boolean | null
          trial_vence: string | null
        }
        Insert: {
          activa?: boolean | null
          app_id?: string | null
          configuracion?: Json | null
          created_at?: string | null
          empresa_id?: string | null
          fecha_activacion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          trial_activo?: boolean | null
          trial_vence?: string | null
        }
        Update: {
          activa?: boolean | null
          app_id?: string | null
          configuracion?: Json | null
          created_at?: string | null
          empresa_id?: string | null
          fecha_activacion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          trial_activo?: boolean | null
          trial_vence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_apps_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_apps_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          archivo_pdf: string | null
          base_imponible: number | null
          certificado_usado: string | null
          cliente_nif: string | null
          created_at: string
          cuota_iva: number | null
          ejercicio_fiscal: number | null
          email_enviado: boolean | null
          email_fecha_envio: string | null
          emisor_cif: string | null
          emisor_direccion: string | null
          emisor_nombre: string | null
          empresa_id: string | null
          es_rectificativa: boolean | null
          estado_facturae: string | null
          estado_notificacion: string | null
          estado_pago: string
          factura_origen_id: string | null
          fecha_emision: string
          fecha_firma: string | null
          fecha_pago: string | null
          hash_actual: string | null
          hash_anterior: string | null
          id: string
          id_cliente: string
          id_orden: string
          intentos_envio: number | null
          metodo_pago: string | null
          numero_factura: string | null
          observaciones: string | null
          serie_factura: string | null
          tipo_iva: number | null
          total: number
          ultimo_error: string | null
          updated_at: string
          validacion_xsd: boolean | null
          whatsapp_enviado: boolean | null
          whatsapp_fecha_envio: string | null
          xml_facturae: string | null
          xml_firmado: string | null
        }
        Insert: {
          archivo_pdf?: string | null
          base_imponible?: number | null
          certificado_usado?: string | null
          cliente_nif?: string | null
          created_at?: string
          cuota_iva?: number | null
          ejercicio_fiscal?: number | null
          email_enviado?: boolean | null
          email_fecha_envio?: string | null
          emisor_cif?: string | null
          emisor_direccion?: string | null
          emisor_nombre?: string | null
          empresa_id?: string | null
          es_rectificativa?: boolean | null
          estado_facturae?: string | null
          estado_notificacion?: string | null
          estado_pago?: string
          factura_origen_id?: string | null
          fecha_emision?: string
          fecha_firma?: string | null
          fecha_pago?: string | null
          hash_actual?: string | null
          hash_anterior?: string | null
          id?: string
          id_cliente: string
          id_orden: string
          intentos_envio?: number | null
          metodo_pago?: string | null
          numero_factura?: string | null
          observaciones?: string | null
          serie_factura?: string | null
          tipo_iva?: number | null
          total: number
          ultimo_error?: string | null
          updated_at?: string
          validacion_xsd?: boolean | null
          whatsapp_enviado?: boolean | null
          whatsapp_fecha_envio?: string | null
          xml_facturae?: string | null
          xml_firmado?: string | null
        }
        Update: {
          archivo_pdf?: string | null
          base_imponible?: number | null
          certificado_usado?: string | null
          cliente_nif?: string | null
          created_at?: string
          cuota_iva?: number | null
          ejercicio_fiscal?: number | null
          email_enviado?: boolean | null
          email_fecha_envio?: string | null
          emisor_cif?: string | null
          emisor_direccion?: string | null
          emisor_nombre?: string | null
          empresa_id?: string | null
          es_rectificativa?: boolean | null
          estado_facturae?: string | null
          estado_notificacion?: string | null
          estado_pago?: string
          factura_origen_id?: string | null
          fecha_emision?: string
          fecha_firma?: string | null
          fecha_pago?: string | null
          hash_actual?: string | null
          hash_anterior?: string | null
          id?: string
          id_cliente?: string
          id_orden?: string
          intentos_envio?: number | null
          metodo_pago?: string | null
          numero_factura?: string | null
          observaciones?: string | null
          serie_factura?: string | null
          tipo_iva?: number | null
          total?: number
          ultimo_error?: string | null
          updated_at?: string
          validacion_xsd?: boolean | null
          whatsapp_enviado?: boolean | null
          whatsapp_fecha_envio?: string | null
          xml_facturae?: string | null
          xml_firmado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_factura_origen_id_fkey"
            columns: ["factura_origen_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
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
      facturas_log: {
        Row: {
          accion: string
          created_at: string
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          factura_id: string
          id: string
          timestamp: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          factura_id: string
          id?: string
          timestamp?: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          factura_id?: string
          id?: string
          timestamp?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_log_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_saas: {
        Row: {
          app_id: string
          archivo_pdf: string | null
          concepto: string
          created_at: string
          datos_empresa: Json
          datos_stripe: Json | null
          empresa_id: string
          estado: string
          fecha_factura: string
          id: string
          importe_iva: number
          importe_sin_iva: number
          importe_total: number
          numero_factura: string
          periodo_fin: string
          periodo_inicio: string
          stripe_invoice_id: string
          stripe_payment_status: string
          stripe_subscription_id: string
          tipo_iva: number
          updated_at: string
        }
        Insert: {
          app_id: string
          archivo_pdf?: string | null
          concepto: string
          created_at?: string
          datos_empresa: Json
          datos_stripe?: Json | null
          empresa_id: string
          estado?: string
          fecha_factura?: string
          id?: string
          importe_iva: number
          importe_sin_iva: number
          importe_total: number
          numero_factura: string
          periodo_fin: string
          periodo_inicio: string
          stripe_invoice_id: string
          stripe_payment_status: string
          stripe_subscription_id: string
          tipo_iva?: number
          updated_at?: string
        }
        Update: {
          app_id?: string
          archivo_pdf?: string | null
          concepto?: string
          created_at?: string
          datos_empresa?: Json
          datos_stripe?: Json | null
          empresa_id?: string
          estado?: string
          fecha_factura?: string
          id?: string
          importe_iva?: number
          importe_sin_iva?: number
          importe_total?: number
          numero_factura?: string
          periodo_fin?: string
          periodo_inicio?: string
          stripe_invoice_id?: string
          stripe_payment_status?: string
          stripe_subscription_id?: string
          tipo_iva?: number
          updated_at?: string
        }
        Relationships: []
      }
      feedback_saas: {
        Row: {
          app_relacionada: string | null
          created_at: string
          descripcion: string
          empresa_id: string
          estado: string
          id: string
          prioridad: string
          respuesta_admin: string | null
          resuelto_por: string | null
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_relacionada?: string | null
          created_at?: string
          descripcion: string
          empresa_id: string
          estado?: string
          id?: string
          prioridad?: string
          respuesta_admin?: string | null
          resuelto_por?: string | null
          tipo: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_relacionada?: string | null
          created_at?: string
          descripcion?: string
          empresa_id?: string
          estado?: string
          id?: string
          prioridad?: string
          respuesta_admin?: string | null
          resuelto_por?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      firmas_log: {
        Row: {
          accion: string
          archivo_generado: string | null
          certificado_usado: string | null
          created_at: string
          errores_validacion: Json | null
          estado: string
          factura_id: string
          id: string
          metadatos: Json | null
          usuario_email: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          archivo_generado?: string | null
          certificado_usado?: string | null
          created_at?: string
          errores_validacion?: Json | null
          estado: string
          factura_id: string
          id?: string
          metadatos?: Json | null
          usuario_email: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          archivo_generado?: string | null
          certificado_usado?: string | null
          created_at?: string
          errores_validacion?: Json | null
          estado?: string
          factura_id?: string
          id?: string
          metadatos?: Json | null
          usuario_email?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          descripcion: string
          detalles_adicionales: Json | null
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
          entidad_afectada?: Database["public"]["Enums"]["entidad_tipo"]
          fecha_hora?: string
          id?: string
          id_entidad?: string | null
          tipo_accion?: Database["public"]["Enums"]["tipo_accion"]
          usuario_email?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_tests_empresa: {
        Row: {
          created_at: string
          empresa_id: string
          error_stack: string | null
          estado: string
          id: string
          mensaje: string | null
          test_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          error_stack?: string | null
          estado: string
          id?: string
          mensaje?: string | null
          test_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          error_stack?: string | null
          estado?: string
          id?: string
          mensaje?: string | null
          test_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notificaciones_log: {
        Row: {
          created_at: string | null
          destinatario: string
          estado: string
          factura_id: string
          fecha_envio: string | null
          id: string
          mensaje_error: string | null
          metadatos: Json | null
          tipo_notificacion: string
        }
        Insert: {
          created_at?: string | null
          destinatario: string
          estado: string
          factura_id: string
          fecha_envio?: string | null
          id?: string
          mensaje_error?: string | null
          metadatos?: Json | null
          tipo_notificacion: string
        }
        Update: {
          created_at?: string | null
          destinatario?: string
          estado?: string
          factura_id?: string
          fecha_envio?: string | null
          id?: string
          mensaje_error?: string | null
          metadatos?: Json | null
          tipo_notificacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_log_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones_saas: {
        Row: {
          created_at: string
          empresa_id: string
          enviado_email: boolean
          id: string
          mensaje: string
          tipo: string
          titulo: string
          updated_at: string
          url_redireccion: string | null
          user_id: string
          visto: boolean
        }
        Insert: {
          created_at?: string
          empresa_id: string
          enviado_email?: boolean
          id?: string
          mensaje: string
          tipo: string
          titulo: string
          updated_at?: string
          url_redireccion?: string | null
          user_id: string
          visto?: boolean
        }
        Update: {
          created_at?: string
          empresa_id?: string
          enviado_email?: boolean
          id?: string
          mensaje?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          url_redireccion?: string | null
          user_id?: string
          visto?: boolean
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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
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
          {
            foreignKeyName: "ordenes_reparacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          archivo_justificante: string | null
          cliente_id: string
          created_at: string
          empresa_id: string | null
          es_anticipo: boolean
          es_parcial: boolean
          estado_conciliacion: string
          factura_id: string | null
          fecha_pago: string
          id: string
          metodo_pago: string
          monto: number
          observaciones: string | null
          referencia: string | null
          updated_at: string
        }
        Insert: {
          archivo_justificante?: string | null
          cliente_id: string
          created_at?: string
          empresa_id?: string | null
          es_anticipo?: boolean
          es_parcial?: boolean
          estado_conciliacion?: string
          factura_id?: string | null
          fecha_pago?: string
          id?: string
          metodo_pago: string
          monto: number
          observaciones?: string | null
          referencia?: string | null
          updated_at?: string
        }
        Update: {
          archivo_justificante?: string | null
          cliente_id?: string
          created_at?: string
          empresa_id?: string | null
          es_anticipo?: boolean
          es_parcial?: boolean
          estado_conciliacion?: string
          factura_id?: string | null
          fecha_pago?: string
          id?: string
          metodo_pago?: string
          monto?: number
          observaciones?: string | null
          referencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos_roles_empresa: {
        Row: {
          accion: string
          created_at: string | null
          empresa_id: string
          id: string
          permitido: boolean
          recurso: string
          rol: string
          updated_at: string | null
        }
        Insert: {
          accion: string
          created_at?: string | null
          empresa_id: string
          id?: string
          permitido?: boolean
          recurso: string
          rol: string
          updated_at?: string | null
        }
        Update: {
          accion?: string
          created_at?: string | null
          empresa_id?: string
          id?: string
          permitido?: boolean
          recurso?: string
          rol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      productos_inventario: {
        Row: {
          cantidad_actual: number
          cantidad_minima: number
          categoria: Database["public"]["Enums"]["categoria_producto"]
          codigo_barras: string | null
          costo_unitario: number
          created_at: string
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
          fecha_actualizacion?: string
          id?: string
          imagen?: string | null
          margen?: number
          nombre?: string
          notas?: string | null
          proveedor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_inventario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          empresa_actual: string | null
          full_name: string | null
          id: string
          rol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          empresa_actual?: string | null
          full_name?: string | null
          id?: string
          rol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          empresa_actual?: string | null
          full_name?: string | null
          id?: string
          rol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_actual_fkey"
            columns: ["empresa_actual"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripciones_stripe: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          empresa_id: string | null
          estado: string
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          metadatos: Json | null
          periodo_actual_fin: string | null
          periodo_actual_inicio: string | null
          plan: string
          precio_mensual: number | null
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          estado: string
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          metadatos?: Json | null
          periodo_actual_fin?: string | null
          periodo_actual_inicio?: string | null
          plan: string
          precio_mensual?: number | null
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          metadatos?: Json | null
          periodo_actual_fin?: string | null
          periodo_actual_inicio?: string | null
          plan?: string
          precio_mensual?: number | null
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_stripe_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tests_empresa: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          empresa_id: string
          id: string
          nombre: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          empresa_id: string
          id?: string
          nombre: string
          tipo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      uso_apps_empresa: {
        Row: {
          app_codigo: string
          created_at: string
          empresa_id: string
          fecha_uso: string
          id: string
          metadata: Json | null
          tipo_accion: string
          user_id: string | null
        }
        Insert: {
          app_codigo: string
          created_at?: string
          empresa_id: string
          fecha_uso?: string
          id?: string
          metadata?: Json | null
          tipo_accion: string
          user_id?: string | null
        }
        Update: {
          app_codigo?: string
          created_at?: string
          empresa_id?: string
          fecha_uso?: string
          id?: string
          metadata?: Json | null
          tipo_accion?: string
          user_id?: string | null
        }
        Relationships: []
      }
      usuarios_empresas: {
        Row: {
          activo: boolean | null
          created_at: string | null
          empresa_id: string | null
          fecha_invitacion: string | null
          id: string
          invitado_por: string | null
          rol: string | null
          user_id: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          fecha_invitacion?: string | null
          id?: string
          invitado_por?: string | null
          rol?: string | null
          user_id?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          fecha_invitacion?: string | null
          id?: string
          invitado_por?: string | null
          rol?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activar_apps_default_empresa: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      actualizar_branding_empresa: {
        Args: {
          p_logo_url?: string
          p_color_primario?: string
          p_color_secundario?: string
          p_tipografia_base?: string
          p_modo_oscuro?: boolean
        }
        Returns: Json
      }
      actualizar_config_app_empresa: {
        Args: { p_app_codigo: string; p_configuracion: Json }
        Returns: Json
      }
      calcular_hash_verifactu: {
        Args: {
          p_numero_factura: string
          p_fecha_emision: string
          p_total: number
          p_hash_anterior?: string
        }
        Returns: string
      }
      calcular_iva_factura: {
        Args: { p_total_sin_iva: number; p_tipo_iva?: number }
        Returns: {
          base_imponible: number
          cuota_iva: number
          total_con_iva: number
        }[]
      }
      calcular_total_productos_orden: {
        Args: { orden_id_param: string }
        Returns: number
      }
      crear_alerta_factura_vencida: {
        Args: { p_factura_id: string; p_dias_vencimiento?: number }
        Returns: string
      }
      crear_alerta_mantenimiento: {
        Args: {
          p_bicicleta_id: string
          p_descripcion: string
          p_meses_frecuencia?: number
        }
        Returns: string
      }
      descontar_stock_orden: {
        Args: { orden_id_param: string }
        Returns: undefined
      }
      ejecutar_test: {
        Args: { codigo_test: string }
        Returns: Json
      }
      empresa_has_app_active: {
        Args: { p_empresa_id: string; p_app_codigo: string }
        Returns: boolean
      }
      generar_json_verifactu: {
        Args: { p_factura_id: string }
        Returns: Json
      }
      generar_numero_abono: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generar_numero_factura_saas: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generar_numero_factura_verifactu: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_empresa_actual: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      insertar_permisos_default_empresa: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      marcar_notificacion_vista: {
        Args: { p_notificacion_id: string }
        Returns: boolean
      }
      obtener_actividad_diaria_empresa: {
        Args: { p_empresa_id: string; p_dias?: number }
        Returns: {
          fecha: string
          total_acciones: number
          apps_usadas: number
          usuarios_activos: number
        }[]
      }
      obtener_analisis_alertas: {
        Args: { p_fecha_inicio: string; p_fecha_fin: string }
        Returns: {
          total_alertas: number
          alertas_resueltas: number
          alertas_pendientes: number
          alertas_criticas: number
          ratio_resolucion: number
          tipo_mas_frecuente: string
        }[]
      }
      obtener_analisis_inventario: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_productos: number
          valor_total_inventario: number
          productos_stock_bajo: number
          productos_sin_stock: number
          categoria_mayor_valor: string
          producto_mayor_rotacion: string
        }[]
      }
      obtener_analisis_metodos_pago: {
        Args: { p_fecha_inicio: string; p_fecha_fin: string }
        Returns: {
          metodo_pago: string
          total_monto: number
          numero_pagos: number
          porcentaje: number
        }[]
      }
      obtener_apps_sin_uso_reciente: {
        Args: { p_empresa_id: string; p_dias?: number }
        Returns: {
          app_codigo: string
          app_nombre: string
          ultimo_uso: string
          dias_sin_uso: number
        }[]
      }
      obtener_branding_empresa_actual: {
        Args: Record<PropertyKey, never>
        Returns: {
          empresa_id: string
          logo_url: string
          color_primario: string
          color_secundario: string
          tipografia_base: string
          modo_oscuro: boolean
          updated_at: string
        }[]
      }
      obtener_config_app_empresa: {
        Args: { p_app_codigo: string }
        Returns: Json
      }
      obtener_datos_abono_completo: {
        Args: { p_abono_id: string }
        Returns: {
          numero_abono: string
          fecha_abono: string
          monto: number
          tipo: string
          motivo: string
          metodo_pago: string
          referencia: string
          cliente_nombre: string
          cliente_email: string
          cliente_telefono: string
          cliente_direccion: string
          factura_numero: string
          factura_total: number
          emisor_nombre: string
          emisor_cif: string
          emisor_direccion: string
          hash_actual: string
          ejercicio_fiscal: number
        }[]
      }
      obtener_datos_factura_facturae: {
        Args: { p_factura_id: string }
        Returns: {
          numero_factura: string
          fecha_emision: string
          total: number
          base_imponible: number
          cuota_iva: number
          tipo_iva: number
          emisor_cif: string
          emisor_nombre: string
          emisor_direccion: string
          cliente_nombre: string
          cliente_nif: string
          cliente_direccion: string
          cliente_telefono: string
          cliente_email: string
          bicicleta_info: string
          descripcion_trabajo: string
          hash_actual: string
          hash_anterior: string
          ejercicio_fiscal: number
        }[]
      }
      obtener_datos_factura_notificacion: {
        Args: { p_factura_id: string }
        Returns: {
          factura_numero: string
          factura_total: number
          cliente_nombre: string
          cliente_email: string
          cliente_telefono: string
          archivo_pdf: string
          bicicleta_info: string
        }[]
      }
      obtener_datos_factura_saas: {
        Args: { p_factura_id: string }
        Returns: {
          numero_factura: string
          fecha_factura: string
          concepto: string
          periodo_inicio: string
          periodo_fin: string
          importe_sin_iva: number
          importe_iva: number
          importe_total: number
          empresa_nombre: string
          empresa_cif: string
          empresa_email: string
          empresa_direccion: string
          app_nombre: string
          archivo_pdf: string
        }[]
      }
      obtener_datos_pago_justificante: {
        Args: { p_pago_id: string }
        Returns: {
          numero_recibo: string
          fecha_pago: string
          monto: number
          metodo_pago: string
          referencia: string
          cliente_nombre: string
          cliente_nif: string
          cliente_direccion: string
          factura_numero: string
          emisor_nombre: string
          emisor_cif: string
          emisor_direccion: string
        }[]
      }
      obtener_estadisticas_feedback_empresa: {
        Args: { p_empresa_id: string }
        Returns: {
          total_feedback: number
          por_estado: Json
          por_tipo: Json
          por_app: Json
          feedback_reciente: number
        }[]
      }
      obtener_estadisticas_notificaciones: {
        Args: { p_empresa_id: string }
        Returns: {
          total_notificaciones: number
          notificaciones_vistas: number
          notificaciones_no_vistas: number
          por_tipo: Json
          recientes_7_dias: number
        }[]
      }
      obtener_estadisticas_uso_empresa: {
        Args: { p_empresa_id: string }
        Returns: {
          app_codigo: string
          app_nombre: string
          total_acciones: number
          ultimo_uso: string
          acciones_mes_actual: number
          acciones_semana_actual: number
          tipos_acciones: Json
        }[]
      }
      obtener_facturacion_mensual: {
        Args: { p_ano?: number }
        Returns: {
          mes: number
          mes_nombre: string
          total_facturado: number
          total_cobrado: number
          numero_facturas: number
          numero_ordenes: number
        }[]
      }
      obtener_feedback_por_app: {
        Args: { p_empresa_id: string; p_app_codigo: string }
        Returns: {
          total: number
          pendientes: number
          implementados: number
          ultimo_feedback: string
          feedback_reciente: Json
        }[]
      }
      obtener_logs_test: {
        Args: { p_test_id: string }
        Returns: {
          id: string
          test_id: string
          empresa_id: string
          user_id: string
          estado: string
          mensaje: string
          error_stack: string
          created_at: string
        }[]
      }
      obtener_resumen_financiero: {
        Args: { p_fecha_inicio: string; p_fecha_fin: string }
        Returns: {
          total_facturado: number
          total_cobrado: number
          total_abonos: number
          total_pendiente: number
          numero_ordenes: number
          numero_facturas: number
          numero_clientes: number
          ticket_promedio: number
        }[]
      }
      obtener_tests_disponibles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          empresa_id: string
          nombre: string
          descripcion: string
          codigo: string
          tipo: string
          activo: boolean
          created_at: string
          updated_at: string
        }[]
      }
      obtener_tiempo_promedio_reparacion: {
        Args: { p_fecha_inicio: string; p_fecha_fin: string }
        Returns: {
          tiempo_promedio_dias: number
          ordenes_analizadas: number
          tiempo_minimo_dias: number
          tiempo_maximo_dias: number
        }[]
      }
      obtener_todas_config_apps_empresa: {
        Args: Record<PropertyKey, never>
        Returns: {
          app_codigo: string
          app_nombre: string
          app_descripcion: string
          activa: boolean
          limite_uso_mensual: number
          restricciones: Json
          modo_demo: boolean
          configuracion_personalizada: Json
          updated_at: string
        }[]
      }
      obtener_top_clientes: {
        Args: { p_fecha_inicio: string; p_fecha_fin: string; p_limite?: number }
        Returns: {
          cliente_id: string
          nombre_completo: string
          total_facturado: number
          total_pagado: number
          numero_ordenes: number
          numero_facturas: number
          ultima_factura: string
        }[]
      }
      procesar_alertas_vencidas: {
        Args: Record<PropertyKey, never>
        Returns: number
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
      registrar_log_abono: {
        Args: {
          p_abono_id: string
          p_accion: string
          p_estado: string
          p_mensaje?: string
          p_metadatos?: Json
        }
        Returns: string
      }
      registrar_log_firma: {
        Args: {
          p_factura_id: string
          p_accion: string
          p_estado: string
          p_archivo_generado?: string
          p_certificado_usado?: string
          p_errores_validacion?: Json
          p_metadatos?: Json
        }
        Returns: string
      }
      registrar_notificacion: {
        Args: {
          p_factura_id: string
          p_tipo: string
          p_destinatario: string
          p_estado: string
          p_error?: string
          p_metadatos?: Json
        }
        Returns: string
      }
      registrar_uso_app: {
        Args: { p_app_codigo: string; p_tipo_accion: string; p_metadata?: Json }
        Returns: string
      }
      user_has_empresa_access: {
        Args: { p_empresa_id: string }
        Returns: boolean
      }
      verificar_permiso_usuario: {
        Args: { p_recurso: string; p_accion: string }
        Returns: boolean
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
        | "pago"
        | "abono"
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
        | "CREAR_PAGO"
        | "ACTUALIZAR_PAGO"
        | "ELIMINAR_PAGO"
        | "CONCILIAR_PAGO"
        | "CREAR_ABONO"
        | "ACTUALIZAR_ABONO"
        | "ELIMINAR_ABONO"
        | "FIRMAR_ABONO"
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
        "pago",
        "abono",
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
        "CREAR_PAGO",
        "ACTUALIZAR_PAGO",
        "ELIMINAR_PAGO",
        "CONCILIAR_PAGO",
        "CREAR_ABONO",
        "ACTUALIZAR_ABONO",
        "ELIMINAR_ABONO",
        "FIRMAR_ABONO",
      ],
    },
  },
} as const
