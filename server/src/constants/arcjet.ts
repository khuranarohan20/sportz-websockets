interface ArcjetRules {
  INTERVAL: string;
  MAX: number;
}

export const HTTP_ARCJECT_RULES: ArcjetRules = {
  INTERVAL: "10s",
  MAX: 50,
};

export const WS_ARCJECT_RULES: ArcjetRules = {
  INTERVAL: "2s",
  MAX: 5,
};
