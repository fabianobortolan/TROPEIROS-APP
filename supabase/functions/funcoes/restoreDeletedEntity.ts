// Portado do Base44 (base44/functions/restoreDeletedEntity) — só o cabeçalho e o fim mudaram.
// deno-lint-ignore-file no-explicit-any
import { createClientFromRequest } from './base44.ts';

export default async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deletedEntityId } = body;

    if (!deletedEntityId) {
      return Response.json({ error: 'Missing deletedEntityId' }, { status: 400 });
    }

    // Buscar entidade deletada
    const deleted = await base44.entities.DeletedEntity.filter({ id: deletedEntityId }, null, 1);
    
    if (!deleted || deleted.length === 0) {
      return Response.json({ error: 'Entidade não encontrada na papeleira' }, { status: 404 });
    }

    const deletedEntity = deleted[0];

    if (!deletedEntity.can_restore) {
      return Response.json({ error: 'Esta entidade não pode mais ser restaurada' }, { status: 400 });
    }

    const now = new Date();
    if (new Date(deletedEntity.restore_deadline) < now) {
      return Response.json({ error: 'Prazo de restauração expirado' }, { status: 400 });
    }

    // Restaurar entidade original
    const { id, created_date, updated_date, created_by, ...cleanData } = deletedEntity.entity_data;
    
    const restored = await base44.entities[deletedEntity.entity_type].create(cleanData);

    // Registrar restauração
    await base44.entities.DataChangeLog.create({
      entity_type: deletedEntity.entity_type,
      entity_id: deletedEntity.entity_id,
      action: 'restore',
      changed_by: user.email,
      change_timestamp: new Date().toISOString(),
      old_data: null,
      new_data: cleanData,
      is_critical: true
    });

    // Marcar como restaurado
    await base44.entities.DeletedEntity.update(deletedEntityId, { can_restore: false });

    return Response.json({
      success: true,
      message: 'Entidade restaurada com sucesso',
      restored_id: restored.id
    });
  } catch (error) {
    console.error('Restore error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
