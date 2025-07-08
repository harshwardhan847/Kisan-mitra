import type { StateComparisonData } from "tools/compareMandiPrices";
import type { CropDiseaseDiagnosis } from "tools/diagnoseCropDisease";
import type { GovernmentSchemesResult } from "tools/getGovernmentSchemes";
import type { MarketDataResult } from "tools/getMarketData";

export type PreviousChats = (
  | MarketDataResult
  | CropDiseaseDiagnosis
  | StateComparisonData
  | GovernmentSchemesResult
  | Record<string, MarketDataResult>
  | { error: string }
)[];
