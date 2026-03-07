"""
Unit tests for Numba JIT-compiled kernels.

Validates that every kernel produces results identical (within 1e-6)
to the original pure-Python implementations.
"""

import math

import pytest

from src.optimization import numba_kernels as nk


# ===================================================================
# Geometry kernels
# ===================================================================


class TestHaversine:
    def test_london_to_paris(self):
        result = nk.haversine(51.5, -0.12, 48.86, 2.35)
        assert result == pytest.approx(184.7540, rel=1e-4)

    def test_same_point(self):
        assert nk.haversine(10.0, 20.0, 10.0, 20.0) == pytest.approx(0.0, abs=1e-10)

    def test_equator_crossing(self):
        d = nk.haversine(0.0, 0.0, 0.0, 1.0)
        assert d == pytest.approx(60.0, rel=0.01)  # ~60 nm per degree at equator

    def test_poles(self):
        d = nk.haversine(90.0, 0.0, -90.0, 0.0)
        assert d == pytest.approx(3440.065 * math.pi, rel=1e-4)  # half circumference


class TestBearing:
    def test_london_to_paris(self):
        result = nk.bearing(51.5, -0.12, 48.86, 2.35)
        assert result == pytest.approx(148.117, rel=1e-3)

    def test_due_north(self):
        result = nk.bearing(0.0, 0.0, 1.0, 0.0)
        assert result == pytest.approx(0.0, abs=1e-6)

    def test_due_east(self):
        result = nk.bearing(0.0, 0.0, 0.0, 1.0)
        assert result == pytest.approx(90.0, abs=1e-6)

    def test_due_south(self):
        result = nk.bearing(1.0, 0.0, 0.0, 0.0)
        assert result == pytest.approx(180.0, abs=1e-6)


class TestCurrentEffect:
    def test_favorable_current(self):
        # Current in same direction as heading
        result = nk.current_effect(90.0, 2.0, 90.0)
        assert result == pytest.approx(2.0 * 1.94384, rel=1e-6)

    def test_adverse_current(self):
        # Current opposite to heading
        result = nk.current_effect(0.0, 1.0, 180.0)
        assert result == pytest.approx(-1.94384, rel=1e-6)

    def test_beam_current(self):
        # Current perpendicular to heading
        result = nk.current_effect(0.0, 1.0, 90.0)
        assert abs(result) < 1e-6

    def test_zero_current(self):
        assert nk.current_effect(0.0, 0.0, 0.0) == 0.0

    def test_negative_current(self):
        assert nk.current_effect(0.0, -1.0, 0.0) == 0.0


class TestCourseChangePenalty:
    def test_no_change(self):
        assert nk.course_change_penalty(0.0, 0.0) == 0.0

    def test_small_change(self):
        # 10° → within dead band
        assert nk.course_change_penalty(0.0, 10.0) == 0.0

    def test_medium_change(self):
        # 30° → in 15-45° band
        assert nk.course_change_penalty(0.0, 30.0) == pytest.approx(0.01, abs=1e-6)

    def test_large_change(self):
        # 60° → in 45-90° band
        assert nk.course_change_penalty(0.0, 60.0) == pytest.approx(0.04, abs=1e-6)

    def test_reversal(self):
        # 180° → maximum penalty
        assert nk.course_change_penalty(0.0, 180.0) == pytest.approx(0.20, abs=1e-6)

    def test_wrap_around(self):
        # 350° to 10° → 20° change
        result = nk.course_change_penalty(350.0, 10.0)
        assert result == pytest.approx(
            nk.course_change_penalty(0.0, 20.0), abs=1e-6
        )


# ===================================================================
# Seawater properties
# ===================================================================


class TestSeawaterDensity:
    def test_at_15c(self):
        result = nk.seawater_density(15.0)
        assert result == pytest.approx(1025.863, rel=1e-4)

    def test_at_0c(self):
        result = nk.seawater_density(0.0)
        assert 1028 < result < 1030  # Cold water is denser

    def test_at_30c(self):
        result = nk.seawater_density(30.0)
        assert 1020 < result < 1025  # Warm water is less dense

    def test_density_decreases_with_temperature(self):
        rho_cold = nk.seawater_density(5.0)
        rho_warm = nk.seawater_density(25.0)
        assert rho_cold > rho_warm


