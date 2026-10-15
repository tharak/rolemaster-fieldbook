#!/usr/bin/env python3
"""
Rolemaster Fantasy Role Playing - Interactive Table Lookup & Character Calculator
---------------------------------------------------------------------------------
This script loads the exported Rolemaster JSON tables (T-1 to T-6 series and Appendices)
to perform automated stat calculations, racial modifier queries, DP pool determinations,
combat maneuver checks, and creature/equipment lookups.
"""

import os
import json
import sys
import argparse

DATA_DIR = "/workspace/artifacts"

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        filepath = os.path.join("/workspace/scratch", filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

class RolemasterCalculator:
    def __init__(self):
        self.races = load_json("t1_1_race_abilities-v2.json")
        self.professions = load_json("t1_4_profession_table.json")
        self.stat_bonuses = load_json("t2_1_basic_stat_bonus-v2.json")
        self.profession_dps = load_json("t2_8_standard_skill_category_dp_cost-v2.json") or load_json("t2_8_profession_dp_costs.json")
        self.armor_table = load_json("t3_3_armor_table-v2.json")
        self.creatures = load_json("a8_creatures.json")
        self.equipment = load_json("a7_equipment_and_weapons.json")

    def get_stat_bonus(self, stat_value):
        """Looks up basic stat bonus for a temporary stat value (1-100)."""
        if self.stat_bonuses and "basic_stat_bonuses" in self.stat_bonuses:
            for entry in self.stat_bonuses["basic_stat_bonuses"]:
                r = entry["range"]
                if r[0] <= stat_value <= r[1]:
                    return entry["bonus"]
        # Fallback formula
        if stat_value == 100: return 10
        if stat_value >= 98: return 9
        if stat_value >= 95: return 8
        if stat_value >= 90: return 5
        if stat_value >= 85: return 4
        if stat_value >= 80: return 3
        if stat_value >= 75: return 2
        if stat_value >= 70: return 1
        if stat_value >= 31: return 0
        if stat_value >= 25: return -1
        if stat_value >= 20: return -2
        if stat_value >= 15: return -3
        if stat_value >= 10: return -4
        if stat_value >= 5: return -5
        if stat_value >= 3: return -8
        if stat_value >= 2: return -9
        return -10

    def get_race_info(self, race_name):
        """Returns racial abilities and stat modifications for a given race."""
        if not self.races or "races" not in self.races:
            return None
        for key, data in self.races["races"].items():
            if race_name.lower() in key.lower():
                return key, data
        return None

    def calculate_development_points(self, stats):
        """Calculates total Development Points (DPs) based on mental & physical stat averages."""
        m_stats = [stats.get("Me", 50), stats.get("Re", 50), stats.get("SD", 50), stats.get("Em", 50), stats.get("In", 50), stats.get("Pr", 50)]
        p_stats = [stats.get("Ag", 50), stats.get("Co", 50), stats.get("Qu", 50), stats.get("St", 50)]

        m_avg = sum(m_stats) / len(m_stats)
        p_avg = sum(p_stats) / len(p_stats)

        dp_m = int(m_avg / 10)
        dp_p = int(p_avg / 10)
        return dp_m + dp_p + 30

    def build_character(self, name, race_search, profession_name, stats):
        """Builds a complete 1st level character profile."""
        race_match = self.get_race_info(race_search)
        race_title = race_match[0] if race_match else race_search
        race_data = race_match[1] if race_match else {}

        stat_summary = {}
        for stat, temp_val in stats.items():
            basic_b = self.get_stat_bonus(temp_val)
            racial_b = race_data.get("stat_mods", {}).get(stat, 0)
            total_b = basic_b + racial_b
            stat_summary[stat] = {
                "temp_value": temp_val,
                "basic_bonus": basic_b,
                "racial_bonus": racial_b,
                "total_stat_bonus": total_b
            }

        dp_total = self.calculate_development_points(stats)

        return {
            "character_name": name,
            "race": race_title,
            "profession": profession_name,
            "development_points": dp_total,
            "background_options": race_data.get("background_options", 0),
            "resistance_roll_bonuses": race_data.get("rr_mods", {}),
            "hit_die": race_data.get("hit_die", "d10"),
            "stats": stat_summary
        }

    def search_creature(self, query):
        """Searches Appendix A-8 creatures by name."""
        results = []
        if not self.creatures:
            return results
        for category in ["monster_statistics_chart", "animal_statistics_chart"]:
            for item in self.creatures.get(category, []):
                if query.lower() in item.get("name", "").lower():
                    results.append(item)
        return results

    def search_weapon(self, query):
        """Searches Appendix A-7 weapons by name."""
        results = []
        if not self.equipment:
            return results
        chart = self.equipment.get("weapon_chart") or self.equipment.get("weapon_chart_sample", [])
        for weapon in chart:
            name = weapon.get("item") or weapon.get("weapon", "")
            if query.lower() in name.lower():
                results.append(weapon)
        return results

def main():
    parser = argparse.ArgumentParser(description="Rolemaster FRP Interactive Table Lookup & Character Calculator")
    parser.add_argument("--demo-varak", action="store_true", help="Generate example character sheet for Varak Tanuk (High Man Ranger)")
    parser.add_argument("--stat", type=int, help="Look up basic stat bonus for a value (1-100)")
    parser.add_argument("--race", type=str, help="Look up racial abilities and modifications")
    parser.add_argument("--creature", type=str, help="Search creature statistics in Appendix A-8")
    parser.add_argument("--weapon", type=str, help="Search weapon stats in Appendix A-7")

    args = parser.parse_args()
    calc = RolemasterCalculator()

    if args.demo_varak or len(sys.argv) == 1:
        # High Man Ranger Varak Tanuk (Aragorn II archetype)
        varak_stats = {
            "Ag": 97, "Co": 90, "Me": 38, "Re": 43, "SD": 39,
            "Em": 20, "In": 90, "Pr": 63, "Qu": 75, "St": 92
        }
        profile = calc.build_character("Varak Tanuk", "High Men", "Ranger", varak_stats)
        print("==========================================================")
        print("          ROLEMASTER FRP CHARACTER CALCULATOR             ")
        print("==========================================================")
        print(json.dumps(profile, indent=2))
        print("==========================================================")

    if args.stat is not None:
        bonus = calc.get_stat_bonus(args.stat)
        print(f"Stat Value: {args.stat} -> Basic Stat Bonus: {bonus:+d}")

    if args.race:
        match = calc.get_race_info(args.race)
        if match:
            print(f"--- Racial Info: {match[0]} ---")
            print(json.dumps(match[1], indent=2))
        else:
            print(f"No race matching '{args.race}' found.")

    if args.creature:
        found = calc.search_creature(args.creature)
        print(f"Found {len(found)} creature(s) matching '{args.creature}':")
        print(json.dumps(found, indent=2))

    if args.weapon:
        found = calc.search_weapon(args.weapon)
        print(f"Found {len(found)} weapon(s) matching '{args.weapon}':")
        print(json.dumps(found, indent=2))

if __name__ == "__main__":
    main()
