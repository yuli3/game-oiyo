#!/usr/bin/env python3
"""Add Related Tools callout to en and ja tool-*.mdx files."""

import os
import glob

BASE = "/Users/seuncho/coding/blog-oiyo/src/content/blog"

# Related tools map (derived from ko callouts)
RELATED: dict[str, list[str]] = {
    "tool-anniversary-calculator": ["tool-dday-calculator", "tool-dday-counter", "tool-countdown-timer"],
    "tool-annual-leave-calculator": ["tool-salary-negotiation-calculator", "tool-tax-savings-roadmap"],
    "tool-apt-subscription-score": ["tool-reconstruction-profit-calculator", "tool-jeonse-guarantee-calculator", "tool-jeonse-monthly-converter"],
    "tool-biorhythm-calculator": ["tool-sleep-calculator", "tool-menstrual-cycle-calculator", "tool-saju-calculator"],
    "tool-blood-type-calculator": ["tool-mbti-compatibility", "tool-fortune-tools", "tool-saju-calculator"],
    "tool-body-fat-calculator": ["tool-calorie-calculator", "tool-nutrition-calculator", "tool-height-converter"],
    "tool-calorie-calculator": ["tool-body-fat-calculator", "tool-nutrition-calculator", "tool-water-intake-calculator"],
    "tool-career-finance-tools": ["tool-salary-negotiation-calculator", "tool-tax-savings-roadmap", "tool-europe-salary-calculators"],
    "tool-chinese-zodiac": ["tool-saju-calculator", "tool-numerology-calculator", "tool-fortune-tools"],
    "tool-color-converter": ["tool-developer-utilities", "tool-uuid-generator"],
    "tool-countdown-timer": ["tool-dday-calculator", "tool-dday-counter", "tool-anniversary-calculator"],
    "tool-currency-converter": ["tool-travel-budget-calculator", "tool-tip-calculator", "tool-fuel-cost-calculator"],
    "tool-daily-horoscope": ["tool-saju-calculator", "tool-tarot-daily-card", "tool-fortune-tools"],
    "tool-dday-calculator": ["tool-anniversary-calculator", "tool-dday-counter", "tool-countdown-timer"],
    "tool-dday-counter": ["tool-dday-calculator", "tool-anniversary-calculator", "tool-countdown-timer"],
    "tool-developer-utilities": ["tool-uuid-generator", "tool-color-converter", "tool-password-generator", "tool-lorem-ipsum-generator"],
    "tool-education-tools": ["tool-toeic-score-converter", "tool-pomodoro-timer"],
    "tool-europe-salary-calculators": ["tool-global-salary-calculators", "tool-salary-negotiation-calculator", "tool-currency-converter"],
    "tool-financial-investment-tax-calculator": ["tool-tax-savings-roadmap", "tool-salary-negotiation-calculator", "tool-legal-interest-calc"],
    "tool-fortune-tools": ["tool-tarot-daily-card", "tool-saju-calculator", "tool-daily-horoscope"],
    "tool-fuel-cost-calculator": ["tool-travel-budget-calculator", "tool-currency-converter"],
    "tool-global-salary-calculators": ["tool-europe-salary-calculators", "tool-salary-negotiation-calculator", "tool-currency-converter"],
    "tool-height-converter": ["tool-body-fat-calculator", "tool-calorie-calculator"],
    "tool-insurance-premium-calculator": ["tool-tax-savings-roadmap", "tool-legal-interest-calc"],
    "tool-jeonse-guarantee-calculator": ["tool-jeonse-monthly-converter", "tool-reconstruction-profit-calculator", "tool-apt-subscription-score"],
    "tool-jeonse-monthly-converter": ["tool-jeonse-guarantee-calculator", "tool-reconstruction-profit-calculator", "tool-legal-interest-calc"],
    "tool-legal-interest-calc": ["tool-tax-savings-roadmap", "tool-jeonse-guarantee-calculator", "tool-reconstruction-profit-calculator"],
    "tool-life-utilities": ["tool-nutrition-calculator", "tool-water-intake-calculator", "tool-sleep-calculator"],
    "tool-lorem-ipsum-generator": ["tool-developer-utilities", "tool-word-counter", "tool-morse-code-converter"],
    "tool-lostark-auction-calc": ["tool-lostark-raid-splitter"],
    "tool-lostark-raid-splitter": ["tool-lostark-auction-calc"],
    "tool-love-calculator": ["tool-mbti-compatibility", "tool-blood-type-calculator", "tool-numerology-calculator"],
    "tool-marriage-age-calculator": ["tool-anniversary-calculator", "tool-love-calculator", "tool-jeonse-guarantee-calculator"],
    "tool-mbti-compatibility": ["tool-blood-type-calculator", "tool-numerology-calculator", "tool-love-calculator"],
    "tool-menstrual-cycle-calculator": ["tool-biorhythm-calculator", "tool-water-intake-calculator", "tool-sleep-calculator"],
    "tool-morse-code-converter": ["tool-developer-utilities", "tool-word-counter", "tool-lorem-ipsum-generator"],
    "tool-numerology-calculator": ["tool-saju-calculator", "tool-mbti-compatibility", "tool-love-calculator"],
    "tool-nutrition-calculator": ["tool-calorie-calculator", "tool-body-fat-calculator", "tool-water-intake-calculator"],
    "tool-password-generator": ["tool-uuid-generator", "tool-developer-utilities"],
    "tool-pet-age-calculator": ["tool-anniversary-calculator", "tool-dday-calculator"],
    "tool-pomodoro-timer": ["tool-education-tools", "tool-sleep-calculator", "tool-countdown-timer"],
    "tool-reconstruction-profit-calculator": ["tool-jeonse-guarantee-calculator", "tool-apt-subscription-score", "tool-jeonse-monthly-converter"],
    "tool-saju-calculator": ["tool-numerology-calculator", "tool-daily-horoscope", "tool-tarot-daily-card"],
    "tool-salary-negotiation-calculator": ["tool-tax-savings-roadmap", "tool-financial-investment-tax-calculator", "tool-annual-leave-calculator"],
    "tool-sleep-calculator": ["tool-biorhythm-calculator", "tool-pomodoro-timer", "tool-water-intake-calculator"],
    "tool-tarot-daily-card": ["tool-fortune-tools", "tool-saju-calculator", "tool-daily-horoscope"],
    "tool-tax-savings-roadmap": ["tool-financial-investment-tax-calculator", "tool-salary-negotiation-calculator", "tool-insurance-premium-calculator"],
    "tool-tip-calculator": ["tool-travel-budget-calculator", "tool-currency-converter"],
    "tool-toeic-score-converter": ["tool-education-tools", "tool-pomodoro-timer"],
    "tool-travel-budget-calculator": ["tool-currency-converter", "tool-fuel-cost-calculator", "tool-tip-calculator"],
    "tool-uuid-generator": ["tool-developer-utilities", "tool-password-generator"],
    "tool-water-intake-calculator": ["tool-calorie-calculator", "tool-nutrition-calculator", "tool-sleep-calculator"],
    "tool-word-counter": ["tool-lorem-ipsum-generator", "tool-morse-code-converter", "tool-developer-utilities"],
    "tool-zodiac-personality": ["tool-daily-horoscope", "tool-mbti-compatibility", "tool-blood-type-calculator"],
}

