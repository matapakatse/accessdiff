export async function getInvoice(req, db) {
  if (!req.user) return { status: 401 };
  const invoice = await db.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return { status: 404 };
  return { status: 200, body: invoice };
}
