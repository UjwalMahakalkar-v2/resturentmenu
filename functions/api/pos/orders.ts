import { getDB, queryAll, queryFirst, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function rowToOrder(r: any, items: any[] = []) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    orderNumber: r.order_number,
    orderType: r.order_type,
    sectionId: r.section_id || null,
    tableId: r.table_id || null,
    tableName: r.table_name || null,
    customerName: r.customer_name || '',
    customerPhone: r.customer_phone || '',
    status: r.status,
    subtotal: r.subtotal,
    discountAmount: r.discount_amount,
    gstAmount: r.gst_amount,
    totalAmount: r.total_amount,
    paymentMethod: r.payment_method || null,
    paymentStatus: r.payment_status,
    notes: r.notes || '',
    items: items.map(i => ({
      id: i.id,
      menuItemId: i.menu_item_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      notes: i.notes || '',
      subtotal: i.price * i.quantity,
    })),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const url = new URL(context.request.url);
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let sql = 'SELECT * FROM pos_orders WHERE tenant_id = ?';
    const params: any[] = [tenantId];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (date) { sql += ' AND date(created_at) = ?'; params.push(date); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const orders = await queryAll(db, sql, ...params);

    // Fetch items for each order
    const result = await Promise.all(orders.map(async (order) => {
      const items = await queryAll(db, 'SELECT * FROM pos_order_items WHERE order_id = ?', order.id);
      return rowToOrder(order, items);
    }));

    return new Response(JSON.stringify(result), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch orders';
    if (msg.includes('no such table')) return new Response(JSON.stringify([]), { headers: CORS });
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const body = await context.request.json();
    const now = new Date().toISOString();

    // Generate order number
    const settings = await queryFirst(db, 'SELECT bill_prefix, next_bill_number FROM pos_settings WHERE tenant_id = ?', tenantId);
    const prefix = settings?.bill_prefix ?? 'INV';
    const num = settings?.next_bill_number ?? 1;
    const orderNumber = `${prefix}-${String(num).padStart(4, '0')}`;

    // Update next bill number
    if (settings) {
      await execute(db, 'UPDATE pos_settings SET next_bill_number = next_bill_number + 1, updated_at = ? WHERE tenant_id = ?', now, tenantId);
    }

    const id = `ord_${crypto.randomUUID()}`;
    const subtotal = body.subtotal ?? 0;
    const discountAmount = body.discountAmount ?? 0;
    const gstAmount = body.gstAmount ?? 0;
    const totalAmount = body.totalAmount ?? (subtotal - discountAmount + gstAmount);

    await execute(
      db,
      `INSERT INTO pos_orders (id, tenant_id, order_number, order_type, section_id, table_id, table_name, customer_name, customer_phone, status, subtotal, discount_amount, gst_amount, total_amount, payment_method, payment_status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, tenantId, orderNumber,
      body.orderType ?? 'dine-in',
      body.sectionId ?? null,
      body.tableId ?? null,
      body.tableName ?? null,
      body.customerName ?? '',
      body.customerPhone ?? '',
      body.status ?? 'open',
      subtotal, discountAmount, gstAmount, totalAmount,
      body.paymentMethod ?? null,
      body.paymentStatus ?? 'pending',
      body.notes ?? '',
      now, now,
    );

    // Insert order items
    const items = body.items ?? [];
    for (const item of items) {
      const itemId = `oi_${crypto.randomUUID()}`;
      await execute(
        db,
        'INSERT INTO pos_order_items (id, order_id, tenant_id, menu_item_id, name, price, quantity, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        itemId, id, tenantId, item.menuItemId, item.name, item.price, item.quantity ?? 1, item.notes ?? '', now,
      );
    }

    // Update table status if dine-in
    if (body.tableId && body.orderType === 'dine-in') {
      await execute(db, "UPDATE pos_tables SET status = 'occupied', updated_at = ? WHERE id = ? AND tenant_id = ?", now, body.tableId, tenantId);
    }

    const savedOrder = await queryFirst(db, 'SELECT * FROM pos_orders WHERE id = ?', id);
    const savedItems = await queryAll(db, 'SELECT * FROM pos_order_items WHERE order_id = ?', id);
    return new Response(JSON.stringify(rowToOrder(savedOrder, savedItems)), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create order';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
