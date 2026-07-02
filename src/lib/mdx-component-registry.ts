import type { ContentTrack } from "./taxonomy";

import Callout from "../components/mdx/Callout.astro";
import FormulaBlock from "../components/mdx/FormulaBlock.astro";
import HighlightBox from "../components/mdx/HighlightBox.astro";
import Term from "../components/mdx/Term.astro";
import ResearchReference from "../components/mdx/ResearchReference.astro";
import Reference from "../components/mdx/Reference.astro";
import Quiz from "../components/mdx/Quiz.astro";
import ResultGraph from "../components/mdx/ResultGraph.astro";
import BarChart from "../components/mdx/BarChart.astro";
import PieChart from "../components/mdx/PieChart.astro";
import FlowChart from "../components/mdx/FlowChart.astro";
import CompareTable from "../components/mdx/CompareTable.astro";
import Fraction from "../components/mdx/Fraction.astro";
import FormulaBox from "../components/mdx/FormulaBox.astro";
import LineChart from "../components/mdx/LineChart.astro";
import ProgressBar from "../components/mdx/ProgressBar.astro";
import Timeline from "../components/mdx/Timeline.astro";
import HeatMap from "../components/mdx/HeatMap.astro";
import StatCards from "../components/mdx/StatCards.astro";
import RadarChart from "../components/mdx/RadarChart.astro";
import ToolCTA from "../components/mdx/ToolCTA.astro";
import ToolCTAInline from "../components/mdx/ToolCTAInline.astro";
import TestCTA from "../components/mdx/TestCTA.astro";
import QuadrantMatrix from "../components/mdx/QuadrantMatrix.astro";
import PyramidDiagram from "../components/mdx/PyramidDiagram.astro";
import ForceDiagram from "../components/mdx/ForceDiagram.astro";
import ValueChain from "../components/mdx/ValueChain.astro";
import ConceptCard from "../components/mdx/ConceptCard.astro";
import SupplyDemandChart from "../components/mdx/SupplyDemandChart.astro";
import ASADChart from "../components/mdx/ASADChart.astro";
import PhillipsCurveChart from "../components/mdx/PhillipsCurveChart.astro";
import LorenzCurve from "../components/mdx/LorenzCurve.astro";
import PPFChart from "../components/mdx/PPFChart.astro";
import BusinessCycle from "../components/mdx/BusinessCycle.astro";
import ProductLifeCycle from "../components/mdx/ProductLifeCycle.astro";
import KeynesianCross from "../components/mdx/KeynesianCross.astro";
import OrgChart from "../components/mdx/OrgChart.astro";
import PolicyCycle from "../components/mdx/PolicyCycle.astro";

