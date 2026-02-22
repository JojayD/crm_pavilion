# Sequences — Flow Diagram

---

## What is a Sequence? (Plain English)

A **sequence** is a series of scheduled messages sent to a contact over time.

Think of it like a drip campaign:
- Day 0 → "Welcome!" email
- Day 3 → "How's it going?" SMS
- Day 7 → "Here's a tip" push notification

You build the steps first, publish the sequence to lock it in, then enroll contacts.
Once enrolled, the system automatically sends each message at the right time — no manual work needed.

---

## The 3 Phases (Plain English)

### Phase 1 — Build (Setup)
You create the sequence and add steps to it.
Nothing is sent yet. The sequence sits in **draft** status.

### Phase 2 — Publish
You click "Publish & Activate". The sequence flips to **active**.
Only active sequences can accept contacts. This is intentional — you shouldn't enroll people into an incomplete sequence.

### Phase 3 — Enroll & Send
You pick which contacts to enroll (all, filtered by company/tag/status, or specific people).
The system schedules a background job for each contact. When the timer runs out, the message goes out, and the next step is scheduled automatically. This repeats until all steps are done.

---

## Full Lifecycle (Technical Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'signalColor': '#000000', 'lineColor': '#000000', 'signalTextColor': '#000000'}}}%%
sequenceDiagram
    actor User
    participant Controller as SequencesController
    participant Service as SequencesService
    participant DB as PostgreSQL
    participant Redis as Redis (BullMQ)
    participant Processor as SequencesProcessor
    participant Delivery as Message Delivery<br/>(TODO: Resend/Twilio/FCM)

    %% ── SETUP PHASE ──────────────────────────────────────────────────────────
    rect rgb(240, 248, 255)
        Note over User,DB: SETUP — Build the sequence (done once)

        User->>Controller: POST /sequences { name }
        Controller->>Service: create(userId, dto)
        Service->>DB: INSERT sequences (status='draft')
        DB-->>Service: sequence row
        Service-->>Controller: sequence
        Controller-->>User: { id, name, status:'draft' }

        User->>Controller: POST /sequences/:id/steps { dayOffset, stepOrder, channel, content }
        Note over User,Controller: Repeat for each step (e.g. day 0, day 2, day 5)
        Controller->>Service: createStep(userId, sequenceId, dto)
        Service->>DB: INSERT sequence_steps
        DB-->>Service: step row
        Service-->>Controller: step
        Controller-->>User: { id, dayOffset, channel, content }

        User->>Controller: PATCH /sequences/:id { status:'active' }
        Controller->>Service: update(userId, id, dto)
        Service->>DB: UPDATE sequences SET status='active'
        DB-->>Service: updated row
        Controller-->>User: { id, status:'active' }
    end

    %% ── ENROLLMENT PHASE ─────────────────────────────────────────────────────
    rect rgb(240, 255, 240)
        Note over User,Redis: ENROLLMENT — Add contacts to the sequence

        User->>Controller: POST /sequences/:id/batch-enroll<br/>{ contactIds?, company?, tag?, status? }
        Note over Controller: Audience options: all / filtered / specific contacts
        Controller->>Service: batchEnroll(userId, sequenceId, dto)
        Service->>DB: SELECT contacts WHERE userId = userId<br/>+ apply company/tag/status filters
        Note over Service: Union filter results + explicit contactIds, deduplicate, remove exclusions
        loop For each resolved contact
            Service->>Service: enroll(userId, sequenceId, { contactId })
            Service->>DB: SELECT sequences (verify active)
            Service->>DB: SELECT contacts (verify ownership)
            Service->>DB: SELECT sequence_steps ORDER BY stepOrder
            Note over Service: nextStepAt = now + step[0].dayOffset days, at step[0].sendHour UTC
            Service->>DB: INSERT sequence_enrollments<br/>{ contactId, sequenceId, currentStepIndex:0,<br/>  nextStepAt, status:'active' }
            DB-->>Service: enrollment row
            Service->>Redis: queue.add('process-step', { enrollmentId },<br/>{ delay: nextStepAt - now })
            Note over Redis: Job held in Redis until delay expires
        end
        Service-->>Controller: { enrolledCount, skippedCount }
        Controller-->>User: { success, data: { enrolledCount, skippedCount } }
    end

    %% ── JOB EXECUTION PHASE ──────────────────────────────────────────────────
    rect rgb(255, 250, 240)
        Note over Redis,DB: JOB EXECUTION — BullMQ fires when delay expires

        Redis->>Processor: job fires: { enrollmentId }
        Processor->>Service: processStep(enrollmentId)
        Service->>DB: SELECT sequence_enrollments WHERE id = enrollmentId
        Service->>DB: SELECT sequence_steps ORDER BY stepOrder

        Note over Service: currentStep = steps[enrollment.currentStepIndex]

        Service->>DB: INSERT sequence_step_logs<br/>{ enrollmentId, stepId, channel,<br/>  contentSnapshot, status:'pending' }

        Service->>Delivery: send message<br/>(channel, contactId, content)

        alt Delivery succeeds
            Delivery-->>Service: ok
            Service->>DB: UPDATE sequence_step_logs SET status='completed', sentAt=now

            alt More steps remain
                Note over Service: nextStepAt = now + nextStep.dayOffset days
                Service->>DB: UPDATE sequence_enrollments<br/>SET currentStepIndex++, nextStepAt
                Service->>Redis: queue.add('process-step', { enrollmentId },<br/>{ delay: nextStepAt - now })
                Note over Redis: Next step held in Redis until its delay expires
            else No more steps
                Service->>DB: UPDATE sequence_enrollments SET status='completed'
                Note over DB: Enrollment finished — contact has received all messages
            end

        else Delivery fails
            Delivery-->>Service: throws Error
            Service->>DB: UPDATE sequence_step_logs<br/>SET status='failed', error=message
            Service-->>Processor: re-throws error
            Processor-->>Redis: BullMQ retries job automatically
        end
    end
