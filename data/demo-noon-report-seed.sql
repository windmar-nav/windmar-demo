-- =============================================================
-- Windmar Demo Noon Report Seed Data
-- Generated: 2026-03-10
-- Source: Synthetic MR Tanker (NW Europe / Mediterranean)
-- Reports: 30 noon reports (at-sea days only)
-- Date range: 2025-07-01 to 2025-08-15
-- Vessel ID: 00000000-0000-0000-0000-de0000000001
-- Route: Rotterdam → Algeciras → Augusta → Piraeus → Trieste
--        → Augusta → Algeciras → Rotterdam
-- =============================================================

-- Ensure table exists (self-contained)
CREATE TABLE IF NOT EXISTS noon_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    speed_over_ground_kts FLOAT NOT NULL,
    speed_through_water_kts FLOAT,
    fuel_consumption_mt FLOAT NOT NULL,
    period_hours FLOAT NOT NULL DEFAULT 24.0,
    is_laden BOOLEAN NOT NULL DEFAULT TRUE,
    heading_deg FLOAT DEFAULT 0,
    wind_speed_kts FLOAT,
    wind_direction_deg FLOAT,
    wave_height_m FLOAT,
    wave_direction_deg FLOAT,
    engine_power_kw FLOAT,
    draft_fwd_m FLOAT,
    draft_aft_m FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_noon_reports_vessel_id ON noon_reports(vessel_id);
CREATE INDEX IF NOT EXISTS ix_noon_reports_timestamp ON noon_reports(timestamp);

BEGIN;

-- Delete existing demo data (idempotent)
DELETE FROM noon_reports WHERE vessel_id = '00000000-0000-0000-0000-de0000000001';

-- Leg 1: Rotterdam → Algeciras (laden, ~5 days at sea, Jul 1-6)
INSERT INTO noon_reports (vessel_id, timestamp, latitude, longitude, speed_over_ground_kts, speed_through_water_kts, fuel_consumption_mt, period_hours, is_laden, heading_deg, wind_speed_kts, wind_direction_deg, wave_height_m, wave_direction_deg, engine_power_kw, draft_fwd_m, draft_aft_m) VALUES
('00000000-0000-0000-0000-de0000000001', '2025-07-01 12:00:00', 51.00,  2.50, 13.2, 13.5, 28.5, 24, TRUE,  210, 15.0, 250, 1.5, 240, 4400, 11.8, 11.6),
('00000000-0000-0000-0000-de0000000001', '2025-07-02 12:00:00', 48.50, -5.20, 14.0, 14.2, 30.1, 24, TRUE,  205, 18.0, 225, 1.8, 220, 4900, 11.8, 11.6),
('00000000-0000-0000-0000-de0000000001', '2025-07-03 12:00:00', 44.80, -9.10, 12.8, 13.0, 27.1, 24, TRUE,  195, 22.0, 310, 2.4, 300, 4600, 11.7, 11.5),
('00000000-0000-0000-0000-de0000000001', '2025-07-04 12:00:00', 40.20, -9.50, 13.5, 13.8, 29.2, 24, TRUE,  180, 12.0, 270, 1.2, 260, 4500, 11.8, 11.6),
('00000000-0000-0000-0000-de0000000001', '2025-07-05 12:00:00', 37.50, -6.80, 13.8, 14.1, 28.8, 24, TRUE,  100, 10.0, 180, 0.8, 170, 4350, 11.8, 11.6);