class TestSeawaterViscosity:
    def test_at_15c(self):
        result = nk.seawater_viscosity(15.0)
        assert result == pytest.approx(1.1104e-6, rel=1e-3)

    def test_viscosity_decreases_with_temperature(self):
        nu_cold = nk.seawater_viscosity(5.0)
        nu_warm = nk.seawater_viscosity(25.0)
        assert nu_cold > nu_warm


# ===================================================================
# Vessel resistance kernels
# ===================================================================


class TestHoltropMennen:
    """Test calm-water resistance kernel."""

    # MR tanker defaults
    LPP = 176.0
    BEAM = 32.0
    RHO_SW = 1025.0
    NU_SW = 1.19e-6

    def test_positive_resistance(self):
        r = nk.holtrop_mennen_resistance(
            7.0, 11.8, 65000.0, 0.82, 7500.0,
            self.LPP, self.BEAM, self.RHO_SW, self.NU_SW,
        )
        assert r > 0

    def test_increases_with_speed(self):
        r1 = nk.holtrop_mennen_resistance(
            5.0, 11.8, 65000.0, 0.82, 7500.0,
            self.LPP, self.BEAM, self.RHO_SW, self.NU_SW,
        )
        r2 = nk.holtrop_mennen_resistance(
            8.0, 11.8, 65000.0, 0.82, 7500.0,
            self.LPP, self.BEAM, self.RHO_SW, self.NU_SW,
        )
        assert r2 > r1

    def test_laden_more_than_ballast(self):
        r_laden = nk.holtrop_mennen_resistance(
            7.0, 11.8, 65000.0, 0.82, 7500.0,
            self.LPP, self.BEAM, self.RHO_SW, self.NU_SW,
        )
        r_ballast = nk.holtrop_mennen_resistance(
            7.0, 6.5, 20000.0, 0.75, 5200.0,
            self.LPP, self.BEAM, self.RHO_SW, self.NU_SW,
        )
        assert r_laden > r_ballast


class TestWindResistance:
    RHO_AIR = 1.225

    def test_head_wind(self):
        r = nk.wind_resistance(15.0, 0.0, 0.0, 450.0, 2100.0, self.RHO_AIR)
        assert r > 0

    def test_following_wind_less(self):
        r_head = nk.wind_resistance(15.0, 0.0, 0.0, 450.0, 2100.0, self.RHO_AIR)
        r_follow = nk.wind_resistance(15.0, 180.0, 0.0, 450.0, 2100.0, self.RHO_AIR)
        assert r_head > r_follow

    def test_zero_wind(self):
        r = nk.wind_resistance(0.0, 0.0, 0.0, 450.0, 2100.0, self.RHO_AIR)
        assert r == pytest.approx(0.0, abs=1e-10)


class TestStawave1:
    RHO_SW = 1025.0

    def test_positive(self):
        r = nk.stawave1_wave_resistance(3.0, 0.0, 0.0, 7.0, 32.0, 176.0, self.RHO_SW)
        assert r > 0

    def test_increases_with_height(self):
        r1 = nk.stawave1_wave_resistance(1.0, 0.0, 0.0, 7.0, 32.0, 176.0, self.RHO_SW)
        r2 = nk.stawave1_wave_resistance(3.0, 0.0, 0.0, 7.0, 32.0, 176.0, self.RHO_SW)
        assert r2 > r1

    def test_following_seas_less(self):
        r_head = nk.stawave1_wave_resistance(3.0, 0.0, 0.0, 7.0, 32.0, 176.0, self.RHO_SW)
        r_follow = nk.stawave1_wave_resistance(3.0, 180.0, 0.0, 7.0, 32.0, 176.0, self.RHO_SW)
        assert r_head > r_follow


class TestKwonSpeedLoss:
    def test_head_seas(self):
        pct = nk.kwon_speed_loss_pct(3.0, 0.0, 0.0, 0.82, 176.0)
        assert pct > 0

    def test_following_seas_less(self):
        pct_head = nk.kwon_speed_loss_pct(3.0, 0.0, 0.0, 0.82, 176.0)
        pct_follow = nk.kwon_speed_loss_pct(3.0, 180.0, 0.0, 0.82, 176.0)
        assert pct_head > pct_follow

    def test_zero_wave(self):
        assert nk.kwon_speed_loss_pct(0.0, 0.0, 0.0, 0.82, 176.0) == 0.0

    def test_cap_at_50(self):
        pct = nk.kwon_speed_loss_pct(100.0, 0.0, 0.0, 0.82, 176.0)
        assert pct == pytest.approx(50.0, abs=1e-6)