import {
  LectureTable,
  LectureProcess,
  LecturePieChart,
  LectureBarChart,
} from "@/features/education-common/components/LectureVisuals";
import {
  OptionPayoffChart,
  FrontierChart,
  NPVChart,
  SMLChart,
} from "@/features/education-finance/FinanceCharts";
import { GameTheoryPlayground } from "@/features/education-game-theory";
import { CVPCalculator, NPVCalculator } from "@/features/education-calculators/FinancialCalculators";
import { StoneSimulator } from "@/features/education-calculators/GameCalculators";
import { CVPChart } from "@/features/education-calculators/FinancialCharts";
import { ISLMSimulator } from "@/features/education-calculators/EconomicSimulators";
import { TruthTableGenerator } from "@/features/education-calculators/LogicTools";
import { CompAdvantageCalculator } from "@/features/education-calculators/TradeSimulators";
import { PersonalColorMiniTest } from "@/features/education-calculators/PersonalColorTools";
import { CAPMCalculator, WACCCalculator } from "@/features/education-calculators/AdvancedFinanceCalculators";
import { VarianceAnalysis } from "@/features/education-calculators/AccountingSimulators";
import { JournalEntryTrainer } from "@/features/education-calculators/JournalEntryTrainer";
import { TAccountVisualizer } from "@/features/education-calculators/TAccountVisualizer";
import { MacroCalculators, GDPCalculator, MultiplierCalculator, InflationCalculator as MacroInflationCalculator } from "@/features/education-calculators/MacroCalculators";
import { CostAccountingSimulator } from "@/features/education-calculators/CostAccountingSimulator";
import { FinancialRatioTrendAnalyzer } from "@/features/education-calculators/FinancialStatementAnalyzer";
import InheritanceTaxCalculator from "../components/calculators/InheritanceTaxCalculator";
import { BondPricer, PortfolioVisualizer } from "@/features/education-calculators/BondAndPortfolioTools";
import { TypingSpeedTest, PrisonersDilemma } from "@/features/education-calculators/UtilityGames";
import { AttachmentTest } from "@/features/education-calculators/PsychologyTools";
import { CVPGame } from "@/features/education-calculators/AccountingGames";
import { SWOTBuilder } from "@/features/education-calculators/BusinessStrategyTools";
import { DeveloperUnitConverter } from "@/features/education-calculators/DeveloperTools";
import Gomoku from "../components/games/Gomoku";
import ChessBoard from "../components/games/ChessBoard";
import Reversi from "../components/games/Reversi";
import Checkers from "../components/games/Checkers";
import Game2048 from "../components/games/Game2048";
import Sudoku from "../components/games/Sudoku";
import Minesweeper from "../components/games/Minesweeper";
import Blackjack from "../components/games/Blackjack";
import SnakeGame from "../components/games/SnakeGame";
import Dominoes from "../components/games/Dominoes";
import HeartsGame from "../components/games/HeartsGame";
import FreeCell from "../components/games/FreeCell";
import Solitaire from "../components/games/Solitaire";
import Hitori from "../components/games/Hitori";
import LightUp from "../components/games/LightUp";
import JanggiBoard from "../components/games/JanggiBoard";
import LottoGenerator from "../components/games/LottoGenerator";
import ChimpTest from "../components/games/ChimpTest";
import PsychologyWordle from "../components/games/PsychologyWordle";
import TentsAndTrees from "../components/games/TentsAndTrees";
import WaterSort from "../components/games/WaterSort";
import WheelSpinner from "../components/games/WheelSpinner";
import AcquisitionTaxCalculator from "../components/tools/AcquisitionTaxCalculator";
import CashFlowManager from "../components/tools/CashFlowManager";
import CompoundInterestCalculator from "../components/tools/CompoundInterestCalculator";
import SalaryCalculator from "../components/mdx/SalaryCalculator";
import CapitalGainsTaxCalculator from "../components/mdx/CapitalGainsTaxCalculator";
import PropertyTaxCalculator from "../components/tools/PropertyTaxCalculator";
import SeveranceCalculator from "../components/tools/SeveranceCalculator";
import FreelancerTaxCalculator from "../components/tools/FreelancerTaxCalculator";
import IsaCalculator from "../components/tools/IsaCalculator";
import PensionCalculator from "../components/tools/PensionCalculator";
import BrokerageCalculator from "../components/tools/BrokerageCalculator";
import RentComparisonCalculator from "../components/tools/RentComparisonCalculator";
import RentalYieldCalculator from "../components/tools/RentalYieldCalculator";
import StockAverageCalculator from "../components/tools/StockAverageCalculator";
import BmiCalculator from "../components/tools/BmiCalculator";
import MeetingCostCalculator from "../components/tools/MeetingCostCalculator";
import RoiCalculator from "../components/tools/RoiCalculator";
import AgeCalculator from "../components/tools/AgeCalculator";
import GpaCalculator from "../components/tools/GpaCalculator";
import PetAgeCalculator from "../components/tools/PetAgeCalculator";
import HeightPredictor from "../components/tools/HeightPredictor";
import PregnancyCalculator from "../components/tools/PregnancyCalculator";
import CaffeineCalculator from "../components/tools/CaffeineCalculator";
import FastingTimer from "../components/tools/FastingTimer";
import EtfRecommender from "../components/tools/EtfRecommender";
import AutoTaxCalculator from "../components/tools/AutoTaxCalculator";
import AsciiArtGenerator from "../components/tools/AsciiArtGenerator";
import Base64Converter from "../components/tools/Base64Converter";
import CaffelatteCalculator from "../components/tools/CaffelatteCalculator";
import DogVisionSimulator from "../components/tools/DogVisionSimulator";
import GrayscaleConverter from "../components/tools/GrayscaleConverter";
import InflationCalculator from "../components/tools/InflationCalculator";
import ImageCropper from "../components/tools/ImageCropper";
import ImageDegrader from "../components/tools/ImageDegrader";
import ImagePixelator from "../components/tools/ImagePixelator";
import ImageProcessor from "../components/tools/ImageProcessor";
import MetadataViewer from "../components/tools/MetadataViewer";
import PaletteExtractor from "../components/tools/PaletteExtractor";
import SvgStudio from "../components/tools/SvgStudio";
import CryptoTaxCalculator from "../components/mdx/CryptoTaxCalculator";
import DividendCalculator from "../components/mdx/DividendCalculator";
import EarlyRepaymentCalculator from "../components/mdx/EarlyRepaymentCalculator";
import LoanCalculator from "../components/mdx/LoanCalculator";
import ROICalculator from "../components/mdx/ROICalculator";
import SavingsCalculator from "../components/mdx/SavingsCalculator";
import StockYieldCalculator from "../components/mdx/StockYieldCalculator";
import VatCalculator from "../components/mdx/VatCalculator";
import YearEndTaxCalculator from "../components/mdx/YearEndTaxCalculator";
import ChildHeightCalculator from "../components/mdx/ChildHeightCalculator";