-- Leg 2: Algeciras → Augusta (ballast, ~4 days at sea, Jul 8-11)
INSERT INTO noon_reports (vessel_id, timestamp, latitude, longitude, speed_over_ground_kts, speed_through_water_kts, fuel_consumption_mt, period_hours, is_laden, heading_deg, wind_speed_kts, wind_direction_deg, wave_height_m, wave_direction_deg, engine_power_kw, draft_fwd_m, draft_aft_m) VALUES
('00000000-0000-0000-0000-de0000000001', '2025-07-08 12:00:00', 37.20, -2.50, 14.5, 14.8, 25.2, 24, FALSE, 80, 8.0,  320, 0.6, 310, 3900, 6.5, 6.3),
('00000000-0000-0000-0000-de0000000001', '2025-07-09 12:00:00', 37.80,  3.20, 14.8, 15.1, 26.0, 24, FALSE, 75, 14.0, 350, 1.1, 340, 4100, 6.5, 6.3),
('00000000-0000-0000-0000-de0000000001', '2025-07-10 12:00:00', 37.50,  9.80, 15.2, 15.5, 27.5, 24, FALSE, 65, 10.0, 290, 0.9, 280, 4200, 6.4, 6.3),
('00000000-0000-0000-0000-de0000000001', '2025-07-11 12:00:00', 37.20, 14.90, 14.2, 14.5, 24.8, 24, FALSE, 50, 16.0, 340, 1.4, 330, 3800, 6.5, 6.3);

-- Leg 3: Augusta → Piraeus (laden, ~3 days at sea, Jul 13-15)
INSERT INTO noon_reports (vessel_id, timestamp, latitude, longitude, speed_over_ground_kts, speed_through_water_kts, fuel_consumption_mt, period_hours, is_laden, heading_deg, wind_speed_kts, wind_direction_deg, wave_height_m, wave_direction_deg, engine_power_kw, draft_fwd_m, draft_aft_m) VALUES
('00000000-0000-0000-0000-de0000000001', '2025-07-13 12:00:00', 36.80, 17.50, 13.5, 13.8, 29.8, 24, TRUE, 90, 20.0, 330, 2.0, 320, 5200, 11.8, 11.6),
('00000000-0000-0000-0000-de0000000001', '2025-07-14 12:00:00', 36.50, 22.80, 15.1, 15.4, 31.5, 24, TRUE, 55, 18.0, 350, 1.5, 340, 5100, 11.7, 11.5),
('00000000-0000-0000-0000-de0000000001', '2025-07-15 12:00:00', 37.80, 23.50, 12.5, 12.8, 26.8, 18, TRUE, 10, 25.0, 10,  2.8, 350, 5500, 11.8, 11.6);

-- Leg 4: Piraeus → Trieste (ballast, ~4 days at sea, Jul 17-20)
INSERT INTO noon_reports (vessel_id, timestamp, latitude, longitude, speed_over_ground_kts, speed_through_water_kts, fuel_consumption_mt, period_hours, is_laden, heading_deg, wind_speed_kts, wind_direction_deg, wave_height_m, wave_direction_deg, engine_power_kw, draft_fwd_m, draft_aft_m) VALUES
('00000000-0000-0000-0000-de0000000001', '2025-07-17 12:00:00', 37.50, 21.50, 15.6, 15.9, 24.5, 24, FALSE, 320, 8.0,  10,  0.5, 0,   3800, 6.5, 6.3),
('00000000-0000-0000-0000-de0000000001', '2025-07-18 12:00:00', 39.80, 18.50, 15.1, 15.4, 25.8, 24, FALSE, 340, 12.0, 130, 1.0, 120, 4000, 6.5, 6.3),
('00000000-0000-0000-0000-de0000000001', '2025-07-19 12:00:00', 42.50, 15.80, 15.4, 15.7, 24.2, 24, FALSE, 350, 6.0,  90,  0.4, 80,  3700, 6.4, 6.2),
('00000000-0000-0000-0000-de0000000001', '2025-07-20 12:00:00', 44.80, 13.60, 14.8, 15.1, 23.5, 18, FALSE, 10,  10.0, 180, 0.7, 170, 3600, 6.5, 6.3);

