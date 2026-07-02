import { useState, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

interface Card {
  word: string;
  meaning: string;
  example: string;
}

type DeckKey = "toeic" | "business" | "daily" | "csat";

const DECKS: Record<DeckKey, Card[]> = {
  toeic: [
    { word: "abandon", meaning: "to leave completely; to give up", example: "They had to abandon the plan due to lack of funds." },
    { word: "accumulate", meaning: "to gather or collect over time", example: "She accumulated a large amount of data for her research." },
    { word: "adjacent", meaning: "next to or adjoining something else", example: "The office is adjacent to the main building." },
    { word: "allocate", meaning: "to distribute for a specific purpose", example: "The company will allocate $50,000 for marketing." },
    { word: "amendment", meaning: "a minor change or addition", example: "The contract requires an amendment before signing." },
    { word: "anticipate", meaning: "to expect or predict something", example: "We anticipate strong sales this quarter." },
    { word: "assess", meaning: "to evaluate or estimate", example: "The team will assess the damage after the storm." },
    { word: "authorize", meaning: "to give official permission", example: "Only the manager can authorize overtime pay." },
    { word: "beneficial", meaning: "resulting in good; favorable", example: "Exercise is beneficial to overall health." },
    { word: "collaborate", meaning: "to work jointly with others", example: "The two departments will collaborate on the project." },
    { word: "commence", meaning: "to begin or start", example: "The construction will commence next Monday." },
    { word: "compensate", meaning: "to pay or give something in return", example: "The company compensated employees for extra work." },
    { word: "comply", meaning: "to act in accordance with rules", example: "All staff must comply with the safety regulations." },
    { word: "comprehensive", meaning: "covering all aspects; thorough", example: "She wrote a comprehensive report on market trends." },
    { word: "confidential", meaning: "kept secret; private", example: "Please treat this information as confidential." },
    { word: "consecutive", meaning: "following in order without interruption", example: "Sales increased for three consecutive quarters." },
    { word: "consolidate", meaning: "to make or become more stable; to merge", example: "The company plans to consolidate its offices." },
    { word: "constraint", meaning: "a limitation or restriction", example: "Budget constraints affect the project timeline." },
    { word: "contract", meaning: "a formal written agreement", example: "Both parties signed the contract yesterday." },
    { word: "contribute", meaning: "to give or add to something", example: "Everyone can contribute ideas to the meeting." },
    { word: "coordinate", meaning: "to organize activities to work well together", example: "She coordinates the schedules of all departments." },
    { word: "deficit", meaning: "an amount by which something is too small", example: "The company reported a budget deficit this year." },
    { word: "delegate", meaning: "to assign tasks to others", example: "A good manager knows how to delegate responsibilities." },
    { word: "demonstrate", meaning: "to show clearly; to prove", example: "He demonstrated how to use the new software." },
    { word: "designate", meaning: "to appoint or officially choose", example: "She was designated as the project leader." },
    { word: "determine", meaning: "to discover or establish facts", example: "We need to determine the cause of the delay." },
    { word: "distribute", meaning: "to share or spread out", example: "The company distributed samples to all customers." },
    { word: "document", meaning: "to record in writing", example: "Please document all changes made to the system." },
    { word: "efficient", meaning: "achieving maximum output with minimum waste", example: "The new process is more efficient than before." },
    { word: "eligible", meaning: "satisfying the conditions required", example: "All full-time employees are eligible for benefits." },
    { word: "enhance", meaning: "to improve the quality of something", example: "Training programs enhance employee productivity." },
    { word: "equivalent", meaning: "equal in value, amount, or meaning", example: "This certificate is equivalent to a degree." },
    { word: "establish", meaning: "to set up; to prove beyond doubt", example: "The company established its headquarters in 2005." },
    { word: "evaluate", meaning: "to assess or judge the value of", example: "The committee will evaluate all proposals." },
    { word: "facilitate", meaning: "to make something easier", example: "Technology facilitates communication worldwide." },
    { word: "fluctuate", meaning: "to change frequently or irregularly", example: "Oil prices fluctuate depending on global demand." },
    { word: "generate", meaning: "to produce or create", example: "The campaign generated a lot of positive feedback." },
    { word: "guideline", meaning: "a general rule or principle", example: "Follow the company guidelines when writing reports." },
    { word: "implement", meaning: "to put into action", example: "The new policy will be implemented next month." },
    { word: "indicate", meaning: "to point to or suggest", example: "The data indicates a rising trend in sales." },
    { word: "initiate", meaning: "to begin or introduce something", example: "She initiated a new training program." },
    { word: "integrate", meaning: "to combine parts into a whole", example: "The system integrates data from multiple sources." },
    { word: "inventory", meaning: "a complete list of goods in stock", example: "We conduct an inventory check every month." },
    { word: "maintain", meaning: "to keep in good condition", example: "It is important to maintain accurate records." },
    { word: "mandatory", meaning: "required by law or rules", example: "Attendance at the safety seminar is mandatory." },
    { word: "negotiate", meaning: "to reach an agreement through discussion", example: "We negotiated the terms of the contract." },
    { word: "objective", meaning: "a goal or aim; not influenced by feelings", example: "Our main objective is customer satisfaction." },
    { word: "outstanding", meaning: "exceptionally good; not yet paid", example: "He received an award for outstanding performance." },
    { word: "perspective", meaning: "a particular way of thinking about something", example: "We need a fresh perspective on this issue." },
    { word: "preliminary", meaning: "coming before the main part", example: "A preliminary report is due by Friday." },
    { word: "prioritize", meaning: "to treat as more important than others", example: "Please prioritize the urgent tasks first." },
    { word: "proficient", meaning: "competent or skilled in doing something", example: "She is proficient in three programming languages." },
    { word: "prohibit", meaning: "to formally forbid by authority", example: "Smoking is prohibited in all indoor areas." },
    { word: "promote", meaning: "to raise to a higher position; to advertise", example: "The company promoted him to senior manager." },
    { word: "qualification", meaning: "a condition that must be met", example: "What are the qualifications for this job?" },
    { word: "reimburse", meaning: "to repay money spent", example: "The company will reimburse your travel expenses." },
    { word: "relevant", meaning: "closely connected or appropriate", example: "Please provide any relevant documentation." },
    { word: "reliable", meaning: "consistently dependable", example: "She is one of our most reliable employees." },
    { word: "request", meaning: "to ask for something formally", example: "Please submit your request in writing." },
    { word: "revenue", meaning: "income generated by a business", example: "Annual revenue increased by 15% this year." },
    { word: "revise", meaning: "to amend or alter", example: "We need to revise the budget proposal." },
    { word: "schedule", meaning: "a plan showing times and events", example: "Check your schedule before confirming the meeting." },
    { word: "significant", meaning: "important; large enough to matter", example: "There was a significant improvement in quality." },
    { word: "submit", meaning: "to present for consideration", example: "Please submit the form before the deadline." },
    { word: "subsequent", meaning: "coming after or following", example: "Subsequent meetings will be held monthly." },
    { word: "sufficient", meaning: "enough for a particular purpose", example: "Do we have sufficient staff for the event?" },
    { word: "summarize", meaning: "to give a brief account of the main points", example: "Please summarize the key findings of your report." },
    { word: "supervise", meaning: "to oversee the work of others", example: "She supervises a team of twenty employees." },
    { word: "terminate", meaning: "to bring to an end", example: "The contract was terminated due to non-payment." },
    { word: "transaction", meaning: "an instance of buying or selling", example: "All transactions must be approved by finance." },
    { word: "transfer", meaning: "to move from one place to another", example: "He was transferred to the Seoul office." },
    { word: "unanimous", meaning: "in complete agreement", example: "The board reached a unanimous decision." },
    { word: "upgrade", meaning: "to improve or raise to a higher standard", example: "We will upgrade the software next week." },
    { word: "utilize", meaning: "to make practical use of", example: "We should utilize available resources effectively." },
    { word: "verify", meaning: "to confirm the accuracy of", example: "Please verify your contact information." },
    { word: "warranty", meaning: "a guarantee given by a manufacturer", example: "The product comes with a one-year warranty." },
    { word: "withdraw", meaning: "to remove or take back", example: "She decided to withdraw her application." },
    { word: "accomodate", meaning: "to provide lodging or space; to adapt", example: "The hotel can accommodate 300 guests." },
    { word: "accurate", meaning: "free from error; correct", example: "Please ensure the figures are accurate." },
    { word: "acquire", meaning: "to buy or obtain", example: "The company acquired a startup last year." },
    { word: "affordable", meaning: "priced reasonably; inexpensive", example: "We offer affordable plans for small businesses." },
    { word: "agenda", meaning: "a list of items to be discussed", example: "The agenda for today's meeting was sent out." },
    { word: "applicant", meaning: "a person who applies for something", example: "All applicants must submit a résumé." },
    { word: "approve", meaning: "to officially agree to or accept", example: "The budget was approved by the board." },
    { word: "audit", meaning: "an official inspection of accounts", example: "An external audit will be conducted next month." },
    { word: "bulletin", meaning: "a short official statement", example: "Check the company bulletin board for updates." },
    { word: "candidate", meaning: "a person being considered for a position", example: "Three candidates were interviewed for the role." },
    { word: "capacity", meaning: "the maximum amount that can be held", example: "The warehouse is at full capacity." },
    { word: "circulate", meaning: "to pass or spread among a group", example: "Please circulate the memo to all staff." },
    { word: "clarify", meaning: "to make clearer and easier to understand", example: "She clarified the instructions for the team." },
    { word: "clientele", meaning: "clients or customers collectively", example: "The restaurant has a loyal clientele." },
    { word: "closure", meaning: "the act of closing something permanently", example: "The factory closure affected 500 workers." },
    { word: "competitive", meaning: "having a strong desire to win; offering good value", example: "Our prices are highly competitive." },
    { word: "concern", meaning: "a matter that interests or affects someone", example: "The main concern is customer satisfaction." },
    { word: "deadline", meaning: "a time by which something must be done", example: "The project deadline is Friday at 5 PM." },
  ],
  business: [
    { word: "acquisition", meaning: "the purchase of one company by another", example: "The acquisition was valued at $2 billion." },
    { word: "arbitrage", meaning: "exploiting price differences in markets", example: "Traders use arbitrage to make risk-free profits." },
    { word: "benchmark", meaning: "a standard point of reference", example: "We use industry benchmarks to measure performance." },
    { word: "bottom line", meaning: "the final total; net profit or loss", example: "Cost cuts improved the company's bottom line." },
    { word: "brand equity", meaning: "the value a brand adds to a product", example: "Strong brand equity justifies premium pricing." },
    { word: "break-even", meaning: "the point where income equals expenses", example: "We expect to break even by Q3 this year." },
    { word: "budget variance", meaning: "the difference between budgeted and actual figures", example: "We need to explain the budget variance to the CFO." },
    { word: "burn rate", meaning: "the rate at which a startup spends money", example: "Their high burn rate concerned investors." },
    { word: "capital expenditure", meaning: "funds used to acquire long-term assets", example: "The capital expenditure for new equipment is $500K." },
    { word: "cash flow", meaning: "movement of money in and out of a business", example: "Positive cash flow is vital for business survival." },
    { word: "churn rate", meaning: "rate at which customers stop using a service", example: "High churn rate signals customer dissatisfaction." },
    { word: "compliance", meaning: "conformity to rules or regulations", example: "Compliance with data privacy laws is mandatory." },
    { word: "contingency", meaning: "a provision for possible future events", example: "Set aside a contingency fund for emergencies." },
    { word: "core competency", meaning: "a unique strength that gives competitive advantage", example: "Innovation is our core competency." },
    { word: "cost-benefit analysis", meaning: "a process of weighing costs against benefits", example: "We ran a cost-benefit analysis before the merger." },
    { word: "cross-functional", meaning: "involving different departments or areas", example: "A cross-functional team was formed for the launch." },
    { word: "deliverable", meaning: "a piece of work to be produced for a project", example: "List all project deliverables in the proposal." },
    { word: "disruptive", meaning: "causing significant change in an industry", example: "Streaming services were disruptive to cable TV." },
    { word: "diversification", meaning: "expanding into new areas to reduce risk", example: "Diversification protects against market downturns." },
    { word: "dividend", meaning: "a payment to shareholders from profits", example: "Investors received a dividend of $2 per share." },
    { word: "due diligence", meaning: "thorough investigation before a transaction", example: "We conducted due diligence on the acquisition target." },
    { word: "economies of scale", meaning: "cost advantages from increased production", example: "Large manufacturers benefit from economies of scale." },
    { word: "fiscal year", meaning: "a 12-month period used for financial reporting", example: "Our fiscal year ends on March 31." },
    { word: "gross margin", meaning: "revenue minus the cost of goods sold", example: "The gross margin improved to 45% last quarter." },
    { word: "hedge", meaning: "to reduce risk by balancing investments", example: "The company hedged against currency fluctuations." },
    { word: "incentive", meaning: "something that motivates action", example: "A bonus is a common financial incentive." },
    { word: "incumbent", meaning: "the current holder of a position", example: "The incumbent CEO announced his retirement." },
    { word: "intellectual property", meaning: "creations of the mind protected by law", example: "Patents protect the company's intellectual property." },
    { word: "invoice", meaning: "a bill for goods or services provided", example: "Please send the invoice to accounting." },
    { word: "joint venture", meaning: "a business arrangement between two parties", example: "The two firms formed a joint venture in Asia." },
    { word: "key performance indicator", meaning: "a measurable value showing progress", example: "Conversion rate is a key performance indicator." },
    { word: "leverage", meaning: "using borrowed capital to increase returns", example: "The company used leverage to fund the expansion." },
    { word: "liability", meaning: "a legal or financial obligation", example: "The company's liabilities exceed its assets." },
    { word: "liquidity", meaning: "availability of cash or easily converted assets", example: "The bank maintains high liquidity at all times." },
    { word: "market share", meaning: "the percentage of a market controlled by a company", example: "Our market share grew by 5% this year." },
    { word: "merger", meaning: "combining two companies into one", example: "The merger created the world's largest airline." },
    { word: "milestone", meaning: "a significant stage in a project or process", example: "We reached a key milestone last quarter." },
    { word: "monetize", meaning: "to convert into or generate money", example: "The app monetizes through in-app purchases." },
    { word: "net profit", meaning: "total revenue minus all expenses", example: "Net profit rose 12% year over year." },
    { word: "onboarding", meaning: "the process of integrating new employees", example: "Effective onboarding reduces early turnover." },
    { word: "outsource", meaning: "to hire outside firms to do work", example: "We outsource our customer support to a third party." },
    { word: "overhead", meaning: "ongoing business expenses not tied to production", example: "Reducing overhead helps improve profitability." },
    { word: "paradigm shift", meaning: "a fundamental change in approach or assumptions", example: "Remote work caused a paradigm shift in office culture." },
    { word: "pitch", meaning: "a presentation to persuade investors or clients", example: "She gave a compelling pitch to the venture capitalists." },
    { word: "portfolio", meaning: "a range of investments or products", example: "The company's portfolio includes 15 different brands." },
    { word: "procurement", meaning: "the process of obtaining goods or services", example: "The procurement team negotiates supplier contracts." },
    { word: "productivity", meaning: "effectiveness of productive effort", example: "Flexible hours increase employee productivity." },
    { word: "profit margin", meaning: "percentage of revenue kept as profit", example: "The profit margin improved from 8% to 12%." },
    { word: "scalable", meaning: "capable of being scaled or expanded", example: "We need a scalable solution for future growth." },
    { word: "stakeholder", meaning: "a person with an interest in an organization", example: "All stakeholders were briefed on the new strategy." },
    { word: "start-up", meaning: "a newly established business", example: "The start-up raised $5 million in seed funding." },
    { word: "subsidiary", meaning: "a company controlled by another", example: "The subsidiary operates independently in Europe." },
    { word: "supply chain", meaning: "sequence of processes to produce and deliver goods", example: "Supply chain disruptions affected global shipping." },
    { word: "synergy", meaning: "combined effect greater than individual parts", example: "The merger created synergy in research and development." },
    { word: "target market", meaning: "the specific group a product is aimed at", example: "Our target market is millennials aged 25–35." },
    { word: "turnover", meaning: "total revenue; rate at which employees leave", example: "The company had $10M in turnover last year." },
    { word: "unicorn", meaning: "a startup valued at over $1 billion", example: "The fintech firm became a unicorn after its funding round." },
    { word: "valuation", meaning: "an estimation of a company's worth", example: "The startup's valuation reached $500 million." },
    { word: "venture capital", meaning: "funding provided to startups by investors", example: "They secured venture capital to expand the business." },
    { word: "whitepaper", meaning: "an authoritative report on a complex issue", example: "The company published a whitepaper on AI ethics." },
    { word: "working capital", meaning: "current assets minus current liabilities", example: "Positive working capital shows short-term health." },
    { word: "write-off", meaning: "a reduction of an asset's book value to zero", example: "The bad debt was recorded as a write-off." },
    { word: "yield", meaning: "the earnings generated on an investment", example: "The bond yields 4% annually." },
    { word: "zero-based budgeting", meaning: "building a budget from scratch each period", example: "Zero-based budgeting removes inefficient spending." },
    { word: "agile", meaning: "flexible and adaptive project management method", example: "The team uses agile sprints to deliver features." },
    { word: "bandwidth", meaning: "available capacity or time to handle tasks", example: "I don't have the bandwidth to take on more work." },
    { word: "capital", meaning: "wealth used to start or expand a business", example: "The firm raised capital through a public offering." },
    { word: "channel", meaning: "a medium for distributing products or messages", example: "Social media is a key marketing channel." },
    { word: "competitive advantage", meaning: "a condition giving a business superiority", example: "Speed of delivery is our competitive advantage." },
    { word: "cross-selling", meaning: "selling related products to existing customers", example: "Cross-selling insurance with loans increases revenue." },
    { word: "customer retention", meaning: "ability to keep customers over time", example: "High customer retention reduces marketing costs." },
    { word: "debt financing", meaning: "raising funds by borrowing", example: "Debt financing requires repayment with interest." },
    { word: "equity", meaning: "ownership interest in a company", example: "She holds 20% equity in the startup." },
    { word: "exit strategy", meaning: "a plan for ending investment in a business", example: "Their exit strategy is an IPO in two years." },
    { word: "franchise", meaning: "a right to sell a company's products", example: "They opened a franchise of the coffee chain." },
    { word: "go-to-market", meaning: "the plan for launching a product", example: "The go-to-market strategy targets enterprise clients." },
    { word: "headcount", meaning: "the total number of employees", example: "The headcount will increase by 20 this quarter." },
    { word: "holistic", meaning: "considering the whole system, not just parts", example: "We take a holistic approach to customer experience." },
    { word: "impact investing", meaning: "investing for social or environmental benefit", example: "Impact investing aligns finance with social goals." },
  ],
  daily: [
    { word: "accommodate", meaning: "to have room for; to adapt to needs", example: "Can you accommodate an extra guest for dinner?" },
    { word: "acquaintance", meaning: "a person one knows slightly", example: "He is an acquaintance from my university days." },
    { word: "aggravate", meaning: "to make worse; to annoy", example: "Don't aggravate the situation by arguing." },
    { word: "ambiguous", meaning: "open to more than one interpretation", example: "His answer was ambiguous and confusing." },
    { word: "apologize", meaning: "to say sorry for something", example: "She apologized for arriving late." },
    { word: "appreciate", meaning: "to value; to be grateful for", example: "I really appreciate your help with this." },
    { word: "available", meaning: "able to be used; free to do something", example: "Are you available for a meeting tomorrow?" },
    { word: "awkward", meaning: "causing difficulty; lacking grace", example: "It was an awkward silence at the dinner table." },
    { word: "bother", meaning: "to trouble or annoy; to make an effort", example: "Don't bother getting up — I can help myself." },
    { word: "casual", meaning: "relaxed and informal", example: "The office has a casual dress code on Fridays." },
    { word: "commute", meaning: "to travel regularly between home and work", example: "Her commute takes about an hour each way." },
    { word: "convenient", meaning: "fitting in well with needs or plans", example: "Is Tuesday convenient for you?" },
    { word: "cope", meaning: "to deal effectively with difficulties", example: "She's learning to cope with stress at work." },
    { word: "curious", meaning: "eager to know or learn something", example: "Children are naturally curious about the world." },
    { word: "delay", meaning: "to make something happen later than planned", example: "The flight was delayed by two hours." },
    { word: "embarrass", meaning: "to cause to feel self-conscious", example: "He was embarrassed when he forgot her name." },
    { word: "encourage", meaning: "to give support or confidence to", example: "Her parents encouraged her to study abroad." },
    { word: "exhausted", meaning: "drained of energy; very tired", example: "She felt completely exhausted after the marathon." },
    { word: "familiar", meaning: "well known; comfortable with something", example: "Are you familiar with this area?" },
    { word: "genuine", meaning: "truly what something is said to be; sincere", example: "Her smile was genuine and warm." },
    { word: "grateful", meaning: "feeling thankful for something received", example: "I'm so grateful for all your support." },
    { word: "habit", meaning: "a regular behavior done unconsciously", example: "Exercising every morning is a healthy habit." },
    { word: "hesitate", meaning: "to pause before doing something", example: "Don't hesitate to ask if you need help." },
    { word: "impress", meaning: "to have a strong effect on; to cause admiration", example: "His presentation impressed the whole audience." },
    { word: "intention", meaning: "what one intends to do; purpose", example: "My intention is to finish the project by Friday." },
    { word: "jealous", meaning: "feeling envy toward others; protective", example: "She was jealous of her colleague's promotion." },
    { word: "keen", meaning: "having a strong interest; sharp", example: "He is keen to learn new languages." },
    { word: "launch", meaning: "to start or introduce something new", example: "They launched a new product line in spring." },
    { word: "manage", meaning: "to succeed in doing; to be in charge of", example: "Did you manage to find a parking spot?" },
    { word: "neighbor", meaning: "a person living next door or nearby", example: "My neighbor is very friendly and helpful." },
    { word: "occasion", meaning: "a particular event or time", example: "We only use the formal dining room on special occasions." },
    { word: "offend", meaning: "to cause upset or annoyance", example: "He didn't mean to offend anyone with his joke." },
    { word: "passion", meaning: "strong enthusiasm for something", example: "Cooking is her greatest passion." },
    { word: "perspective", meaning: "a way of thinking about something", example: "Try to see things from my perspective." },
    { word: "practical", meaning: "concerned with what is real and useful", example: "She is very practical and never wastes time." },
    { word: "reliable", meaning: "able to be depended on", example: "My old car is slow but reliable." },
    { word: "routine", meaning: "a regular course of procedure", example: "Morning exercise is part of his daily routine." },
    { word: "schedule", meaning: "a plan of activities at specific times", example: "What's your schedule this weekend?" },
    { word: "struggle", meaning: "to work hard under difficulty", example: "Many students struggle with math." },
    { word: "support", meaning: "give assistance or encouragement", example: "Thank you for always supporting my decisions." },
    { word: "tense", meaning: "unable to relax; nervous", example: "She felt tense before the job interview." },
    { word: "tradition", meaning: "a custom passed down through generations", example: "It's a family tradition to have dinner together on Sundays." },
    { word: "typical", meaning: "having the usual qualities of a type", example: "A typical workday starts at nine." },
    { word: "unique", meaning: "being the only one of its kind", example: "Every person has a unique personality." },
    { word: "valuable", meaning: "worth a great deal of money or importance", example: "Her advice was very valuable to me." },
    { word: "volunteer", meaning: "to freely offer to do something", example: "She volunteers at the local food bank on weekends." },
    { word: "wander", meaning: "to walk without a fixed destination", example: "We wandered through the old city streets." },
    { word: "worry", meaning: "to feel anxious about something", example: "Don't worry — everything will work out fine." },
    { word: "accustomed", meaning: "used to something through habit", example: "I am accustomed to waking up early." },
    { word: "advantage", meaning: "a condition giving a more favorable position", example: "Living near work is a big advantage." },
    { word: "afford", meaning: "to have enough money for; to be able to bear", example: "We can't afford to miss this opportunity." },
    { word: "anniversary", meaning: "the yearly recurrence of an event", example: "Today is our fifth wedding anniversary." },
    { word: "annoying", meaning: "slightly anger-inducing or irritating", example: "The loud music from next door is annoying." },
    { word: "arrange", meaning: "to put in order; to plan", example: "Can you arrange a meeting for Thursday?" },
    { word: "atmosphere", meaning: "the mood or feeling of a place", example: "The restaurant has a very cozy atmosphere." },
    { word: "attitude", meaning: "a way of thinking or feeling", example: "A positive attitude helps in difficult times." },
    { word: "brave", meaning: "ready to face danger or pain", example: "It was brave of her to speak up in the meeting." },
    { word: "challenge", meaning: "a difficult task that tests abilities", example: "Learning a new language is always a challenge." },
    { word: "comfort", meaning: "physical ease and freedom from pain", example: "She found comfort in talking to her friends." },
    { word: "complain", meaning: "to express dissatisfaction", example: "He always complains about the cold weather." },
  ],
  csat: [
    { word: "abolish", meaning: "to formally put an end to a system or practice", example: "The government abolished the outdated law." },
    { word: "abstract", meaning: "existing in thought rather than concrete form", example: "Love is an abstract concept that is hard to define." },
    { word: "adversity", meaning: "a difficult or unfortunate situation", example: "She showed great courage in the face of adversity." },
    { word: "aesthetic", meaning: "concerned with beauty or the appreciation of art", example: "The garden had a peaceful, aesthetic charm." },
    { word: "ambivalence", meaning: "having mixed feelings about something", example: "He felt ambivalence about moving abroad." },
    { word: "analogy", meaning: "a comparison made to explain something", example: "The teacher used an analogy to explain the concept." },
    { word: "anarchy", meaning: "a state of disorder due to absence of authority", example: "Without leadership, the group fell into anarchy." },
    { word: "assimilate", meaning: "to absorb and integrate", example: "It takes time to assimilate new information." },
    { word: "autonomy", meaning: "freedom to govern oneself; self-direction", example: "Teachers need more autonomy in the classroom." },
    { word: "brevity", meaning: "concise and exact use of words", example: "The best speeches are admired for their brevity." },
    { word: "catalyst", meaning: "something that causes change or speeds up a process", example: "Her speech was a catalyst for the movement." },
    { word: "censorship", meaning: "suppression of speech or media", example: "Censorship of the press is a threat to democracy." },
    { word: "chronic", meaning: "persisting for a long time; habitual", example: "Chronic stress can lead to serious health issues." },
    { word: "coexist", meaning: "to exist at the same time or place", example: "Different cultures can coexist peacefully." },
    { word: "cognitive", meaning: "relating to mental processes", example: "Reading enhances cognitive development in children." },
    { word: "compassion", meaning: "sympathetic concern for others' suffering", example: "Compassion is essential in the medical profession." },
    { word: "conform", meaning: "to comply with rules or standards", example: "Students are expected to conform to school rules." },
    { word: "consciousness", meaning: "awareness of one's own existence and thoughts", example: "Philosophy explores the nature of consciousness." },
    { word: "contemporary", meaning: "existing or occurring at the present time", example: "The museum focuses on contemporary art." },
    { word: "contradict", meaning: "to assert the opposite of a statement", example: "His actions contradict his words." },
    { word: "conviction", meaning: "a firmly held belief", example: "She spoke with deep conviction about justice." },
    { word: "cultivate", meaning: "to develop or promote by effort", example: "We should cultivate a habit of critical thinking." },
    { word: "cynical", meaning: "believing that people are motivated purely by self-interest", example: "He became cynical after years of disappointment." },
    { word: "deliberate", meaning: "done consciously and intentionally", example: "Her choice of words was deliberate and precise." },
    { word: "democracy", meaning: "a system of government by the whole population", example: "Freedom of speech is central to democracy." },
    { word: "dilemma", meaning: "a situation requiring a choice between unpleasant options", example: "She faced a moral dilemma at work." },
    { word: "discern", meaning: "to perceive or recognize something", example: "It is hard to discern the truth from the rumors." },
    { word: "discrimination", meaning: "unjust treatment of different categories of people", example: "Discrimination based on gender is illegal." },
    { word: "eloquent", meaning: "fluent and persuasive in speech or writing", example: "He gave an eloquent speech at the ceremony." },
    { word: "empathy", meaning: "the ability to understand others' feelings", example: "Empathy is a key quality of a good leader." },
    { word: "empirical", meaning: "based on observation or experience", example: "Scientific claims must be backed by empirical evidence." },
    { word: "enigma", meaning: "a mysterious or puzzling person or thing", example: "The ancient ruins remain an enigma to historians." },
    { word: "epidemic", meaning: "a widespread occurrence of an illness", example: "The flu epidemic affected millions worldwide." },
    { word: "ethical", meaning: "relating to moral principles", example: "We must consider the ethical implications of AI." },
    { word: "evolution", meaning: "gradual development or change", example: "The evolution of smartphones changed communication." },
    { word: "exploitation", meaning: "the action of using unfairly for one's own benefit", example: "Child labor is a form of exploitation." },
    { word: "facade", meaning: "the outward appearance concealing truth", example: "His calm facade hid his inner anxiety." },
    { word: "fallacy", meaning: "a mistaken belief based on unsound reasoning", example: "It is a fallacy that success comes without effort." },
    { word: "flourish", meaning: "to grow or develop in a healthy way", example: "The arts flourish when society is at peace." },
    { word: "fragile", meaning: "easily broken or damaged", example: "The peace agreement was fragile from the start." },
    { word: "generation", meaning: "all people born and living at the same time", example: "Each generation faces unique challenges." },
    { word: "hierarchy", meaning: "a system with levels of rank or authority", example: "The military has a strict hierarchy." },
    { word: "hypocrisy", meaning: "claiming virtues one does not practice", example: "His hypocrisy was evident to everyone around him." },
    { word: "ideology", meaning: "a system of ideas that forms the basis of a theory", example: "Political parties are shaped by their ideology." },
    { word: "illusion", meaning: "a false idea or impression", example: "Success can be an illusion without happiness." },
    { word: "incentive", meaning: "a thing that motivates action", example: "Tax breaks serve as an incentive for investment." },
    { word: "indifference", meaning: "lack of interest or concern", example: "His indifference to others' pain was troubling." },
    { word: "inevitable", meaning: "certain to happen; unavoidable", example: "Change is inevitable in any growing organization." },
    { word: "inherent", meaning: "existing as a natural part of something", example: "There are inherent risks in every business venture." },
    { word: "innovation", meaning: "the introduction of new ideas or methods", example: "Innovation drives economic growth." },
    { word: "integrity", meaning: "the quality of being honest and having strong principles", example: "Integrity is the foundation of trust." },
    { word: "intrinsic", meaning: "belonging naturally; essential", example: "Learning has intrinsic value beyond career benefits." },
    { word: "intuition", meaning: "the ability to understand without reasoning", example: "She trusted her intuition and made the right call." },
    { word: "irony", meaning: "a state of affairs that seems contrary to expectations", example: "The irony is that he feared failure but succeeded." },
    { word: "juxtapose", meaning: "to place side by side for comparison", example: "The author juxtaposes wealth and poverty." },
    { word: "mediocre", meaning: "of average quality; not very good", example: "A mediocre effort will not lead to great results." },
    { word: "metaphor", meaning: "a figure of speech describing one thing as another", example: "Life is a journey is a common metaphor." },
    { word: "nostalgia", meaning: "longing for the past", example: "Old songs fill her with nostalgia." },
    { word: "oppression", meaning: "prolonged cruel or unjust treatment", example: "History is full of examples of oppression." },
    { word: "paradox", meaning: "a seemingly contradictory statement with truth", example: "It's a paradox that war can sometimes bring peace." },
    { word: "perception", meaning: "the way something is understood or interpreted", example: "Perception of beauty varies across cultures." },
    { word: "perseverance", meaning: "persistence in doing something despite difficulty", example: "Her perseverance helped her overcome every obstacle." },
    { word: "philanthropy", meaning: "the desire to promote the welfare of others", example: "Philanthropy plays a vital role in society." },
    { word: "prejudice", meaning: "an unfair opinion formed without reason", example: "Prejudice should have no place in the workplace." },
    { word: "prevail", meaning: "to be greater in strength; to be widespread", example: "Justice will prevail in the end." },
    { word: "profound", meaning: "having deep meaning; intense", example: "The book made a profound impact on my thinking." },
    { word: "rationalize", meaning: "to justify behavior with logical reasons", example: "He tried to rationalize his poor decision." },
    { word: "reconcile", meaning: "to restore friendly relations; to make consistent", example: "They finally reconciled after years of conflict." },
    { word: "resilience", meaning: "the capacity to recover quickly", example: "Resilience is key to overcoming adversity." },
    { word: "rhetoric", meaning: "persuasive language in speaking or writing", example: "Political rhetoric often simplifies complex issues." },
    { word: "sacrifice", meaning: "giving up something valued for something else", example: "Parents often make sacrifices for their children." },
    { word: "skeptical", meaning: "not easily convinced; doubting", example: "Scientists must be skeptical of new claims." },
    { word: "solidarity", meaning: "unity and agreement among a group", example: "The workers showed solidarity during the strike." },
    { word: "sovereignty", meaning: "supreme power; a self-governing state", example: "The treaty respected each nation's sovereignty." },
    { word: "stereotype", meaning: "a widely held but oversimplified idea", example: "Stereotypes prevent understanding of individuals." },
    { word: "subjective", meaning: "based on personal opinions or feelings", example: "Art criticism is highly subjective." },
    { word: "superficial", meaning: "existing only on the surface; shallow", example: "Their friendship was superficial and short-lived." },
    { word: "sustainable", meaning: "able to be maintained at a certain level", example: "Sustainable development balances growth and ecology." },
    { word: "synthesis", meaning: "a combination of elements to form a whole", example: "The essay requires a synthesis of multiple sources." },
    { word: "tolerant", meaning: "willing to accept different opinions or behavior", example: "A tolerant society respects all religions." },
    { word: "transcend", meaning: "to go beyond the limits of", example: "Great art transcends cultural boundaries." },
    { word: "tyranny", meaning: "cruel and oppressive government", example: "The people rose against tyranny." },
    { word: "utopia", meaning: "an imagined perfect society", example: "His novel describes a utopia free from war." },
    { word: "vulnerable", meaning: "exposed to the possibility of attack or harm", example: "Children are particularly vulnerable to poverty." },
  ],
};

const DECK_SIZES: Record<DeckKey, number> = { toeic: 100, business: 80, daily: 60, csat: 80 };

type UIData = {
  title: string;
  subtitle: string;
  decks: Record<DeckKey, string>;
  deckSize: string;
  cardCount: string;
  tapToFlip: string;
  knowBtn: string;
  unknownBtn: string;
  knownLabel: string;
  unknownLabel: string;
  remainLabel: string;
  reviewUnknown: string;
  resetDeck: string;
  todayLabel: string;
  frontHint: string;
  meaningLabel: string;
  exampleLabel: string;
  completedTitle: string;
  completedMsg: string;
  allKnown: string;
};

const UI: Record<Locale, UIData> = {
  ko: {
    title: "영단어 플래시카드",
    subtitle: "카드를 뒤집어 단어를 학습하세요",
    decks: { toeic: "TOEIC 필수", business: "비즈니스", daily: "일상회화", csat: "수능" },
    deckSize: "단어 수",
    cardCount: "번째 카드",
    tapToFlip: "카드를 클릭해 뒤집기",
    knowBtn: "알아요",
    unknownBtn: "모르겠어요",
    knownLabel: "아는 단어",
    unknownLabel: "모르는 단어",
    remainLabel: "남은 카드",
    reviewUnknown: "모르는 단어만 복습",
    resetDeck: "처음부터 다시",
    todayLabel: "오늘 학습",
    frontHint: "클릭해서 뜻 확인",
    meaningLabel: "뜻",
    exampleLabel: "예문",
    completedTitle: "완료!",
    completedMsg: "모든 카드를 학습했습니다.",
    allKnown: "모두 알고 있어요!",
  },
  en: {
    title: "Vocabulary Flashcards",
    subtitle: "Flip cards to study vocabulary",
    decks: { toeic: "TOEIC Essential", business: "Business", daily: "Daily Conversation", csat: "CSAT" },
    deckSize: "Cards",
    cardCount: "Card",
    tapToFlip: "Click the card to flip",
    knowBtn: "Know It",
    unknownBtn: "Don't Know",
    knownLabel: "Known",
    unknownLabel: "Unknown",
    remainLabel: "Remaining",
    reviewUnknown: "Review Unknown Cards",
    resetDeck: "Start Over",
    todayLabel: "Today's Study",
    frontHint: "Click to reveal meaning",
    meaningLabel: "Meaning",
    exampleLabel: "Example",
    completedTitle: "Complete!",
    completedMsg: "You've studied all the cards.",
    allKnown: "You know them all!",
  },
  ja: {
    title: "英単語フラッシュカード",
    subtitle: "カードをめくって単語を学習しよう",
    decks: { toeic: "TOEIC必須", business: "ビジネス", daily: "日常会話", csat: "センター試験" },
    deckSize: "単語数",
    cardCount: "枚目",
    tapToFlip: "クリックしてカードをめくる",
    knowBtn: "知ってる",
    unknownBtn: "わからない",
    knownLabel: "わかった",
    unknownLabel: "わからない",
    remainLabel: "残り",
    reviewUnknown: "わからない単語を復習",
    resetDeck: "最初からやり直す",
    todayLabel: "今日の学習",
    frontHint: "クリックして意味を確認",
    meaningLabel: "意味",
    exampleLabel: "例文",
    completedTitle: "完了！",
    completedMsg: "すべてのカードを学習しました。",
    allKnown: "全部わかります！",
  },
  fr: {
    title: "Cartes Mémoire de Vocabulaire",
    subtitle: "Retournez les cartes pour apprendre du vocabulaire",
    decks: { toeic: "TOEIC Essentiel", business: "Affaires", daily: "Conversation Quotidienne", csat: "Examen Scolaire" },
    deckSize: "Cartes",
    cardCount: "Carte",
    tapToFlip: "Cliquez pour retourner la carte",
    knowBtn: "Je connais",
    unknownBtn: "Je ne sais pas",
    knownLabel: "Connus",
    unknownLabel: "Inconnus",
    remainLabel: "Restants",
    reviewUnknown: "Réviser les mots inconnus",
    resetDeck: "Recommencer",
    todayLabel: "Étude du jour",
    frontHint: "Cliquez pour révéler la signification",
    meaningLabel: "Signification",
    exampleLabel: "Exemple",
    completedTitle: "Terminé !",
    completedMsg: "Vous avez étudié toutes les cartes.",
    allKnown: "Vous les connaissez tous !",
  },
  es: {
    title: "Tarjetas de Vocabulario",
    subtitle: "Voltea las tarjetas para aprender vocabulario",
    decks: { toeic: "TOEIC Esencial", business: "Negocios", daily: "Conversación Diaria", csat: "Examen Escolar" },
    deckSize: "Tarjetas",
    cardCount: "Tarjeta",
    tapToFlip: "Haz clic para voltear la tarjeta",
    knowBtn: "Lo sé",
    unknownBtn: "No lo sé",
    knownLabel: "Conocidas",
    unknownLabel: "Desconocidas",
    remainLabel: "Restantes",
    reviewUnknown: "Revisar palabras desconocidas",
    resetDeck: "Empezar de nuevo",
    todayLabel: "Estudio de hoy",
    frontHint: "Haz clic para ver el significado",
    meaningLabel: "Significado",
    exampleLabel: "Ejemplo",
    completedTitle: "¡Completado!",
    completedMsg: "Has estudiado todas las tarjetas.",
    allKnown: "¡Las conoces todas!",
  },
  zh: {
    title: "词汇闪卡",
    subtitle: "翻转卡片学习词汇",
    decks: { toeic: "TOEIC必备", business: "商务英语", daily: "日常对话", csat: "高考词汇" },
    deckSize: "单词数",
    cardCount: "张",
    tapToFlip: "点击卡片翻转",
    knowBtn: "认识",
    unknownBtn: "不认识",
    knownLabel: "已知",
    unknownLabel: "未知",
    remainLabel: "剩余",
    reviewUnknown: "复习未知单词",
    resetDeck: "重新开始",
    todayLabel: "今日学习",
    frontHint: "点击查看含义",
    meaningLabel: "含义",
    exampleLabel: "例句",
    completedTitle: "完成！",
    completedMsg: "你已学完所有单词卡。",
    allKnown: "全都认识了！",
  },
};

const TODAY_KEY = new Date().toISOString().slice(0, 10);

function getTodayCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("vocabflash_today");
    if (!raw) return 0;
    const data = JSON.parse(raw) as { date: string; count: number };
    return data.date === TODAY_KEY ? data.count : 0;
  } catch {
    return 0;
  }
}

