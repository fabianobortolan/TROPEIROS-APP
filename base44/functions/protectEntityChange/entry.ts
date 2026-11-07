import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId, action, oldData, newData, isCritical } = body;

    if (!entityType || !entityId || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calcular resumo das mudanças
    const changesSummary = [];
    if (oldData && newData && action === 'update') {
      for (const key in newData) {
        if (oldData[key] !== newData[key]) {
          changesSummary.push({
            field: key,
            old_value: oldData[key],
            new_value: newData[key]
          });
        }
      }
    }

    // Registrar mudança no log
    const logEntry = {
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      changed_by: user.email,
      change_timestamp: new Date().toISOString(),
      old_data: oldData || null,
      new_data: newData || null,
      changes_summary: changesSummary,
      is_critical: isCritical || false
    };

    try {
      await base44.entities.DataChangeLog.create(logEntry);
    } catch (e) {
      console.error('Failed to log change:', e);
      // Não bloqueia a operação se o log falhar
    }

    // Se for delete, salvar na papeleira
    if (action === 'delete' && oldData) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const deletedEntry = {
        entity_type: entityType,
        entity_id: entityId,
        entity_name: oldData.title || oldData.name || oldData.song_title || 'Sem título',
        entity_data: oldData,
        deleted_by: user.email,
        deleted_at: new Date().toISOString(),
        restore_deadline: thirtyDaysFromNow.toISOString(),
        can_restore: true
      };

      try {
        await base44.entities.DeletedEntity.create(deletedEntry);
      } catch (e) {
        console.error('Failed to store deleted entity:', e);
      }
    }

    return Response.json({
      success: true,
      logged: true,
      changeId: logEntry.id
    });
  } catch (error) {
    console.error('Protect entity change error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});