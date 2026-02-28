export const config = {
  listName: "Layer is in state",
  displayText: "Layer {0} is in state {1}",
  description:
    "True if the named layer is currently in the given state. States: visible (shown + interactive), hidden (invisible), disabled (visible but not interactive), focused (focused on stack). Example: if 'Pause Menu' is in state visible → show the Resume button.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to check.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "state",
      name: "State",
      desc: "The state to check against.",
      type: "combo",
      initialValue: "visible",
      items: [
        { visible: "Visible" },
        { hidden: "Hidden" },
        { disabled: "Disabled" },
        { focused: "Focused" },
      ],
    },
  ],
};

export const expose = false;

export default function (layerName, state) {
  return (this._layers.get(layerName)?.state ?? "") === state;
}
