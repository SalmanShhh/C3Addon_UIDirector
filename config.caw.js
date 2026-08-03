import {
  ADDON_CATEGORY,
  ADDON_TYPE,
  PLUGIN_TYPE,
  PROPERTY_TYPE,
} from "./template/enums.js";
import _version from "./version.js";
export const addonType = ADDON_TYPE.PLUGIN;
export const type = PLUGIN_TYPE.OBJECT;
export const id = "salmanshh_uidirector";
export const name = "UIDirector";
export const version = _version;
export const minConstructVersion = undefined;
export const author = "SalmanShh";
export const website = "https://www.construct.net";
export const documentation = "https://www.construct.net";
export const description =
  "Layer-based UI manager with focus stack, popup system, animations, modal control, and collision management. Track any layer as a named screen, popup, or tooltip - then open, close, and navigate between them with simple actions.";
export const category = ADDON_CATEGORY.OTHER;

export const hasDomside = false;
export const files = {
  extensionScript: {
    enabled: false, // set to false to disable the extension script
    watch: true, // set to true to enable live reload on changes during development
    targets: ["x86", "x64"],
    // you don't need to change this, the build step will rename the dll for you. Only change this if you change the name of the dll exported by Visual Studio
    name: "MyExtension",
  },
  fileDependencies: [],
  remoteFileDependencies: [
    // {
    //   src: "https://example.com/api.js", // Must use https:// or same-protocol // URLs. http:// is not allowed.
    //   type: "" // Optional: "" or "module". Empty string or omit for classic script.
    // }
  ],
  cordovaPluginReferences: [],
  cordovaResourceFiles: [],
};

// Display names for ACE categories (folder name -> display name)
export const aceCategories = {
  Setup: "Setup",
  Navigation: "Navigation",
  Layers: "Layers",
  Popups_Tooltips: "Popups & Tooltips",
  Transitions: "Transitions & Events",
};

export const info = {
  // icon: "icon.svg",
  // PLUGIN world only
  // defaultImageUrl: "default-image.png",
  Set: {
    // COMMON to all
    CanBeBundled: true,
    IsDeprecated: false,
    GooglePlayServicesEnabled: false,

    // BEHAVIOR only
    IsOnlyOneAllowed: false,

    // PLUGIN world only
    IsResizable: false,
    IsRotatable: false,
    Is3D: false,
    HasImage: false,
    IsTiled: false,
    SupportsZElevation: false,
    SupportsColor: false,
    SupportsEffects: false,
    MustPreDraw: false,

    // PLUGIN object only
    IsSingleGlobal: true,
  },
  // PLUGIN only
  AddCommonACEs: {
    Position: false,
    SceneGraph: false,
    Size: false,
    Angle: false,
    Appearance: false,
    ZOrder: false,
  },
};

// Properties - declaration order is critical!
// GROUP rows are layout-only: they carry no value, so they do NOT occupy a slot in the array
// returned by _getInitProperties(). The value indices are therefore:
//   0: uiContainerLayer
//   1: defaultAnimType  2: defaultAnimDuration  3: defaultAnimEasing  4: anchorMode
//   5: dimLayer         6: dimOpacity
//   7: persistAcrossLayouts  8: debugMode
// src/runtime/instance.js derives this mapping from the list below rather than hardcoding the
// indices, so adding, removing or regrouping a property here cannot silently shift the values.
export const properties = [
  {
    type: PROPERTY_TYPE.TEXT,
    id: "uiContainerLayer",
    name: "UI Container Layer",
    desc: 'Name of the group layer in your layout that contains all managed UI sublayers. Example: if your group layer is called "UI", enter "UI" here. Leave blank to search the whole layout.',
    options: { initialValue: "UI" },
  },
  {
    type: PROPERTY_TYPE.GROUP,
    id: "groupTransitions",
    name: "Transitions",
    desc: "Transition-related defaults.",
    options: {},
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "defaultAnimType",
    name: "Default Animation",
    desc: "The default transition animation played when showing or hiding a layer. Can be overridden per-layer with the Set animation action.",
    options: {
      initialValue: "fade",
      items: [
        { fade: "Fade" },
        { slideLeft: "Slide Left" },
        { slideRight: "Slide Right" },
        { slideUp: "Slide Up" },
        { slideDown: "Slide Down" },
        { none: "None (instant)" },
        { scaleDown: "Scale Down" },
        { scaleUp: "Scale Up" },
      ],
    },
  },
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "defaultAnimDuration",
    name: "Default Duration (ms)",
    desc: "How long the default transition animation takes, in milliseconds. Example: 200 = a quick 0.2 second fade.",
    options: { initialValue: 200, minValue: 0 },
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "defaultAnimEasing",
    name: "Default Easing",
    desc: "The easing curve applied to the default animation. EaseOut feels snappy and responsive; EaseInOut feels smooth.",
    options: {
      initialValue: "easeOut",
      items: [
        { linear: "Linear" },
        { easeIn: "Ease In" },
        { easeOut: "Ease Out" },
        { easeInOut: "Ease In Out" },
        { quadraticOut: "Quadratic Out" },
        { quarticOut: "Quartic Out" },
        { exponentialOut: "Exponential Out" },
        { circularOut: "Circular Out" },
        { backOut: "Back Out" },
        { elasticOut: "Elastic Out" },
        { bounceOut: "Bounce Out" },
      ],
    },
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "anchorMode",
    name: "Anchored Objects",
    desc: "How slide and scale transitions treat objects with the Anchor behavior. \"Move with layer\" slides/scales them along with everything else; \"Stay in place\" keeps them where they are and animates only the objects attached to them.",
    options: {
      initialValue: "hold",
      items: [
        { animate: "Move with layer" },
        { hold: "Stay in place" },
      ],
    },
  },
  {
    type: PROPERTY_TYPE.GROUP,
    id: "groupModalDim",
    name: "Modal / Dim",
    desc: "Modal dim layer settings.",
    options: {},
  },
  {
    type: PROPERTY_TYPE.TEXT,
    id: "dimLayer",
    name: "Dim Layer",
    desc: "Optional. The name of a layer inside your UI container to use as a dim/scrim overlay. UIDirector will show this layer at the set opacity whenever a modal screen or popup is active, and hide it when none are. Leave blank to disable.",
    options: { initialValue: "" },
  },
  {
    type: PROPERTY_TYPE.PERCENT,
    id: "dimOpacity",
    name: "Dim Opacity",
    desc: "The opacity of the dim layer when it is active (0 = invisible, 1 = fully opaque). Default is 0.5 (50% semi-transparent). Only applies when Dim Layer is set; ignored otherwise.",
    options: { initialValue: 0.5 },
  },
  {
    type: PROPERTY_TYPE.GROUP,
    id: "groupBehavior",
    name: "Behavior",
    desc: "Global behavior settings.",
    options: {},
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "persistAcrossLayouts",
    name: "Persist Across Layouts",
    desc: "If enabled, UIDirector remembers tracked layers and their states when the layout changes. Layer references are re-resolved on the new layout.",
    options: { initialValue: false },
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "debugMode",
    name: "Debug Mode",
    desc: "If enabled, UIDirector logs all operations to the browser console (F12 -> Console). Useful during development - turn off before release.",
    options: { initialValue: false },
  },
];
