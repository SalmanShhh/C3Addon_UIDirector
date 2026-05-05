export default function (instanceClass) {
  return class extends instanceClass {
    constructor(sdkType, inst) {
      super(sdkType, inst);
    }

    Release() {}

    OnCreate() {
      // Set initial enabled state for Dim Opacity based on current Dim Layer value.
      const dimLayer = this.GetPropertyValue("dimLayer");
      this.SetPropertyEnabled("dimOpacity", typeof dimLayer === "string" && dimLayer.trim().length > 0);
    }

    OnPlacedInLayout() {}

    OnPropertyChanged(id, value) {
      if (id === "dimLayer") {
        this.SetPropertyEnabled("dimOpacity", typeof value === "string" && value.trim().length > 0);
      }
    }
  };
}
