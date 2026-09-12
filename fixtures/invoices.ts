export async function getInvoice(req, db) {
  if (!req.user) return { status: 401 };
  const invoice = await db.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return { status: 404 };
  if (invoice.customerId !== req.user.id) return { status: 403 };
  return { status: 200, body: invoice };
}