// Batch-1 psych tests (2026-05-16)
import EmotionalMindTest from "../components/tests/EmotionalMindTest";
import HappinessMeterTest from "../components/tests/HappinessMeterTest";
import LeaderPulseTest from "../components/tests/LeaderPulseTest";
import ProductivityStyleTest from "../components/tests/ProductivityStyleTest";
import ValueCompassTest from "../components/tests/ValueCompassTest";
import ThinkingPatternsTest from "../components/tests/ThinkingPatternsTest";
import ResilienceBoostTest from "../components/tests/ResilienceBoostTest";
import FocusBlockerTest from "../components/tests/FocusBlockerTest";
import StrengthSageTest from "../components/tests/StrengthSageTest";
import MindClearTest from "../components/tests/MindClearTest";

// Batch-2 psych tests (2026-05-16)
import HormonesTest from "../components/tests/HormonesTest";
import InsightQuestTest from "../components/tests/InsightQuestTest";
import CommuteMentalTest from "../components/tests/CommuteMentalTest";
import CritiQuestTest from "../components/tests/CritiQuestTest";
import CollabRiskTest from "../components/tests/CollabRiskTest";
import BondInsightTest from "../components/tests/BondInsightTest";
import MindEaseTest from "../components/tests/MindEaseTest";
import MindRestTest from "../components/tests/MindRestTest";
import MeetingStyleTest from "../components/tests/MeetingStyleTest";
import PersonaScopeTest from "../components/tests/PersonaScopeTest";

// Batch-5 psych/social tests (2026-06-02)
import MbtiCareerTest from "../components/tests/MbtiCareerTest";
import MbtiLoveTest from "../components/tests/MbtiLoveTest";
import MbtiStressTest from "../components/tests/MbtiStressTest";
import SocialAnxietyTest from "../components/tests/SocialAnxietyTest";
import NarcissismTest from "../components/tests/NarcissismTest";
import ResilienceTest from "../components/tests/ResilienceTest";
import LeadershipStyleTest from "../components/tests/LeadershipStyleTest";
import GrowthMindsetTest from "../components/tests/GrowthMindsetTest";
import LonelinessTest from "../components/tests/LonelinessTest";
import ProcrastinationTypeTest from "../components/tests/ProcrastinationTypeTest";
import MotivationTypeTest from "../components/tests/MotivationTypeTest";
import DopamineDependencyTest from "../components/tests/DopamineDependencyTest";
import AngerStyleTest from "../components/tests/AngerStyleTest";
import SleepChronotypeTest from "../components/tests/SleepChronotypeTest";
import EmotionalIntelligenceTest from "../components/tests/EmotionalIntelligenceTest";
import HomeBuyingCalculator from "../components/calculators/HomeBuyingCalculator";

