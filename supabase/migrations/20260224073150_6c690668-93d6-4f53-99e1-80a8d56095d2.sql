
-- ============================================================
-- 1. CLEAN UP ORPHAN DATA (groups without institution)
-- ============================================================

-- Delete dependent data from orphan rooms
DELETE FROM peer_evaluations WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM evaluations WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM evaluation_criteria WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM step_items WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM chat_messages WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM session_references WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM session_minutes WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM user_badges WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM tutorial_sessions WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM room_scenarios WHERE room_id IN (
  SELECT r.id FROM rooms r JOIN groups g ON g.id = r.group_id WHERE g.course_id IS NULL
);
DELETE FROM rooms WHERE group_id IN (
  SELECT id FROM groups WHERE course_id IS NULL
);
DELETE FROM group_members WHERE group_id IN (
  SELECT id FROM groups WHERE course_id IS NULL
);
DELETE FROM groups WHERE course_id IS NULL;

-- ============================================================
-- 2. ADD ON DELETE CASCADE TO ALL HIERARCHICAL FOREIGN KEYS
-- ============================================================

-- courses -> institutions
ALTER TABLE courses DROP CONSTRAINT courses_institution_id_fkey;
ALTER TABLE courses ADD CONSTRAINT courses_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- modules -> courses
ALTER TABLE modules DROP CONSTRAINT modules_course_id_fkey;
ALTER TABLE modules ADD CONSTRAINT modules_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- course_members -> courses
ALTER TABLE course_members DROP CONSTRAINT course_members_course_id_fkey;
ALTER TABLE course_members ADD CONSTRAINT course_members_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- groups -> courses
ALTER TABLE groups DROP CONSTRAINT groups_course_id_fkey;
ALTER TABLE groups ADD CONSTRAINT groups_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- groups -> modules
ALTER TABLE groups DROP CONSTRAINT groups_module_id_fkey;
ALTER TABLE groups ADD CONSTRAINT groups_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL;

-- group_members -> groups
ALTER TABLE group_members DROP CONSTRAINT group_members_group_id_fkey;
ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- rooms -> groups
ALTER TABLE rooms DROP CONSTRAINT rooms_group_id_fkey;
ALTER TABLE rooms ADD CONSTRAINT rooms_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- room_scenarios -> rooms
ALTER TABLE room_scenarios DROP CONSTRAINT room_scenarios_room_id_fkey;
ALTER TABLE room_scenarios ADD CONSTRAINT room_scenarios_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- room_scenarios -> scenarios
ALTER TABLE room_scenarios DROP CONSTRAINT room_scenarios_scenario_id_fkey;
ALTER TABLE room_scenarios ADD CONSTRAINT room_scenarios_scenario_id_fkey
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL;

-- tutorial_sessions -> rooms
ALTER TABLE tutorial_sessions DROP CONSTRAINT tutorial_sessions_room_id_fkey;
ALTER TABLE tutorial_sessions ADD CONSTRAINT tutorial_sessions_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- tutorial_sessions -> room_scenarios
ALTER TABLE tutorial_sessions DROP CONSTRAINT tutorial_sessions_room_scenario_id_fkey;
ALTER TABLE tutorial_sessions ADD CONSTRAINT tutorial_sessions_room_scenario_id_fkey
  FOREIGN KEY (room_scenario_id) REFERENCES room_scenarios(id) ON DELETE CASCADE;

-- chat_messages -> rooms
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_room_id_fkey;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- chat_messages -> tutorial_sessions
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_session_id_fkey;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES tutorial_sessions(id) ON DELETE SET NULL;

-- step_items -> rooms
ALTER TABLE step_items DROP CONSTRAINT step_items_room_id_fkey;
ALTER TABLE step_items ADD CONSTRAINT step_items_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- step_items -> tutorial_sessions
ALTER TABLE step_items DROP CONSTRAINT step_items_session_id_fkey;
ALTER TABLE step_items ADD CONSTRAINT step_items_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES tutorial_sessions(id) ON DELETE SET NULL;

-- evaluation_criteria -> rooms
ALTER TABLE evaluation_criteria DROP CONSTRAINT evaluation_criteria_room_id_fkey;
ALTER TABLE evaluation_criteria ADD CONSTRAINT evaluation_criteria_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- evaluations -> rooms
ALTER TABLE evaluations DROP CONSTRAINT evaluations_room_id_fkey;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- evaluations -> evaluation_criteria
ALTER TABLE evaluations DROP CONSTRAINT evaluations_criterion_id_fkey;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_criterion_id_fkey
  FOREIGN KEY (criterion_id) REFERENCES evaluation_criteria(id) ON DELETE CASCADE;

