---
name: Simulador de Paciente Virtual
description: IA assume papel do paciente para anamnese; cenários têm dossiê oculto editável no admin
type: feature
---
- Cada `scenarios.patient_dossier` (text) guarda informações ocultas reveladas só ao prompt do simulador.
- Edge function `patient-simulator` carrega dossiê do `room_scenarios` ativo + histórico em `patient_interviews`, chama Lovable AI (gemini-3-flash-preview), persiste mensagens e loga em `ai_usage_log` (prompt_type='patient_simulator') + incrementa `ai_interaction_counts` da instituição.
- IA mantém personagem; nunca despeja dossiê de uma vez; responde "não sei" para perguntas fora do dossiê.
- UI `PatientSimulatorPanel` (aba "Paciente" na sessão): chat, voz via Web Speech API (pt-BR), botão "Citar no P7" cria `session_references` com `ref_type='patient_interview'`.
- RLS de `patient_interviews`: professor da sala + membros do grupo via `is_group_member`; admins gerenciam tudo.