function saveTodayCount(count: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("vocabflash_today", JSON.stringify({ date: TODAY_KEY, count }));
  } catch {
    // ignore
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VocabFlashcard({ locale }: Props) {
  const t = UI[locale] ?? UI.en;

  const [selectedDeck, setSelectedDeck] = useState<DeckKey>("toeic");
  const [queue, setQueue] = useState<Card[]>(() => shuffle(DECKS.toeic.slice(0, DECK_SIZES.toeic)));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [todayCount, setTodayCount] = useState(() => getTodayCount());

  const current = queue[idx] ?? null;
  const total = queue.length;
  const done = idx >= total;

  function changeDeck(dk: DeckKey) {
    setSelectedDeck(dk);
    const cards = shuffle(DECKS[dk].slice(0, DECK_SIZES[dk]));
    setQueue(cards);
    setIdx(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
  }

  function handleFlip() {
    setFlipped((f) => !f);
  }

  const incrementToday = useCallback(() => {
    const next = todayCount + 1;
    setTodayCount(next);
    saveTodayCount(next);
  }, [todayCount]);

  function handleKnow() {
    if (!flipped) return;
    setKnown((prev) => new Set(prev).add(idx));
    incrementToday();
    setIdx(idx + 1);
    setFlipped(false);
  }

  function handleUnknown() {
    if (!flipped) return;
    setUnknown((prev) => new Set(prev).add(idx));
    incrementToday();
    setIdx(idx + 1);
    setFlipped(false);
  }

  function handleReviewUnknown() {
    const unknownCards = queue.filter((_, i) => unknown.has(i));
    setQueue(shuffle(unknownCards));
    setIdx(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
  }

  function handleReset() {
    const cards = shuffle(DECKS[selectedDeck].slice(0, DECK_SIZES[selectedDeck]));
    setQueue(cards);
    setIdx(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
  }

  const progress = total > 0 ? (idx / total) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      {/* Today count */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm text-green-700">
          <span>📅</span>
          <span>{t.todayLabel}: <strong>{todayCount}</strong></span>
        </div>
      </div>

      {/* Deck selector */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(DECKS) as DeckKey[]).map((dk) => (
          <button
            key={dk}
            onClick={() => changeDeck(dk)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              selectedDeck === dk
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-emerald-400"
            }`}
          >
            <div>{t.decks[dk]}</div>
            <div className="text-xs opacity-70">{t.deckSize}: {DECK_SIZES[dk]}</div>
          </button>
        ))}
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{t.cardCount} {Math.min(idx + 1, total)} / {total}</span>
          <span className="flex gap-3">
            <span className="text-green-600">{t.knownLabel}: {known.size}</span>
            <span className="text-red-500">{t.unknownLabel}: {unknown.size}</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      {!done && current ? (
        <>
          {/* Flip card */}
          <div
            className="relative w-full cursor-pointer"
            style={{ perspective: "1000px", height: "220px" }}
            onClick={handleFlip}
          >
            <div
              className="absolute inset-0 transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-300 bg-white shadow-lg p-6 text-center"
                style={{ backfaceVisibility: "hidden" }}
              >
                <p className="text-3xl font-extrabold text-gray-900 mb-3">
                  {current.word}
                </p>
                <p className="text-sm text-gray-400">{t.frontHint}</p>
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 flex flex-col items-start justify-center rounded-2xl border-2 border-teal-400 bg-teal-50 shadow-lg p-6 space-y-3"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">{t.meaningLabel}</p>
                <p className="text-base font-semibold text-gray-900">{current.meaning}</p>
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">{t.exampleLabel}</p>
                <p className="text-sm italic text-gray-600">"{current.example}"</p>
              </div>
            </div>
          </div>
          {!flipped && (
            <p className="text-center text-xs text-gray-400">{t.tapToFlip}</p>
          )}

          {/* Action buttons */}
          {flipped && (
            <div className="flex gap-3">
              <button
                onClick={handleUnknown}
                className="flex-1 rounded-xl border-2 border-red-300 bg-red-50 py-3 font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                {t.unknownBtn}
              </button>
              <button
                onClick={handleKnow}
                className="flex-1 rounded-xl border-2 border-green-400 bg-green-50 py-3 font-semibold text-green-700 hover:bg-green-100 transition-colors"
              >
                {t.knowBtn}
              </button>
            </div>
          )}
        </>
      ) : (
        /* Completed */
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center space-y-4">
          <p className="text-4xl">🎉</p>
          <p className="text-xl font-bold text-gray-900">{t.completedTitle}</p>
          <p className="text-gray-500">{t.completedMsg}</p>
          <div className="flex gap-2 justify-center text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
              {t.knownLabel}: {known.size}
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-600">
              {t.unknownLabel}: {unknown.size}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {unknown.size > 0 ? (
              <button
                onClick={handleReviewUnknown}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white hover:from-orange-600 hover:to-red-600 transition-all"
              >
                {t.reviewUnknown} ({unknown.size})
              </button>
            ) : (
              <div className="flex-1 rounded-xl bg-green-100 py-3 text-center font-semibold text-green-700">
                {t.allKnown}
              </div>
            )}
            <button
              onClick={handleReset}
              className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t.resetDeck}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