-- evaluations -> tutorial_sessions
ALTER TABLE evaluations DROP CONSTRAINT evaluations_session_id_fkey;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES tutorial_sessions(id) ON DELETE SET NULL;

-- peer_evaluations -> rooms
ALTER TABLE peer_evaluations DROP CONSTRAINT peer_evaluations_room_id_fkey;
ALTER TABLE peer_evaluations ADD CONSTRAINT peer_evaluations_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- peer_evaluations -> evaluation_criteria
ALTER TABLE peer_evaluations DROP CONSTRAINT peer_evaluations_criterion_id_fkey;
ALTER TABLE peer_evaluations ADD CONSTRAINT peer_evaluations_criterion_id_fkey
  FOREIGN KEY (criterion_id) REFERENCES evaluation_criteria(id) ON DELETE CASCADE;

-- peer_evaluations -> tutorial_sessions
ALTER TABLE peer_evaluations DROP CONSTRAINT peer_evaluations_session_id_fkey;
ALTER TABLE peer_evaluations ADD CONSTRAINT peer_evaluations_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES tutorial_sessions(id) ON DELETE SET NULL;

-- session_references -> rooms
ALTER TABLE session_references DROP CONSTRAINT session_references_room_id_fkey;
ALTER TABLE session_references ADD CONSTRAINT session_references_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- session_references -> tutorial_sessions
ALTER TABLE session_references DROP CONSTRAINT session_references_session_id_fkey;
ALTER TABLE session_references ADD CONSTRAINT session_references_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES tutorial_sessions(id) ON DELETE SET NULL;

-- session_minutes -> rooms
ALTER TABLE session_minutes DROP CONSTRAINT session_minutes_room_id_fkey;
ALTER TABLE session_minutes ADD CONSTRAINT session_minutes_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- session_minutes -> tutorial_sessions
ALTER TABLE session_minutes DROP CONSTRAINT session_minutes_session_id_fkey;
ALTER TABLE session_minutes ADD CONSTRAINT session_minutes_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES tutorial_sessions(id) ON DELETE CASCADE;

-- professor_notes -> tutorial_sessions
ALTER TABLE professor_notes DROP CONSTRAINT professor_notes_session_id_fkey;
ALTER TABLE professor_notes ADD CONSTRAINT professor_notes_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES tutorial_sessions(id) ON DELETE CASCADE;

-- user_badges -> rooms
ALTER TABLE user_badges DROP CONSTRAINT user_badges_room_id_fkey;
ALTER TABLE user_badges ADD CONSTRAINT user_badges_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- user_badges -> badge_definitions
ALTER TABLE user_badges DROP CONSTRAINT user_badges_badge_id_fkey;
ALTER TABLE user_badges ADD CONSTRAINT user_badges_badge_id_fkey
  FOREIGN KEY (badge_id) REFERENCES badge_definitions(id) ON DELETE CASCADE;

-- learning_objectives -> modules
ALTER TABLE learning_objectives DROP CONSTRAINT learning_objectives_module_id_fkey;
ALTER TABLE learning_objectives ADD CONSTRAINT learning_objectives_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;

-- learning_objectives -> tutorial_sessions
ALTER TABLE learning_objectives DROP CONSTRAINT learning_objectives_source_session_id_fkey;
ALTER TABLE learning_objectives ADD CONSTRAINT learning_objectives_source_session_id_fkey
  FOREIGN KEY (source_session_id) REFERENCES tutorial_sessions(id) ON DELETE SET NULL;

-- objective_sessions -> learning_objectives
ALTER TABLE objective_sessions DROP CONSTRAINT objective_sessions_objective_id_fkey;
ALTER TABLE objective_sessions ADD CONSTRAINT objective_sessions_objective_id_fkey
  FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE;

-- objective_sessions -> tutorial_sessions
ALTER TABLE objective_sessions DROP CONSTRAINT objective_sessions_session_id_fkey;
ALTER TABLE objective_sessions ADD CONSTRAINT objective_sessions_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES tutorial_sessions(id) ON DELETE CASCADE;

-- scenarios -> courses
ALTER TABLE scenarios DROP CONSTRAINT scenarios_course_id_fkey;
ALTER TABLE scenarios ADD CONSTRAINT scenarios_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- scenarios -> modules
ALTER TABLE scenarios DROP CONSTRAINT scenarios_module_id_fkey;
ALTER TABLE scenarios ADD CONSTRAINT scenarios_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL;

-- subscriptions -> institutions
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_institution_id_fkey;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- admin_invites -> institutions
ALTER TABLE admin_invites DROP CONSTRAINT admin_invites_institution_id_fkey;
ALTER TABLE admin_invites ADD CONSTRAINT admin_invites_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
