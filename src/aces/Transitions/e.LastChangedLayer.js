export const config = {
  returnType: "string",
  description:
    "Returns the name of the layer whose state most recently changed. Use inside state-changed triggers to know which layer fired the event. Polled by companion addons to follow the active screen.",
  highlight: false,
  deprecated: false,
  params: [],
};

// Exposed on the instance so companion addons (e.g. UIForge) can poll it directly
// to follow the active screen. Keep true — the cross-addon integration reads this.
export const expose = true;

export default function () {
  return this._lastChangedLayer;
}
