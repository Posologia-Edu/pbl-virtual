---
name: Tutor Ears — Transcrição e Mapa de Participação Oral
description: Gravação de áudio da sessão PBL com transcrição diarizada via Gemini e mapa de participação por falante.
type: feature
---

Coordenador ou professor inicia gravação via MediaRecorder (audio/webm) no painel "Tutor Ears" da sessão. Áudio sobe para o bucket privado `references` sob `audio/{room_id}/{session_id}/...` e é registrado em `session_audio_recordings` (status `pending`).

A edge function `transcribe-session` baixa o áudio (service role), envia ao Lovable AI Gateway (`google/gemini-2.5-flash`) via `input_audio` (base64, formato webm/mp3/mp4) com tool calling `return_transcript` retornando `{ full_text, segments:[{speaker,start,end,text}], glossary_hits:[{term,speaker,context}] }`. Limite: 20MB por arquivo. Diariza com rótulos consistentes Speaker A/B/C... (ainda não mapeia para `student_id` automaticamente — opcional via `speaker_labels`).

A função agrega `participation.by_speaker` (segundos e turnos) e atualiza status para `ready`. Logs em `ai_usage_log` com `prompt_type='transcribe_session'`.

RLS de `session_audio_recordings`: professor da sala (FOR ALL), coordenador (INSERT/SELECT na própria sala), membros do grupo (SELECT apenas se `status='ready'`), superadmin (FOR ALL). Realtime habilitado por canal `audio-rec-{sessionId}` no painel.

Termos do glossário do cenário (`scenarios.glossary`) entram no prompt para detecção de menções orais — alimenta cobertura de objetivos.
