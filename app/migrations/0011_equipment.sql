-- Phase 5.8: the classroom equipment / hardware inventory ("the kit list").
-- One flat, fast-to-maintain list: what's in the room, how many work, where it lives.
-- Referred to during planning by the teacher (/kit + a panel on Schemes) and injected into every
-- AI planning feature so practical suggestions fit the kit we actually own.

CREATE TABLE IF NOT EXISTS equipment (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,                       -- "micro:bit v2", "Crumble kit", "ESP32 CYD"
  category      TEXT NOT NULL DEFAULT 'other',       -- soft vocabulary: physical-computing |
                                                     -- robotics | computers | peripherals | av |
                                                     -- consumables | other (free text allowed)
  qty_total     INT,                                 -- how many we own (NULL = uncounted class set)
  qty_working   INT,                                 -- usable now; total - working = out of action
  location      TEXT,                                -- "cupboard B top shelf", "trolley 2"
  notes         TEXT,                                -- "needs 2xAAA each", "3 missing USB leads"
  tags          TEXT,                                -- comma labels, like scheme labels
  active        BOOLEAN NOT NULL DEFAULT true,       -- archive, never delete
  last_checked  DATE,                                -- when last counted / tested
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