EN_NAMES: dict[str, str] = {
    "tool-anniversary-calculator": "Anniversary Calculator",
    "tool-annual-leave-calculator": "Annual Leave Calculator",
    "tool-apt-subscription-score": "Apartment Subscription Score",
    "tool-biorhythm-calculator": "Biorhythm Calculator",
    "tool-blood-type-calculator": "Blood Type Calculator",
    "tool-body-fat-calculator": "Body Fat Calculator",
    "tool-calorie-calculator": "Calorie Calculator",
    "tool-career-finance-tools": "Career & Finance Tools",
    "tool-chinese-zodiac": "Chinese Zodiac",
    "tool-color-converter": "Color Code Converter",
    "tool-countdown-timer": "Countdown Timer",
    "tool-currency-converter": "Currency Converter",
    "tool-daily-horoscope": "Daily Horoscope",
    "tool-dday-calculator": "D-Day Calculator",
    "tool-dday-counter": "D-Day Counter",
    "tool-developer-utilities": "Developer Utilities",
    "tool-education-tools": "Education Tools",
    "tool-europe-salary-calculators": "Europe Salary Calculators",
    "tool-financial-investment-tax-calculator": "Investment Tax Calculator",
    "tool-fortune-tools": "Fortune Tools",
    "tool-fuel-cost-calculator": "Fuel Cost Calculator",
    "tool-global-salary-calculators": "Global Salary Calculators",
    "tool-height-converter": "Height Converter",
    "tool-insurance-premium-calculator": "Insurance Calculator",
    "tool-jeonse-guarantee-calculator": "Jeonse Safety Calculator",
    "tool-jeonse-monthly-converter": "Jeonse/Monthly Converter",
    "tool-legal-interest-calc": "Legal Interest Calculator",
    "tool-life-utilities": "Life Utilities",
    "tool-lorem-ipsum-generator": "Lorem Ipsum Generator",
    "tool-lostark-auction-calc": "Lost Ark Auction Calc",
    "tool-lostark-raid-splitter": "Lost Ark Raid Splitter",
    "tool-love-calculator": "Love Calculator",
    "tool-marriage-age-calculator": "Marriage Age Calculator",
    "tool-mbti-compatibility": "MBTI Compatibility",
    "tool-menstrual-cycle-calculator": "Menstrual Cycle Calculator",
    "tool-morse-code-converter": "Morse Code Converter",
    "tool-numerology-calculator": "Numerology Calculator",
    "tool-nutrition-calculator": "Nutrition Calculator",
    "tool-password-generator": "Password Generator",
    "tool-pet-age-calculator": "Pet Age Calculator",
    "tool-pomodoro-timer": "Pomodoro Timer",
    "tool-reconstruction-profit-calculator": "Reconstruction Profit Calc",
    "tool-saju-calculator": "Saju Calculator",
    "tool-salary-negotiation-calculator": "Salary Negotiation Calculator",
    "tool-sleep-calculator": "Sleep Calculator",
    "tool-tarot-daily-card": "Daily Tarot Card",
    "tool-tax-savings-roadmap": "Tax Savings Roadmap",
    "tool-tip-calculator": "Tip Calculator",
    "tool-toeic-score-converter": "TOEIC Score Converter",
    "tool-travel-budget-calculator": "Travel Budget Calculator",
    "tool-uuid-generator": "UUID Generator",
    "tool-water-intake-calculator": "Water Intake Calculator",
    "tool-word-counter": "Word Counter",
    "tool-zodiac-personality": "Zodiac Personality",
}