// Batch-4 psych/health tests (2026-06-02)
import BigFivePersonalityTest from "../components/tests/BigFivePersonalityTest";
import BurnoutTest from "../components/tests/BurnoutTest";
import IQTest from "../components/tests/IQTest";
import PersonalColorTest from "../components/tests/PersonalColorTest";
import AdhdScreeningTest from "../components/tests/AdhdScreeningTest";
import SelfEsteemTest from "../components/tests/SelfEsteemTest";
import DepressionScreeningTest from "../components/tests/DepressionScreeningTest";
import AnxietyScreeningTest from "../components/tests/AnxietyScreeningTest";

// Games batch-2 (2026-06-02)
import WordleGame from "../components/games/WordleGame";
import MemoryCardGame from "../components/games/MemoryCardGame";

// Batch-3 psych tests (2026-05-17)
import SoulMirrorTest from "../components/tests/SoulMirrorTest";
import ToneAnalysisTest from "../components/tests/ToneAnalysisTest";
import ColorRecognitionTest from "../components/tests/ColorRecognitionTest";
import MindsetCompassTest from "../components/tests/MindsetCompassTest";
import PerfectScopeTest from "../components/tests/PerfectScopeTest";
import PerfumePersonalityTest from "../components/tests/PerfumePersonalityTest";
import PersonaPathTest from "../components/tests/PersonaPathTest";
import ProblemSolverTest from "../components/tests/ProblemSolverTest";

// Batch-1 finance calculators (2026-05-16)
import FireRetirementCalculator from "../components/calculators/FireRetirementCalculator";
import JeonsevsBuyCalculator from "../components/calculators/JeonsevsBuyCalculator";
import LatteFactorCalculator from "../components/calculators/LatteFactorCalculator";
import DutchPayCalculator from "../components/calculators/DutchPayCalculator";
import GiftTaxCalculator from "../components/calculators/GiftTaxCalculator";
import SavingsComparisonCalculator from "../components/calculators/SavingsComparisonCalculator";
import PensionOptimizerCalculator from "../components/calculators/PensionOptimizerCalculator";
import TaxCalendar from "../components/calculators/TaxCalendar";
import LifeExpectancyCalculator from "../components/calculators/LifeExpectancyCalculator";

// Batch-3 finance calculators (2026-05-17)
import StatuteLimitationsCalculator from "../components/calculators/StatuteLimitationsCalculator";
import StockYieldCalculatorNew from "../components/calculators/StockYieldCalculator";
import LegalInterestCalculator from "../components/calculators/LegalInterestCalculator";
import LaborCostCalculator from "../components/calculators/LaborCostCalculator";
import LifePlanningCalculator from "../components/calculators/LifePlanningCalculator";
import WeddingPlanningCalculator from "../components/calculators/WeddingPlanningCalculator";
import JeonseVsRentCalculator from "../components/calculators/JeonseVsRentCalculator";
import IncorporationCalculator from "../components/calculators/IncorporationCalculator";
import SeparateVsComprehensiveTaxCalc from "../components/tools/SeparateVsComprehensiveTaxCalc";
import RealEstateCapitalGainsTaxCalc from "../components/tools/RealEstateCapitalGainsTaxCalc";
import ComprehensiveIncomeTaxCalc from "../components/tools/ComprehensiveIncomeTaxCalc";

// Batch-2 finance calculators (2026-05-16)
import MortgageCalculator from "../components/calculators/MortgageCalculator";
import Compound2Calculator from "../components/calculators/Compound2Calculator";
import DepositCalculator from "../components/calculators/DepositCalculator";
import GiftVsInheritanceCalculator from "../components/calculators/GiftVsInheritanceCalculator";
import IsaVsPensionCalculator from "../components/calculators/IsaVsPensionCalculator";
import ExpenseRatioCalculator from "../components/calculators/ExpenseRatioCalculator";
import OverseasStockSaverCalculator from "../components/calculators/OverseasStockSaverCalculator";
import PensionTaxCalculator from "../components/calculators/PensionTaxCalculator";
import PresentValueCalculator from "../components/calculators/PresentValueCalculator";
import RentalRoiCalculator from "../components/calculators/RentalRoiCalculator";

