# Credential Catalog Blueprint

## 1. Purpose

This document defines how qualification and professional-license information should be collected, stored, and expanded.

The goal is to support:

1. overview articles
2. lecture planning
3. comparison pages
4. internal linking
5. reusable structured data

## 2. Collection Scope

The catalog should be broad and expandable.

Initial scope includes:

1. 감정평가사
2. 건축사
3. 경영지도사
4. 공인노무사
5. 공인회계사
6. 기술사
7. 기술지도사
8. 법무사
9. 변리사
10. 변호사
11. 세무사
12. 손해사정사
13. 심판변론인
14. 측량사
15. 관세사/통관 관련
16. 행정사
17. 의사
18. 한의사
19. 수의사
20. 약사
21. 도선사

Duplicates should be merged at the catalog layer even if they appear multiple times in planning notes.

## 3. Storage Principle

Store qualification information separately from prose articles.

Recommended storage roles:

1. `JSON`
   Canonical machine-readable record set

2. `YAML`
   Human-friendly editing template for early drafting and review

3. `CSV`
   Spreadsheet-friendly overview for bulk maintenance

## 4. Required Field Families

Each qualification record should support these field groups.

1. identity
2. eligibility
3. exam structure
4. subject list
5. timeline
6. cutline/passing logic
7. career outcome
8. lecture linkage
9. source references
10. update status

## 5. Minimum Required Fields Per Record

1. `id`
2. `name_ko`
3. `name_en`
4. `family`
5. `status`
6. `license_type`
7. `overview`
8. `preparation_stages`
9. `typical_study_period`
10. `eligibility_summary`
11. `credit_requirement`
12. `exam_rounds`
13. `round1_subjects`
14. `round2_subjects`
15. `passing_rule`
16. `cutline_notes`
17. `practical_training`
18. `career_paths`
19. `related_series_ids`
20. `source_notes`
21. `last_verified_on`

## 6. Normalization Rules

### 6.1 Subject Storage

Store subjects as arrays, not long comma-joined strings.

### 6.2 Passing Rule

Separate:

1. absolute cutline
2. relative ranking
3. stage-specific pass rule

### 6.3 Eligibility

Separate:

1. formal eligibility
2. credit requirement
3. degree equivalence
4. practical exceptions

## 7. Relationship to Content

The catalog is not the article itself.

It should feed:

1. qualification overview pages
2. comparison pages
3. lecture prerequisites
4. internal links between fields and lectures

## 8. Planned Content Types Derived from the Catalog

1. single qualification guide
2. qualification comparison matrix
3. exam subject deep-dive page
4. preparation timeline page
5. linked lecture pages such as 노동법, 세법학, 재정학

## 9. Verification Rule

Qualification data is time-sensitive.

Each record should track:

1. last verified date
2. verification confidence
3. source type
4. whether re-check is required before publishing or updating

## 10. Planned File Location

Use:

1. [data/catalog/professional-credentials.schema.json](/Users/seuncho/coding/blog/data/catalog/professional-credentials.schema.json)
2. [data/catalog/professional-credentials.template.yaml](/Users/seuncho/coding/blog/data/catalog/professional-credentials.template.yaml)
3. [data/catalog/professional-credentials.template.csv](/Users/seuncho/coding/blog/data/catalog/professional-credentials.template.csv)

These files are templates and structural seeds, not the final completed database.
