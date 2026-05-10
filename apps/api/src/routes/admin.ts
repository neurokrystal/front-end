import { FastifyInstance } from "fastify";
import { auth } from "../auth.js";
import { query } from "../lib/db.js";
import { emailService } from "../lib/email.js";
import { storageService } from "../lib/storage.js";
import { v4 as uuidv4 } from "uuid";

export async function adminRoutes(fastify: FastifyInstance) {
  // Middleware to check for platform_admin
  fastify.addHook("preHandler", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: new Headers(request.headers as Record<string, string>)
    });

    if (!session || (session.user as any).role !== "platform_admin") {
      return reply.status(403).send({ message: "Forbidden" });
    }
    
    (request as any).session = session;
  });

  // Email Templates
  fastify.get("/admin/email-templates", async () => {
    const res = await query("SELECT * FROM email_templates ORDER BY id");
    return res.rows;
  });

  fastify.get("/admin/email-templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await query("SELECT * FROM email_templates WHERE id = $1", [id]);
    if (res.rowCount === 0) return reply.status(404).send({ message: "Not found" });
    return res.rows[0];
  });

  fastify.patch("/admin/email-templates/:id", async (request) => {
    const { id } = request.params as { id: string };
    const { subject, body_text, body_html } = request.body as any;
    
    await query(
      "UPDATE email_templates SET subject = $1, body_text = $2, body_html = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
      [subject, body_text, body_html, id]
    );
    
    return { success: true };
  });

  fastify.post("/admin/email-templates/test", async (request) => {
    const { to, subject, body_text, body_html, data } = request.body as any;
    
    const renderedText = emailService.renderTemplate(body_text, data || {});
    const renderedHtml = emailService.renderTemplate(body_html, data || {});

    await emailService.sendEmail({
      to,
      subject,
      text: renderedText,
      html: renderedHtml,
    });

    return { success: true };
  });

  // Assets
  fastify.get("/admin/assets", async () => {
    const res = await query("SELECT * FROM assets ORDER BY created_at DESC");
    return res.rows;
  });

  fastify.post("/admin/assets/upload", async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ message: "No file uploaded" });

    const folder = (data.fields.folder as any)?.value || "general";
    const filename = data.filename;
    const contentType = data.mimetype;
    const buffer = await data.toBuffer();
    
    // Create unique path: folder/uuid-filename
    const id = uuidv4();
    const path = `${folder}/${id}-${filename}`;
    
    const url = await storageService.uploadFile(path, buffer, contentType);
    
    await query(
      "INSERT INTO assets (id, name, path, url, content_type, size, folder) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, filename, path, url, contentType, buffer.length, folder]
    );

    return { id, url, name: filename };
  });

  fastify.delete("/admin/assets/:id", async (request) => {
    const { id } = request.params as { id: string };
    const res = await query("SELECT path FROM assets WHERE id = $1", [id]);
    if (res.rowCount && res.rowCount > 0) {
      await storageService.deleteFile(res.rows[0].path);
      await query("DELETE FROM assets WHERE id = $1", [id]);
    }
    return { success: true };
  });
}
