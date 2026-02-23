-- Enable RLS on all 10 tables
ALTER TABLE contacts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_step_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows               ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions     ENABLE ROW LEVEL SECURITY;

-- User-owned tables (direct user_id column)
CREATE POLICY "contacts: own rows" ON contacts
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "announcements: own rows" ON announcements
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "sequences: own rows" ON sequences
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "workflows: own rows" ON workflows
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Child tables (traverse FK to parent for user_id)

-- announcement_recipients → announcements.user_id
CREATE POLICY "announcement_recipients: own rows" ON announcement_recipients
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM announcements
    WHERE announcements.id = announcement_recipients.announcement_id
      AND announcements.user_id = auth.uid()
  ));

-- sequence_steps → sequences.user_id
CREATE POLICY "sequence_steps: own rows" ON sequence_steps
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sequences
    WHERE sequences.id = sequence_steps.sequence_id
      AND sequences.user_id = auth.uid()
  ));

-- sequence_enrollments → sequences.user_id
CREATE POLICY "sequence_enrollments: own rows" ON sequence_enrollments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sequences
    WHERE sequences.id = sequence_enrollments.sequence_id
      AND sequences.user_id = auth.uid()
  ));

-- sequence_step_logs → sequence_enrollments → sequences.user_id
CREATE POLICY "sequence_step_logs: own rows" ON sequence_step_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sequence_enrollments se
    JOIN sequences s ON s.id = se.sequence_id
    WHERE se.id = sequence_step_logs.enrollment_id
      AND s.user_id = auth.uid()
  ));

-- workflow_actions → workflows.user_id
CREATE POLICY "workflow_actions: own rows" ON workflow_actions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workflows
    WHERE workflows.id = workflow_actions.workflow_id
      AND workflows.user_id = auth.uid()
  ));

-- workflow_executions → workflows.user_id
CREATE POLICY "workflow_executions: own rows" ON workflow_executions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workflows
    WHERE workflows.id = workflow_executions.workflow_id
      AND workflows.user_id = auth.uid()
  ));
