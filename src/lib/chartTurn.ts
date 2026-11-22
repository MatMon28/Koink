import { createContext, useContext } from 'react';

/**
 * Whether the chart's full view is turned a quarter (sideways). The settings popup is drawn inside the
 * full view, so it turns with it; its swipe-down-to-close has to read a finger's movement in the view's
 * own axes ("down" is then to the left of the screen). `ChartLargeView` provides it, `ChartPopup` reads it.
 */
export const ChartTurnContext = createContext(false);

export const useChartTurned = (): boolean => useContext(ChartTurnContext);
