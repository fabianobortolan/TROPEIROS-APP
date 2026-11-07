import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { importData } = body;

    if (!importData || !importData.data) {
      return Response.json({ error: 'Arquivo de backup inválido' }, { status: 400 });
    }

    const results = { created: {}, errors: [] };
    const isArray = Array.isArray(importData.data);
    const exportType = importData.export_type;

    const cleanRecord = (record) => {
      const { id, created_date, updated_date, created_by, created_by_id, entity_name, app_id, is_sample, is_deleted, deleted_date, ...clean } = record;
      return clean;
    };

    // Importação de arquivo individual (array)
    if (isArray) {
      if (exportType === 'songs') {
        results.created.songs = 0;
        for (const item of importData.data) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.title && cleaned.artist) {
              await base44.entities.Song.create(cleaned);
              results.created.songs++;
            }
          } catch (e) {
            results.errors.push(`Song: ${e.message}`);
          }
        }
      } else if (exportType === 'progressions') {
        results.created.progressions = 0;
        for (const item of importData.data) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.name && cleaned.pattern) {
              await base44.entities.Progression.create(cleaned);
              results.created.progressions++;
            }
          } catch (e) {
            results.errors.push(`Progression: ${e.message}`);
          }
        }
      } else if (exportType === 'rhythms') {
        results.created.rhythms = 0;
        for (const item of importData.data) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.name) {
              await base44.entities.Rhythm.create(cleaned);
              results.created.rhythms++;
            }
          } catch (e) {
            results.errors.push(`Rhythm: ${e.message}`);
          }
        }
      } else if (exportType === 'chords') {
        results.created.chords = 0;
        for (const item of importData.data) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.name && cleaned.instrument) {
              await base44.entities.Chord.create(cleaned);
              results.created.chords++;
            }
          } catch (e) {
            results.errors.push(`Chord: ${e.message}`);
          }
        }
      } else if (exportType === 'setlists') {
        results.created.setlists = 0;
        for (const item of importData.data) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.name) {
              await base44.entities.Setlist.create(cleaned);
              results.created.setlists++;
            }
          } catch (e) {
            results.errors.push(`Setlist: ${e.message}`);
          }
        }
      } else if (exportType === 'exercises') {
        results.created.exercises = 0;
        for (const item of importData.data) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.title && cleaned.category) {
              await base44.entities.Exercise.create(cleaned);
              results.created.exercises++;
            }
          } catch (e) {
            results.errors.push(`Exercise: ${e.message}`);
          }
        }
      } else {
        return Response.json({ error: 'Tipo de exportação não reconhecido' }, { status: 400 });
      }
    } else {
      // Backup completo
      if (importData.data.progressions?.length > 0) {
        results.created.progressions = 0;
        for (const item of importData.data.progressions) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.name && cleaned.pattern) {
              await base44.entities.Progression.create(cleaned);
              results.created.progressions++;
            }
          } catch (e) {
            results.errors.push(`Progression: ${e.message}`);
          }
        }
      }

      if (importData.data.rhythms?.length > 0) {
        results.created.rhythms = 0;
        for (const item of importData.data.rhythms) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.name) {
              await base44.entities.Rhythm.create(cleaned);
              results.created.rhythms++;
            }
          } catch (e) {
            results.errors.push(`Rhythm: ${e.message}`);
          }
        }
      }

      if (importData.data.chords?.length > 0) {
        results.created.chords = 0;
        for (const item of importData.data.chords) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.name && cleaned.instrument) {
              await base44.entities.Chord.create(cleaned);
              results.created.chords++;
            }
          } catch (e) {
            results.errors.push(`Chord: ${e.message}`);
          }
        }
      }

      if (importData.data.songs?.length > 0) {
        results.created.songs = 0;
        for (const item of importData.data.songs) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.title && cleaned.artist) {
              await base44.entities.Song.create(cleaned);
              results.created.songs++;
            }
          } catch (e) {
            results.errors.push(`Song: ${e.message}`);
          }
        }
      }

      if (importData.data.setlists?.length > 0) {
        results.created.setlists = 0;
        for (const item of importData.data.setlists) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.name) {
              await base44.entities.Setlist.create(cleaned);
              results.created.setlists++;
            }
          } catch (e) {
            results.errors.push(`Setlist: ${e.message}`);
          }
        }
      }

      if (importData.data.exercises?.length > 0) {
        results.created.exercises = 0;
        for (const item of importData.data.exercises) {
          try {
            const cleaned = cleanRecord(item);
            if (cleaned.title && cleaned.category) {
              await base44.entities.Exercise.create(cleaned);
              results.created.exercises++;
            }
          } catch (e) {
            results.errors.push(`Exercise: ${e.message}`);
          }
        }
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});