const editorialComponents = {
  Callout,
  HighlightBox,
  Term,
  ResearchReference,
  Reference,
  Quiz,
  ToolCTA,
  ToolCTAInline,
  TestCTA,
};

const diagramComponents = {
  FlowChart,
  CompareTable,
  Timeline,
  ProgressBar,
  StatCards,
  QuadrantMatrix,
  PyramidDiagram,
  ForceDiagram,
  ValueChain,
  ConceptCard,
  OrgChart,
  PolicyCycle,
};

const chartsAndMathComponents = {
  FormulaBlock,
  FormulaBox,
  Fraction,
  ResultGraph,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  HeatMap,
  SupplyDemandChart,
  ASADChart,
  PhillipsCurveChart,
  LorenzCurve,
  PPFChart,
  BusinessCycle,
  ProductLifeCycle,
  KeynesianCross,
};

const lectureComponents = {
  LectureTable,
  LectureProcess,
  LecturePieChart,
  LectureBarChart,
  OptionPayoffChart,
  FrontierChart,
  NPVChart,
  SMLChart,
  GameTheoryPlayground,
};

const islandComponents = {
  CVPCalculator,
  NPVCalculator,
  StoneSimulator,
  CVPChart,
  ISLMSimulator,
  TruthTableGenerator,
  CompAdvantageCalculator,
  PersonalColorMiniTest,
  CAPMCalculator,
  WACCCalculator,
  VarianceAnalysis,
  JournalEntryTrainer,
  TAccountVisualizer,
  MacroCalculators,
  GDPCalculator,
  MultiplierCalculator,
  MacroInflationCalculator,
  CostAccountingSimulator,
  FinancialRatioTrendAnalyzer,
  InheritanceTaxCalculator,
  BondPricer,
  PortfolioVisualizer,
  TypingSpeedTest,
  PrisonersDilemma,
  AttachmentTest,
  CVPGame,
  SWOTBuilder,
  DeveloperUnitConverter,
  Gomoku,
  ChessBoard,
  Reversi,
  Checkers,
  Game2048,
  Sudoku,
  AcquisitionTaxCalculator,
  CashFlowManager,
  CompoundInterestCalculator,
  SalaryCalculator,
  CapitalGainsTaxCalculator,
  PropertyTaxCalculator,
  SeveranceCalculator,
  FreelancerTaxCalculator,
  IsaCalculator,
  PensionCalculator,
  BrokerageCalculator,
  RentComparisonCalculator,
  RentalYieldCalculator,
  StockAverageCalculator,
  BmiCalculator,
  MeetingCostCalculator,
  RoiCalculator,
  AgeCalculator,
  GpaCalculator,
  PetAgeCalculator,
  HeightPredictor,
  PregnancyCalculator,
  CaffeineCalculator,
  FastingTimer,
  EtfRecommender,
  Minesweeper,
  Blackjack,
  SnakeGame,
  Dominoes,
  HeartsGame,
  FreeCell,
  Solitaire,
  Hitori,
  LightUp,
  JanggiBoard,
  LottoGenerator,
  ChimpTest,
  PsychologyWordle,
  TentsAndTrees,
  WaterSort,
  WheelSpinner,
  AutoTaxCalculator,
  AsciiArtGenerator,
  Base64Converter,
  CaffelatteCalculator,
  DogVisionSimulator,
  GrayscaleConverter,
  InflationCalculator,
  ImageCropper,
  ImageDegrader,
  ImagePixelator,
  ImageProcessor,
  MetadataViewer,
  PaletteExtractor,
  SvgStudio,
  CryptoTaxCalculator,
  DividendCalculator,
  EarlyRepaymentCalculator,
  LoanCalculator,
  ROICalculator,
  SavingsCalculator,
  StockYieldCalculator,
  VatCalculator,
  YearEndTaxCalculator,
  ChildHeightCalculator,
  // Batch-1 psych tests
  EmotionalMindTest,
  HappinessMeterTest,
  LeaderPulseTest,
  ProductivityStyleTest,
  ValueCompassTest,
  ThinkingPatternsTest,
  ResilienceBoostTest,
  FocusBlockerTest,
  StrengthSageTest,
  MindClearTest,
  // Batch-2 psych tests
  HormonesTest,
  InsightQuestTest,
  CommuteMentalTest,
  CritiQuestTest,
  CollabRiskTest,
  BondInsightTest,
  MindEaseTest,
  MindRestTest,
  MeetingStyleTest,
  PersonaScopeTest,
  // Batch-5 psych/social tests (2026-06-02)
  MbtiCareerTest,
  MbtiLoveTest,
  MbtiStressTest,
  SocialAnxietyTest,
  NarcissismTest,
  ResilienceTest,
  LeadershipStyleTest,
  GrowthMindsetTest,
  LonelinessTest,
  ProcrastinationTypeTest,
  MotivationTypeTest,
  DopamineDependencyTest,
  AngerStyleTest,
  SleepChronotypeTest,
  EmotionalIntelligenceTest,
  HomeBuyingCalculator,
  // Batch-4 psych/health tests (2026-06-02)
  BigFivePersonalityTest,
  BurnoutTest,
  IQTest,
  PersonalColorTest,
  AdhdScreeningTest,
  SelfEsteemTest,
  DepressionScreeningTest,
  AnxietyScreeningTest,
  // Games batch-2 (2026-06-02)
  WordleGame,
  MemoryCardGame,
  // Batch-3 psych tests
  SoulMirrorTest,
  ToneAnalysisTest,
  ColorRecognitionTest,
  MindsetCompassTest,
  PerfectScopeTest,
  PerfumePersonalityTest,
  PersonaPathTest,
  ProblemSolverTest,
  // Batch-1 finance calculators
  FireRetirementCalculator,
  JeonsevsBuyCalculator,
  LatteFactorCalculator,
  DutchPayCalculator,
  GiftTaxCalculator,
  SavingsComparisonCalculator,
  PensionOptimizerCalculator,
  TaxCalendar,
  LifeExpectancyCalculator,
  // Batch-2 finance calculators
  MortgageCalculator,
  Compound2Calculator,
  DepositCalculator,
  GiftVsInheritanceCalculator,
  IsaVsPensionCalculator,
  ExpenseRatioCalculator,
  OverseasStockSaverCalculator,
  PensionTaxCalculator,
  PresentValueCalculator,
  RentalRoiCalculator,
  // Batch-3 finance calculators
  StatuteLimitationsCalculator,
  StockYieldCalculatorNew,
  LegalInterestCalculator,
  LaborCostCalculator,
  LifePlanningCalculator,
  WeddingPlanningCalculator,
  JeonseVsRentCalculator,
  IncorporationCalculator,
  // Tax tools batch (2026-06-01)
  SeparateVsComprehensiveTaxCalc,
  RealEstateCapitalGainsTaxCalc,
  ComprehensiveIncomeTaxCalc,
};

