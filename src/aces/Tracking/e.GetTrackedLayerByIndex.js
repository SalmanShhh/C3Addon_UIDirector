export const config = {
  returnType: "string",
  description: "Returns the name of a tracked layer at the given zero-based index. Use with CountTrackedLayers in a Repeat loop to iterate all tracked layers.",
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "index",
      name: "Index",
      desc: "Zero-based index of the tracked layer (0 = first tracked, CountTrackedLayers - 1 = last).",
      type: "number",
    },
  ],
};

export const expose = false;

export default function (index) {
  return Array.from(this._layers.keys())[index] ?? "";
}
