export const config = {
  listName: "On any layer state changed",
  displayText: "On any layer state changed",
  description:
    "Fires after any tracked layer finishes transitioning to a new state. Use LastChangedLayer and LastChangedState expressions to know which layer changed and what state it moved to. Example: update a debug HUD whenever any UI state changes.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return true;
}
