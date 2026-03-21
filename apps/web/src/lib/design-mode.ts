const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function asBool(value: string | undefined): boolean {
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

export function isUiDesignMode(): boolean {
  return (
    asBool(process.env.UI_DESIGN_MODE) ||
    asBool(process.env.NEXT_PUBLIC_UI_DESIGN_MODE) ||
    asBool(process.env.DISABLE_FIRESTORE_READS_FOR_UI)
  );
}