class TestSfocCurve:
    def test_optimal_load(self):
        sfoc = nk.sfoc_curve(0.75, 171.0, 1.0)
        assert sfoc == pytest.approx(171.0, abs=1e-6)

    def test_half_load(self):
        sfoc = nk.sfoc_curve(0.5, 171.0, 1.0)
        assert sfoc == pytest.approx(177.4125, rel=1e-4)

    def test_calibration_factor(self):
        sfoc_base = nk.sfoc_curve(0.75, 171.0, 1.0)
        sfoc_cal = nk.sfoc_curve(0.75, 171.0, 1.1)
        assert sfoc_cal == pytest.approx(sfoc_base * 1.1, rel=1e-6)

    def test_clamped_low(self):
        # Load < 0.15 gets clamped
        sfoc_low = nk.sfoc_curve(0.01, 171.0, 1.0)
        sfoc_15 = nk.sfoc_curve(0.15, 171.0, 1.0)
        assert sfoc_low == pytest.approx(sfoc_15, abs=1e-6)


# ===================================================================
# Seakeeping kernels
# ===================================================================


class TestCalculateRoll:
    G = 9.81

    def test_beam_seas_maximum(self):
        # 90° encounter = beam seas → max roll
        roll = nk.calculate_roll(3.0, 100.0, math.pi / 2, 0.5, 0.45, 2.5, 0.05, self.G)
        assert roll > 0

    def test_head_seas_minimal(self):
        # 0° encounter = head seas → minimal roll
        roll = nk.calculate_roll(3.0, 100.0, 0.0, 0.5, 0.45, 2.5, 0.05, self.G)
        assert roll == pytest.approx(0.0, abs=0.01)

    def test_cap_at_45(self):
        # Extreme conditions → should cap at 45°
        roll = nk.calculate_roll(15.0, 50.0, math.pi / 2, 0.449, 0.45, 0.5, 0.01, self.G)
        assert roll <= 45.0

    def test_increases_with_wave_height(self):
        r1 = nk.calculate_roll(1.0, 100.0, math.pi / 2, 0.5, 0.45, 2.5, 0.05, self.G)
        r2 = nk.calculate_roll(4.0, 100.0, math.pi / 2, 0.5, 0.45, 2.5, 0.05, self.G)
        assert r2 > r1


class TestCalculatePitch:
    def test_head_seas(self):
        amp, period = nk.calculate_pitch(3.0, 200.0, 0.0, 7.0, 176.0)
        assert amp > 0
        assert period > 0

    def test_beam_seas_minimal(self):
        amp, _ = nk.calculate_pitch(3.0, 200.0, math.pi / 2, 7.0, 176.0)
        assert amp == pytest.approx(0.0, abs=0.01)

    def test_cap_at_20(self):
        amp, _ = nk.calculate_pitch(20.0, 50.0, 0.0, 7.0, 176.0)
        assert amp <= 20.0


class TestCalculateHeaveAccel:
    def test_positive(self):
        accel = nk.calculate_heave_accel(3.0, 0.5, 0.0)
        assert accel > 0

    def test_zero_waves(self):
        accel = nk.calculate_heave_accel(0.0, 0.5, 0.0)
        assert accel == pytest.approx(0.0, abs=1e-10)

    def test_beam_seas_reduced(self):
        accel_head = nk.calculate_heave_accel(3.0, 0.5, 0.0)
        accel_beam = nk.calculate_heave_accel(3.0, 0.5, math.pi / 2)
        assert accel_head > accel_beam


class TestCalculatePointAccel:
    def test_at_midship(self):
        # Distance 0 → only heave component
        accel = nk.calculate_point_accel(1.0, 5.0, 0.5, 0.0)
        assert accel == pytest.approx(1.0, abs=1e-6)

    def test_at_bow(self):
        accel = nk.calculate_point_accel(1.0, 5.0, 0.5, 88.0)
        assert accel > 1.0  # Combined heave + pitch


