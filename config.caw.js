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
  "Layer-based UI manager with focus stack, popup system, animations, modal control, and collision management. Track any layer as a named screen, popup, or tooltip — then open, close, and navigate between them with simple actions.";
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

// Display names for ACE categories (folder name → display name)
export const aceCategories = {
  Common: "Common",
  Tracking: "Layer Tracking",
  Layer_State: "Layer State",
  Focus_Stack: "Focus Stack",
  Popups: "Popups",
  Tooltips: "Tooltips",
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

// Properties — declaration order is critical!
// _getInitProperties() returns them as an array by index:
// 0: uiContainerLayer  1: defaultAnimType  2: defaultAnimDuration
// 3: defaultAnimEasing  4: persistAcrossLayouts  5: debugMode
export const properties = [
  {
    type: PROPERTY_TYPE.TEXT,
    id: "uiContainerLayer",
    name: "UI Container Layer",
    desc: 'Name of the group layer in your layout that contains all managed UI sublayers. Example: if your group layer is called "UI", enter "UI" here.',
    options: { initialValue: "UI" },
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "defaultAnimType",
    name: "Default Animation",
    desc: "The default transition animation played when showing or hiding a layer. Can be overridden per-layer with Set Layer Animation.",
    options: {
      initialValue: "fade",
      items: [
        { fade: "Fade" },
        { slideLeft: "Slide Left" },
        { slideRight: "Slide Right" },
        { slideUp: "Slide Up" },
        { slideDown: "Slide Down" },
        { none: "None (instant)" },
      ],
    },
  },
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "defaultAnimDuration",
    name: "Default Anim Duration (ms)",
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
      ],
    },
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
    desc: "If enabled, UIDirector logs all operations to the browser console (F12 → Console). Useful during development — turn off before release.",
    options: { initialValue: false },
  },
];
