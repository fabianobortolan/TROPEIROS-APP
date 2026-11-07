import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Busca TODAS as músicas usando service role (sem restrição de RLS)
  const allSongs = await base44.asServiceRole.entities.Song.list();

  if (user.role === 'admin') {
    // Admin vê tudo
    return Response.json(allSongs);
  }

  // Usuário comum: vê suas próprias músicas + músicas de admins
  const allUsers = await base44.asServiceRole.entities.User.list();
  const adminEmails = new Set(
    allUsers.filter(u => u.role === 'admin').map(u => u.email)
  );

  const filtered = allSongs.filter(song =>
    song.created_by === user.email ||
    adminEmails.has(song.created_by)
  );

  return Response.json(filtered);
});