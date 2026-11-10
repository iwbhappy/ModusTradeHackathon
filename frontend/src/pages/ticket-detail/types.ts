export type ActionRunner = (operation: () => Promise<unknown>, message: string) => Promise<void>;