JA_NAMES: dict[str, str] = {
    "tool-anniversary-calculator": "記念日計算機",
    "tool-annual-leave-calculator": "有給休暇計算機",
    "tool-apt-subscription-score": "マンション申込スコア計算機",
    "tool-biorhythm-calculator": "バイオリズム計算機",
    "tool-blood-type-calculator": "血液型計算機",
    "tool-body-fat-calculator": "体脂肪率計算機",
    "tool-calorie-calculator": "カロリー計算機",
    "tool-career-finance-tools": "キャリア・金融ツール集",
    "tool-chinese-zodiac": "中国の干支",
    "tool-color-converter": "カラーコード変換器",
    "tool-countdown-timer": "カウントダウンタイマー",
    "tool-currency-converter": "為替レート変換器",
    "tool-daily-horoscope": "今日の星座占い",
    "tool-dday-calculator": "D-Day計算機",
    "tool-dday-counter": "D-Dayカウンター",
    "tool-developer-utilities": "開発者ユーティリティ集",
    "tool-education-tools": "教育ツール集",
    "tool-europe-salary-calculators": "ヨーロッパ給与計算機",
    "tool-financial-investment-tax-calculator": "金融投資所得税計算機",
    "tool-fortune-tools": "占いツール集",
    "tool-fuel-cost-calculator": "燃料費計算機",
    "tool-global-salary-calculators": "世界の給与計算機",
    "tool-height-converter": "身長換算器",
    "tool-insurance-premium-calculator": "保険料計算機",
    "tool-jeonse-guarantee-calculator": "伝貰保証金安全性計算機",
    "tool-jeonse-monthly-converter": "伝貰・月額換算器",
    "tool-legal-interest-calc": "法定利息計算機",
    "tool-life-utilities": "生活ユーティリティ集",
    "tool-lorem-ipsum-generator": "Loremジェネレーター",
    "tool-lostark-auction-calc": "ロストアークオークション計算機",
    "tool-lostark-raid-splitter": "ロストアークレイド分配ツール",
    "tool-love-calculator": "恋愛相性計算機",
    "tool-marriage-age-calculator": "結婚適齢期計算機",
    "tool-mbti-compatibility": "MBTI相性診断",
    "tool-menstrual-cycle-calculator": "生理周期計算機",
    "tool-morse-code-converter": "モールス信号変換器",
    "tool-numerology-calculator": "数秘術計算機",
    "tool-nutrition-calculator": "栄養素計算機",
    "tool-password-generator": "パスワード生成器",
    "tool-pet-age-calculator": "ペット年齢計算機",
    "tool-pomodoro-timer": "ポモドーロタイマー",
    "tool-reconstruction-profit-calculator": "再建築収益性計算機",
    "tool-saju-calculator": "四柱推命計算機",
    "tool-salary-negotiation-calculator": "給与交渉計算機",
    "tool-sleep-calculator": "睡眠計算機",
    "tool-tarot-daily-card": "デイリータロットカード",
    "tool-tax-savings-roadmap": "節税ロードマップ",
    "tool-tip-calculator": "チップ計算機",
    "tool-toeic-score-converter": "TOEICスコア換算器",
    "tool-travel-budget-calculator": "旅行予算計算機",
    "tool-uuid-generator": "UUID生成器",
    "tool-water-intake-calculator": "水分摂取量計算機",
    "tool-word-counter": "文字数カウンター",
    "tool-zodiac-personality": "星座性格診断",
}


