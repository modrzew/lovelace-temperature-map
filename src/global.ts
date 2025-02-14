declare global {
  interface Window {
    loadCardHelpers?: () => Promise<{
      createCardElement: (entity: any) => HTMLElement;
    }>;
  }
}
