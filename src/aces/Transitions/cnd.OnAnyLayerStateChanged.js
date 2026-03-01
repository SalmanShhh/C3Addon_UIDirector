export const config = {
  listName: "On any layer state changed",
  displayText: "On any layer state changed",
  description:
    "Triggers whenever any layer changes state. Use with LastChangedLayer and LastChangedState for debug logging or global UI tracking.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