-- Leg 5: Trieste → Augusta (laden, ~3 days at sea, Jul 22-24)
INSERT INTO noon_reports (vessel_id, timestamp, latitude, longitude, speed_over_ground_kts, speed_through_water_kts, fuel_consumption_mt, period_hours, is_laden, heading_deg, wind_speed_kts, wind_direction_deg, wave_height_m, wave_direction_deg, engine_power_kw, draft_fwd_m, draft_aft_m) VALUES
('00000000-0000-0000-0000-de0000000001', '2025-07-22 12:00:00', 42.80, 14.20, 13.0, 13.3, 28.0, 24, TRUE, 190, 14.0, 350, 1.3, 340, 4600, 11.8, 11.6),
('00000000-0000-0000-0000-de0000000001', '2025-07-23 12:00:00', 39.50, 15.80, 13.8, 14.1, 30.5, 24, TRUE, 170, 20.0, 320, 2.2, 310, 5000, 11.7, 11.5),
('00000000-0000-0000-0000-de0000000001', '2025-07-24 12:00:00', 37.30, 15.20, 12.2, 12.5, 26.5, 16, TRUE, 200, 16.0, 280, 1.6, 270, 4400, 11.8, 11.6);

-- Leg 6: Augusta → Algeciras (ballast, ~4 days at sea, Jul 26-29)
INSERT INTO noon_reports (vessel_id, timestamp, latitude, longitude, speed_over_ground_kts, speed_through_water_kts, fuel_consumption_mt, period_hours, is_laden, heading_deg, wind_speed_kts, wind_direction_deg, wave_height_m, wave_direction_deg, engine_power_kw, draft_fwd_m, draft_aft_m) VALUES
('00000000-0000-0000-0000-de0000000001', '2025-07-26 12:00:00', 37.50, 12.00, 15.5, 15.8, 25.0, 24, FALSE, 260, 8.0,  30,  0.5, 20,  3800, 6.5, 6.3),
('00000000-0000-0000-0000-de0000000001', '2025-07-27 12:00:00', 37.80,  6.50, 14.9, 15.2, 24.2, 24, FALSE, 255, 14.0, 340, 1.2, 330, 4000, 6.5, 6.3),
('00000000-0000-0000-0000-de0000000001', '2025-07-28 12:00:00', 37.20,  1.20, 15.8, 16.1, 26.8, 24, FALSE, 250, 10.0, 300, 0.8, 290, 4100, 6.4, 6.2),
('00000000-0000-0000-0000-de0000000001', '2025-07-29 12:00:00', 36.40, -4.50, 14.5, 14.8, 23.8, 18, FALSE, 265, 18.0, 250, 1.8, 240, 4200, 6.5, 6.3);

-- Leg 7: Algeciras → Rotterdam (laden, ~5 days at sea, Aug 1-5)
INSERT INTO noon_reports (vessel_id, timestamp, latitude, longitude, speed_over_ground_kts, speed_through_water_kts, fuel_consumption_mt, period_hours, is_laden, heading_deg, wind_speed_kts, wind_direction_deg, wave_height_m, wave_direction_deg, engine_power_kw, draft_fwd_m, draft_aft_m) VALUES
('00000000-0000-0000-0000-de0000000001', '2025-08-01 12:00:00', 37.80, -7.50, 13.0, 13.3, 28.2, 24, TRUE, 340, 15.0, 20,  1.5, 10,  4500, 11.8, 11.6),
('00000000-0000-0000-0000-de0000000001', '2025-08-02 12:00:00', 40.50, -9.80, 12.5, 12.8, 27.8, 24, TRUE, 355, 20.0, 310, 2.5, 300, 4800, 11.7, 11.5),
('00000000-0000-0000-0000-de0000000001', '2025-08-03 12:00:00', 43.80, -8.20, 13.8, 14.1, 30.2, 24, TRUE, 15,  25.0, 270, 3.0, 260, 5200, 11.8, 11.6),
('00000000-0000-0000-0000-de0000000001', '2025-08-04 12:00:00', 47.20, -5.50, 14.2, 14.5, 29.5, 24, TRUE, 30,  18.0, 250, 2.0, 240, 4700, 11.8, 11.6),
('00000000-0000-0000-0000-de0000000001', '2025-08-05 12:00:00', 50.50,  1.80, 13.5, 13.8, 28.0, 20, TRUE, 45,  12.0, 220, 1.2, 210, 4300, 11.7, 11.5);

COMMIT;