// Keep a narrow bridge for older magazine essays that still embed a few
// interactive or lightweight teaching widgets. This is transitional and should
// shrink as content is normalized.
const transitionalMagazineCompatibilityComponents = {
  AttachmentTest,
  PersonalColorMiniTest,
  StoneSimulator,
  TruthTableGenerator,
  TypingSpeedTest,
};

const baseComponents = {
  ...editorialComponents,
  ...diagramComponents,
  ...chartsAndMathComponents,
};

export const academyMdxComponents = {
  ...baseComponents,
  ...lectureComponents,
  ...islandComponents,
};

export const magazineMdxComponents = {
  ...baseComponents,
  ...lectureComponents,
  ...islandComponents,
  ...transitionalMagazineCompatibilityComponents,
};

export const interactiveMdxComponents = {
  ...baseComponents,
  ...lectureComponents,
  ...islandComponents,
};

export function getRegisteredMdxComponents(track: ContentTrack) {
  if (track === "academy") return academyMdxComponents;
  if (track === "interactive") return interactiveMdxComponents;
  return magazineMdxComponents;
}

export const mdxRegistryTiers = {
  editorial: Object.keys(editorialComponents),
  diagrams: Object.keys(diagramComponents),
  chartsAndMath: Object.keys(chartsAndMathComponents),
  lecture: Object.keys(lectureComponents),
  islands: Object.keys(islandComponents),
  transitionalMagazineCompatibility: Object.keys(transitionalMagazineCompatibilityComponents),
} as const;