def make_callout(locale: str, slug: str) -> str:
    related = RELATED.get(slug, [])
    if not related:
        return ""
    if locale == "en":
        links = " · ".join(f"[{EN_NAMES[r]}](/en/{r})" for r in related)
        return f'\n<Callout type="tip">**Related Tools**: {links}</Callout>\n'
    else:  # ja
        links = " · ".join(f"[{JA_NAMES[r]}](/ja/{r})" for r in related)
        return f'\n<Callout type="tip">**関連ツール**: {links}</Callout>\n'


def process(locale: str) -> int:
    count = 0
    pattern = os.path.join(BASE, locale, "tool-*.mdx")
    for path in sorted(glob.glob(pattern)):
        slug = os.path.basename(path).replace(".mdx", "")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        callout = make_callout(locale, slug)
        if not callout:
            print(f"  SKIP (no related): {slug}")
            continue
        # Strip trailing newline then append callout
        content = content.rstrip("\n") + callout
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        count += 1
        print(f"  OK: {slug}")
    return count


if __name__ == "__main__":
    print("=== en ===")
    en_count = process("en")
    print(f"  → {en_count} files updated\n")

    print("=== ja ===")
    ja_count = process("ja")
    print(f"  → {ja_count} files updated\n")

    print(f"Total: {en_count + ja_count} files updated")
