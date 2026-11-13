export const isReceptionIntakeEnabled =
  import.meta.env.VITE_ENABLE_RECEPTION_INTAKE === 'true';

export const isReceptionSpecialtyRoutingEnabled =
  isReceptionIntakeEnabled &&
  import.meta.env.VITE_ENABLE_RECEPTION_SPECIALTY_ROUTING === 'true';
