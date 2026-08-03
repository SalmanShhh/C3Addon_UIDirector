export const config = {
  returnType: "string",
  description:
    "Returns the new state of the most recently changed layer. Use inside state-changed triggers to react differently to 'hidden' vs 'visible'. Polled by companion addons.",
  highlight: false,
  deprecated: false,
  params: [],
};

// Exposed on the instance so companion addons (e.g. UIForge) can poll it directly
// to follow the active screen. Keep true — the cross-addon integration reads this.
export const expose = true;

export default function () {
  return this._lastChangedState;
}
