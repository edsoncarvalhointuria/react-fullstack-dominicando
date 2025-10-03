import type { ROLES } from "./Roles";

type ObjectValues<T> = T[keyof T];
type Roles = ObjectValues<typeof ROLES>;
