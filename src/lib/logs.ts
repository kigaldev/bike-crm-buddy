import { supabase } from "@/integrations/supabase/client";

export type TipoAccion = 
  | 'CREAR_CLIENTE'
  | 'ACTUALIZAR_CLIENTE' 
  | 'ELIMINAR_CLIENTE'
  | 'CREAR_BICICLETA'
  | 'ACTUALIZAR_BICICLETA'
  | 'ELIMINAR_BICICLETA'
  | 'CREAR_ORDEN'
  | 'ACTUALIZAR_ORDEN'
  | 'ELIMINAR_ORDEN'
  | 'CREAR_FACTURA'
  | 'ACTUALIZAR_FACTURA'
  | 'ELIMINAR_FACTURA'
  | 'CREAR_PRODUCTO'
  | 'ACTUALIZAR_PRODUCTO'
  | 'ELIMINAR_PRODUCTO'
  | 'LOGIN'
  | 'LOGOUT';

export type EntidadTipo = 'cliente' | 'bicicleta' | 'orden' | 'factura' | 'producto' | 'sistema';

interface RegistrarLogParams {
  tipoAccion: TipoAccion;
  entidadAfectada: EntidadTipo;
  idEntidad?: string;
  descripcion: string;
  detallesAdicionales?: Record<string, any>;
}

export async function registrarLog({
  tipoAccion,
  entidadAfectada,
  idEntidad,
  descripcion,
  detallesAdicionales
}: RegistrarLogParams): Promise<void> {
  try {
    const { error } = await supabase.rpc('registrar_log', {
      p_tipo_accion: tipoAccion,
      p_entidad_afectada: entidadAfectada,
      p_id_entidad: idEntidad || null,
      p_descripcion: descripcion,
      p_detalles_adicionales: detallesAdicionales ? JSON.stringify(detallesAdicionales) : null
    });

    if (error) {
      console.error('Error registrando log:', error);
    }
  } catch (error) {
    console.error('Error registrando log:', error);
  }
}

// Funciones de conveniencia para cada tipo de entidad
export const logCliente = {
  crear: (idCliente: string, nombreCliente: string) => 
    registrarLog({
      tipoAccion: 'CREAR_CLIENTE',
      entidadAfectada: 'cliente',
      idEntidad: idCliente,
      descripcion: `Cliente creado: ${nombreCliente}`
    }),
  
  actualizar: (idCliente: string, nombreCliente: string) => 
    registrarLog({
      tipoAccion: 'ACTUALIZAR_CLIENTE',
      entidadAfectada: 'cliente',
      idEntidad: idCliente,
      descripcion: `Cliente actualizado: ${nombreCliente}`
    }),
  
  eliminar: (idCliente: string, nombreCliente: string) => 
    registrarLog({
      tipoAccion: 'ELIMINAR_CLIENTE',
      entidadAfectada: 'cliente',
      idEntidad: idCliente,
      descripcion: `Cliente eliminado: ${nombreCliente}`
    })
};

export const logBicicleta = {
  crear: (idBicicleta: string, aliasBicicleta: string, clienteNombre?: string) => 
    registrarLog({
      tipoAccion: 'CREAR_BICICLETA',
      entidadAfectada: 'bicicleta',
      idEntidad: idBicicleta,
      descripcion: `Bicicleta creada: ${aliasBicicleta}${clienteNombre ? ` (Cliente: ${clienteNombre})` : ''}`
    }),
  
  actualizar: (idBicicleta: string, aliasBicicleta: string) => 
    registrarLog({
      tipoAccion: 'ACTUALIZAR_BICICLETA',
      entidadAfectada: 'bicicleta',
      idEntidad: idBicicleta,
      descripcion: `Bicicleta actualizada: ${aliasBicicleta}`
    }),
  
  eliminar: (idBicicleta: string, aliasBicicleta: string) => 
    registrarLog({
      tipoAccion: 'ELIMINAR_BICICLETA',
      entidadAfectada: 'bicicleta',
      idEntidad: idBicicleta,
      descripcion: `Bicicleta eliminada: ${aliasBicicleta}`
    })
};

export const logOrden = {
  crear: (idOrden: string, clienteNombre: string, descripcion?: string) => 
    registrarLog({
      tipoAccion: 'CREAR_ORDEN',
      entidadAfectada: 'orden',
      idEntidad: idOrden,
      descripcion: `Orden creada para cliente: ${clienteNombre}${descripcion ? ` - ${descripcion}` : ''}`
    }),
  
  actualizar: (idOrden: string, estado: string, clienteNombre?: string) => 
    registrarLog({
      tipoAccion: 'ACTUALIZAR_ORDEN',
      entidadAfectada: 'orden',
      idEntidad: idOrden,
      descripcion: `Orden actualizada${clienteNombre ? ` (${clienteNombre})` : ''} - Estado: ${estado}`
    }),
  
  eliminar: (idOrden: string, clienteNombre?: string) => 
    registrarLog({
      tipoAccion: 'ELIMINAR_ORDEN',
      entidadAfectada: 'orden',
      idEntidad: idOrden,
      descripcion: `Orden eliminada${clienteNombre ? ` (Cliente: ${clienteNombre})` : ''}`
    })
};

export const logFactura = {
  crear: (idFactura: string, clienteNombre: string, total: number) => 
    registrarLog({
      tipoAccion: 'CREAR_FACTURA',
      entidadAfectada: 'factura',
      idEntidad: idFactura,
      descripcion: `Factura creada para ${clienteNombre} - Total: €${total}`
    }),
  
  actualizar: (idFactura: string, estado: string, clienteNombre?: string) => 
    registrarLog({
      tipoAccion: 'ACTUALIZAR_FACTURA',
      entidadAfectada: 'factura',
      idEntidad: idFactura,
      descripcion: `Factura actualizada${clienteNombre ? ` (${clienteNombre})` : ''} - Estado: ${estado}`
    }),
  
  eliminar: (idFactura: string, clienteNombre?: string) => 
    registrarLog({
      tipoAccion: 'ELIMINAR_FACTURA',
      entidadAfectada: 'factura',
      idEntidad: idFactura,
      descripcion: `Factura eliminada${clienteNombre ? ` (${clienteNombre})` : ''}`
    })
};

export const logProducto = {
  crear: (idProducto: string, nombreProducto: string) => 
    registrarLog({
      tipoAccion: 'CREAR_PRODUCTO',
      entidadAfectada: 'producto',
      idEntidad: idProducto,
      descripcion: `Producto creado: ${nombreProducto}`
    }),
  
  actualizar: (idProducto: string, nombreProducto: string) => 
    registrarLog({
      tipoAccion: 'ACTUALIZAR_PRODUCTO',
      entidadAfectada: 'producto',
      idEntidad: idProducto,
      descripcion: `Producto actualizado: ${nombreProducto}`
    }),
  
  eliminar: (idProducto: string, nombreProducto: string) => 
    registrarLog({
      tipoAccion: 'ELIMINAR_PRODUCTO',
      entidadAfectada: 'producto',
      idEntidad: idProducto,
      descripcion: `Producto eliminado: ${nombreProducto}`
    })
};