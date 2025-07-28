import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('Processing invoice payment succeeded:', invoice.id);
  
  try {
    // Obtener detalles de la suscripción
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const customer = await stripe.customers.retrieve(invoice.customer);
    
    // Buscar la empresa por stripe_customer_id
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nombre_comercial, razon_social, cif, email, direccion')
      .eq('stripe_customer_id', invoice.customer)
      .single();
    
    if (empresaError || !empresa) {
      console.error('Empresa no encontrada:', empresaError);
      return;
    }
    
    // Obtener la app desde los metadatos de la suscripción
    const appId = subscription.metadata.app_id;
    if (!appId) {
      console.error('app_id no encontrado en metadatos');
      return;
    }
    
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, nombre, codigo')
      .eq('id', appId)
      .single();
    
    if (appError || !app) {
      console.error('App no encontrada:', appError);
      return;
    }
    
    // Calcular período de facturación
    const periodoInicio = new Date(invoice.period_start * 1000);
    const periodoFin = new Date(invoice.period_end * 1000);
    
    // Calcular importes (Stripe maneja centavos)
    const importeTotal = invoice.amount_paid / 100;
    const importeSinIva = Math.round((importeTotal / 1.21) * 100) / 100;
    const importeIva = importeTotal - importeSinIva;
    
    // Crear factura SaaS
    const { data: facturaSaas, error: facturaError } = await supabase
      .from('facturas_saas')
      .insert({
        empresa_id: empresa.id,
        app_id: app.id,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscription.id,
        fecha_factura: new Date().toISOString().split('T')[0],
        periodo_inicio: periodoInicio.toISOString().split('T')[0],
        periodo_fin: periodoFin.toISOString().split('T')[0],
        concepto: `Suscripción mensual - ${app.nombre}`,
        importe_sin_iva: importeSinIva,
        importe_iva: importeIva,
        importe_total: importeTotal,
        stripe_payment_status: 'paid',
        datos_empresa: {
          nombre: empresa.razon_social || empresa.nombre_comercial,
          cif: empresa.cif,
          email: empresa.email,
          direccion: empresa.direccion
        },
        datos_stripe: {
          invoice_id: invoice.id,
          subscription_id: subscription.id,
          customer_id: invoice.customer,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency
        }
      })
      .select()
      .single();
    
    if (facturaError) {
      console.error('Error creando factura SaaS:', facturaError);
      return;
    }
    
    console.log('Factura SaaS creada:', facturaSaas.numero_factura);
    
    // Generar PDF de la factura
    try {
      const { error: pdfError } = await supabase.functions.invoke('generate-saas-invoice-pdf', {
        body: { facturaId: facturaSaas.id }
      });
      
      if (pdfError) {
        console.error('Error generando PDF:', pdfError);
      } else {
        console.log('PDF generado exitosamente para factura:', facturaSaas.numero_factura);
      }
    } catch (pdfError) {
      console.error('Error invocando función PDF:', pdfError);
    }
    
  } catch (error) {
    console.error('Error en handleInvoicePaymentSucceeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Processing invoice payment failed:', invoice.id);
  
  try {
    // Buscar si existe una factura SaaS pendiente para esta invoice
    const { data: facturaExistente, error } = await supabase
      .from('facturas_saas')
      .select('id')
      .eq('stripe_invoice_id', invoice.id)
      .maybeSingle();
    
    if (facturaExistente) {
      // Actualizar estado a fallido
      await supabase
        .from('facturas_saas')
        .update({
          stripe_payment_status: 'failed',
          estado: 'error'
        })
        .eq('id', facturaExistente.id);
      
      console.log('Factura SaaS marcada como fallida');
    }
    
    // También actualizar el estado de la suscripción si es necesario
    await handleSubscriptionUpdated(await stripe.subscriptions.retrieve(invoice.subscription));
    
  } catch (error) {
    console.error('Error en handleInvoicePaymentFailed:', error);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log('Processing subscription created:', subscription.id);
  
  try {
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();
    
    if (empresaError || !empresa) {
      console.error('Empresa no encontrada para customer:', subscription.customer);
      return;
    }
    
    const appId = subscription.metadata.app_id;
    if (!appId) {
      console.error('app_id no encontrado en metadatos de suscripción');
      return;
    }
    
    // Activar la app para la empresa
    await supabase
      .from('empresas_apps')
      .upsert({
        empresa_id: empresa.id,
        app_id: appId,
        activa: true,
        fecha_activacion: new Date().toISOString(),
        trial_activo: false
      }, {
        onConflict: 'empresa_id,app_id'
      });
    
    // Crear/actualizar registro de suscripción
    await supabase
      .from('suscripciones_stripe')
      .upsert({
        empresa_id: empresa.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        plan: subscription.metadata.plan || 'monthly',
        estado: subscription.status,
        fecha_inicio: new Date(subscription.created * 1000).toISOString(),
        periodo_actual_inicio: new Date(subscription.current_period_start * 1000).toISOString(),
        periodo_actual_fin: new Date(subscription.current_period_end * 1000).toISOString(),
        precio_mensual: subscription.items.data[0]?.price?.unit_amount || 0,
        metadatos: subscription.metadata
      }, {
        onConflict: 'stripe_subscription_id'
      });
    
    console.log('Suscripción creada y app activada');
  } catch (error) {
    console.error('Error en handleSubscriptionCreated:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Processing subscription updated:', subscription.id);
  
  try {
    // Actualizar estado de suscripción
    await supabase
      .from('suscripciones_stripe')
      .update({
        estado: subscription.status,
        periodo_actual_inicio: new Date(subscription.current_period_start * 1000).toISOString(),
        periodo_actual_fin: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        fecha_fin: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
      })
      .eq('stripe_subscription_id', subscription.id);
    
    console.log('Suscripción actualizada');
  } catch (error) {
    console.error('Error en handleSubscriptionUpdated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Processing subscription deleted:', subscription.id);
  
  try {
    const { data: suscripcion, error } = await supabase
      .from('suscripciones_stripe')
      .select('empresa_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (error || !suscripcion) {
      console.error('Suscripción no encontrada:', error);
      return;
    }
    
    // Desactivar la app asociada
    const appId = subscription.metadata.app_id;
    if (appId) {
      await supabase
        .from('empresas_apps')
        .update({ activa: false })
        .eq('empresa_id', suscripcion.empresa_id)
        .eq('app_id', appId);
    }
    
    // Marcar suscripción como cancelada
    await supabase
      .from('suscripciones_stripe')
      .update({
        estado: 'canceled',
        fecha_fin: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
    
    console.log('Suscripción cancelada y app desactivada');
  } catch (error) {
    console.error('Error en handleSubscriptionDeleted:', error);
  }
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    console.log('Processing webhook event:', event.type);
    
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as any);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as any);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as any);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 400 });
  }
});