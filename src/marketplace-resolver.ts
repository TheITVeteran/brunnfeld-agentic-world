import type { AgentTurnResult, WorldState, SimTime } from "./types.js";
import { expireOrders } from "./marketplace.js";

export function resolveMarketplace(
  _results: AgentTurnResult[],
  state: WorldState,
  time: SimTime,
): void {
  expireOrders(state, time);
}
