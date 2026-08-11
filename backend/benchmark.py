"""
Automated Benchmark Suite using AI_Generated.csv and Human-Written.csv datasets.
Measures:
1. AI detection score reduction before vs after humanization on AI-generated samples.
2. False-positive rate on authentic human-written papers from Human-Written.csv.
"""

import csv
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_checker import AICheckEngine
from humanizer import humanize


def run_benchmark(num_samples: int = 5):
    print("=" * 60)
    print(" 🚀 RUNNING HUMANIZER DATASET BENCHMARK SUITE")
    print("=" * 60)

    # 1. Test False Positive Rate on Human-Written.csv
    print("\n[PART 1] Testing False-Positive Rate on Human-Written.csv...")
    human_scores = []
    with open('/home/dishantgiri/humanizer/Human-Written.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= num_samples:
                break
            text = row.get('Text', '')
            if not text:
                continue
            report = AICheckEngine.analyze(text)
            human_scores.append(report.overall_score)
            print(f"  • Human Sample #{i+1} ({row.get('Topic', 'Unknown')[:30]}): Verdict={report.verdict}, Score={report.overall_score}/27, Confidence={report.confidence}")

    avg_human_score = sum(human_scores) / max(1, len(human_scores))
    print(f"  --> Average Score for Authentic Human Text: {avg_human_score:.1f} / 27 (Target: < 7.0)")

    # 2. Test Humanization Score Reduction on AI_Generated.csv
    print("\n[PART 2] Testing Humanization & AI Score Reduction on AI_Generated.csv...")
    before_scores = []
    after_scores = []

    with open('/home/dishantgiri/humanizer/AI_Generated.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= num_samples:
                break
            raw_ai = row.get('Generated', '')
            if not raw_ai:
                continue

            # Check raw AI text score
            before_report = AICheckEngine.analyze(raw_ai)
            before_scores.append(before_report.overall_score)

            # Humanize through engine
            humanized = humanize(raw_ai, intensity=0.8, original_text=raw_ai, mode="standard")
            after_report = AICheckEngine.analyze(humanized)
            after_scores.append(after_report.overall_score)

            reduction = ((before_report.overall_score - after_report.overall_score) / max(1, before_report.overall_score)) * 100
            print(f"\n  • Sample #{i+1} ({row.get('Topic', 'General')}):")
            print(f"    Raw AI Score:    {before_report.overall_score}/27 (Verdict: {before_report.verdict})")
            print(f"    Humanized Score: {after_report.overall_score}/27 (Verdict: {after_report.verdict})")
            print(f"    Reduction:       {reduction:.1f}% drop in AI signals")

    avg_before = sum(before_scores) / max(1, len(before_scores))
    avg_after = sum(after_scores) / max(1, len(after_scores))
    print("\n" + "=" * 60)
    print(" 📊 BENCHMARK SUMMARY")
    print(f" Average Raw AI Score:       {avg_before:.1f} / 27 (High AI)")
    print(f" Average Humanized Score:    {avg_after:.1f} / 27 (Human)")
    print(f" Total Signal Reduction:     {((avg_before - avg_after) / avg_before) * 100:.1f}%")
    print("=" * 60)


if __name__ == "__main__":
    run_benchmark(5)
