# Lecture System Blueprint

## 1. Purpose

This document defines how `academy` content should be planned before writing begins.

Every lecture series must be:

1. pre-scaffolded
2. chaptered
3. internally linked
4. teachable in real classroom conditions
5. suitable for self-study and exam preparation

## 2. Required Metadata for a Lecture Series

Each series should have a planning record before article drafting starts.

Required fields:

1. series id
2. Korean display name
3. track
4. exam or audience
5. subject category
6. recommended prerequisites
7. total planned chapters
8. data sources
9. required visuals
10. related qualifications

## 3. Required Metadata for Each Chapter

Every chapter plan should include:

1. chapter number
2. chapter title
3. learning objective
4. core concepts
5. memory hooks
6. formulas or statutes to explain
7. required tables/charts/flows
8. prerequisite chapters
9. related practice items
10. related internal links

## 4. Chapter Structure Standard

Default chapter order:

1. `ChN. 주제명`
2. Why this chapter matters
3. Key terms
4. Core concept explanation
5. Structure or process map
6. Example or worked case
7. Exam point or trap point
8. Summary
9. Next chapter bridge

## 5. Lecture Layout Standard

The lecture page should support:

1. chapter navigation
2. concise metadata bar
3. stable prose styling
4. topic-specific visual blocks only when justified
5. summary boxes
6. related chapter links

Default rendering stack direction:

1. `prose`
2. standardized shadcn-style primitives
3. optional domain visuals
4. avoid forcing one custom lecture component everywhere

## 6. Public Document Writing Series

This series should be planned explicitly.

Recommended chapter map:

1. `Ch1. 공문서의 구조`
2. `Ch2. 항목 체계와 번호 규칙`
3. `Ch3. 문장을 짧고 분명하게 쓰는 법`
4. `Ch4. 보고서, 기안문, 시행문 작성`
5. `Ch5. 실제 문장 첨삭과 비교`

The numbering rule should follow:

1. `1`
2. `가`
3. `1)`
4. `가)`
5. `(1)`
6. `(가)`
7. circled `1`
8. circled `가`

## 7. Management Series Baseline Plan

Recommended first-pass series map:

1. `Ch1. 경영학 개론`
2. `Ch2. 경영전략`
3. `Ch3. 조직행동`
4. `Ch4. 인사관리`
5. `Ch5. 생산관리`
6. `Ch6. 마케팅`
7. `Ch7. 재무관리`
8. `Ch8. 회계 기초`
9. `Ch9. 경영과학`
10. `Ch10. 공기업 경영학 적용`

Use newly added `data` folder source files as planning inputs rather than blindly copying them.

## 8. NCS Series Baseline Plan

Recommended module map:

1. 의사소통능력
2. 수리능력
3. 문제해결능력
4. 자원관리능력
5. 조직이해능력
6. 정보능력

Each module should contain:

1. concept map
2. representative problem types
3. timing strategy
4. common error patterns
5. weekly study schedule

## 9. Qualification Lecture Expansion

The following high-value lecture clusters should be planned with both overview pages and subject pages.

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

## 10. What Each Qualification Overview Must Contain

Each qualification overview page should aim to contain:

1. who it is for
2. preparation stages
3. typical study duration
4. eligibility or credit requirement
5. first-stage subjects
6. second-stage subjects
7. passing structure
8. cutline or selection logic
9. yearly variability notes
10. related lecture series

## 11. Teaching Schedule Standard

For actual lecture use, every chapter should have a time plan.

Default `90-minute` plan:

1. 10 minutes: orientation
2. 25 minutes: concept lecture
3. 20 minutes: examples
4. 20 minutes: practice/application
5. 10 minutes: summary
6. 5 minutes: assignment

## 12. Visual Selection Rule

Do not insert charts, tables, flowcharts, or formulas just because a component already exists.

Every visual must justify itself by function:

1. formula for relationships
2. table for comparison
3. flowchart for process
4. timeline for chronology
5. chart for trend or distribution

If a visual does not improve understanding of that exact chapter, replace it.
