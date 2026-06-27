import { getDB, queryFirst, queryAll, execute } from '../../../db';
import { getTenantIdFromRequest } from '../../../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);
    const order = await queryFirst(db, 'SELECT * FROM pos_orders WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!order) return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: CORS });
    const items = await queryAll(db, 'SELECT * FROM pos_order_items WHERE order_id = ?', id);
    return new Response(JSON.stringify({
      ...order,
      items: items.map(i => ({
        id: i.id, menuItemId: i.menu_item_id, name: i.name, price: i.price,
        quantity: i.quantity, notes: i.notes || '', subtotal: i.price * i.quantity,
      })),
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch order';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);

    const order = await queryFirst(db, 'SELECT * FROM pos_orders WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!order) return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: CORS });

    const body = await context.request.json();
    const now = new Date().toISOString();

    await execute(
      db,
      `UPDATE pos_orders SET
         status = COALESCE(?, status),
         payment_method = COALESCE(?, payment_method),
         payment_status = COALESCE(?, payment_status),
         subtotal = COALESCE(?, subtotal),
         discount_amount = COALESCE(?, discount_amount),
         gst_amount = COALESCE(?, gst_amount),
         total_amount = COALESCE(?, total_amount),
         customer_name = COALESCE(?, customer_name),
         customer_phone = COALESCE(?, customer_phone),
         notes = COALESCE(?, notes),
         updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      body.status ?? null,
      body.paymentMethod ?? null,
      body.paymentStatus ?? null,
      body.subtotal !== undefined ? body.subtotal : null,
      body.discountAmount !== undefined ? body.discountAmount : null,
      body.gstAmount !== undefined ? body.gstAmount : null,
      body.totalAmount !== undefined ? body.totalAmount : null,
      body.customerName ?? null,
      body.customerPhone ?? null,
      body.notes ?? null,
      now, id, tenantId,
    );

    // Free table when order is paid/closed
    if ((body.status === 'paid' || body.status === 'closed') && order.table_id) {
      await execute(db, "UPDATE pos_tables SET status = 'available', updated_at = ? WHERE id = ? AND tenant_id = ?", now, order.table_id, tenantId);
    }

    const updated = await queryFirst(db, 'SELECT * FROM pos_orders WHERE id = ?', id);
    const items = await queryAll(db, 'SELECT * FROM pos_order_items WHERE order_id = ?', id);
    return new Response(JSON.stringify({
      ...updated,
      items: items.map(i => ({
        id: i.id, menuItemId: i.menu_item_id, name: i.name, price: i.price,
        quantity: i.quantity, notes: i.notes || '', subtotal: i.price * i.quantity,
      })),
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update order';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);

    const order = await queryFirst(db, 'SELECT * FROM pos_orders WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!order) return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: CORS });

    // Free table if it was occupied
    if (order.table_id) {
      const now = new Date().toISOString();
      await execute(db, "UPDATE pos_tables SET status = 'available', updated_at = ? WHERE id = ? AND tenant_id = ?", now, order.table_id, tenantId);
    }

    await execute(db, 'DELETE FROM pos_order_items WHERE order_id = ?', id);
    await execute(db, 'DELETE FROM pos_orders WHERE id = ? AND tenant_id = ?', id, tenantId);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete order';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
