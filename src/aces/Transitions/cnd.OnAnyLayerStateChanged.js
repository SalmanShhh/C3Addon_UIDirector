export const config = {
  listName: "On any layer state changed",
  displayText: "On any layer state changed",
  description:
    "Triggers whenever any layer changes state. Use with LastChangedLayer and LastChangedState for global UI tracking. Companion addons poll these to follow the active screen.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