```

---

## Job Cycle — Plain English

Here's what happens behind the scenes after a contact is enrolled:

1. **A timer is set.** The moment a contact is enrolled, the system figures out when the first message should go out (e.g. "9 AM on day 0") and hands a job to Redis — like dropping a note in a to-do box with a timestamp.

2. **Redis holds the job.** Nothing happens until the clock runs out. The job just waits in Redis. The app can restart, the server can reboot — the job survives.

3. **The timer expires, the job fires.** BullMQ (the job runner) picks up the job and calls `processStep`. This is the worker doing its job.

4. **A log entry is created first.** Before sending anything, a record is created in `sequence_step_logs` with `status: pending`. This acts as a paper trail — if something crashes mid-send, we know which step was in progress.

5. **The message is sent.** The worker calls the delivery service (email/SMS/push). If it succeeds, the log is updated to `completed`.

6. **Next step is scheduled.** If there are more steps, the same "set a timer" process repeats for the next one. If it was the last step, the enrollment is marked `completed`.

7. **If the send fails**, the log is marked `failed` and the job is re-thrown. BullMQ automatically retries it (with backoff). The contact doesn't miss a step because of a temporary glitch.

---

## Enrollment Status Lifecycle — Plain English

Each enrolled contact goes through these states:

| Status | What it means |
|---|---|
| `active` | Contact is in the sequence, steps are being sent |
| `paused` | Temporarily stopped (e.g. you paused it manually) — no new jobs fire |
| `completed` | All steps have been sent — done |
| `cancelled` | Removed from the sequence before finishing |

```
enrolled → active → completed
                 ↘ paused → active (if resumed)
                 ↘ cancelled
```

---

## BullMQ Job Chain (Technical Diagram)

```mermaid
flowchart TD
    A([Contact enrolled]) --> B[sequenceQueue.add\n'process-step'\ndelay = step0.dayOffset days at step0.sendHour UTC]
    B --> C{Redis holds job\nuntil delay expires}
    C --> D[SequencesProcessor.process fires]
    D --> E[sequencesService.processStep]
    E --> F[INSERT sequence_step_logs\nstatus = pending]
    F --> G{Send message}
    G -->|success| H[UPDATE log → completed]
    G -->|failure| I[UPDATE log → failed\nre-throw error]
    I --> J[BullMQ retries job]
    J --> D
    H --> K{Next step?}
    K -->|yes| L[UPDATE enrollment\ncurrentStepIndex++\nnextStepAt = now + dayOffset at sendHour UTC]
    L --> M[sequenceQueue.add\n'process-step'\ndelay = nextStepAt - now]
    M --> C
    K -->|no| N[UPDATE enrollment\nstatus = completed]
    N --> O([Done])
```

---

## Database Relationships

```mermaid
erDiagram
    sequences {
        uuid id PK
        uuid userId
        text name
        enum status "draft | active | paused"
        timestamp createdAt
    }

    sequence_steps {
        uuid id PK
        uuid sequenceId FK
        int dayOffset
        int stepOrder
        int sendHour "UTC hour 0-23"
        enum channel "email | sms | push"
        text content
        timestamp createdAt
    }

    sequence_enrollments {
        uuid id PK
        uuid sequenceId FK
        uuid contactId FK
        int currentStepIndex
        timestamp nextStepAt
        enum status "active | paused | completed | cancelled"
        timestamp enrolledAt
        timestamp createdAt
    }

    sequence_step_logs {
        uuid id PK
        uuid enrollmentId FK
        uuid stepId FK
        enum channel "email | sms | push"
        text contentSnapshot
        enum status "pending | completed | failed | skipped"
        timestamp sentAt
        text error
        timestamp createdAt
    }

    sequences ||--o{ sequence_steps : "has"
    sequences ||--o{ sequence_enrollments : "tracks"
    sequence_enrollments ||--o{ sequence_step_logs : "records"
    sequence_steps ||--o{ sequence_step_logs : "referenced by"
```
