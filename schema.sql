CREATE TABLE IF NOT EXISTS games(
 pid TEXT NOT NULL, seed INTEGER NOT NULL, name TEXT, ver TEXT, pack INTEGER, field TEXT, map TEXT, army TEXT, foe TEXT, att INTEGER,
 started INTEGER, ended INTEGER, round INTEGER, vp_h INTEGER, vp_c INTEGER, winner INTEGER, opts TEXT,
 PRIMARY KEY(pid,seed));
CREATE INDEX IF NOT EXISTS games_started ON games(started);
