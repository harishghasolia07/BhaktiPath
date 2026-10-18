import { describe, expect, it } from "vitest";
import { tidyTitle } from "./tidy";

describe("tidyTitle", () => {
  it("capitalises each word and tidies spaces", () => {
    expect(tidyTitle("hey gopal  radhe krishna GOVIND govind", false)).toBe("Hey Gopal Radhe Krishna Govind Govind");
  });
  it("turns a mix note into a 'Mix:' title with spaced +", () => {
    expect(tidyTitle("sawriyo hai seth+ others", true)).toBe("Mix: Sawriyo Hai Seth + More");
    expect(tidyTitle("brej me hey rahi jai jai kar + chtak matak so thakur + other...", true)).toBe("Mix: Brej Me Hey Rahi Jai Jai Kar + Chtak Matak So Thakur + More");
  });
  it("keeps Devanagari and commas, drops stray punctuation", () => {
    expect(tidyTitle("राधे राधे, govind - ", false)).toBe("राधे राधे, Govind");
  });
  it("a mix with no names is just 'Mix'", () => {
    expect(tidyTitle("", true)).toBe("Mix");
  });
});