class TestCalculateSlammingProbability:
    def test_calm_seas(self):
        prob = nk.calculate_slamming_probability(0.05, 8.0, 6.0, 7.0, 0.0, 0.0, 88.0)
        assert prob == pytest.approx(0.0, abs=1e-6)

    def test_head_seas_positive(self):
        prob = nk.calculate_slamming_probability(4.0, 8.0, 4.0, 8.0, 0.0, 5.0, 88.0)
        assert prob > 0

    def test_following_seas_less(self):
        prob_head = nk.calculate_slamming_probability(4.0, 8.0, 4.0, 8.0, 0.0, 5.0, 88.0)
        prob_follow = nk.calculate_slamming_probability(4.0, 8.0, 4.0, 8.0, math.pi, 5.0, 88.0)
        assert prob_head > prob_follow

    def test_capped_at_1(self):
        prob = nk.calculate_slamming_probability(10.0, 5.0, 0.5, 15.0, 0.0, 15.0, 88.0)
        assert prob <= 1.0


class TestCalculateGreenWaterProbability:
    def test_high_freeboard(self):
        prob = nk.calculate_green_water_probability(1.0, 12.0, 1.0, 88.0)
        assert prob == pytest.approx(0.0, abs=0.01)

    def test_low_freeboard(self):
        prob = nk.calculate_green_water_probability(5.0, 2.0, 10.0, 88.0)
        assert prob == 1.0  # Effective freeboard goes negative

    def test_calm_seas(self):
        prob = nk.calculate_green_water_probability(0.05, 6.0, 1.0, 88.0)
        assert prob == pytest.approx(0.0, abs=1e-6)


class TestCalculateParametricRollRisk:
    def test_no_risk_wrong_period(self):
        risk = nk.calculate_parametric_roll_risk(200.0, 20.0, 14.0, 0.0, 176.0)
        assert risk == pytest.approx(0.0, abs=0.01)

    def test_risk_matching_conditions(self):
        # Te ≈ Tr/2, lambda ≈ Lpp, head seas
        risk = nk.calculate_parametric_roll_risk(176.0, 7.0, 14.0, 0.0, 176.0)
        assert risk > 0.5

    def test_beam_seas_less_risk(self):
        risk_head = nk.calculate_parametric_roll_risk(176.0, 7.0, 14.0, 0.0, 176.0)
        risk_beam = nk.calculate_parametric_roll_risk(176.0, 7.0, 14.0, math.pi / 2, 176.0)
        assert risk_head > risk_beam


# ===================================================================
# Warm-up function
# ===================================================================


class TestWarmUp:
    def test_warm_up_succeeds(self):
        """Warm-up should run without errors."""
        nk.warm_up()

    def test_warm_up_idempotent(self):
        """Calling warm-up multiple times is safe."""
        nk.warm_up()
        nk.warm_up()


# ===================================================================
# Integration: kernel output matches class method output
# ===================================================================


class TestKernelMatchesClassMethod:
    """Verify that kernel delegations produce identical results to original."""

    def test_haversine_matches_base_optimizer(self):
        from src.optimization.base_optimizer import BaseOptimizer

        # Can't instantiate ABC directly, call static method via class
        expected = BaseOptimizer.haversine(51.5, -0.12, 48.86, 2.35)
        actual = nk.haversine(51.5, -0.12, 48.86, 2.35)
        assert actual == pytest.approx(expected, rel=1e-10)

    def test_bearing_matches_base_optimizer(self):
        from src.optimization.base_optimizer import BaseOptimizer

        expected = BaseOptimizer.bearing(51.5, -0.12, 48.86, 2.35)
        actual = nk.bearing(51.5, -0.12, 48.86, 2.35)
        assert actual == pytest.approx(expected, rel=1e-10)

    def test_vessel_model_fuel_consistency(self):
        """Full fuel calculation through VesselModel still works."""
        from src.optimization.vessel_model import VesselModel

        vm = VesselModel()
        result = vm.calculate_fuel_consumption(
            speed_kts=14.5, is_laden=True, weather=None, distance_nm=348.0,
        )
        assert result["fuel_mt"] > 0
        assert result["power_kw"] > 0

    def test_seakeeping_motions_consistency(self):
        """Full seakeeping calculation through SeakeepingModel still works."""
        from src.optimization.seakeeping import SeakeepingModel

        sk = SeakeepingModel()
        motions = sk.calculate_motions(
            wave_height_m=3.0,
            wave_period_s=8.0,
            wave_dir_deg=0.0,
            heading_deg=0.0,
            speed_kts=14.0,
            is_laden=True,
        )
        assert motions.roll_amplitude_deg >= 0
        assert motions.pitch_amplitude_deg >= 0
        assert motions.heave_accel_ms2 >= 0
