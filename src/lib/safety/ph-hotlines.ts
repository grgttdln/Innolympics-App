export const PH_HOTLINES = {
  NCMH: {
    name: "NCMH Crisis Hotline",
    number: "1553",
    note: "toll-free nationwide",
  },
  HOPELINE: {
    name: "Hopeline PH",
    number: "0917-558-4673",
    note: "",
  },
  IN_TOUCH: {
    name: "In Touch Crisis Line",
    number: "0917-572-4673",
    note: "",
  },
} as const;

export type PhHotlineKey = keyof typeof PH_HOTLINES;
