export const config = {
  returnType: "number",
  description:
    "Returns the total number of layers currently tracked by UIDirector. Use with GetTrackedLayerByIndex in a Repeat loop to iterate all tracked layers.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._layers.size;
}
